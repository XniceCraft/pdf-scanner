"use client";

import { useExportPdf } from "@/hooks/utils/use-export-pdf";
import { useRouter } from "next/navigation";
import { Button, LoadingButton } from "@/components/ui/button";
import { ChangeNameDialog } from "@/components/dialog/change-name-dialog";
import { ChevronLeftIcon, DownloadIcon } from "lucide-react";

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

  const { exportPdf, isExporting } = useExportPdf(documentId, documentName);

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
      <LoadingButton
        variant="outline"
        type="button"
        isLoading={isExporting}
        Icon={DownloadIcon}
        onClick={exportPdf}
      >
        Export
      </LoadingButton>
    </nav>
  );
}
