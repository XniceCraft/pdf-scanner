import Dexie, { type EntityTable } from "dexie";

import type { Document } from "@/types/document";
import type { Page } from "@/types/page";

class Database extends Dexie {
  documents!: EntityTable<Document, "id">;
  pages!: EntityTable<Page, "id">;

  constructor() {
    super("PDFScannerDatabase");
    this.version(1).stores({
      documents: "++id, updatedAt",
      pages: "++id, documentId",
    });
  }
}

const database = new Database();
export default database;
