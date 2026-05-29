import { z } from "zod/mini";

const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const perspectiveCropSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }),
  z.object({
    enabled: z.literal(true),
    points: z.tuple([pointSchema, pointSchema, pointSchema, pointSchema]),
  }),
]);

const baseEditShape = {
  rotation: z
    .number()
    .check(z.gte(0, "Rotation must be at least 0."))
    .check(z.lte(270, "Rotation must be at most 270.")),
  perspectiveCrop: perspectiveCropSchema,
};

const colorEditShape = {
  temperature: z
    .int()
    .check(z.gte(-100, "Temperature must be at least -100."))
    .check(z.lte(100, "Temperature must be at most 100.")),
  tint: z
    .int()
    .check(z.gte(-100, "Tint must be at least -100."))
    .check(z.lte(100, "Tint must be at most 100.")),
};

const luminanceEditShape = {
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
};

export const upsertEditSchema = z.discriminatedUnion("preset", [
  z.object({
    ...baseEditShape,
    ...colorEditShape,
    ...luminanceEditShape,
    preset: z.literal("original"),
  }),
  z.object({
    ...baseEditShape,
    ...colorEditShape,
    ...luminanceEditShape,
    preset: z.literal("enhanced"),
  }),
  z.object({
    ...baseEditShape,
    brightness: z
      .int()
      .check(z.gte(-100, "Brightness must be at least -100."))
      .check(z.lte(100, "Brightness must be at most 100.")),
    contrast: z
      .int()
      .check(z.gte(-100, "Constrast must be at least -100."))
      .check(z.lte(100, "Constrast must be at most 100.")),
    preset: z.literal("no-shadow"),
  }),
]);

export type UpsertEditInput = z.infer<typeof upsertEditSchema>;
export type Point = z.infer<typeof pointSchema>;
export type PerspectiveCrop = z.infer<typeof perspectiveCropSchema>;
