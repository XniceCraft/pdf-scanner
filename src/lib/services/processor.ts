import type { PerspectiveCrop } from "@/types/edit";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

const px = (x: number, y: number, w: number) => y * w + x;

// ---------------------------------------------------------------------------
// Downscale by integer factor (box-average)
// ---------------------------------------------------------------------------

function downscale(
  src: Uint8Array,
  w: number,
  h: number,
  factor: number
): { data: Uint8Array; w: number; h: number } {
  const dw = Math.floor(w / factor);
  const dh = Math.floor(h / factor);
  const dst = new Uint8Array(dw * dh);
  for (let y = 0; y < dh; y++)
    for (let x = 0; x < dw; x++) {
      let sum = 0;
      for (let dy = 0; dy < factor; dy++)
        for (let dx = 0; dx < factor; dx++)
          sum += src[px(x * factor + dx, y * factor + dy, w)];
      dst[px(x, y, dw)] = (sum / (factor * factor)) | 0;
    }
  return { data: dst, w: dw, h: dh };
}

// ---------------------------------------------------------------------------
// Preprocessing channels
// ---------------------------------------------------------------------------

function channelPaperWarmBackground(
  d: Uint8ClampedArray,
  w: number,
  h: number
): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = d[i * 4],
      g = d[i * 4 + 1],
      b = d[i * 4 + 2];
    out[i] = clamp((r + g + b) / 3 - clamp(r - b, 0, 255) * 0.8, 0, 255) | 0;
  }
  return out;
}

function channelCardBlueness(
  d: Uint8ClampedArray,
  w: number,
  h: number
): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = d[i * 4],
      g = d[i * 4 + 1],
      b = d[i * 4 + 2];
    out[i] = clamp((b - (r + g) / 2) * 2 + 128, 0, 255) | 0;
  }
  return out;
}

function channelSaturation(
  d: Uint8ClampedArray,
  w: number,
  h: number
): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = d[i * 4] / 255,
      g = d[i * 4 + 1] / 255,
      b = d[i * 4 + 2] / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    out[i] = max === 0 ? 0 : Math.round(((max - min) / max) * 255);
  }
  return out;
}

function channelLuminance(
  d: Uint8ClampedArray,
  w: number,
  h: number
): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++)
    out[i] = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8;
  return out;
}

// ---------------------------------------------------------------------------
// Separable Gaussian blur (σ≈1, 5-tap)
// ---------------------------------------------------------------------------

const GAUSS5 = [2, 4, 5, 4, 2] as const;
const GAUSS5_SUM = 17;

function gaussianBlur5(src: Uint8Array, w: number, h: number): Uint8Array {
  const tmp = new Uint8Array(w * h);
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -2; k <= 2; k++)
        acc += GAUSS5[k + 2] * src[px(clamp(x + k, 0, w - 1), y, w)];
      tmp[px(x, y, w)] = (acc / GAUSS5_SUM) | 0;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -2; k <= 2; k++)
        acc += GAUSS5[k + 2] * tmp[px(x, clamp(y + k, 0, h - 1), w)];
      dst[px(x, y, w)] = (acc / GAUSS5_SUM) | 0;
    }
  return dst;
}

// ---------------------------------------------------------------------------
// Canny edge detection
// ---------------------------------------------------------------------------

