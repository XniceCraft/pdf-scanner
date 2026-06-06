"use client";

import { useCallback, useState } from "react";
import documentService from "@/lib/services/document";
import toast from "react-hot-toast";

interface UseExportPdfResult {
  exportPdf: () => Promise<void>;
  isExporting: boolean;
}

export function useExportPdf(
  documentId: number,
  documentName: string
): UseExportPdfResult {
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const exportPdf = useCallback(async () => {
    if (isExporting) return;
    const toastId = toast.loading(`Exporting "${documentName}.pdf"`);

    try {
      setIsExporting(true);
      const blob = await documentService.exportToPdf(documentId);
      if (!blob) {
        setIsExporting(false);
        toast.dismiss(toastId);
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
      toast.dismiss(toastId);
      toast.error(`Failed to export "${documentName}.pdf"`);
    } finally {
      setIsExporting(false);
    }
  }, [documentId, documentName, isExporting]);

  return { exportPdf, isExporting };
}
