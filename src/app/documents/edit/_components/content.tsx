"use client";

import { useMutative } from "use-mutative";
import { useAsRef } from "@/hooks/use-as-ref";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { parseAsInteger, useQueryStates } from "nuqs";
import { notFound } from "next/navigation";
import { rawReturn } from "mutative";
import { DeletePageButton } from "./button/delete-page-button";
import { EditorSection } from "./section/editor-section";
import { Loading } from "@/components/ui/loading";
import { MenuBar } from "./layout/menu-bar";
import { NewPageButton } from "./button/new-page-button";
import { PageCard } from "./card/page-card";
import documentService from "@/lib/services/document";

import type { Document as DocumentType } from "@/types/document";
import type { Edit } from "@/types/edit";
import type { EditedImage } from "@/types/page";

const MenuBarMemo = memo(MenuBar);
const PageCardMemo = memo(PageCard);
const NewPageButtonMemo = memo(NewPageButton);

export function Content() {
  const [{ id: documentId, page: pageId }, setQuery] = useQueryStates({
    id: parseAsInteger.withDefault(0),
    page: parseAsInteger,
  });

  const [activePage, setActivePage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [doc, setDoc] = useMutative<DocumentType<true> | null>(null);

  const editBufferRef = useRef<Edit | null>(null);
  const editedImageBufferRef = useRef<EditedImage | null>(null);
  const activePageRef = useAsRef(activePage);
  const documentRef = useAsRef(doc);

  useEffect(() => {
    if (!documentId) return;

    async function fetchData() {
      setIsLoading(true);
      const savedDoc = await documentService.findWithPages(documentId);
      setIsLoading(false);
      if (!savedDoc) return;

      const active = savedDoc.pages.findIndex((p) => p.id === pageId);
      setDoc(rawReturn(savedDoc));
      setActivePage(active === -1 ? 0 : active);
    }

    fetchData();
    // pageId only needed for first pageLoad
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const handleUpdateEdit = useCallback((edit: Edit) => {
    editBufferRef.current = edit;
  }, []);

  const handleUpdateEditedImage = useCallback((editedImage: EditedImage) => {
    editedImageBufferRef.current = editedImage;
  }, []);

  const setCurrentPage = useCallback(
    (pageIndex: number) => {
      if (editBufferRef.current)
        setDoc((prevDocument) => {
          if (!prevDocument) return rawReturn(undefined);

          if (editBufferRef.current) {
            prevDocument.pages[activePageRef.current].edit =
              editBufferRef.current;
            editBufferRef.current = null;
          }

          if (editedImageBufferRef.current) {
            prevDocument.pages[activePageRef.current].editedImage =
              editedImageBufferRef.current;
            editedImageBufferRef.current = null;
          }
        });

      setQuery(({ id }) => ({
        id: id,
        page: documentRef.current?.pages[pageIndex].id,
      }));
      setActivePage(pageIndex);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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
      <MenuBarMemo
        documentId={doc.id}
        documentName={doc.name}
        documentUpdater={setDoc}
      />
      <EditorSection
        pageId={doc.pages[activePage].id}
        pageEdit={doc.pages[activePage].edit}
        pageSourceImage={doc.pages[activePage].sourceImage.large}
        pageEditedImage={doc.pages[activePage].editedImage.large}
        handleUpdateEdit={handleUpdateEdit}
        handleUpdateEditedImage={handleUpdateEditedImage}
      />
      <aside className="bg-muted/30 border-r border-border z-40 hidden md:block">
        <div className="flex items-center justify-between mb-2 px-3 pt-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            {doc.pages.length} Pages
          </span>
          <div className="flex gap-3">
            <DeletePageButton
              pageId={doc.pages[activePage].id}
              documentAction={setDoc}
              setActivePage={setCurrentPage}
            />
            <NewPageButtonMemo documentId={doc.id} documentAction={setDoc} />
          </div>
        </div>
        {doc.pages && (
          <div className="flex gap-1 px-1 pb-1">
            {doc.pages.map((page, index) => (
              <PageCardMemo
                key={page.id}
                index={index}
                blob={page.editedImage.small}
                active={activePage === index}
                onClick={setCurrentPage}
              />
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
