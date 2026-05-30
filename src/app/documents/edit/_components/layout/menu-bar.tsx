"use client";

import { useRouter } from "next/navigation";
import { useExportPdf } from "@/hooks/utils/use-export-pdf";
import { Button, LoadingButton } from "@/components/ui/button";
import { ChangeNameDialog } from "@/components/dialog/change-name-dialog";
import { ChevronLeftIcon, DownloadIcon } from "lucide-react";

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
  const { exportPdf, isExporting } = useExportPdf(documentId, documentName);

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
        <LoadingButton
          variant="outline"
          type="button"
          className="bg-primary/20! border-primary/40!"
          onClick={exportPdf}
          isLoading={isExporting}
          Icon={DownloadIcon}
        />
      </div>
      <ChangeNameDialog
        documentUpdater={documentUpdater}
        documentId={documentId}
        name={documentName}
      />
    </nav>
  );
}
