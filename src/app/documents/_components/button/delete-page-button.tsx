"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleDeletePage = useCallback(async () => {
    setIsDeleting(true);
    try {
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
    } finally {
      setIsDeleting(false);
      setShowDialog(false);
    }
  }, [documentAction, pageId, setActivePage]);

  return (
    <>
      <ResponsiveDialog open={showDialog} onOpenChange={setShowDialog}>
        <ResponsiveDialogTrigger asChild>
          <Button
            size="sm"
            variant="destructive"
            className="font-bold text-xs px-3 rounded-lg hover:opacity-90 active:scale-95 transition-all"
          >
            <Trash2Icon />
            Delete
          </Button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Delete current page?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              This will permanently delete current page. This action cannot be
              undone.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveDialogClose>
            <Button
              variant="destructive"
              onClick={handleDeletePage}
              disabled={isDeleting}
            >
              {isDeleting && <Spinner />}
              Delete
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
