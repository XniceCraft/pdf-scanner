import { z } from "zod";

export const upsertDocumentSchema = z.object({
  name: z.string().min(1).max(255),
});

export type UpsertDocumentInput = z.infer<typeof upsertDocumentSchema>;
