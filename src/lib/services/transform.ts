import type { Edit } from "@/types/edit";
import type { OpenCV } from "@opencvjs/web";

const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;

const MAX_COLOR_SHIFT = 25;
const MAX_BRIGHTNESS = 100;
const MAX_TONE_SHIFT = 80;
const MAX_POINT_SHIFT = 50;
const MAX_CONTRAST_C = 127;

class TransformService {
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
    const warped = new cv.Mat();

    if (edit.perspectiveCrop.enabled) {
      const pts1 = cv.matFromArray(
        4,
        1,
        cv.CV_32FC2,
        edit.perspectiveCrop.points.flatMap((p) => [p.x, p.y])
      );
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
      cv.warpPerspective(src, warped, matrix, new cv.Size(A4_WIDTH, A4_HEIGHT));
      [pts1, pts2, matrix].forEach((m) => m.delete());
    } else {
      src.copyTo(warped);
    }
    src.delete();

    const output = this.applyEdits(cv, warped, edit);
    warped.delete();

    cv.imshow(canvas, output);
    output.delete();
  }

  private applyEdits(
    cv: typeof OpenCV,
    src: InstanceType<typeof cv.Mat>,
    edit: Edit
  ): InstanceType<typeof cv.Mat> {
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

    const result = new cv.Mat();
    cv.cvtColor(merged, result, cv.COLOR_Lab2RGB);
    merged.delete();

    return result;
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
}

const transformService = new TransformService();
export default transformService;
