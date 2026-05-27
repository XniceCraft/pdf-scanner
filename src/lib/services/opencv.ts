import { type OpenCV } from "@opencvjs/web";

const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;

class OpenCVService {
  async apply(
    cv: typeof OpenCV,
    image: ImageBitmap,
    canvas: HTMLCanvasElement
  ) {
    const inputCanvas = document.createElement("canvas");
    inputCanvas.width = image.width;
    inputCanvas.height = image.height;
    inputCanvas.getContext("2d")!.drawImage(image, 0, 0);

    const src = cv.imread(inputCanvas);

    // — Try white preprocessing first, fallback to hsv saturation
    const grayWhite = this.preprocessWhite(cv, src);
    const contours =
      this.getContours(cv, grayWhite) ??
      this.getContours(cv, this.preprocessHsvSaturation(cv, src));
    grayWhite.delete();

    const output = new cv.Mat();

    if (contours) {
      const pts1 = cv.matFromArray(4, 1, cv.CV_32FC2, contours.flat());
      const pts2 = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0,
        0,
        A4_WIDTH,
        0,
        0,
        A4_HEIGHT,
        A4_WIDTH,
        A4_HEIGHT,
      ]);

      const matrix = cv.getPerspectiveTransform(pts1, pts2);
      cv.warpPerspective(src, output, matrix, new cv.Size(A4_WIDTH, A4_HEIGHT));

      [pts1, pts2, matrix].forEach((m) => m.delete());
    } else {
      console.error("No document detected!");
      src.copyTo(output);
    }

    cv.imshow(canvas, output);
    [src, output].forEach((m) => m.delete());
  }

  // Pixels where std(R,G,B) < 10 AND mean(R,G,B) > 100 → forced to 255 (white)
  // then convert to grayscale
  private preprocessWhite(
    cv: typeof OpenCV,
    src: InstanceType<typeof cv.Mat>
  ): InstanceType<typeof cv.Mat> {
    const channels = new cv.MatVector();
    const rgb = new cv.Mat();
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.split(rgb, channels);

    const r = channels.get(0);
    const g = channels.get(1);
    const b = channels.get(2);

    const rows = src.rows;
    const cols = src.cols;
    const total = rows * cols;

    // Work on raw pixel data
    const rData = new Uint8Array(r.data);
    const gData = new Uint8Array(g.data);
    const bData = new Uint8Array(b.data);

    for (let i = 0; i < total; i++) {
      const rv = rData[i];
      const gv = gData[i];
      const bv = bData[i];

      const mean = (rv + gv + bv) / 3;
      const std = Math.sqrt(
        ((rv - mean) ** 2 + (gv - mean) ** 2 + (bv - mean) ** 2) / 3
      );

      if (std < 10 && mean > 100) {
        r.data[i] = 255;
        g.data[i] = 255;
        b.data[i] = 255;
      }
    }

    // Merge back and convert to grayscale
    const merged = new cv.Mat();
    cv.merge(channels, merged);

    const gray = new cv.Mat();
    cv.cvtColor(merged, gray, cv.COLOR_RGB2GRAY);

    [rgb, channels, merged].forEach((m) => m.delete());

    return gray;
  }

  // Extract saturation channel from HSV (no inversion — matches repo exactly)
  private preprocessHsvSaturation(
    cv: typeof OpenCV,
    src: InstanceType<typeof cv.Mat>
  ): InstanceType<typeof cv.Mat> {
    const rgb = new cv.Mat();
    const hsv = new cv.Mat();
    const channels = new cv.MatVector();

    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);
    cv.split(hsv, channels);

    const saturation = channels.get(1).clone();

    [rgb, hsv, channels].forEach((m) => m.delete());

    return saturation;
  }

  // adaptiveThreshold → Canny → dilate → biggest contour → approxPolyDP
  private getContours(
    cv: typeof OpenCV,
    gray: InstanceType<typeof cv.Mat>
  ): number[][] | null {
    const thresh = new cv.Mat();
    cv.adaptiveThreshold(
      gray,
      thresh,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      199,
      5
    );

    const edges = new cv.Mat();
    cv.Canny(thresh, edges, 50, 50);
    cv.dilate(edges, edges, new cv.Mat(), new cv.Point(-1, -1), 1);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    let biggest: InstanceType<typeof cv.Mat> | null = null;
    let maxArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      if (area > maxArea) {
        maxArea = area;
        biggest = contour;
      }
    }

    let result: number[][] | null = null;

    if (biggest) {
      const perimeter = cv.arcLength(biggest, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(biggest, approx, 0.02 * perimeter, true);

      if (approx.rows === 4) {
        const pts: number[][] = [];
        for (let i = 0; i < 4; i++) {
          pts.push([approx.intAt(i, 0), approx.intAt(i, 1)]);
        }
        result = this.reorder(pts);
      }

      approx.delete();
    }

    [thresh, edges, contours, hierarchy].forEach((m) => m.delete());

    return result;
  }

  // Exact port of reorder() — handles vertical and horizontal orientation
  private reorder(points: number[][]): number[][] {
    const sorted = [...points].sort((a, b) => a[1] - b[1]);

    const top = [...sorted.slice(0, 2)].sort((a, b) => a[0] - b[0]);
    const [a, b] = top;

    const bottom = [...sorted.slice(2)].sort((a, b) => a[0] - b[0]);
    const [c, d] = bottom;

    const distAB = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const distAC = Math.hypot(c[0] - a[0], c[1] - a[1]);

    if (distAB <= distAC)
      return [a, b, c, d]; // vertical
    else return [c, a, d, b]; // horizontal
  }
}

const opencvService = new OpenCVService();
export default opencvService;
