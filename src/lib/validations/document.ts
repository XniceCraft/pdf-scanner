import { z } from "zod/mini";

export const upsertDocumentSchema = z.object({
  name: z
    .string()
    .check(z.minLength(1, "Document name must be at least 1 character long."))
    .check(
      z.maxLength(255, "Document name must be at most 255 characters long.")
    ),
});

export type UpsertDocumentInput = z.infer<typeof upsertDocumentSchema>;
