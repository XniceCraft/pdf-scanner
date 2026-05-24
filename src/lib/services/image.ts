const DEFAULT_QUALITY = 0.85;
const OUTPUT_FORMAT = "image/webp";

class ImageService {
  async compress(file: File, quality: number = DEFAULT_QUALITY): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Failed to compress image"));

          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".webp"),
            { type: OUTPUT_FORMAT }
          );
          resolve(compressed);
        },
        OUTPUT_FORMAT,
        quality
      );
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
    const bitmaps = await Promise.all(sources.map((s) => createImageBitmap(s)));
    const dimensions = bitmaps.map(({ width, height }) => ({ width, height }));
    bitmaps.forEach((b) => b.close());
    return dimensions;
  }
}

const imageService = new ImageService();
export default imageService;
