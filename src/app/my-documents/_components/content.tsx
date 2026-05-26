"use client";

import { useEffect, useState } from "react";
import { useMutative } from "use-mutative";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { useDebounceValue } from "@/hooks/use-debounce-value";
import { DocumentCard } from "./card/document-card";
import { Loading } from "@/components/ui/loading";
import { rawReturn } from "mutative";
import documentService from "@/lib/services/document";

import type { Document as DocumentType } from "@/types/document";

export function Content() {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useMutative<DocumentType<true, true>[]>([]);

  const [queryString] = useQueryStates(
    {
      search: parseAsString,
      sort: parseAsStringEnum([
        "name-asc",
        "name-desc",
        "updatedAt-desc",
        "updatedAt-asc",
        "createdAt-desc",
        "createdAt-asc",
      ]).withDefault("name-asc"),
    },
    { shallow: false }
  );

  const { search, sort } = useDebounceValue(queryString, 500);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        setIsLoading(true);
        const [orderByQuery, sortQuery] = sort.split("-") as [
          "name" | "updatedAt" | "createdAt",
          "asc" | "desc",
        ];
        const res = await documentService.all({
          withFirstPage: true,
          withPageCount: true,
          search: search ?? undefined,
          orderBy: orderByQuery,
          sort: sortQuery,
        });
        setDocuments(rawReturn(res));
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

  return (
    <section className="space-y-4">
      {isLoading ? (
        <div className="h-72 flex items-center justify-center">
          <Loading />
        </div>
      ) : documents.length > 0 ? (
        documents.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} documentAction={setDocuments} />
        ))
      ) : (
        <div className="h-72 flex items-center justify-center">
          No documents yet. Try create a new one!
        </div>
      )}
    </section>
  );
}