function canny(
  src: Uint8Array,
  w: number,
  h: number,
  lo: number,
  hi: number
): Uint8Array {
  const bl = gaussianBlur5(src, w, h);
  const mag = new Float32Array(w * h);
  const dir = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -bl[px(x - 1, y - 1, w)] +
        bl[px(x + 1, y - 1, w)] -
        2 * bl[px(x - 1, y, w)] +
        2 * bl[px(x + 1, y, w)] -
        bl[px(x - 1, y + 1, w)] +
        bl[px(x + 1, y + 1, w)];
      const gy =
        -bl[px(x - 1, y - 1, w)] -
        2 * bl[px(x, y - 1, w)] -
        bl[px(x + 1, y - 1, w)] +
        bl[px(x - 1, y + 1, w)] +
        2 * bl[px(x, y + 1, w)] +
        bl[px(x + 1, y + 1, w)];
      mag[px(x, y, w)] = Math.sqrt(gx * gx + gy * gy);
      const ang = ((Math.atan2(gy, gx) * 180) / Math.PI + 180) % 180;
      dir[px(x, y, w)] =
        ang < 22.5 || ang >= 157.5 ? 0 : ang < 67.5 ? 1 : ang < 112.5 ? 2 : 3;
    }

  const nms = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = px(x, y, w),
        m = mag[i];
      let n1: number, n2: number;
      switch (dir[i]) {
        case 0:
          n1 = mag[px(x - 1, y, w)];
          n2 = mag[px(x + 1, y, w)];
          break;
        case 1:
          n1 = mag[px(x - 1, y + 1, w)];
          n2 = mag[px(x + 1, y - 1, w)];
          break;
        case 2:
          n1 = mag[px(x, y - 1, w)];
          n2 = mag[px(x, y + 1, w)];
          break;
        default:
          n1 = mag[px(x - 1, y - 1, w)];
          n2 = mag[px(x + 1, y + 1, w)];
      }
      nms[i] = m >= n1 && m >= n2 ? m : 0;
    }

  const STRONG = 255,
    WEAK = 128;
  const edges = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++)
    edges[i] = nms[i] >= hi ? STRONG : nms[i] >= lo ? WEAK : 0;

  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = px(x, y, w);
        if (edges[i] !== WEAK) continue;
        if (
          edges[px(x - 1, y - 1, w)] === STRONG ||
          edges[px(x, y - 1, w)] === STRONG ||
          edges[px(x + 1, y - 1, w)] === STRONG ||
          edges[px(x - 1, y, w)] === STRONG ||
          edges[px(x + 1, y, w)] === STRONG ||
          edges[px(x - 1, y + 1, w)] === STRONG ||
          edges[px(x, y + 1, w)] === STRONG ||
          edges[px(x + 1, y + 1, w)] === STRONG
        ) {
          edges[i] = STRONG;
          changed = true;
        }
      }
  }
  for (let i = 0; i < w * h; i++) if (edges[i] !== STRONG) edges[i] = 0;

  return edges;
}

// ---------------------------------------------------------------------------
// Morphological dilation (3×3)
// ---------------------------------------------------------------------------

function dilate3x3(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      outer: for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && src[px(nx, ny, w)]) {
            dst[px(x, y, w)] = 255;
            break outer;
          }
        }
    }
  return dst;
}

// ---------------------------------------------------------------------------
// Find top-N blobs by pixel count via DFS
// ---------------------------------------------------------------------------

const DX8 = [-1, 0, 1, 1, 1, 0, -1, -1];
const DY8 = [-1, -1, -1, 0, 1, 1, 1, 0];

function findBlobs(
  edges: Uint8Array,
  w: number,
  h: number,
  maxBlobs = 8
): number[][][] {
  const visited = new Uint8Array(w * h);
  const blobs: Array<{ pixels: number[][]; len: number }> = [];
  const stack: number[] = [];

  for (let sy = 1; sy < h - 1; sy++)
    for (let sx = 1; sx < w - 1; sx++) {
      const si = px(sx, sy, w);
      if (!edges[si] || visited[si]) continue;

      const pixels: number[][] = [];
      stack.push(si);
      visited[si] = 1;

      while (stack.length) {
        const ci = stack.pop()!;
        const cx = ci % w,
          cy = (ci / w) | 0;
        pixels.push([cx, cy]);
        for (let d = 0; d < 8; d++) {
          const nx = cx + DX8[d],
            ny = cy + DY8[d];
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = px(nx, ny, w);
          if (edges[ni] && !visited[ni]) {
            visited[ni] = 1;
            stack.push(ni);
          }
        }
      }

      blobs.push({ pixels, len: pixels.length });
    }

  blobs.sort((a, b) => b.len - a.len);
  return blobs.slice(0, maxBlobs).map((b) => b.pixels);
}

// ---------------------------------------------------------------------------
// Convex hull (Graham scan)
// ---------------------------------------------------------------------------

function convexHull(pts: number[][]): number[][] {
  if (pts.length < 3) return pts;
  let pivot = pts[0];
  for (const p of pts)
    if (p[1] > pivot[1] || (p[1] === pivot[1] && p[0] < pivot[0])) pivot = p;

  const sorted = pts
    .filter((p) => p !== pivot)
    .sort(
      (a, b) =>
        Math.atan2(a[1] - pivot[1], a[0] - pivot[0]) -
        Math.atan2(b[1] - pivot[1], b[0] - pivot[0])
    );

  const hull = [pivot];
  for (const p of sorted) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2],
        b = hull[hull.length - 1];
      if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) <= 0)
        hull.pop();
      else break;
    }
    hull.push(p);
  }
  return hull;
}

function perimeter(pts: number[][]): number {
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length];
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return len;
}

// ---------------------------------------------------------------------------
// Ramer–Douglas–Peucker
// ---------------------------------------------------------------------------

