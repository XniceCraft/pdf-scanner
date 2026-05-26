import type { Page } from "./page";

export interface Document<
  TPages extends boolean = false,
  TPageCount extends boolean = false,
> {
  id: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  pages: TPages extends true ? Page[] : never;
  pageCount: TPageCount extends true ? number : never;
}
