"use client";

import { useRouter } from "next/navigation";
import { useExportPdf } from "@/hooks/utils/use-export-pdf";
import { ChangeNameDialog } from "@/components/dialog/change-name-dialog";
import {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";

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

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <nav className="flex justify-between items-center border-b border-border py-1">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarItem onClick={handleBack}>Back</MenubarItem>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarItem onClick={exportPdf} disabled={isExporting}>
                Export
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <ChangeNameDialog
        documentUpdater={documentUpdater}
        documentId={documentId}
        name={documentName}
      />
      <div></div>
    </nav>
  );
}
