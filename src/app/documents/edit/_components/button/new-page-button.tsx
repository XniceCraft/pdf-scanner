import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import pageService from "@/lib/services/page";

import type { Updater } from "use-mutative";
import type { Document as DocumentType } from "@/types/document";

export function NewPageButton({
  documentId,
  documentAction,
}: {
  documentAction: Updater<DocumentType<true> | null>;
  documentId: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewPage = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const imageFiles = Array.from(files);

      const ids = await pageService.createMany({
        documentId,
        images: imageFiles,
      });

      const newPages = await Promise.all(
        (Array.isArray(ids) ? ids : [ids]).map((id) =>
          pageService.find(Number(id))
        )
      );

      documentAction((draft) => {
        if (!draft) return;
        for (const page of newPages) {
          if (page) draft.pages.push(page);
        }
      });

      e.target.value = "";
    },
    [documentId, documentAction]
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        size="sm"
        className="font-bold text-xs px-3 rounded-lg hover:opacity-90 active:scale-95 transition-all"
        onClick={handleNewPage}
      >
        + New Page
      </Button>
    </>
  );
}
