import { z } from "zod/mini";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const imageValidation = () =>
  z.array(
    z.instanceof(File).check(
      z.refine((file) => file.size <= MAX_SIZE, "Max file size is 10MB."),
      z.refine(
        (file) => ACCEPTED_TYPES.includes(file.type),
        "Only .png, .jpg, and .webp files are accepted."
      )
    )
  );
