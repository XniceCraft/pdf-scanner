"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useController } from "react-hook-form";
import { useAsRef } from "@/hooks/use-as-ref";
import { useOpenCV } from "@/providers/opencv-provider";
import {
  getImageBounds,
  imageToDisplay,
  displayToImage,
} from "@/lib/utils/crop-overlay";
import transformService from "@/lib/services/transform";
import imageService from "@/lib/services/image";
import pageService from "@/lib/services/page";

import type { RefObject } from "react";
import type { Edit, PerspectiveCrop, Point } from "@/types/edit";
import type { Control } from "react-hook-form";
import type { CropOverlayRef } from "@/types/components/crop-overlay";
import type { EditedImage } from "@/types/page";

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
  ref,
  canvasRef,
  pageId,
  enabled,
  sourceImage,
  initialCrop,
  control,
  handleUpdateEditedImage,
}: {
  ref: RefObject<CropOverlayRef | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  pageId: number;
  enabled: boolean;
  sourceImage: Blob;
  initialCrop: PerspectiveCrop;
  control: Control<Edit>;
  handleUpdateEditedImage: (editedImage: EditedImage) => void;
}) {
  const { cv, isLoading: cvLoading } = useOpenCV();

  const cvRef = useAsRef(cv);
  const cvLoadingRef = useAsRef(cvLoading);

  const svgRef = useRef<SVGSVGElement>(null);
  const draggingIndex = useRef<number | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  const pointsRef = useRef<FourPoints | null>(null);
  const displayPointsRef = useRef<Point[] | null>(null);
  const defaultDisplayRef = useRef<Point[] | null>(null);

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

  useEffect(() => {
    ref.current = {
      handleApply: async () => {
        if (!pointsRef.current || cvLoadingRef.current) return;

        const bm = bitmapRef.current;
        if (!bm) return;

        perspectiveCrop.onChange({ enabled: true, points: pointsRef.current });

        const warpedImage = await transformService.generateWarped(
          cvRef.current!,
          bm,
          pointsRef.current
        );

        const editedImage = await imageService.generateEditedImage(
          warpedImage,
          bm.width,
          bm.height
        );

        await pageService.updateEditedImage(pageId, editedImage);
        handleUpdateEditedImage(editedImage);
      },

      handleCancel: () => {
        pointsRef.current = null;
        displayPointsRef.current = defaultDisplayRef.current;
        setDisplayPoints(defaultDisplayRef.current);
        perspectiveCrop.onChange({ enabled: false });
      },

      handleOnChange: (points: FourPoints) => {
        if (!displayPointsRef.current) return;

        pointsRef.current = points;

        const canvas = canvasRef.current;
        const bm = bitmapRef.current;
        if (!canvas || !bm) return;

        const bounds = getImageBounds(canvas, bm);
        const size = { width: bm.width, height: bm.height };

        displayPointsRef.current = points.map((p) =>
          imageToDisplay(p, size, bounds)
        );
        setDisplayPoints([...displayPointsRef.current]);
      },
    };

    const canvas = canvasRef.current;
    if (!canvas) return;

    async function load() {
      const bitmap = await createImageBitmap(sourceImage);
      bitmapRef.current = bitmap;

      const bounds = getImageBounds(canvas!, bitmap);
      const size = { width: bitmap.width, height: bitmap.height };

      const initial = initialCrop.enabled
        ? initialCrop.points
        : getDefaultPoints(bitmap);
      const initialDisplay = initial.map((p) =>
        imageToDisplay(p, size, bounds)
      );

      pointsRef.current = initial;
      displayPointsRef.current = initialDisplay;
      defaultDisplayRef.current = initialDisplay;
      setDisplayPoints(initialDisplay);
    }

    load();

    return () => {
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
    // eslint-disable-next-line
  }, [pageId, sourceImage, initialCrop]);

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
    [canvasRef]
  );

  const handlePointerUp = useCallback(() => {
    if (draggingIndex.current === null) return;
    draggingIndex.current = null;
    if (displayPointsRef.current) {
      setDisplayPoints([...displayPointsRef.current]);
    }
  }, []);

  if (!displayPoints || !enabled) return null;

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
