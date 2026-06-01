"use client";

import { Button } from "@/components/ui/button";
import { CropIcon, RotateCcwIcon, SlidersHorizontalIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CropForm } from "../form/crop-form";
import { AdjustmentForm } from "../form/adjustment-form";
import { type RefObject, useState } from "react";

import type { Control } from "react-hook-form";
import type { Edit } from "@/types/edit";
import type { CropOverlayRef } from "@/types/components/crop-overlay";

export function ControlSection({
  control,
  overlayRef,
  sourceImage,
  handleReset,
  editingField,
  handleChangeEditingField,
}: {
  control: Control<Edit>;
  overlayRef: RefObject<CropOverlayRef | null>;
  sourceImage: Blob;
  handleReset: () => Promise<void>;
  editingField: "crop" | "adjustment";
  handleChangeEditingField: (field: "crop" | "adjustment") => Promise<void>;
}) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  return (
    <>
      <aside className="flex-col items-center hidden gap-3 lg:flex p-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleReset}
          disabled={isProcessing}
        >
          <RotateCcwIcon />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={isProcessing}
          onClick={() =>
            handleChangeEditingField(
              editingField === "crop" ? "adjustment" : "crop"
            )
          }
        >
          {editingField === "crop" ? <SlidersHorizontalIcon /> : <CropIcon />}
        </Button>
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
              handleChangeEditingField={handleChangeEditingField}
            />
          )}
        </form>
      </ScrollArea>
    </>
  );
}