function rdp(pts: number[][], eps: number): number[][] {
  if (pts.length < 3) return pts;
  const first = pts[0],
    last = pts[pts.length - 1];
  const dx = last[0] - first[0],
    dy = last[1] - first[1];
  const len = Math.hypot(dx, dy);
  let maxD = 0,
    maxI = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d =
      len === 0
        ? Math.hypot(pts[i][0] - first[0], pts[i][1] - first[1])
        : Math.abs(
            dy * pts[i][0] -
              dx * pts[i][1] +
              last[0] * first[1] -
              last[1] * first[0]
          ) / len;
    if (d > maxD) {
      maxD = d;
      maxI = i;
    }
  }
  if (maxD > eps) {
    const l = rdp(pts.slice(0, maxI + 1), eps);
    const r = rdp(pts.slice(maxI), eps);
    return [...l.slice(0, -1), ...r];
  }
  return [first, last];
}

// ---------------------------------------------------------------------------
// Approximate blob to exactly 4 corners, with bounding-rect fallback
// ---------------------------------------------------------------------------

function approxQuad(contour: number[][]): number[][] | null {
  const hull = convexHull(contour);
  if (hull.length < 4) return null;

  const peri = perimeter(hull);
  const closed = [...hull, hull[0]];

  for (let f = 0.01; f <= 0.35; f += 0.005) {
    const poly = rdp(closed, peri * f);
    const pts =
      poly.length > 1 &&
      poly[0][0] === poly[poly.length - 1][0] &&
      poly[0][1] === poly[poly.length - 1][1]
        ? poly.slice(0, -1)
        : poly;
    if (pts.length === 4) return pts;
    if (pts.length < 4) break;
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of hull) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ];
}

// ---------------------------------------------------------------------------
// Score a candidate quad for document-likeness
// ---------------------------------------------------------------------------

function scoreQuad(quad: number[][], imgW: number, imgH: number): number {
  const imgArea = imgW * imgH;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of quad) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const bboxArea = (maxX - minX) * (maxY - minY);
  const ratio = bboxArea / imgArea;
  if (ratio < 0.05 || ratio > 0.92) return -Infinity;

  let polyArea = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i],
      b = quad[(i + 1) % 4];
    polyArea += a[0] * b[1] - b[0] * a[1];
  }
  polyArea = Math.abs(polyArea) / 2;
  const rectangularity = polyArea / bboxArea;
  if (rectangularity < 0.5) return -Infinity;

  for (let i = 0; i < 4; i++) {
    const prev = quad[(i + 3) % 4],
      curr = quad[i],
      next = quad[(i + 1) % 4];
    const ax = prev[0] - curr[0],
      ay = prev[1] - curr[1];
    const bx = next[0] - curr[0],
      by = next[1] - curr[1];
    const cos =
      (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) + 1e-9);
    const deg = (Math.acos(clamp(cos, -1, 1)) * 180) / Math.PI;
    if (deg < 45 || deg > 135) return -Infinity;
  }

  const docW = maxX - minX,
    docH = maxY - minY;
  const aspect = Math.max(docW, docH) / (Math.min(docW, docH) + 1e-9);
  if (aspect > 4.0) return -Infinity;

  return rectangularity * 0.6 + ratio * 0.4;
}

// ---------------------------------------------------------------------------
// Expand each corner outward from the quad centroid.
// Compensates for Canny edge pixels landing on the inner face of the boundary.
// `amount` is in downscaled pixels.
// ---------------------------------------------------------------------------

function expandCorners(quad: number[][], amount: number): number[][] {
  const cx = quad.reduce((s, p) => s + p[0], 0) / 4;
  const cy = quad.reduce((s, p) => s + p[1], 0) / 4;
  return quad.map(([x, y]) => {
    const dx = x - cx,
      dy = y - cy;
    const len = Math.hypot(dx, dy) + 1e-9;
    return [x + (dx / len) * amount, y + (dy / len) * amount];
  });
}

// ---------------------------------------------------------------------------
// Subpixel corner snap (full-resolution).
// For each corner, walk outward ±searchRadius px along the corner's diagonal
// and snap to the position of maximum gradient magnitude.
// ---------------------------------------------------------------------------

