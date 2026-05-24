import type { Page } from "./page";

export interface Document<T extends boolean = false> {
  id: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  pages: T extends true ? Page[] : never;
}
