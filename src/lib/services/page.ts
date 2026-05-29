import db from "@/lib/database/database";
import {
  type BulkCreatePageInput,
  type CreatePageInput,
} from "@/lib/validations/page";
import imageService from "@/lib/services/image";

import type { Page, SourceImage, EditedImage } from "@/types/page";
import type { UpsertEditInput } from "@/lib/validations/edit";

interface FindByDocumentParams {
  first?: boolean;
}

class PageService {
  async findByDocument(
    documentId: number,
    params: FindByDocumentParams & { first: true }
  ): Promise<Page | undefined>;
  async findByDocument(
    documentId: number,
    params?: FindByDocumentParams
  ): Promise<Page[]>;
  async findByDocument(
    documentId: number,
    params?: FindByDocumentParams
  ): Promise<Page | undefined | Page[]> {
    const query = db.pages.where("documentId").equals(documentId);

    if (params?.first) {
      return await query.first();
    }

    return await query.toArray();
  }

  async find(id: number): Promise<Page | undefined> {
    return await db.pages.get(id);
  }

  async count(documentId: number): Promise<number> {
    return await db.pages.where("documentId").equals(documentId).count();
  }

  async create(data: CreatePageInput) {
    const { width, height } = await imageService.getImageDimensions(data.image);
    const sourceImage: SourceImage = {
      width,
      height,
      source: data.image,
    };
    const editedImage = await imageService.generateEditedImage(
      data.image,
      width,
      height
    );

    const id = await db.pages.add({
      documentId: data.documentId,
      sourceImage,
      editedImage,
      edit: {
        preset: "original",
        rotation: 0,
        perspectiveCrop: { enabled: false },
        temperature: 0,
        tint: 0,
        brightness: 0,
        contrast: 0,
        highlight: 0,
        shadow: 0,
        white: 0,
        black: 0,
      },
    });
    return id;
  }

  async createMany(data: BulkCreatePageInput) {
    const dimensions = await imageService.getImageDimensionsBatch(data.images);

    const sourceImages: SourceImage[] = data.images.map((file, index) => ({
      source: file,
      width: dimensions[index].width,
      height: dimensions[index].height,
    }));

    const editedImages = await Promise.all(
      data.images.map((img, i) =>
        imageService.generateEditedImage(
          img,
          dimensions[i].width,
          dimensions[i].height
        )
      )
    );
    return db.pages.bulkAdd(
      data.images.map((_, index) => ({
        documentId: data.documentId,
        sourceImage: sourceImages[index],
        editedImage: editedImages[index],
        edit: {
          preset: "original",
          rotation: 0,
          perspectiveCrop: { enabled: false },
          temperature: 0,
          tint: 0,
          brightness: 0,
          contrast: 0,
          highlight: 0,
          shadow: 0,
          white: 0,
          black: 0,
        },
      }))
    );
  }

  async updateEditedImage(id: number, editedImage: EditedImage) {
    const page = await db.pages.get(id);
    if (!page) return;

    await db.pages.update(id, {
      editedImage,
    });
  }

  async findEdit(id: number) {
    const page = await db.pages.get(id);
    if (!page) return;

    return page.edit;
  }

  async updateEdit(id: number, data: UpsertEditInput) {
    return await db.transaction("rw", db.pages, async () => {
      const page = await db.pages.get(id);
      if (!page) return;

      await db.pages.update(id, {
        edit: { ...page.edit, ...data },
      });
    });
  }

  async resetEdit(id: number) {
    const page = await db.pages.get(id);
    if (!page) return;

    const editedImage = await imageService.generateEditedImage(
      page.sourceImage.source,
      page.sourceImage.width,
      page.sourceImage.height
    );

    await db.transaction("rw", db.pages, async () => {
      await db.pages.update(id, {
        editedImage,
        edit: {
          preset: "original",
          rotation: 0,
          perspectiveCrop: { enabled: false },
          brightness: 0,
          contrast: 0,
          temperature: 0,
          tint: 0,
          highlight: 0,
          shadow: 0,
          white: 0,
          black: 0,
        },
      });
    });

    return editedImage;
  }

  async delete(id: number) {
    return await db.pages.delete(id);
  }

  async deleteByDocument(documentId: number) {
    return await db.pages.where("documentId").equals(documentId).delete();
  }
}

const service = new PageService();
export default service;
