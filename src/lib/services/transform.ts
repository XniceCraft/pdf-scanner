import type { Edit, PerspectiveCrop, Point } from "@/types/edit";
import type { Size } from "@/types/size";
import type { OpenCV } from "@opencvjs/web";

const MAX_COLOR_SHIFT = 25;
const MAX_BRIGHTNESS = 100;
const MAX_TONE_SHIFT = 80;
const MAX_POINT_SHIFT = 50;
const MAX_CONTRAST_C = 127;

class TransformService {
  // renderToCanvas src image (bitmap) must use pre-perspective warped image.
  // If absent, use original image and generate perspective warped image.
  renderToCanvas(
    cv: typeof OpenCV,
    bitmap: ImageBitmap,
    canvas: HTMLCanvasElement,
    edit: Edit
  ): void {
    const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = offscreen.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

    const src = cv.matFromImageData(imageData);
    const output = new cv.Mat();
    this.applyEdits(cv, src, edit, output);

    cv.imshow(canvas, output);

    output.delete();
    src.delete();
  }

  // Used for perspective warp image caching
  async generateWarped(
    cv: typeof OpenCV,
    bitmap: ImageBitmap,
    points: Extract<PerspectiveCrop, { enabled: true }>["points"]
  ): Promise<Blob> {
    const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = offscreen.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);

    const src = cv.matFromImageData(
      ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    );
    const warped = new cv.Mat();

    try {
      const size = this.computeWarpSize(points, {
        width: bitmap.width,
        height: bitmap.height,
      });
      this.applyWarp(cv, warped, src, points, size);

      const out = document.createElement("canvas");
      out.width = size.width;
      out.height = size.height;
      cv.imshow(out, warped);

      return await new Promise<Blob>((resolve, reject) =>
        out.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
          "image/webp",
          1
        )
      );
    } finally {
      src.delete();
      warped.delete();
    }
  }

  async exportPage(
    cv: typeof OpenCV,
    bitmap: ImageBitmap,
    canvas: HTMLCanvasElement,
    edit: Edit
  ) {
    const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = offscreen.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);

    const src = cv.matFromImageData(
      ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    );

    const warped = new cv.Mat();
    const output = new cv.Mat();
    let newSize: Size | null = null;

    try {
      if (edit.perspectiveCrop.enabled) {
        newSize = this.computeWarpSize(edit.perspectiveCrop.points, {
          width: bitmap.width,
          height: bitmap.height,
        });

        this.applyWarp(cv, warped, src, edit.perspectiveCrop.points, newSize);
      } else {
        src.copyTo(warped);
      }
      this.applyEdits(cv, warped, edit, output);

      canvas.width = newSize?.width ?? bitmap.width;
      canvas.height = newSize?.height ?? bitmap.height;
      cv.imshow(canvas, output);
    } finally {
      src.delete();
      warped.delete();
      output.delete();
    }
  }

  private applyWarp(
    cv: typeof OpenCV,
    warped: InstanceType<typeof cv.Mat>,
    src: InstanceType<typeof cv.Mat>,
    points: Extract<PerspectiveCrop, { enabled: true }>["points"],
    size: Size
  ) {
    const pts1 = cv.matFromArray(
      4,
      1,
      cv.CV_32FC2,
      points.flatMap(({ x, y }) => [x * src.cols, y * src.rows])
    );

    const pts2 = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      size.width,
      0,
      0,
      size.height,
      size.width,
      size.height,
    ]);

    const matrix = cv.getPerspectiveTransform(pts1, pts2);
    cv.warpPerspective(
      src,
      warped,
      matrix,
      new cv.Size(size.width, size.height)
    );

    pts1.delete();
    pts2.delete();
    matrix.delete();
  }

  private applyEdits(
    cv: typeof OpenCV,
    src: InstanceType<typeof cv.Mat>,
    edit: Edit,
    output: InstanceType<typeof cv.Mat>
  ) {
    const rgb = new cv.Mat();
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);

    const lab = new cv.Mat();
    cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
    rgb.delete();

    const channels = new cv.MatVector();
    cv.split(lab, channels);
    lab.delete();

    this.applyLUT(cv, channels.get(0), this.buildLuminanceLUT(edit));

    if (edit.preset !== "no-shadow") {
      this.applyLUT(
        cv,
        channels.get(2),
        this.buildShiftLUT(edit.temperature, MAX_COLOR_SHIFT)
      );
      this.applyLUT(
        cv,
        channels.get(1),
        this.buildShiftLUT(edit.tint, MAX_COLOR_SHIFT)
      );
    }

    const merged = new cv.Mat();
    cv.merge(channels, merged);
    channels.delete();

    cv.cvtColor(merged, output, cv.COLOR_Lab2RGB);
    merged.delete();
  }

  private applyLUT(
    cv: typeof OpenCV,
    mat: InstanceType<typeof cv.Mat>,
    data: Uint8Array
  ): void {
    const lut = cv.matFromArray(1, 256, cv.CV_8UC1, data);
    cv.LUT(mat, lut, mat);
    lut.delete();
  }

  private buildLuminanceLUT(edit: Edit): Uint8Array {
    const { brightness, contrast } = edit;
    const black = edit.preset !== "no-shadow" ? edit.black : 0;
    const white = edit.preset !== "no-shadow" ? edit.white : 0;
    const shadow = edit.preset !== "no-shadow" ? edit.shadow : 0;
    const highlight = edit.preset !== "no-shadow" ? edit.highlight : 0;

    const c = (contrast / 100) * MAX_CONTRAST_C;
    const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));

    const lut = new Uint8Array(256);

    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let v = i;

      v += (black / 100) * MAX_POINT_SHIFT * (1 - t);
      v += (white / 100) * MAX_POINT_SHIFT * t;
      v += (shadow / 100) * MAX_TONE_SHIFT * (1 - t) ** 2;
      v += (highlight / 100) * MAX_TONE_SHIFT * t ** 2;

      v += (brightness / 100) * MAX_BRIGHTNESS;
      v = contrastFactor * (v - 128) + 128;

      lut[i] = Math.max(0, Math.min(255, Math.round(v)));
    }

    return lut;
  }

  private buildShiftLUT(value: number, maxShift: number): Uint8Array {
    const shift = Math.round((value / 100) * maxShift);
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.max(0, Math.min(255, i + shift));
    }
    return lut;
  }

  computeWarpSize(
    points: Extract<PerspectiveCrop, { enabled: true }>["points"],
    bitmapSize: Size
  ): Size {
    const [tl, tr, bl, br] = points;

    const toPixel = (p: Point) => ({
      x: p.x * bitmapSize.width,
      y: p.y * bitmapSize.height,
    });
    const [tlp, trp, blp, brp] = [tl, tr, bl, br].map(toPixel);

    const topWidth = Math.hypot(trp.x - tlp.x, trp.y - tlp.y);
    const bottomWidth = Math.hypot(brp.x - blp.x, brp.y - blp.y);
    const width = Math.round(Math.max(topWidth, bottomWidth));

    const leftHeight = Math.hypot(blp.x - tlp.x, blp.y - tlp.y);
    const rightHeight = Math.hypot(brp.x - trp.x, brp.y - trp.y);
    const height = Math.round(Math.max(leftHeight, rightHeight));

    return { width, height };
  }
}

const transformService = new TransformService();
export default transformService;
