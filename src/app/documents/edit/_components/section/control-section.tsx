"use client";

import { Button } from "@/components/ui/button";
import { CropIcon, RotateCcwIcon, SlidersHorizontalIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CropForm } from "../form/crop-form";
import { AdjustmentForm } from "../form/adjustment-form";
import { type RefObject, useState } from "react";

import type { Control } from "react-hook-form";
import type { Edit } from "@/types/edit";
import type { EditedImage } from "@/types/page";

export function ControlSection({
  pageId,
  control,
  bitmapRef,
  handleReset,
  handleUpdateEditedImage,
  handleUpdateBitmap,
}: {
  pageId: number;
  control: Control<Edit>;
  bitmapRef: RefObject<ImageBitmap | null>;
  handleReset: () => Promise<void>;
  handleUpdateEditedImage: (editedImage: EditedImage) => void;
  handleUpdateBitmap: (cropEnabled?: boolean) => Promise<void>;
}) {
  const [editingField, setEditingField] = useState<"crop" | "adjustment">(
    "adjustment"
  );
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
            setEditingField((prev) => (prev === "crop" ? "adjustment" : "crop"))
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
              pageId={pageId}
              control={control}
              handleUpdateEditedImage={handleUpdateEditedImage}
              handleUpdateBitmap={handleUpdateBitmap}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              bitmapRef={bitmapRef}
            />
          )}
        </form>
      </ScrollArea>
    </>
  );
}
