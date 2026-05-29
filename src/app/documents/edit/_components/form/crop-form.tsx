"use client";

import { useController, type Control } from "react-hook-form";
import { useOpenCV } from "@/providers/opencv-provider";
import { Button } from "@/components/ui/button";
import { rawReturn } from "mutative";
import imageService from "@/lib/services/image";
import transformService from "@/lib/services/transform";
import opencvService from "@/lib/services/opencv";
import pageService from "@/lib/services/page";

import type { Edit } from "@/types/edit";
import type { RefObject } from "react";
import type { Updater } from "use-mutative";
import type { Document as DocumentType } from "@/types/document";

interface CropFormProps {
  pageId: number;
  control: Control<Edit>;
  documentAction: Updater<DocumentType<true> | null>;
  bitmapRef: RefObject<ImageBitmap | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function CropForm({
  pageId,
  control,
  documentAction,
  bitmapRef,
  canvasRef,
}: CropFormProps) {
  const { cv, isLoading } = useOpenCV();
  const { field: perspectiveField } = useController({
    control,
    name: "perspectiveCrop",
  });

  const handleAutoCrop = async () => {
    if (isLoading || !canvasRef.current || !bitmapRef.current) return;

    const contour = opencvService.calculatePerspective(
      cv,
      bitmapRef.current,
      canvasRef.current
    );
    if (!contour.enabled) return;

    const warpedImage = await transformService.generateWarped(
      cv,
      bitmapRef.current,
      contour.points
    );
    const bitmap = await createImageBitmap(warpedImage);
    const editedImage = await imageService.generateEditedImage(
      warpedImage,
      bitmap.width,
      bitmap.height
    );
    bitmap.close();
    const updatedEditedImage = await pageService.updateEditedImage(
      pageId,
      editedImage
    );
    documentAction((prev) => {
      if (!prev) return rawReturn(undefined);

      const targetPage = prev.pages.find((p) => p.id === pageId);
      if (!targetPage) return rawReturn(undefined);

      targetPage.editedImage = updatedEditedImage;
    });
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
