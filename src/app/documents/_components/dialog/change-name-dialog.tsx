"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { rawReturn } from "mutative";
import { zodResolver } from "@hookform/resolvers/zod";
import { upsertDocumentSchema } from "@/lib/validations/document";
import documentService from "@/lib/services/document";
import toast from "react-hot-toast";

import type { Document as DocumentType } from "@/types/document";
import type { Updater } from "use-mutative";
import type { z } from "zod/mini";

export function ChangeNameDialog({
  documentUpdater,
  documentId,
  name,
}: {
  documentId: number;
  documentUpdater: Updater<DocumentType<true> | null>;
  name: string;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const { control, handleSubmit } = useForm<
    z.infer<typeof upsertDocumentSchema>
  >({
    defaultValues: { name },
    resolver: zodResolver(upsertDocumentSchema),
  });

  const onSubmit = async ({ name }: z.infer<typeof upsertDocumentSchema>) => {
    await documentService.update(documentId, { name });
    documentUpdater((prev) => {
      if (!prev) return rawReturn(undefined);

      prev.name = name;
    });
    setShowDialog(false);
    toast.success("Name changed successfully");
  };

  return (
    <ResponsiveDialog open={showDialog} onOpenChange={setShowDialog}>
      <ResponsiveDialogTrigger asChild>
        <Button variant="ghost">{name}</Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Change Document Name</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Type new document name
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form id="change-name-form" onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="change-name-form-name">Name</FieldLabel>
                <Input
                  {...field}
                  id="change-name-form-name"
                  aria-invalid={fieldState.invalid}
                  placeholder="shadcn"
                  autoComplete="username"
                />

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </form>
        <ResponsiveDialogFooter>
          <Button form="change-name-form" type="submit">
            Save changes
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
