"use client";

import { Button } from "@/components/ui/button";
import { CropIcon, RotateCcwIcon, SlidersHorizontalIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CropForm } from "../form/crop-form";
import { AdjustmentForm } from "../form/adjustment-form";
import { type RefObject, useCallback, useState } from "react";

import type { Control } from "react-hook-form";
import type { Edit } from "@/types/edit";
import type { CropOverlayControl } from "@/types/components/crop-overlay";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ControlSection({
  control,
  overlayRef,
  sourceImage,
  handleReset,
  editingField,
  handleChangeEditingField,
}: {
  control: Control<Edit>;
  overlayRef: RefObject<CropOverlayControl | null>;
  sourceImage: Blob;
  handleReset: () => Promise<void>;
  editingField: "crop" | "adjustment";
  handleChangeEditingField: (field: "crop" | "adjustment") => Promise<void>;
}) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleCancelCrop = useCallback(async () => {
    overlayRef.current?.handleCancel();
    await handleChangeEditingField("adjustment");
  }, [overlayRef, handleChangeEditingField]);

  return (
    <>
      <aside className="flex-col items-center hidden gap-3 lg:flex p-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleReset}
              disabled={isProcessing}
            >
              <RotateCcwIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Reset Edit</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isProcessing}
              onClick={async () => {
                await handleCancelCrop();
                handleChangeEditingField("adjustment");
              }}
            >
              <SlidersHorizontalIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Adjustment</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isProcessing}
              onClick={() => handleChangeEditingField("crop")}
            >
              <CropIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Crop</p>
          </TooltipContent>
        </Tooltip>
      </aside>
      <ScrollArea
        type="always"
        className="w-80 bg-muted/50 border-l border-border flex-col p-6 hidden lg:flex"
      >
        <form className="space-y-4 flex-1">
          {editingField === "adjustment" && (
            <AdjustmentForm control={control} />
          )}
          {editingField === "crop" && (
            <CropForm
              overlayRef={overlayRef}
              sourceImage={sourceImage}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              handleCancelCrop={handleCancelCrop}
              handleChangeEditingField={handleChangeEditingField}
            />
          )}
        </form>
      </ScrollArea>
    </>
  );
}
