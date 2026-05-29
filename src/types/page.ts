import type { Edit } from "@/types/edit";

export interface SourceImage {
  source: Blob;
  width: number;
  height: number;
}

export interface EditedImage {
  small: Blob;
  medium: Blob;
  large: Blob;
  thumbnail: Blob;
}

export interface Page {
  id: number;
  documentId: number;
  sourceImage: SourceImage;
  editedImage: EditedImage;
  edit: Edit;
}
