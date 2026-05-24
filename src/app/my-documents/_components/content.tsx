"use client";

import { useEffect, useState } from "react";
import { useMutative } from "use-mutative";
import { DocumentCard } from "./card/document-card";
import { Loading } from "@/components/ui/loading";
import { rawReturn } from "mutative";
import documentService from "@/lib/services/document";

import type { Document as DocumentType } from "@/types/document";

export function Content() {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useMutative<DocumentType<true>[]>([]);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        setIsLoading(true);
        const res = await documentService.all({ withFirstPage: true });
        setDocuments(rawReturn(res));
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="space-y-4">
      {isLoading ? (
        <div className="h-72 flex items-center justify-center">
          <Loading />
        </div>
      ) : (
        documents.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} documentAction={setDocuments} />
        ))
      )}
    </section>
  );
}
