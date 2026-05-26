import { z } from "zod/mini";
import { imageValidation } from "./image";

export const editSchema = z.object({
  rotation: z
    .int()
    .check(z.multipleOf(90, "Rotation must be a multiple of 90."))
    .check(z.gte(0, "Rotation must be at least 0."))
    .check(z.lte(270, "Rotation must be at most 270.")),
  temperature: z
    .int()
    .check(z.gte(-100, "Temperature must be at least -100."))
    .check(z.lte(100, "Temperature must be at most 100.")),
  tint: z
    .int()
    .check(z.gte(-100, "Tint must be at least -100."))
    .check(z.lte(100, "Tint must be at most 100.")),
  brightness: z
    .int()
    .check(z.gte(-100, "Brightness must be at least -100."))
    .check(z.lte(100, "Brightness must be at most 100.")),
  contrast: z
    .int()
    .check(z.gte(-100, "Constrast must be at least -100."))
    .check(z.lte(100, "Constrast must be at most 100.")),
  highlight: z
    .int()
    .check(z.gte(-100, "Highlight must be at least -100."))
    .check(z.lte(100, "Highlight must be at most 100.")),
  shadow: z
    .int()
    .check(z.gte(-100, "Shadow must be at least -100."))
    .check(z.lte(100, "Shadow must be at most 100.")),
  white: z
    .int()
    .check(z.gte(-100, "White must be at least -100."))
    .check(z.lte(100, "White must be at most 100.")),
  black: z
    .int()
    .check(z.gte(-100, "Black must be at least -100."))
    .check(z.lte(100, "Black must be at most 100.")),
});

export const createPageSchema = z.object({
  documentId: z.int().check(z.gte(1, "Document ID must be at least 1.")),
  image: z.instanceof(File),
});

export const bulkCreatePageSchema = z.object({
  documentId: z.int().check(z.gte(1, "Document ID must be at least 1.")),
  images: imageValidation(),
});

export const updateEditSchema = z.partial(editSchema);

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type BulkCreatePageInput = z.infer<typeof bulkCreatePageSchema>;
export type UpdateEditInput = z.infer<typeof updateEditSchema>;
