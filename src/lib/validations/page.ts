import { z } from "zod";

export const editSchema = z.object({
  rotation: z.int().multipleOf(90).min(0).max(270),
  temperature: z.int().min(-100).max(100),
  tint: z.int().min(-100).max(100),
  brightness: z
    .int()
    .min(-100, "Brightness must be at least -100.")
    .max(100, "Brightness must be at most 100."),
  contrast: z
    .int()
    .min(-100, "Brightness must be at least -100.")
    .max(100, "Brightness must be at most 100."),
  highlight: z
    .int()
    .min(-100, "Brightness must be at least -100.")
    .max(100, "Brightness must be at most 100."),
  shadow: z
    .int()
    .min(-100, "Brightness must be at least -100.")
    .max(100, "Brightness must be at most 100."),
  white: z
    .int()
    .min(-100, "Brightness must be at least -100.")
    .max(100, "Brightness must be at most 100."),
  black: z
    .int()
    .min(-100, "Contrast must be at least -100.")
    .max(100, "Contrast must be at most 100."),
});

export const createPageSchema = z.object({
  documentId: z.number().min(1),
  image: z.instanceof(File),
});

export const bulkCreatePageSchema = z.object({
  documentId: z.number().min(1),
  images: z.array(z.instanceof(File)),
});

export const updateEditSchema = editSchema.partial();

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type BulkCreatePageInput = z.infer<typeof bulkCreatePageSchema>;
export type UpdateEditInput = z.infer<typeof updateEditSchema>;
