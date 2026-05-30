import type { Edit } from "@/types/edit";

export interface SourceImage {
  original: Blob;
  large: Blob; // Width maxed at 1000px
}

export interface EditedImage {
  // Only used for previewing the edit result like crop, not adjustment sliders
  small: Blob; // Width maxed at 200px
  large: Blob; // Width maxed at 1000px
  // For more information, see image service
}

export interface Page {
  id: number;
  documentId: number;
  sourceImage: SourceImage;
  editedImage: EditedImage;
  edit: Edit;
}
