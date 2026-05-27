"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChangeNameDialog } from "@/components/dialog/change-name-dialog";
import { ChevronLeftIcon, DownloadIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import documentService from "@/lib/services/document";

import type { Updater } from "use-mutative";
import type { Document as DocumentType } from "@/types/document";

interface MenuBarProps {
  documentId: number;
  documentName: string;
  documentUpdater: Updater<DocumentType<true> | null>;
}

export function MenuBar({
  documentId,
  documentName,
  documentUpdater,
}: MenuBarProps) {
  const router = useRouter();

  const handleExport = useCallback(async () => {
    const toastId = toast.loading(`Exporting "${documentName}.pdf"`);

    try {
      const blob = await documentService.exportToPdf(documentId);
      if (!blob) {
        toast.error("Failed to export document");
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${documentName}.pdf`;
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(anchor.href);

      toast.success(`Exported "${documentName}.pdf" successfully`, {
        id: toastId,
      });
    } catch {
      toast.error(`Failed to export "${documentName}.pdf"`, { id: toastId });
    }
  }, [documentId, documentName]);

  return (
    <nav className="flex justify-between items-center border-b border-border py-1">
      <div>
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/");
            }
          }}
        >
          <ChevronLeftIcon /> Back
        </Button>
        <Button
          variant="outline"
          type="button"
          className="bg-primary/20! border-primary/40!"
          onClick={handleExport}
        >
          <DownloadIcon /> Export
        </Button>
      </div>
      <ChangeNameDialog
        documentUpdater={documentUpdater}
        documentId={documentId}
        name={documentName}
      />
    </nav>
  );
}
