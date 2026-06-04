"use client";

import { useCallback, useState, type RefObject } from "react";
import { Button, LoadingButton } from "@/components/ui/button";
import processorService from "@/lib/services/processor";

import type { CropOverlayControl } from "@/types/components/crop-overlay";

interface CropFormProps {
  overlayRef: RefObject<CropOverlayControl | null>;
  sourceImage: Blob;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  handleCancelCrop: () => Promise<void>;
  handleChangeEditingField: (field: "crop" | "adjustment") => Promise<void>;
}

export function CropForm({
  overlayRef,
  sourceImage,
  isProcessing,
  setIsProcessing,
  handleCancelCrop,
  handleChangeEditingField,
}: CropFormProps) {
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [isAutoCropping, setIsAutoCropping] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleAutoCrop = useCallback(async () => {
    setIsProcessing(true);
    setIsAutoCropping(true);

    const bitmap = await createImageBitmap(sourceImage);

    try {
      const contour = processorService.getEdge(bitmap);
      if (contour.enabled) {
        overlayRef.current?.handleOnChange(contour.points);
      }
    } finally {
      bitmap.close();
      setIsProcessing(false);
      setIsAutoCropping(false);
    }
  }, [sourceImage, overlayRef, setIsProcessing]);

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
  }, [overlayRef, handleChangeEditingField, setIsProcessing]);

  const handleResetCrop = useCallback(async () => {
    setIsResetting(true);

    try {
      await overlayRef.current?.handleReset();
    } finally {
      setIsResetting(false);
    }
  }, [overlayRef]);

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
          disabled={isProcessing}
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
          disabled={isProcessing}
        >
          Apply
        </LoadingButton>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={handleCancelCrop}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <LoadingButton
          type="button"
          size="sm"
          variant="outline"
          onClick={handleResetCrop}
          isLoading={isResetting}
          disabled={isProcessing}
        >
          Reset
        </LoadingButton>
      </div>
    </>
  );
}
