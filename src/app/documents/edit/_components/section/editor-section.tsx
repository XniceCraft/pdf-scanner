"use client";

import { useDebounceCallback } from "@/hooks/use-debounce-callback";
import { useCallback, useEffect, useRef } from "react";
import { useOpenCV } from "@/providers/opencv-provider";
import { useForm } from "react-hook-form";
import { upsertEditSchema } from "@/lib/validations/edit";
import { zodResolver } from "@hookform/resolvers/zod";
import imageService from "@/lib/services/image";
import pageService from "@/lib/services/page";
import transformService from "@/lib/services/transform";

import type { z } from "zod/mini";
import type { Edit } from "@/types/edit";
import type { EditedImage } from "@/types/page";
import { ControlSection } from "./control-section";

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
  pageId,
  pageEdit,
  pageSourceImage,
  pageEditedImage,
  handleUpdateEdit,
  handleUpdateEditedImage,
}: {
  pageId: number;
  pageSourceImage: Blob;
  pageEditedImage: Blob;
  pageEdit: Edit;
  handleUpdateEdit: (edit: Edit) => void;
  handleUpdateEditedImage: (editedImage: EditedImage) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  const { cv, isLoading: cvLoading } = useOpenCV();
  const { control, subscribe, reset, getValues } = useForm<
    z.infer<typeof upsertEditSchema>
  >({
    defaultValues: DEFAULT_EDIT_VALUES,
    resolver: zodResolver(upsertEditSchema),
    values: pageEdit,
  });

  const handleUpdateBitmap = useCallback(
    async (useEdited?: boolean) => {
      if (!canvasRef.current) return;

      const bitmap = await createImageBitmap(
        useEdited ? pageEditedImage : pageSourceImage
      );
      bitmapRef.current?.close();
      bitmapRef.current = bitmap;
    },
    [pageEditedImage, pageSourceImage]
  );

  const debouncedCallback = useDebounceCallback(
    async (values: z.infer<typeof upsertEditSchema>) => {
      if (!bitmapRef.current || !canvasRef.current || cvLoading) return;

      transformService.renderToCanvas(
        cv,
        bitmapRef.current,
        canvasRef.current,
        values
      );

      handleUpdateEdit(values);
      await pageService.updateEdit(pageId, values);
    },
    500
  );

  const handleReset = useCallback(async () => {
    const editedImage =
      await imageService.generateEditedImageFromLarge(pageSourceImage);
    await pageService.resetEdit(pageId, editedImage);
    handleUpdateEditedImage(editedImage);

    handleUpdateEdit(DEFAULT_EDIT_VALUES);
    reset(DEFAULT_EDIT_VALUES);

    await handleUpdateBitmap();

    if (!bitmapRef.current || !canvasRef.current || cvLoading) return;

    transformService.renderToCanvas(
      cv,
      bitmapRef.current,
      canvasRef.current,
      DEFAULT_EDIT_VALUES
    );
  }, [
    pageSourceImage,
    reset,
    cv,
    cvLoading,
    pageId,
    handleUpdateBitmap,
    handleUpdateEditedImage,
    handleUpdateEdit,
  ]);

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
    async function load() {
      await handleUpdateBitmap(getValues().perspectiveCrop.enabled);

      if (bitmapRef.current && canvasRef.current && !cvLoading) {
        transformService.renderToCanvas(
          cv,
          bitmapRef.current,
          canvasRef.current,
          pageEdit
        );
      }
    }

    load();

    return () => bitmapRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, cvLoading]);

  return (
    <div className="flex flex-row overflow-hidden h-full bg-neutral-900">
      <div className="overflow-y-auto flex items-start justify-center w-full">
        <canvas
          ref={canvasRef}
          className="relative w-full h-full object-contain"
        ></canvas>
      </div>

      <ControlSection
        pageId={pageId}
        control={control}
        bitmapRef={bitmapRef}
        handleReset={handleReset}
        handleUpdateEditedImage={handleUpdateEditedImage}
        handleUpdateBitmap={handleUpdateBitmap}
      />
    </div>
  );
}
