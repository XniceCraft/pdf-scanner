"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOpenCV } from "@/providers/opencv-provider";
import { Button } from "@/components/ui/button";
import { ChangeNameDialog } from "@/components/dialog/change-name-dialog";
import { ChevronLeftIcon, DownloadIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import documentService from "@/lib/services/document";

import type { Updater } from "use-mutative";
import type { Document as DocumentType } from "@/types/document";

interface MenuBarProps {
  documentUpdater: Updater<DocumentType<true> | null>;
  documentId: number;
  documentName: string;
}

export function MenuBar({
  documentUpdater,
  documentId,
  documentName,
}: MenuBarProps) {
  const router = useRouter();

  const { cv, isLoading } = useOpenCV();
  const handleExport = useCallback(async () => {
    const toastId = toast.loading(`Exporting "${documentName}.pdf"`);

    try {
      if (isLoading) {
        toast.error("Please wait for OpenCV to load");
        return;
      }

      const blob = await documentService.exportToPdf(cv, documentId);
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
  }, [cv, documentId, documentName, isLoading]);

  return (
    <nav className="p-2 bg-white/5 border-b flex flex-nowrap justify-between gap-3">
      <Button
        variant="outline"
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
      <ChangeNameDialog
        documentUpdater={documentUpdater}
        documentId={documentId}
        name={documentName}
      />
      <Button variant="outline" type="button" onClick={handleExport}>
        <DownloadIcon /> Export
      </Button>
    </nav>
  );
}
