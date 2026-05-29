"use client";

import { useDebounceCallback } from "@/hooks/use-debounce-callback";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOpenCV } from "@/providers/opencv-provider";
import { useForm } from "react-hook-form";
import { AdjustmentForm } from "../form/adjustment-form";
import { Button } from "@/components/ui/button";
import { CropForm } from "../form/crop-form";
import { CropIcon, RotateCcwIcon, SlidersHorizontalIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { rawReturn } from "mutative";
import { upsertEditSchema } from "@/lib/validations/edit";
import { zodResolver } from "@hookform/resolvers/zod";
import pageService from "@/lib/services/page";
import transformService from "@/lib/services/transform";

import type { z } from "zod/mini";
import type { Document as DocumentType } from "@/types/document";
import type { Page } from "@/types/page";
import type { Updater } from "use-mutative";
import type { Edit } from "@/types/edit";

const DEFAULT_EDIT_VALUES: Edit = {
  preset: "original",
  perspectiveCrop: { enabled: false },
  rotation: 0,
  black: 0,
  brightness: 0,
  contrast: 0,
  highlight: 0,
  shadow: 0,
  temperature: 0,
  tint: 0,
  white: 0,
};

export function EditorSection({
  page,
  documentAction,
}: {
  documentAction: Updater<DocumentType<true> | null>;
  page: Page;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [editingField, setEditingField] = useState<"crop" | "adjustment">(
    "adjustment"
  );

  const { cv, isLoading: cvLoading } = useOpenCV();
  const { control, subscribe, reset } = useForm<
    z.infer<typeof upsertEditSchema>
  >({
    defaultValues: DEFAULT_EDIT_VALUES,
    resolver: zodResolver(upsertEditSchema),
    values: page.edit,
  });

  const debouncedCallback = useDebounceCallback(
    async (values: z.infer<typeof upsertEditSchema>) => {
      if (!bitmapRef.current || !canvasRef.current || cvLoading) return;

      transformService.renderToCanvas(
        cv,
        bitmapRef.current,
        canvasRef.current,
        values
      );

      documentAction((prev) => {
        if (!prev) return rawReturn(undefined);

        const targetPage = prev.pages.find((p) => p.id === page.id);
        if (!targetPage) return rawReturn(undefined);

        targetPage.edit = values;
      });
      await pageService.updateEdit(page.id, values);
    },
    500
  );

  const handleReset = useCallback(async () => {
    const editedImage = await pageService.resetEdit(page.id);
    documentAction((prev) => {
      if (!prev) return rawReturn(undefined);

      const targetPage = prev.pages.find((p) => p.id === page.id);
      if (!targetPage) return rawReturn(undefined);

      targetPage.editedImage = editedImage!;
    });
    reset(DEFAULT_EDIT_VALUES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, reset]);

  useEffect(() => {
    const cleanupSubscribe = subscribe({
      callback: ({ values }) => debouncedCallback(values),
      formState: {
        values: true,
      },
    });

    return () => cleanupSubscribe();
  }, [subscribe, debouncedCallback]);

  useEffect(() => {
    let bm: ImageBitmap | undefined;

    async function showPreview() {
      if (!canvasRef.current) return;

      bm = await createImageBitmap(page.editedImage.large);
      bitmapRef.current?.close();
      bitmapRef.current = bm;

      if (!cvLoading)
        transformService.renderToCanvas(cv, bm, canvasRef.current, page.edit);
    }

    showPreview();
    return () => {
      if (bm) bm.close();
      bitmapRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, page.editedImage.large, cvLoading]);

  return (
    <div className="flex flex-row overflow-hidden h-full bg-neutral-900">
      <div className="overflow-y-auto flex items-start justify-center w-full">
        <canvas
          ref={canvasRef}
          className="relative w-full h-full object-contain"
        ></canvas>
      </div>

      <aside className="flex-col items-center hidden gap-3 lg:flex p-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleReset}
        >
          <RotateCcwIcon />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
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
              pageId={page.id}
              control={control}
              documentAction={documentAction}
              bitmapRef={bitmapRef}
              canvasRef={canvasRef}
            />
          )}
        </form>
      </ScrollArea>
    </div>
  );
}
