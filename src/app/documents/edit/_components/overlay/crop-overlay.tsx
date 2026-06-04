"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useAsRef } from "@/hooks/use-as-ref";
import { useController } from "react-hook-form";
import { useOpenCV } from "@/providers/opencv-provider";
import transformService from "@/lib/services/transform";
import imageService from "@/lib/services/image";
import pageService from "@/lib/services/page";

import type { RefObject } from "react";
import type { FourPoints, Edit, Point } from "@/types/edit";
import type { Control } from "react-hook-form";
import type { CropOverlayControl } from "@/types/components/crop-overlay";
import type { EditedImage } from "@/types/page";

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const HANDLE_RADIUS = 10;

function getDefaultPoints(): FourPoints {
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];
}

function buildQuadString(dp: Point[]): string {
  const [tl, tr, bl, br] = dp;
  return [tl, tr, br, bl].map((p) => `${p.x},${p.y}`).join(" ");
}

function getImageBounds(
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

function imageToDisplay(point: Point, bounds: Bounds): Point {
  return {
    x: bounds.x + point.x * bounds.width,
    y: bounds.y + point.y * bounds.height,
  };
}

function displayToImage(point: Point, bounds: Bounds): Point {
  return {
    x: (point.x - bounds.x) / bounds.width,
    y: (point.y - bounds.y) / bounds.height,
  };
}

function resolveInitialPoints(value: Edit["perspectiveCrop"]): FourPoints {
  return value.enabled ? [...value.points] : getDefaultPoints();
}

export function CropOverlay({
  ref,
  canvasRef,
  pageId,
  show,
  sourceImage,
  control,
  handleUpdateEditedImage,
}: {
  ref: RefObject<CropOverlayControl | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  pageId: number;
  show: boolean;
  sourceImage: Blob;
  control: Control<Edit>;
  handleUpdateEditedImage: (editedImage: EditedImage) => void;
}) {
  const { cv } = useOpenCV();

  const svgRef = useRef<SVGSVGElement>(null);
  const draggingIndex = useRef<number | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  const pointsRef = useRef<FourPoints | null>(null);
  const displayPointsRef = useRef<Point[] | null>(null);
  const isUnsavedRef = useRef<boolean>(false);

  const hitAreaRefs = useRef<(SVGCircleElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const handleCircleRefs = useRef<(SVGCircleElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const outlineRef = useRef<SVGPolygonElement | null>(null);
  const maskPolygonRef = useRef<SVGPolygonElement | null>(null);

  const [displayPoints, setDisplayPoints] = useState<Point[] | null>(null);

  const { field: perspectiveCrop } = useController({
    control,
    name: "perspectiveCrop",
  });
  const { value: perspectiveCropValue, onChange: setPerspectiveCropValue } =
    perspectiveCrop;

  const perspectiveCropValueRef = useAsRef(perspectiveCropValue);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    function handleResize() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!canvasRef.current || !bitmapRef.current) return;

        const bounds = getImageBounds(canvasRef.current, bitmapRef.current);
        const initial = resolveInitialPoints(perspectiveCropValueRef.current!);
        const initialDisplay = initial.map((p) => imageToDisplay(p, bounds));

        displayPointsRef.current = initialDisplay;
        setDisplayPoints(initialDisplay);
      }, 150);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    let bitmap: ImageBitmap | null = null;

    async function load() {
      if (cancelled || !canvasRef.current) return;

      bitmap = await createImageBitmap(sourceImage);
      bitmapRef.current = bitmap;

      const bounds = getImageBounds(canvasRef.current, bitmap);

      const initial = resolveInitialPoints(perspectiveCropValueRef.current);
      const initialDisplay = initial.map((p) => imageToDisplay(p, bounds));
      if (cancelled) return;

      pointsRef.current = initial;
      displayPointsRef.current = initialDisplay;
      setDisplayPoints(initialDisplay);
    }

    load();

    return () => {
      cancelled = true;
      bitmap?.close();
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, sourceImage]);

  const handleApply = useCallback(async () => {
    if (
      !pointsRef.current ||
      !bitmapRef.current ||
      !isUnsavedRef.current ||
      !cv
    )
      return;

    setPerspectiveCropValue({ enabled: true, points: pointsRef.current });

    const warpedImage = await transformService.generateWarped(
      cv,
      bitmapRef.current,
      pointsRef.current
    );

    const { width, height } =
      await imageService.getImageDimensions(warpedImage);

    const editedImage = await imageService.generateEditedImage(
      warpedImage,
      width,
      height
    );
    await pageService.updateEditedImage(pageId, editedImage);
    handleUpdateEditedImage(editedImage);
  }, [
    cv,
    bitmapRef,
    pointsRef,
    setPerspectiveCropValue,
    handleUpdateEditedImage,
    pageId,
  ]);

  const handleCancel = useCallback(() => {
    if (!canvasRef.current || !bitmapRef.current || !isUnsavedRef.current)
      return;

    const bounds = getImageBounds(canvasRef.current, bitmapRef.current);
    const initial = resolveInitialPoints(perspectiveCropValueRef.current);
    const initialDisplay = initial.map((p) => imageToDisplay(p, bounds));

    pointsRef.current = initial;
    displayPointsRef.current = initialDisplay;
    setDisplayPoints(initialDisplay);
    isUnsavedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnChange = useCallback(
    (points: FourPoints) => {
      if (!displayPointsRef.current || !canvasRef.current || !bitmapRef.current)
        return;

      const bounds = getImageBounds(canvasRef.current, bitmapRef.current);
      pointsRef.current = points;

      const displayPoints = points.map((p) => imageToDisplay(p, bounds));
      displayPointsRef.current = displayPoints;
      setDisplayPoints(displayPoints);
      isUnsavedRef.current = true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleReset = useCallback(async () => {
    if (!canvasRef.current || !bitmapRef.current) return;

    const bounds = getImageBounds(canvasRef.current, bitmapRef.current);
    const initialDisplay = getDefaultPoints().map((p) =>
      imageToDisplay(p, bounds)
    );

    pointsRef.current = null;
    displayPointsRef.current = initialDisplay;
    setDisplayPoints(initialDisplay);
    setPerspectiveCropValue({ enabled: false });

    const { width, height } =
      await imageService.getImageDimensions(sourceImage);

    const editedImage = await imageService.generateEditedImage(
      sourceImage,
      width,
      height
    );
    await pageService.updateEditedImage(pageId, editedImage);
    handleUpdateEditedImage(editedImage);
    isUnsavedRef.current = false;
  }, [
    canvasRef,
    setPerspectiveCropValue,
    handleUpdateEditedImage,
    pageId,
    sourceImage,
  ]);

  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent<SVGCircleElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingIndex.current = index;
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const idx = draggingIndex.current;
      if (idx === null) return;

      const canvas = canvasRef.current;
      const bitmap = bitmapRef.current;
      const svg = svgRef.current;
      if (
        !canvas ||
        !bitmap ||
        !svg ||
        !pointsRef.current ||
        !displayPointsRef.current
      )
        return;

      const svgRect = svg.getBoundingClientRect();
      const bounds = getImageBounds(canvas, bitmap);

      const raw = displayToImage(
        { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top },
        bounds
      );

      const clamped = {
        x: Math.max(0, Math.min(1, raw.x)),
        y: Math.max(0, Math.min(1, raw.y)),
      };

      const dp = imageToDisplay(clamped, bounds);

      pointsRef.current[idx] = clamped;
      displayPointsRef.current[idx] = dp;

      hitAreaRefs.current[idx]?.setAttribute("cx", String(dp.x));
      hitAreaRefs.current[idx]?.setAttribute("cy", String(dp.y));
      handleCircleRefs.current[idx]?.setAttribute("cx", String(dp.x));
      handleCircleRefs.current[idx]?.setAttribute("cy", String(dp.y));

      const quad = buildQuadString(displayPointsRef.current);
      outlineRef.current?.setAttribute("points", quad);
      maskPolygonRef.current?.setAttribute("points", quad);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handlePointerUp = useCallback(() => {
    if (draggingIndex.current === null) return;
    draggingIndex.current = null;

    if (displayPointsRef.current) {
      setDisplayPoints([...displayPointsRef.current]);
      isUnsavedRef.current = true;
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      handleApply,
      handleCancel,
      handleOnChange,
      handleReset,
    }),
    [handleApply, handleCancel, handleOnChange, handleReset]
  );

  if (!displayPoints || !show) return null;

  const quadPoints = buildQuadString(displayPoints);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full z-10"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <defs>
        <mask id="crop-mask">
          <rect width="100%" height="100%" fill="white" />
          <polygon
            ref={(el) => {
              maskPolygonRef.current = el;
            }}
            points={quadPoints}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="black"
        fillOpacity={0.5}
        mask="url(#crop-mask)"
        style={{ pointerEvents: "none" }}
      />
      <polygon
        ref={(el) => {
          outlineRef.current = el;
        }}
        points={quadPoints}
        fill="none"
        stroke="white"
        strokeWidth={1.5}
        strokeDasharray="6 3"
        style={{ pointerEvents: "none" }}
      />
      {displayPoints.map((p, i) => (
        <g key={i}>
          <circle
            ref={(el) => {
              hitAreaRefs.current[i] = el;
            }}
            cx={p.x}
            cy={p.y}
            r={HANDLE_RADIUS + 10}
            fill="transparent"
            style={{ cursor: "grab" }}
            onPointerDown={(e) => handlePointerDown(i, e)}
          />
          <circle
            ref={(el) => {
              handleCircleRefs.current[i] = el;
            }}
            cx={p.x}
            cy={p.y}
            r={HANDLE_RADIUS}
            fill="white"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={1.5}
            style={{ pointerEvents: "none" }}
          />
        </g>
      ))}
    </svg>
  );
}
