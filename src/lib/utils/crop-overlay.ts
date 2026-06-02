import type { Point } from "@/types/edit";

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getImageBounds(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap
): Bounds {
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

export function imageToDisplay(point: Point, bounds: Bounds): Point {
  return {
    x: bounds.x + point.x * bounds.width,
    y: bounds.y + point.y * bounds.height,
  };
}

export function displayToImage(point: Point, bounds: Bounds): Point {
  return {
    x: (point.x - bounds.x) / bounds.width,
    y: (point.y - bounds.y) / bounds.height,
  };
}
