import type { EditedImage } from "@/types/page";

const DEFAULT_QUALITY = 0.85;
const OUTPUT_FORMAT = "image/webp";
type ImagePreset = "small" | "large";

const PRESET_WIDTHS: Record<ImagePreset, number> = {
  small: 500,
  large: 1000,
};

class ImageService {
  async compress(file: File, quality: number = DEFAULT_QUALITY): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: OUTPUT_FORMAT, quality });
    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
      type: OUTPUT_FORMAT,
    });
  }

  async compressBatch(
    files: File[],
    quality: number = DEFAULT_QUALITY
  ): Promise<File[]> {
    return Promise.all(files.map((file) => this.compress(file, quality)));
  }

  async getImageDimensions(
    source: Blob
  ): Promise<{ width: number; height: number }> {
    const bitmap = await createImageBitmap(source);
    const { width, height } = bitmap;
    bitmap.close();
    return { width, height };
  }

  async getImageDimensionsBatch(
    sources: Blob[]
  ): Promise<{ width: number; height: number }[]> {
    return Promise.all(
      sources.map((source) => this.getImageDimensions(source))
    );
  }

  async resize(
    source: Blob,
    originalWidth: number,
    originalHeight: number,
    preset: ImagePreset
  ): Promise<Blob> {
    const targetWidth = PRESET_WIDTHS[preset];
    const targetHeight = Math.round(
      (originalHeight / originalWidth) * targetWidth
    );

    const bitmap = await createImageBitmap(source, {
      resizeWidth: targetWidth,
      resizeHeight: targetHeight,
      resizeQuality: "high",
    });

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    return canvas.convertToBlob({
      type: OUTPUT_FORMAT,
      quality: DEFAULT_QUALITY,
    });
  }

  async generateEditedImage(
    source: Blob,
    width: number,
    height: number
  ): Promise<EditedImage> {
    return Promise.all([
      this.resize(source, width, height, "small"),
      this.resize(source, width, height, "large"),
    ]).then(([small, large]) => ({
      small,
      large,
    }));
  }

  async generateEditedImageFromLarge(largeImage: Blob) {
    const largeImageDimensions = await this.getImageDimensions(largeImage);

    return await this.generateEditedImage(
      largeImage,
      largeImageDimensions.width,
      largeImageDimensions.height
    );
  }

  async generateOriginalThumbnail(originalImage: Blob) {
    const originalDimensions = await this.getImageDimensions(originalImage);

    return await this.resize(
      originalImage,
      originalDimensions.width,
      originalDimensions.height,
      "large"
    );
  }
}

const imageService = new ImageService();
export default imageService;
