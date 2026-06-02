import { jsPDF } from "jspdf";
import db from "@/lib/database/database";
import pageService from "./page";
import transformService from "./transform";

import type { UpsertDocumentInput } from "@/lib/validations/document";
import type { Document as DocumentType } from "@/types/document";
import type { OpenCV } from "@opencvjs/web";

interface AllQueryParams {
  orderBy?: "createdAt" | "updatedAt" | "name";
  search?: string;
  sort?: "asc" | "desc";
  withFirstPage?: boolean;
  withPageCount?: boolean;
}

class DocumentService {
  async all(
    params: AllQueryParams & { withFirstPage: true; withPageCount: true }
  ): Promise<DocumentType<true, true>[]>;
  async all(
    params: AllQueryParams & { withFirstPage: true }
  ): Promise<DocumentType<true, false>[]>;
  async all(
    params: AllQueryParams & { withPageCount: true }
  ): Promise<DocumentType<false, true>[]>;
  async all(params?: AllQueryParams): Promise<DocumentType<false, false>[]>;
  async all(
    params?: AllQueryParams
  ): Promise<DocumentType<boolean, boolean>[]> {
    let collection = db.documents.toCollection();

    const orderBy = params?.orderBy ?? "updatedAt";
    collection = db.documents.orderBy(orderBy);

    if ((params?.sort ?? "desc") === "desc") {
      collection = collection.reverse();
    }

    if (params?.search) {
      const keyword = params.search.toLowerCase();
      collection = collection.filter((doc) =>
        doc.name.toLowerCase().includes(keyword)
      );
    }

    const documents = await collection.toArray();

    return Promise.all(
      documents.map(async (doc) => {
        const withFirstPage = params?.withFirstPage;
        const withPageCount = params?.withPageCount;

        const [page, pageCount] = await Promise.all([
          withFirstPage
            ? pageService.findByDocument(doc.id, { first: true })
            : undefined,
          withPageCount ? pageService.count(doc.id) : undefined,
        ]);

        return {
          ...doc,
          ...(withFirstPage && { pages: page ? [page] : [] }),
          ...(withPageCount && { pageCount: pageCount ?? 0 }),
        };
      })
    ) as Promise<DocumentType<boolean, boolean>[]>;
  }

  async find(id: number): Promise<DocumentType | undefined> {
    return await db.documents.get(id);
  }

  async findWithPages(id: number): Promise<DocumentType<true> | undefined> {
    const document = await this.find(id);
    if (!document) return undefined;

    const pages = await pageService.findByDocument(id);
    return { ...document, pages } as DocumentType<true>;
  }

  async create(data: UpsertDocumentInput, files: File[]): Promise<number> {
    const now = Date.now();
    const id = await db.documents.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    await pageService.createMany({ documentId: id as number, images: files });

    return id as number;
  }

  async update(id: number, data: UpsertDocumentInput): Promise<void> {
    return await db.transaction("rw", db.documents, async () => {
      await db.documents.update(id, { ...data, updatedAt: Date.now() });
    });
  }

  async delete(id: number): Promise<void> {
    await db.transaction("rw", db.documents, db.pages, async () => {
      await pageService.deleteByDocument(id);
      await db.documents.delete(id);
    });
  }

  async exportToPdf(cv: typeof OpenCV, id: number): Promise<Blob | undefined> {
    const userDocument = await this.findWithPages(id);
    if (!userDocument) return undefined;

    const doc = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4",
    });
    const canvas = document.createElement("canvas");
    canvas.style.objectFit = "contain";

    for (let i = 0; i < userDocument.pages.length; i++) {
      let sourceBitmap: ImageBitmap | null = null;
      const page = userDocument.pages[i];
      try {
        sourceBitmap = await createImageBitmap(page.sourceImage.original);
        const size = page.edit.perspectiveCrop.enabled
          ? transformService.computeWarpSize(page.edit.perspectiveCrop.points, {
              width: sourceBitmap.width,
              height: sourceBitmap.height,
            })
          : { width: sourceBitmap.width, height: sourceBitmap.height };
        const aspectRatio = size.width / size.height;

        const pdfWidth = 210;
        const pdfHeight = pdfWidth / aspectRatio;

        const x = 0;
        const y = (297 - pdfHeight) / 2;

        await transformService.exportPage(cv, sourceBitmap, canvas, page.edit);
        doc.addImage(canvas, "WEBP", x, y, pdfWidth, pdfHeight);

        if (i !== userDocument.pages.length - 1) {
          doc.addPage();
        }
      } finally {
        sourceBitmap?.close();
      }
    }

    return doc.output("blob");
  }
}

const documentService = new DocumentService();
export default documentService;
