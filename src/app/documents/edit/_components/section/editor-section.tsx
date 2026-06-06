"use client";

import { useDebounceCallback } from "@/hooks/use-debounce-callback";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { upsertEditSchema } from "@/lib/validations/edit";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControlSection } from "./control-section";
import { CropOverlay } from "../overlay/crop-overlay";
import imageService from "@/lib/services/image";
import pageService from "@/lib/services/page";
import transformService from "@/lib/services/transform";

import type { z } from "zod/mini";
import type { Edit } from "@/types/edit";
import type { EditedImage } from "@/types/page";
import type { CropOverlayControl } from "@/types/components/crop-overlay";

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
  handleUpdateEditedImage: handleUpdateEditedImageParent,
}: {
  pageId: number;
  pageSourceImage: Blob;
  pageEditedImage: Blob;
  pageEdit: Edit;
  handleUpdateEdit: (edit: Edit) => void;
  handleUpdateEditedImage: (editedImage: EditedImage) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceBitmapRef = useRef<ImageBitmap | null>(null);
  const editedBitmapRef = useRef<ImageBitmap | null>(null);
  const overlayRef = useRef<CropOverlayControl | null>(null);

  const [editingField, setEditingField] = useState<"crop" | "adjustment">(
    "adjustment"
  );

  const { control, subscribe, reset, getValues } = useForm<
    z.infer<typeof upsertEditSchema>
  >({
    defaultValues: DEFAULT_EDIT_VALUES,
    resolver: zodResolver(upsertEditSchema),
    values: pageEdit,
  });

  const handleUpdateEditedImage = useCallback(
    async (newImage: EditedImage) => {
      handleUpdateEditedImageParent(newImage);

      const bitmap = await createImageBitmap(newImage.large);
      editedBitmapRef.current?.close();
      editedBitmapRef.current = bitmap;
    },
    [handleUpdateEditedImageParent]
  );

  const handleChangeEditingField = useCallback(
    async (field: "crop" | "adjustment") => {
      setEditingField(field);

      if (
        !sourceBitmapRef.current ||
        !editedBitmapRef.current ||
        !canvasRef.current
      )
        return;

      transformService.renderToCanvas(
        field === "adjustment"
          ? editedBitmapRef.current
          : sourceBitmapRef.current,
        canvasRef.current,
        getValues()
      );
    },
    [getValues]
  );

  const debouncedCallback = useDebounceCallback(
    async (values: z.infer<typeof upsertEditSchema>) => {
      if (!editedBitmapRef.current || !canvasRef.current) return;

      if (editingField !== "crop")
        transformService.renderToCanvas(
          editedBitmapRef.current,
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

    if (sourceBitmapRef.current && canvasRef.current) {
      transformService.renderToCanvas(
        sourceBitmapRef.current,
        canvasRef.current,
        DEFAULT_EDIT_VALUES
      );
    }
  }, [
    pageSourceImage,
    reset,
    pageId,
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
    let cancelled = false;
    let sourceBitmap: ImageBitmap | null = null;
    let editedBitmap: ImageBitmap | null = null;

    async function load() {
      if (cancelled) return;

      sourceBitmap = await createImageBitmap(pageSourceImage);
      editedBitmap = await createImageBitmap(pageEditedImage);
      if (cancelled) {
        sourceBitmap?.close();
        editedBitmap?.close();
        return;
      }

      if (!canvasRef.current) return;

      sourceBitmapRef.current = sourceBitmap;
      editedBitmapRef.current = editedBitmap;
      transformService.renderToCanvas(
        pageEdit.perspectiveCrop.enabled ? editedBitmap : sourceBitmap,
        canvasRef.current,
        pageEdit
      );
    }

    load();
    return () => {
      sourceBitmap?.close();
      editedBitmap?.close();
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  return (
    <div className="flex flex-row overflow-hidden h-full bg-neutral-900">
      <div className="overflow-y-auto relative flex items-start justify-center w-full">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
        <CropOverlay
          ref={overlayRef}
          canvasRef={canvasRef}
          pageId={pageId}
          sourceImage={pageSourceImage}
          show={editingField === "crop"}
          control={control}
          handleUpdateEditedImage={handleUpdateEditedImage}
        />
      </div>

      <ControlSection
        control={control}
        overlayRef={overlayRef}
        sourceImage={pageSourceImage}
        editingField={editingField}
        handleChangeEditingField={handleChangeEditingField}
        handleReset={handleReset}
      />
    </div>
  );
}
