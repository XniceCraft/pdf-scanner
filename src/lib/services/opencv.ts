import type { OpenCV } from "@opencvjs/web";
import type { PerspectiveCrop } from "@/types/edit";

const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;

class OpenCVService {
  calculatePerspective(
    cv: typeof OpenCV,
    image: ImageBitmap,
    canvas: HTMLCanvasElement
  ): PerspectiveCrop {
    const inputCanvas = new OffscreenCanvas(image.width, image.height);
    const ctx = inputCanvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    const src = cv.matFromImageData(imageData);
    const output = new cv.Mat();

    const grayWhite = this.preprocessWhite(cv, src);
    const contours =
      this.getContours(cv, grayWhite) ??
      this.getContours(cv, this.preprocessHsvSaturation(cv, src));
    grayWhite.delete();

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
      src.copyTo(output);
    }

    cv.imshow(canvas, output);
    [src, output].forEach((m) => m.delete());

    if (!contours) return { enabled: false };

    const [a, b, c, d] = contours;
    return {
      enabled: true,
      points: [
        { x: a[0], y: a[1] },
        { x: b[0], y: b[1] },
        { x: c[0], y: c[1] },
        { x: d[0], y: d[1] },
      ],
    };
  }

  private preprocessWhite(
    cv: typeof OpenCV,
    src: InstanceType<typeof cv.Mat>
  ): InstanceType<typeof cv.Mat> {
    const rgb = new cv.Mat();
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);

    const channels = new cv.MatVector();
    cv.split(rgb, channels);

    const r = channels.get(0);
    const g = channels.get(1);
    const b = channels.get(2);
    const total = src.rows * src.cols;

    const rData = new Uint8Array(r.data);
    const gData = new Uint8Array(g.data);
    const bData = new Uint8Array(b.data);

    for (let i = 0; i < total; i++) {
      const mean = (rData[i] + gData[i] + bData[i]) / 3;
      const std = Math.sqrt(
        ((rData[i] - mean) ** 2 +
          (gData[i] - mean) ** 2 +
          (bData[i] - mean) ** 2) /
          3
      );

      if (std < 10 && mean > 100) {
        r.data[i] = 255;
        g.data[i] = 255;
        b.data[i] = 255;
      }
    }

    const merged = new cv.Mat();
    cv.merge(channels, merged);

    const gray = new cv.Mat();
    cv.cvtColor(merged, gray, cv.COLOR_RGB2GRAY);

    [rgb, channels, merged].forEach((m) => m.delete());
    return gray;
  }

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
    const kernel = new cv.Mat();
    cv.dilate(edges, edges, kernel, new cv.Point(-1, -1), 1);
    kernel.delete();

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
        result = this.reorder(
          Array.from({ length: 4 }, (_, i) => [
            approx.intAt(i, 0),
            approx.intAt(i, 1),
          ])
        );
      }

      approx.delete();
    }

    [thresh, edges, contours, hierarchy].forEach((m) => m.delete());
    return result;
  }

  private reorder(points: number[][]): number[][] {
    const sorted = [...points].sort((a, b) => a[1] - b[1]);

    const [a, b] = [...sorted.slice(0, 2)].sort((a, b) => a[0] - b[0]);
    const [c, d] = [...sorted.slice(2)].sort((a, b) => a[0] - b[0]);

    const distAB = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const distAC = Math.hypot(c[0] - a[0], c[1] - a[1]);

    return distAB <= distAC ? [a, b, c, d] : [c, a, d, b];
  }
}

const opencvService = new OpenCVService();
export default opencvService;
