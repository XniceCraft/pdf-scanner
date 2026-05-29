"use client";

import { useController, type Control } from "react-hook-form";
import { useOpenCV } from "@/providers/opencv-provider";
import { Button } from "@/components/ui/button";
import opencvService from "@/lib/services/opencv";

import type { Edit } from "@/types/edit";
import type { RefObject } from "react";

interface CropFormProps {
  control: Control<Edit>;
  bitmapRef: RefObject<ImageBitmap | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function CropForm({ control, bitmapRef, canvasRef }: CropFormProps) {
  const { cv, isLoading } = useOpenCV();
  const { field: perspectiveField } = useController({
    control,
    name: "perspectiveCrop",
  });

  const handleAutoCrop = () => {
    if (isLoading || !canvasRef.current || !bitmapRef.current) return;

    const contour = opencvService.calculatePerspective(
      cv,
      bitmapRef.current,
      canvasRef.current
    );
    if (!contour) return;

    perspectiveField.onChange(contour);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="uppercase text-xs text-muted-foreground font-bold tracking-wide">
          Crop
        </h2>
        {!isLoading && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAutoCrop}
          >
            Auto
          </Button>
        )}
      </div>
    </>
  );
}
