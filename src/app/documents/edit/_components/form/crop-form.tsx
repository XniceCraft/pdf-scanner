"use client";

import { useController, type Control } from "react-hook-form";
import { useOpenCV } from "@/providers/opencv-provider";
import { LoadingButton } from "@/components/ui/button";
import imageService from "@/lib/services/image";
import transformService from "@/lib/services/transform";
import opencvService from "@/lib/services/opencv";
import pageService from "@/lib/services/page";

import type { Edit } from "@/types/edit";
import type { EditedImage } from "@/types/page";

interface CropFormProps {
  pageId: number;
  control: Control<Edit>;
  sourceImage: Blob;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  handleUpdateEditedImage: (editedImage: EditedImage) => void;
}

export function CropForm({
  pageId,
  control,
  sourceImage,
  isProcessing,
  setIsProcessing,
  handleUpdateEditedImage,
}: CropFormProps) {
  const { cv, isLoading: cvLoading } = useOpenCV();
  const { field: perspectiveField } = useController({
    control,
    name: "perspectiveCrop",
  });
  const handleAutoCrop = async () => {
    if (cvLoading || isProcessing) return;

    setIsProcessing(true);
    try {
      const bitmap = await createImageBitmap(sourceImage);
      const contour = opencvService.calculatePerspective(cv, bitmap);
      if (!contour.enabled) {
        bitmap.close();
        return;
      }

      const warpedImage = await transformService.generateWarped(
        cv,
        bitmap,
        contour.points
      );

      const editedImage = await imageService.generateEditedImage(
        warpedImage,
        bitmap.width,
        bitmap.height
      );
      bitmap.close();

      await pageService.updateEditedImage(pageId, editedImage);
      handleUpdateEditedImage(editedImage);
      perspectiveField.onChange(contour);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <h2 className="uppercase text-xs text-muted-foreground font-bold tracking-wide">
        Crop
      </h2>
      <div className="flex items-center relative">
        <LoadingButton
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAutoCrop}
          isLoading={isProcessing || cvLoading}
        >
          Apply
        </LoadingButton>
        <LoadingButton
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAutoCrop}
          isLoading={isProcessing || cvLoading}
        >
          Auto
        </LoadingButton>
      </div>
    </>
  );
}
