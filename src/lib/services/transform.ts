import type { Edit, PerspectiveCrop, Point } from "@/types/edit";
import type { Size } from "@/types/size";
import perspectiveRenderer from "@/lib/services/rendering/perspective-renderer";
import colorRenderer from "@/lib/services/rendering/color-renderer";

class TransformService {
  /**
   * Renders `bitmap` into `canvas` with all colour edits applied.
   *
   * @param bitmap Pre-perspective-warped source image.
   * @param canvas Target canvas; dimensions are set to match `bitmap`.
   * @param edit   Edit descriptor describing all colour adjustments to apply.
   */
  renderToCanvas(
    bitmap: ImageBitmap,
    canvas: HTMLCanvasElement,
    edit: Edit
  ): void {
    colorRenderer.render(bitmap, canvas, edit);
  }

  /**
   * Generates a perspective-corrected warp of `bitmap` for caching.
   *
   * Output dimensions are computed by {@link computeWarpSize} — identical to
   * the previous OpenCV implementation — and the warp is performed by
   * {@link perspectiveRenderer} via WebGL2 inverse homography mapping.
   *
   * @param bitmap Source image to warp.
   * @param points Normalised quad corners: [topLeft, topRight, bottomLeft, bottomRight].
   * @returns      A `image/webp` blob of the warped image at full quality.
   */
  async generateWarped(
    bitmap: ImageBitmap,
    points: Extract<PerspectiveCrop, { enabled: true }>["points"]
  ): Promise<Blob> {
    const size = this.computeWarpSize(points, {
      width: bitmap.width,
      height: bitmap.height,
    });

    const canvas = perspectiveRenderer.render(bitmap, points, size);

    const blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: 1,
    });
    if (!blob) throw new Error("convertToBlob failed");
    return blob;
  }

  /**
   * Exports a fully processed page into `canvas`.
   *
   * When perspective crop is enabled the bitmap is warped via
   * {@link perspectiveRenderer} before colour adjustments are applied by
   * {@link colorRenderer}. Canvas dimensions are set to match the output size.
   *
   * @param bitmap Source image; perspective-warped upstream when crop is disabled.
   * @param canvas Target canvas; dimensions are updated to reflect the output size.
   * @param edit   Edit descriptor describing crop and all colour adjustments.
   */
  async exportPage(
    bitmap: ImageBitmap,
    canvas: HTMLCanvasElement,
    edit: Edit
  ): Promise<void> {
    let source: ImageBitmap;

    if (edit.perspectiveCrop.enabled) {
      const size = this.computeWarpSize(edit.perspectiveCrop.points, {
        width: bitmap.width,
        height: bitmap.height,
      });

      const warpedCanvas = perspectiveRenderer.render(
        bitmap,
        edit.perspectiveCrop.points,
        size
      );

      source = await createImageBitmap(warpedCanvas);
    } else {
      source = bitmap;
    }

    try {
      colorRenderer.render(source, canvas, edit);
    } finally {
      if (edit.perspectiveCrop.enabled) source.close();
    }
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
