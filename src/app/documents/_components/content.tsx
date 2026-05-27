"use client";

import { useMutative } from "use-mutative";
import { useState, useEffect } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { MenuBar } from "./layout/menu-bar";
import { Spinner } from "@/components/ui/spinner";
import { PageCard } from "./card/page-card";
import { rawReturn } from "mutative";
import documentService from "@/lib/services/document";

import type { Document as DocumentType } from "@/types/document";

export function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [doc, setDoc] = useMutative<DocumentType<true> | null>(null);

  useEffect(() => {
    if (!id) return notFound();

    async function fetchData() {
      setIsLoading(true);
      const doc = await documentService.findWithPages(Number(id));
      setIsLoading(false);
      if (!doc) return;

      setDoc(rawReturn(doc));
    }

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-50">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!doc || doc.pages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-50 text-muted-foreground">
        No pages found.
      </div>
    );
  }

  return (
    <>
      <MenuBar
        documentUpdater={setDoc}
        documentId={doc.id}
        documentName={doc.name}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {doc.pages.map((page, index) => (
          <PageCard
            key={page.id}
            documentId={doc.id}
            thumbnail={page.image.thumbnail}
            index={index}
          />
        ))}
      </div>
    </>
  );
}
