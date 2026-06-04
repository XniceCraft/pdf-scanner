import type { PerspectiveCrop } from "@/types/edit";

type FourPoints = Extract<PerspectiveCrop, { enabled: true }>["points"];

export interface CropOverlayControl {
  handleApply: () => Promise<void>;
  handleCancel: () => void;
  handleOnChange: (points: FourPoints) => void;
  handleReset: () => void;
}
