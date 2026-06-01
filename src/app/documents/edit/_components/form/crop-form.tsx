"use client";

import { useCallback, useState, type RefObject } from "react";
import { useOpenCV } from "@/providers/opencv-provider";
import { Button, LoadingButton } from "@/components/ui/button";
import opencvService from "@/lib/services/opencv";

import type { CropOverlayRef } from "@/types/components/crop-overlay";

interface CropFormProps {
  overlayRef: RefObject<CropOverlayRef | null>;
  sourceImage: Blob;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  handleChangeEditingField: (field: "crop" | "adjustment") => Promise<void>;
}

export function CropForm({
  overlayRef,
  sourceImage,
  isProcessing,
  setIsProcessing,
  handleChangeEditingField,
}: CropFormProps) {
  const { cv, isLoading: cvLoading } = useOpenCV();
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [isAutoCropping, setIsAutoCropping] = useState<boolean>(false);

  const handleAutoCrop = useCallback(async () => {
    if (cvLoading || isProcessing || isCropping) return;

    setIsProcessing(true);
    setIsAutoCropping(true);
    const bitmap = await createImageBitmap(sourceImage);
    try {
      const contour = opencvService.calculatePerspective(cv, bitmap);
      if (contour.enabled) {
        overlayRef.current?.handleOnChange(contour.points);
      }
    } finally {
      bitmap.close();
      setIsProcessing(false);
      setIsAutoCropping(false);
    }
    // eslint-disable-next-line
  }, [cv, cvLoading, isProcessing, sourceImage, overlayRef]);

  const handleApplyCrop = useCallback(async () => {
    setIsProcessing(true);
    setIsCropping(true);
    try {
      await overlayRef.current?.handleApply();
      await handleChangeEditingField("adjustment");
    } finally {
      setIsProcessing(false);
      setIsCropping(false);
    }
    // eslint-disable-next-line
  }, [overlayRef, handleChangeEditingField]);

  const handleCancelCrop = useCallback(async () => {
    if (isProcessing || cvLoading || isCropping) return;

    setIsCropping(true);
    try {
      overlayRef.current?.handleCancel();
    } finally {
      setIsCropping(false);
    }
    await handleChangeEditingField("adjustment");
    // eslint-disable-next-line
  }, [overlayRef, handleChangeEditingField]);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="uppercase text-xs text-muted-foreground font-bold tracking-wide">
          Crop
        </h2>
        <LoadingButton
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAutoCrop}
          isLoading={isAutoCropping}
          disabled={isProcessing || cvLoading}
        >
          Auto
        </LoadingButton>
      </div>

      <div className="flex items-center gap-2">
        <LoadingButton
          type="button"
          size="sm"
          variant="outline"
          onClick={handleApplyCrop}
          isLoading={isCropping}
          disabled={isProcessing || cvLoading}
        >
          Apply
        </LoadingButton>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={handleCancelCrop}
          disabled={isProcessing || cvLoading}
        >
          Cancel
        </Button>
      </div>
    </>
  );
}
