import db from "@/lib/database/database";
import {
  type BulkCreatePageInput,
  bulkCreatePageSchema,
  type CreatePageInput,
  createPageSchema,
  type UpdateEditInput,
  updateEditSchema,
} from "@/lib/validations/page";
import imageService from "@/lib/services/image";

import type { Page, PageImage } from "@/types/page";

interface FindByDocumentParams {
  first?: boolean;
}

class PageService {
  findByDocument(
    documentId: number,
    params: FindByDocumentParams & { first: true }
  ): Promise<Page | undefined>;
  findByDocument(
    documentId: number,
    params?: FindByDocumentParams
  ): Promise<Page[]>;
  findByDocument(
    documentId: number,
    params?: FindByDocumentParams
  ): Promise<Page | undefined | Page[]> {
    const query = db.pages.where("documentId").equals(documentId);

    if (params?.first) {
      return query.first();
    }

    return query.toArray();
  }

  find(id: number) {
    return db.pages.get(id);
  }

  count(documentId: number) {
    return db.pages.where("documentId").equals(documentId).count();
  }

  async create(input: CreatePageInput) {
    const data = createPageSchema.parse(input);

    const { width, height } = await imageService.getImageDimensions(
      input.image
    );
    const image: PageImage = {
      width,
      height,
      source: input.image,
      thumbnail: await imageService.compress(input.image),
    };

    const id = await db.pages.add({
      documentId: data.documentId,
      image,
      edit: {
        rotation: 0,
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

  async createMany(params: BulkCreatePageInput) {
    const data = bulkCreatePageSchema.parse(params);

    const [dimensions, thumbnails] = await Promise.all([
      imageService.getImageDimensionsBatch(data.images),
      imageService.compressBatch(data.images),
    ]);

    const images: PageImage[] = data.images.map((file, index) => ({
      source: file,
      width: dimensions[index].width,
      height: dimensions[index].height,
      thumbnail: thumbnails[index],
    }));

    return db.pages.bulkAdd(
      data.images.map((_, index) => ({
        documentId: data.documentId,
        image: images[index],
        edit: {
          rotation: 0,
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

  async findEdit(id: number) {
    return db.transaction("r", db.pages, async () => {
      const page = await db.pages.get(id);
      if (!page) return;

      return page.edit;
    });
  }

  async updateEdit(id: number, input: UpdateEditInput) {
    const data = updateEditSchema.parse(input);

    return db.transaction("rw", db.pages, async () => {
      const page = await db.pages.get(id);
      if (!page) return;

      await db.pages.update(id, {
        edit: { ...page.edit, ...data },
      });
    });
  }

  async reset(id: number) {
    return db.transaction("rw", db.pages, async () => {
      const page = await db.pages.get(id);
      if (!page) return;
      await db.pages.update(id, {
        edit: {
          brightness: 0,
          contrast: 0,
          rotation: 0,
          temperature: 0,
          tint: 0,
          highlight: 0,
          shadow: 0,
          white: 0,
          black: 0,
        },
      });
    });
  }

  delete(id: number) {
    return db.pages.delete(id);
  }

  deleteByDocument(documentId: number) {
    return db.pages.where("documentId").equals(documentId).delete();
  }
}

const service = new PageService();
export default service;
