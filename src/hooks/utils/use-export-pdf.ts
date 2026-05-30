"use client";

import { useCallback, useState } from "react";
import { useOpenCV } from "@/providers/opencv-provider";
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
  const { cv, isLoading } = useOpenCV();

  const exportPdf = useCallback(async () => {
    const toastId = toast.loading(`Exporting "${documentName}.pdf"`);

    try {
      if (isExporting) return;

      if (isLoading) {
        setIsExporting(false);
        toast.error("Please wait for OpenCV to load");
        return;
      }

      setIsExporting(true);
      const blob = await documentService.exportToPdf(cv, documentId);
      if (!blob) {
        setIsExporting(false);
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
  }, [cv, documentId, documentName, isLoading, isExporting]);

  return { exportPdf, isExporting };
}
