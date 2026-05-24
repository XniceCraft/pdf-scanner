import { type Dispatch, type SetStateAction, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import pageService from "@/lib/services/page";

import type { Updater } from "use-mutative";
import type { Document as DocumentType } from "@/types/document";

export function DeletePageButton({
  documentAction,
  setActivePage,
  pageId,
}: {
  documentAction: Updater<DocumentType<true> | null>;
  pageId: number;
  setActivePage: Dispatch<SetStateAction<number>>;
}) {
  const handleDeletePage = useCallback(async () => {
    documentAction((draft) => {
      if (!draft) return;
      const index = draft.pages.findIndex((p) => p.id === pageId);

      if (index !== -1) {
        draft.pages.splice(index, 1);
        setActivePage((prev) =>
          prev === index ? Math.max(0, index - 1) : prev
        );
      }
    });
    await pageService.delete(pageId);
  }, [documentAction, pageId, setActivePage]);

  return (
    <>
      <Button
        size="sm"
        variant="destructive"
        className="font-bold text-xs px-3 rounded-lg hover:opacity-90 active:scale-95 transition-all"
        onClick={handleDeletePage}
      >
        <Trash2Icon />
        Delete
      </Button>
    </>
  );
}
