import { z } from "zod/mini";
import { imageValidation } from "./image";

export const createPageSchema = z.object({
  documentId: z.int().check(z.gte(1, "Document ID must be at least 1.")),
  image: z.instanceof(File),
});

export const bulkCreatePageSchema = z.object({
  documentId: z.int().check(z.gte(1, "Document ID must be at least 1.")),
  images: imageValidation(),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type BulkCreatePageInput = z.infer<typeof bulkCreatePageSchema>;
