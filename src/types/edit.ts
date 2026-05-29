interface Point {
  x: number;
  y: number;
}

export type PerspectiveCrop =
  | { enabled: false }
  | { enabled: true; points: [Point, Point, Point, Point] };

interface BaseEdit {
  rotation: number;
  perspectiveCrop: PerspectiveCrop;
}

interface ColorEdit {
  temperature: number;
  tint: number;
}

interface LuminanceEdit {
  brightness: number;
  contrast: number;
  black: number;
  highlight: number;
  shadow: number;
  white: number;
}

type FullEdit = BaseEdit & ColorEdit & LuminanceEdit;

export interface OriginalEdit extends FullEdit {
  preset: "original";
}

export interface EnhancedEdit extends FullEdit {
  preset: "enhanced";
}

export interface NoShadowEdit
  extends BaseEdit, Pick<LuminanceEdit, "brightness" | "contrast"> {
  preset: "no-shadow";
}

export type Edit = OriginalEdit | EnhancedEdit | NoShadowEdit;
