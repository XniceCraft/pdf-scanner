import { z } from "zod/mini";
import { imageValidation, multipleImageValidation } from "./image";

export const createPageSchema = z.object({
  documentId: z.int().check(z.gte(1, "Document ID must be at least 1.")),
  image: imageValidation,
});

export const bulkCreatePageSchema = z.object({
  documentId: z.int().check(z.gte(1, "Document ID must be at least 1.")),
  images: multipleImageValidation,
});

export const updatePageImageSchema = z.object({
  image: imageValidation,
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type BulkCreatePageInput = z.infer<typeof bulkCreatePageSchema>;
export type UpdatePageImageInput = z.infer<typeof updatePageImageSchema>;
