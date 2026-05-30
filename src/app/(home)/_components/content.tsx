"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Controller, type SubmitErrorHandler, useForm } from "react-hook-form";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableFileItemField } from "./field/sortable-file-item-field";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { multipleImageValidation } from "@/lib/validations/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/mini";
import toast from "react-hot-toast";
import documentService from "@/lib/services/document";

const formSchema = z.object({
  images: multipleImageValidation,
});

export function Content() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      images: [],
    },
    resolver: zodResolver(formSchema),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onSubmit = useCallback(
    async (data: z.infer<typeof formSchema>) => {
      const name = new Date().toISOString().slice(0, 10);
      const id = await documentService.create({ name }, data.images);
      if (!id) toast.error("Failed to create document");

      router.push(`/documents?id=${id}`);
    },
    [router]
  );

  const onError: SubmitErrorHandler<z.infer<typeof formSchema>> = useCallback(
    (errors) => {
      toast.error(errors.images?.message ?? "Invalid images");
    },
    []
  );

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, onError)}
      className="flex-1 min-h-0"
    >
      <Controller
        name="images"
        control={form.control}
        render={({ field }) => {
          const fileIds = field.value.map((f) => f.name + f.size);

          function handleDragEnd(event: DragEndEvent) {
            const { active, over } = event;
            if (!over || active.id === over.id) return;

            const oldIndex = fileIds.indexOf(active.id as string);
            const newIndex = fileIds.indexOf(over.id as string);
            if (oldIndex === -1 || newIndex === -1) return;

            field.onChange(arrayMove(field.value, oldIndex, newIndex));
          }

          return (
            <FileUpload
              value={field.value}
              onValueChange={(files) => {
                const renamed = files.map((file) => {
                  // Only rename files that haven't been stamped yet
                  // (i.e. their name doesn't already contain our separator "_<ms>.")
                  const alreadyStamped = /._\d+\.[^.]+$/.test(file.name);
                  if (alreadyStamped) return file;

                  const dotIndex = file.name.lastIndexOf(".");
                  const hasExt = dotIndex !== -1 && dotIndex !== 0;
                  const baseName = hasExt
                    ? file.name.slice(0, dotIndex)
                    : file.name;
                  const ext = hasExt ? file.name.slice(dotIndex) : "";
                  const newName = `${baseName}_${Date.now()}${ext}`;
                  return new File([file], newName, { type: file.type });
                });
                field.onChange(renamed);
              }}
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="flex lg:flex-row flex-nowrap gap-6 h-full"
            >
              <FileUploadDropzone className="flex-1/2 border-dashed border-2 border-border bg-muted/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-muted/30 transition-colors min-h-96">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors group-hover:text-primary">
                  <FileUp className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-primary">
                  Drag &amp; Drop Documents
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mb-10">
                  Upload your PDF, JPG, or PNG files to start processing.
                  We&apos;ll automatically optimize every page for maximum
                  clarity.
                </p>
                <FileUploadTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-2 w-fit">
                    Browse files
                  </Button>
                </FileUploadTrigger>
              </FileUploadDropzone>

              <section className="flex-1/2 flex flex-col min-w-0">
                {form.formState.isDirty ? (
                  <>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={fileIds}
                        strategy={verticalListSortingStrategy}
                      >
                        <FileUploadList className="overflow-y-auto min-w-0">
                          {field.value.map((file) => {
                            const id = file.name + file.size;
                            return (
                              <SortableFileItemField
                                key={id}
                                file={file}
                                id={id}
                              />
                            );
                          })}
                        </FileUploadList>
                      </SortableContext>
                    </DndContext>
                    <Button
                      type="submit"
                      className="mt-2 w-full"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? "Scanning..." : "Scan"}
                    </Button>
                  </>
                ) : (
                  <div className="flex-1/2 flex flex-col items-center justify-center border-dashed border-2 border-border bg-muted/10 rounded-2xl p-4">
                    <h2 className="text-xl font-semibold mb-2">
                      No files added yet.
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Upload one or multiple images to start creating your PDF
                    </p>
                  </div>
                )}
              </section>
            </FileUpload>
          );
        }}
      />
    </form>
  );
}