function snapCornersToEdge(
  quad: number[][],
  gray: Uint8Array,
  w: number,
  h: number,
  searchRadius = 12
): number[][] {
  const cx = quad.reduce((s, p) => s + p[0], 0) / 4;
  const cy = quad.reduce((s, p) => s + p[1], 0) / 4;

  return quad.map(([x, y]) => {
    const dx = x - cx,
      dy = y - cy;
    const len = Math.hypot(dx, dy) + 1e-9;
    const ux = dx / len,
      uy = dy / len;

    let bestMag = -1,
      bestX = x,
      bestY = y;

    for (let step = -searchRadius; step <= searchRadius; step++) {
      const sx = Math.round(x + ux * step);
      const sy = Math.round(y + uy * step);
      if (sx < 1 || sx >= w - 1 || sy < 1 || sy >= h - 1) continue;

      const gx =
        -gray[px(sx - 1, sy - 1, w)] +
        gray[px(sx + 1, sy - 1, w)] -
        2 * gray[px(sx - 1, sy, w)] +
        2 * gray[px(sx + 1, sy, w)] -
        gray[px(sx - 1, sy + 1, w)] +
        gray[px(sx + 1, sy + 1, w)];
      const gy =
        -gray[px(sx - 1, sy - 1, w)] -
        2 * gray[px(sx, sy - 1, w)] -
        gray[px(sx + 1, sy - 1, w)] +
        gray[px(sx - 1, sy + 1, w)] +
        2 * gray[px(sx, sy + 1, w)] +
        gray[px(sx + 1, sy + 1, w)];
      const mag = gx * gx + gy * gy;

      if (mag > bestMag) {
        bestMag = mag;
        bestX = sx;
        bestY = sy;
      }
    }

    return [bestX, bestY];
  });
}

// ---------------------------------------------------------------------------
// Corner reorder → [top-left, top-right, bottom-left, bottom-right]
// ---------------------------------------------------------------------------

function reorderCorners(
  pts: number[][]
): [number[], number[], number[], number[]] {
  const s = [...pts].sort((a, b) => a[1] - b[1]);
  const [a, b] = s.slice(0, 2).sort((a, b) => a[0] - b[0]);
  const [c, d] = s.slice(2).sort((a, b) => a[0] - b[0]);
  return Math.hypot(b[0] - a[0], b[1] - a[1]) <=
    Math.hypot(c[0] - a[0], c[1] - a[1])
    ? [a, b, c, d]
    : [c, a, d, b];
}

// ---------------------------------------------------------------------------
// Run one detection attempt on a channel
// ---------------------------------------------------------------------------

function tryDetectOnChannel(
  gray: Uint8Array,
  origW: number,
  origH: number,
  cannyLo: number,
  cannyHi: number,
  scaleFactor: number
): number[][] | null {
  const { data: small, w, h } = downscale(gray, origW, origH, scaleFactor);
  const edges = canny(small, w, h, cannyLo, cannyHi);
  const dilated = dilate3x3(edges, w, h);
  const blobs = findBlobs(dilated, w, h, 8);

  let bestQuad: number[][] | null = null;
  let bestScore = -Infinity;

  for (const blob of blobs) {
    const quad = approxQuad(blob);
    if (!quad) continue;
    const score = scoreQuad(quad, w, h);
    if (score > bestScore) {
      bestScore = score;
      bestQuad = quad;
    }
  }

  if (!bestQuad) return null;

  // Expand corners outward to compensate for Canny inner-face bias,
  // then scale back to original resolution.
  const expanded = expandCorners(bestQuad, 1.5);
  return expanded.map(([x, y]) => [
    clamp(Math.round(x * scaleFactor), 0, origW - 1),
    clamp(Math.round(y * scaleFactor), 0, origH - 1),
  ]);
}

class ProcessorService {
  getEdge(image: ImageBitmap): PerspectiveCrop {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const {
      data,
      width: w,
      height: h,
    } = ctx.getImageData(0, 0, image.width, image.height);

    const lumChannel = channelLuminance(data, w, h);

    const strategies: Array<[() => Uint8Array, number, number, number]> = [
      [() => channelCardBlueness(data, w, h), 12, 40, 4],
      [() => channelPaperWarmBackground(data, w, h), 15, 50, 4],
      [() => channelSaturation(data, w, h), 12, 40, 4],
      [() => lumChannel, 10, 30, 6],
      [() => channelCardBlueness(data, w, h), 20, 60, 2],
      [() => channelPaperWarmBackground(data, w, h), 20, 60, 2],
      [() => lumChannel, 8, 22, 6],
    ];

    for (const [buildChannel, lo, hi, factor] of strategies) {
      const corners = tryDetectOnChannel(buildChannel(), w, h, lo, hi, factor);
      if (!corners) continue;

      const snapped = snapCornersToEdge(corners, lumChannel, w, h, 12);
      const [a, b, c, d] = reorderCorners(snapped);

      return {
        enabled: true,
        points: [
          { x: a[0] / w, y: a[1] / h },
          { x: b[0] / w, y: b[1] / h },
          { x: c[0] / w, y: c[1] / h },
          { x: d[0] / w, y: d[1] / h },
        ],
      };
    }

    return { enabled: false };
  }
}

const processorService = new ProcessorService();
export default processorService;
