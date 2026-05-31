"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getImageBounds,
  imageToDisplay,
  displayToImage,
} from "@/lib/utils/crop-overlay";

import type { RefObject } from "react";
import type { PerspectiveCrop, Point } from "@/types/edit";

type FourPoints = Extract<PerspectiveCrop, { enabled: true }>["points"];

const HANDLE_RADIUS = 10;

function getDefaultPoints(bitmap: ImageBitmap): FourPoints {
  const { width, height } = bitmap;
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height },
    { x: width, y: height },
  ];
}

function buildQuadString(dp: Point[]): string {
  const [tl, tr, bl, br] = dp;
  return [tl, tr, br, bl].map((p) => `${p.x},${p.y}`).join(" ");
}

export function CropOverlay({
  bitmapRef,
  canvasRef,
  initialCrop,
  enabled,
  onApply,
  onCancel,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  bitmapRef: RefObject<ImageBitmap | null>;
  initialCrop: PerspectiveCrop;
  enabled: boolean;
  onApply: (points: FourPoints) => void;
  onCancel: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingIndex = useRef<number | null>(null);

  const pointsRef = useRef<FourPoints | null>(null);
  const displayPointsRef = useRef<Point[] | null>(null);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const bm = bitmapRef.current;
    if (!canvas || !bm) return;

    const bounds = getImageBounds(canvas, bm);
    const size = { width: bm.width, height: bm.height };

    const initial = initialCrop.enabled
      ? initialCrop.points
      : getDefaultPoints(bm);
    const initialDisplay = initial.map((p) => imageToDisplay(p, size, bounds));

    pointsRef.current = initial;
    displayPointsRef.current = initialDisplay;
    setDisplayPoints(initialDisplay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent<SVGCircleElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingIndex.current = index;
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (draggingIndex.current === null) return;
      const canvas = canvasRef.current;
      const bm = bitmapRef.current;
      if (!canvas || !bm || !svgRef.current) return;
      if (!pointsRef.current || !displayPointsRef.current) return;

      const svgRect = svgRef.current.getBoundingClientRect();
      const bounds = getImageBounds(canvas, bm);
      const size = { width: bm.width, height: bm.height };

      const raw = displayToImage(
        { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top },
        size,
        bounds
      );

      const clamped = {
        x: Math.max(0, Math.min(bm.width, raw.x)),
        y: Math.max(0, Math.min(bm.height, raw.y)),
      };

      const dp = imageToDisplay(clamped, size, bounds);
      const idx = draggingIndex.current;

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
    [canvasRef, bitmapRef]
  );

  const handlePointerUp = useCallback(() => {
    if (draggingIndex.current === null) return;
    draggingIndex.current = null;

    if (displayPointsRef.current) {
      setDisplayPoints([...displayPointsRef.current]);
    }
  }, []);

  const handleApply = useCallback(() => {
    if (pointsRef.current) onApply(pointsRef.current);
  }, [onApply]);

  const handleCancel = useCallback(() => {
    onCancel();
    setDisplayPoints(null);
    pointsRef.current = null;
    displayPointsRef.current = null;
  }, [onCancel]);

  if (!displayPoints) return null;

  const quadPoints = buildQuadString(displayPoints);

  if (!enabled) return null;

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
