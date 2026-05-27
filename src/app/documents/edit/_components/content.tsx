"use client";

import { useMutative } from "use-mutative";
import { useEffect, useState } from "react";
import { rawReturn } from "mutative";
import { notFound, useSearchParams } from "next/navigation";
import { DeletePageButton } from "./button/delete-page-button";
import { EditorSection } from "./section/editor-section";
import { Loading } from "@/components/ui/loading";
import { MenuBar } from "./layout/menu-bar";
import { NewPageButton } from "./button/new-page-button";
import { PageCard } from "./card/page-card";
import documentService from "@/lib/services/document";

import type { Document as DocumentType } from "@/types/document";

export function Content() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [activePage, setActivePage] = useState<number>(0);
  const [doc, setDoc] = useMutative<DocumentType<true> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return notFound();

    async function fetchData() {
      setIsLoading(true);
      const savedDoc = await documentService.findWithPages(Number(id));
      setIsLoading(false);
      if (!savedDoc) return;

      setDoc(rawReturn(savedDoc));
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!doc) return notFound();

  return (
    <>
      <MenuBar
        documentId={doc.id}
        documentName={doc.name}
        documentUpdater={setDoc}
      />
      <EditorSection documentAction={setDoc} page={doc.pages[activePage]} />
      <aside className="bg-muted/30 border-r border-border z-40 hidden md:block">
        <div className="flex items-center justify-between mb-2 px-3 pt-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            {doc.pages?.length} Pages
          </span>
          <div className="flex gap-3">
            <DeletePageButton
              pageId={doc.pages[activePage].id}
              documentAction={setDoc}
              setActivePage={setActivePage}
            />
            <NewPageButton documentId={doc.id} documentAction={setDoc} />
          </div>
        </div>
        {doc.pages && (
          <div className="flex gap-1 px-1 pb-1">
            {doc.pages.map((page, index) => (
              <PageCard
                key={page.id}
                index={index}
                blob={page.image.thumbnail}
                active={activePage === index}
                onClick={setActivePage}
              />
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
