"use client";

import { useController, type Control } from "react-hook-form";
import { useOpenCV } from "@/providers/opencv-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import imageService from "@/lib/services/image";
import transformService from "@/lib/services/transform";
import opencvService from "@/lib/services/opencv";
import pageService from "@/lib/services/page";

import type { Edit } from "@/types/edit";
import type { EditedImage } from "@/types/page";
import type { RefObject } from "react";

interface CropFormProps {
  pageId: number;
  control: Control<Edit>;
  handleUpdateEditedImage: (editedImage: EditedImage) => void;
  handleUpdateBitmap: (cropEnabled?: boolean) => Promise<void>;
  bitmapRef: RefObject<ImageBitmap | null>;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

export function CropForm({
  pageId,
  control,
  handleUpdateEditedImage,
  handleUpdateBitmap,
  bitmapRef,
  isProcessing,
  setIsProcessing,
}: CropFormProps) {
  const { cv, isLoading: cvLoading } = useOpenCV();
  const { field: perspectiveField } = useController({
    control,
    name: "perspectiveCrop",
  });
  const handleAutoCrop = async () => {
    if (cvLoading || isProcessing || !bitmapRef.current) return;

    setIsProcessing(true);
    try {
      const contour = opencvService.calculatePerspective(cv, bitmapRef.current);
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

      await pageService.updateEditedImage(pageId, editedImage);
      handleUpdateEditedImage(editedImage);
      await handleUpdateBitmap(true);
      perspectiveField.onChange(contour);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-between relative">
      <h2 className="uppercase text-xs text-muted-foreground font-bold tracking-wide">
        Crop
      </h2>
      {!cvLoading && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAutoCrop}
          disabled={isProcessing}
        >
          {isProcessing && <Spinner />}
          Auto
        </Button>
      )}
    </div>
  );
}
