// ---------------------------------------------------------------------------
// TransformService
// Applies non-destructive, pixel-level image adjustments via OffscreenCanvas /
// Canvas 2D. All adjustment parameters follow a ±100 scale (0 = neutral)
// except where noted, mirroring common photo-editing conventions.
//
// Parameter ranges & semantics:
//   brightness  [-100, 100]  overall luminance shift
//   contrast    [-100, 100]  S-curve contrast
//   temperature [-100, 100]  cool (blue) ↔ warm (orange)
//   tint        [-100, 100]  green ↔ magenta
//   shadow      [-100, 100]  lift / crush the dark tones
//   highlight   [-100, 100]  lift / crush the bright tones
//   white       [-100, 100]  white-point shift (expands/contracts highlights)
//   black       [-100, 100]  black-point shift (expands/contracts shadows)
// ---------------------------------------------------------------------------

import type { Edit } from "@/types/edit";

const OUTPUT_FORMAT = "image/webp" as const;
const OUTPUT_QUALITY = 0.92;

// ---------------------------------------------------------------------------
// LUT helpers
// A 256-entry lookup table (Uint8Array) maps input [0-255] → output [0-255]
// so the hot pixel loop becomes a single array read per channel.
// ---------------------------------------------------------------------------

/** Clamps a number to [0, 255] and rounds to nearest integer. */
const clamp255 = (v: number): number =>
  v < 0 ? 0 : v > 255 ? 255 : (v + 0.5) | 0;

/**
 * Builds a per-channel colour LUT combining all adjustments.
 * Returns { r, g, b } each as Uint8Array[256].
 */
function buildLUT(p: Required<Edit>): {
  b: Uint8Array;
  g: Uint8Array;
  r: Uint8Array;
} {
  const r = new Uint8Array(256);
  const g = new Uint8Array(256);
  const b = new Uint8Array(256);

  // Pre-compute scalars once (avoid per-iteration divisions)
  const brightnessShift = (p.brightness / 100) * 127; // ± 127

  // Contrast: S-curve factor.  contrast=0 → factor=1 (no change).
  // factor > 1 increases contrast, factor < 1 decreases it.
  const contrastFactor =
    p.contrast >= 0
      ? 1 + (p.contrast / 100) * 2 // [1, 3]
      : 1 + p.contrast / 100; // [0, 1]

  // Temperature: positive = warmer (add red, remove blue)
  const tempR = (p.temperature / 100) * 30;
  const tempB = -(p.temperature / 100) * 30;

  // Tint: positive = magenta (add red & blue, remove green)
  const tintR = (p.tint / 100) * 20;
  const tintG = -(p.tint / 100) * 20;
  const tintB = (p.tint / 100) * 20;

  // White point: shifts the tone-mapping endpoint.
  // white > 0 → push the top of the range up (brighter highlights)
  // white < 0 → compress the top (darker highlights)
  const whitePoint = 255 + (p.white / 100) * 60; // [195, 315], clamped in loop

  // Black point: shifts the starting point of the tone curve.
  // black > 0 → crush blacks (raise the floor), black < 0 → expand them
  const blackPoint = (p.black / 100) * 60; // ± 60

  // Shadow / highlight: zone-aware lifts applied after tone mapping.
  // Shadow affects pixels < 128, highlight affects pixels > 128.
  const shadowLift = (p.shadow / 100) * 60; // ± 60
  const highlightLift = (p.highlight / 100) * 60; // ± 60

  for (let i = 0; i < 256; i++) {
    // 1. Black-point remap: input range [blackPoint, 255] → [0, 255]
    const blackRange = 255 - blackPoint;
    let v = blackRange > 0 ? ((i - blackPoint) / blackRange) * 255 : i;

    // 2. White-point remap: output range [0, 255] → [0, whitePoint]
    v = (v / 255) * whitePoint;

    // 3. Contrast S-curve around midpoint 128
    v = (v - 128) * contrastFactor + 128;

    // 4. Brightness linear shift
    v += brightnessShift;

    // 5. Shadow / highlight zone adjustments
    if (v < 128) {
      const weight = 1 - v / 128; // 1 at 0, 0 at 128
      v += shadowLift * weight;
    } else {
      const weight = (v - 128) / 127; // 0 at 128, 1 at 255
      v += highlightLift * weight;
    }

    const base = clamp255(v);

    // 6. Per-channel colour shifts (temperature + tint)
    r[i] = clamp255(base + tempR + tintR);
    g[i] = clamp255(base + tintG);
    b[i] = clamp255(base + tempB + tintB);
  }

  return { b, g, r };
}

// ---------------------------------------------------------------------------
// TransformService
// ---------------------------------------------------------------------------

class TransformService {
  /**
   * Applies image adjustments to a Blob/File and returns a new Blob.
   * Runs via OffscreenCanvas when available (worker-safe), falls back to
   * a regular HTMLCanvasElement in browser main-thread contexts.
   */
  async apply(source: Blob, params: Edit): Promise<Blob> {
    const bitmap = await createImageBitmap(source);
    const { width, height } = bitmap;

    const canvas = this._createCanvas(width, height);
    const ctx = canvas.getContext("2d") as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!ctx) {
      bitmap.close();
      throw new Error("TransformService: failed to acquire canvas context");
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, width, height);
    this._applyLUT(imageData.data, buildLUT(params));
    ctx.putImageData(imageData, 0, 0);

    return this._canvasToBlob(canvas);
  }

  async previewOnCanvas(
    bitmap: ImageBitmap,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    params: Edit
  ): Promise<void> {
    const { width, height } = bitmap;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.drawImage(bitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, width, height);
    this._applyLUT(imageData.data, buildLUT(params));
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Convenience overload: accepts an HTMLImageElement or ImageBitmap URL
   * and returns an object URL for the transformed image.
   */
  async applyToFile(file: File, params: Edit): Promise<File> {
    const blob = await this.apply(file, params);
    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
      type: OUTPUT_FORMAT,
    });
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _createCanvas(
    width: number,
    height: number
  ): OffscreenCanvas | HTMLCanvasElement {
    if (typeof OffscreenCanvas !== "undefined") {
      return new OffscreenCanvas(width, height);
    }
    const el = document.createElement("canvas");
    el.width = width;
    el.height = height;
    return el;
  }

  /** Applies the RGB LUT in-place to a raw pixel buffer (RGBA interleaved). */
  private _applyLUT(
    data: Uint8ClampedArray,
    lut: { r: Uint8Array; g: Uint8Array; b: Uint8Array }
  ): void {
    const { r, g, b } = lut;
    const len = data.length;
    // Unrolled 4-byte stride — alpha (data[i+3]) is intentionally untouched
    for (let i = 0; i < len; i += 4) {
      data[i] = r[data[i]];
      data[i + 1] = g[data[i + 1]];
      data[i + 2] = b[data[i + 2]];
    }
  }

  private _canvasToBlob(
    canvas: OffscreenCanvas | HTMLCanvasElement
  ): Promise<Blob> {
    if (canvas instanceof OffscreenCanvas) {
      return canvas.convertToBlob({
        type: OUTPUT_FORMAT,
        quality: OUTPUT_QUALITY,
      });
    }
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        OUTPUT_FORMAT,
        OUTPUT_QUALITY
      );
    });
  }
}

const transformService = new TransformService();
export default transformService;
