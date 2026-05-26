import { jsPDF } from "jspdf";
import db from "@/lib/database/database";
import pageService from "./page";
import transformService from "./transform";

import type { UpsertDocumentInput } from "@/lib/validations/document";
import type { Document as DocumentType } from "@/types/document";

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
          withPageCount
            ? pageService.findByDocument(doc.id, { count: true })
            : undefined,
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

  async exportToPdf(id: number): Promise<Blob | undefined> {
    const document = await this.findWithPages(id);
    if (!document) return undefined;

    const doc = new jsPDF();

    for (let i = 0; i < document.pages.length; i++) {
      const page = document.pages[i];
      const aspectRatio = page.image.width / page.image.height;

      const pdfWidth = 210;
      const pdfHeight = pdfWidth / aspectRatio;

      const x = 0;
      const y = (297 - pdfHeight) / 2;

      const editedBuffer = await transformService.apply(
        page.image.source,
        page.edit
      );
      const arrayBuffer = await editedBuffer.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      doc.addImage(bytes, "JPEG", x, y, pdfWidth, pdfHeight);

      if (i !== document.pages.length - 1) {
        doc.addPage();
      }
    }

    return doc.output("blob");
  }
}

const documentService = new DocumentService();
export default documentService;
