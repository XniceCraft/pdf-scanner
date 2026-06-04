export interface Point {
  x: number;
  y: number;
}

export type FourPoints = [Point, Point, Point, Point];

export type PerspectiveCrop =
  | { enabled: false }
  | { enabled: true; points: FourPoints };

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

export interface NoShadowEdit
  extends BaseEdit, Pick<LuminanceEdit, "brightness" | "contrast"> {
  preset: "no-shadow";
}

export type Edit = OriginalEdit | NoShadowEdit;
