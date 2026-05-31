import type { Point } from "@/types/edit";

export function getImageBounds(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap
): { width: number; height: number; x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const canvasAspect = bitmap.width / bitmap.height;
  const containerAspect = rect.width / rect.height;

  let width = rect.width;
  let height = rect.height;

  if (canvasAspect > containerAspect) {
    height = rect.width / canvasAspect;
  } else {
    width = rect.height * canvasAspect;
  }

  return {
    x: (rect.width - width) / 2,
    y: (rect.height - height) / 2,
    width,
    height,
  };
}

export function imageToDisplay(
  point: Point,
  imageSize: { width: number; height: number },
  bounds: { width: number; height: number; x: number; y: number }
): Point {
  return {
    x: bounds.x + (point.x / imageSize.width) * bounds.width,
    y: bounds.y + (point.y / imageSize.height) * bounds.height,
  };
}

export function displayToImage(
  point: { x: number; y: number },
  imageSize: { width: number; height: number },
  bounds: { width: number; height: number; x: number; y: number }
): { x: number; y: number } {
  return {
    x: Math.round(((point.x - bounds.x) / bounds.width) * imageSize.width),
    y: Math.round(((point.y - bounds.y) / bounds.height) * imageSize.height),
  };
}
