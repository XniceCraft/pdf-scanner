import type { Edit } from "@/types/edit";

export interface PageImage {
  source: Blob;
  width: number;
  height: number;
  thumbnail: Blob;
}

export interface Page {
  id: number;
  documentId: number;
  image: PageImage;
  edit: Edit;
}
