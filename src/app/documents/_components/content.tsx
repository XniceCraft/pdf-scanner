"use client";

import { useMutative } from "use-mutative";
import { useState, useEffect } from "react";
import { parseAsInteger, useQueryState } from "nuqs";
import { notFound } from "next/navigation";
import { Loading } from "@/components/ui/loading";
import { MenuBar } from "./layout/menu-bar";
import { PageCard } from "./card/page-card";
import { rawReturn } from "mutative";
import documentService from "@/lib/services/document";

import type { Document as DocumentType } from "@/types/document";

export function Content() {
  const [documentId] = useQueryState("id", parseAsInteger.withDefault(0));

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [doc, setDoc] = useMutative<DocumentType<true> | null>(null);

  useEffect(() => {
    if (!documentId) return;

    async function fetchData() {
      setIsLoading(true);
      const doc = await documentService.findWithPages(documentId);
      setIsLoading(false);
      if (!doc) return;

      setDoc(rawReturn(doc));
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!doc) return notFound();

  return (
    <>
      <MenuBar
        documentUpdater={setDoc}
        documentId={doc.id}
        documentName={doc.name}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {doc.pages.length > 0 ? (
          doc.pages.map((page, index) => (
            <PageCard
              key={page.id}
              documentId={doc.id}
              pageId={page.id}
              thumbnail={page.editedImage.small}
              index={index}
            />
          ))
        ) : (
          <div className="flex items-center justify-center min-h-50 text-muted-foreground">
            No pages found.
          </div>
        )}
      </div>
    </>
  );
}
