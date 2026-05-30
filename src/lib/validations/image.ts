import { z } from "zod/mini";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const imageValidation = z
  .file()
  .check(
    z.maxSize(MAX_SIZE, "Max file size is 10MB."),
    z.mime(ACCEPTED_TYPES, "Only .png, .jpg, and .webp files are accepted.")
  );

export const multipleImageValidation = z
  .array(imageValidation)
  .check(z.minLength(1, "Please upload at least one image."));
