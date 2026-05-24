"use client";

import { useDebounceCallback } from "@/hooks/use-debouce-callback";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SliderField } from "../field/slider-field";
import { rawReturn } from "mutative";
import { editSchema } from "@/lib/validations/page";
import { zodResolver } from "@hookform/resolvers/zod";
import pageService from "@/lib/services/page";
import transformService from "@/lib/services/transform";

import type { Document as DocumentType } from "@/types/document";
import type { Page } from "@/types/page";
import type { Updater } from "use-mutative";
import type { z } from "zod";

const DEFAULT_EDIT_VALUES = {
  black: 0,
  brightness: 0,
  contrast: 0,
  highlight: 0,
  rotation: 0,
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

  const { control, subscribe, reset } = useForm<z.infer<typeof editSchema>>({
    defaultValues: DEFAULT_EDIT_VALUES,
    resolver: zodResolver(editSchema),
    values: page.edit,
  });

  const debouncedCallback = useDebounceCallback(
    async (values: z.infer<typeof editSchema>) => {
      if (!bitmapRef.current || !canvasRef.current) return;

      await transformService.previewOnCanvas(
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
    async function showPreview() {
      if (!canvasRef.current) return;

      const bm = await createImageBitmap(page.image.source);
      bitmapRef.current?.close();
      bitmapRef.current = bm;

      if (canvasRef.current) {
        await transformService.previewOnCanvas(
          bm,
          canvasRef.current,
          page.edit
        );
      }
    }

    showPreview();
    return () => bitmapRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  return (
    <div className="flex flex-row overflow-hidden h-full">
      <div className="bg-neutral-900 overflow-y-auto flex items-center justify-center p-2 w-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        ></canvas>
      </div>

      <ScrollArea
        type="always"
        className="w-80 bg-muted/30 border-l border-border flex-col p-6 hidden lg:flex"
      >
        <form className="space-y-4 flex-1">
          <h2 className="uppercase text-xs text-muted-foreground font-bold tracking-wide">
            Color
          </h2>
          <SliderField
            control={control}
            name="temperature"
            label="Temperature"
            min={-100}
            max={100}
            step={1}
          />
          <SliderField
            control={control}
            name="tint"
            label="Tint"
            min={-100}
            max={100}
            step={1}
          />
          <Separator className="my-6" />
          <h2 className="uppercase text-xs text-muted-foreground font-bold tracking-wide">
            Lightness
          </h2>
          <SliderField
            control={control}
            name="brightness"
            label="Brightness"
            min={-100}
            max={100}
            step={1}
          />
          <SliderField
            control={control}
            name="contrast"
            label="Contrast"
            min={-100}
            max={100}
            step={1}
          />
          <SliderField
            control={control}
            name="highlight"
            label="Hightlight"
            min={-100}
            max={100}
            step={1}
          />
          <SliderField
            control={control}
            name="shadow"
            label="Shadow"
            min={-100}
            max={100}
            step={1}
          />
          <SliderField
            control={control}
            name="white"
            label="White"
            min={-100}
            max={100}
            step={1}
          />
          <SliderField
            control={control}
            name="black"
            label="Black"
            min={-100}
            max={100}
            step={1}
          />
          <Separator className="my-6" />
          <Button
            type="button"
            variant="outline"
            onClick={() => reset(DEFAULT_EDIT_VALUES)}
          >
            Reset
          </Button>
        </form>
      </ScrollArea>
    </div>
  );
}
