import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EyeIcon, FileDownIcon, Trash2Icon } from "lucide-react";
import { getDateTime, getUpdatedAt } from "@/lib/utils";
import documentService from "@/lib/services/document";
import toast from "react-hot-toast";

import type { Document as DocumentType } from "@/types/document";
import type { Updater } from "use-mutative";

export function DocumentCard({
  doc,
  documentAction,
}: {
  doc: DocumentType<true, true>;
  documentAction: Updater<DocumentType<true, true>[]>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const src = useMemo(
    () =>
      doc.pages?.[0]
        ? URL.createObjectURL(doc.pages?.[0].editedImage.thumbnail)
        : undefined,
    [doc.pages]
  );

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await documentService.delete(doc.id);
      documentAction((draft) => {
        draft.splice(
          draft.findIndex((item) => item.id === doc.id),
          1
        );
      });
    } finally {
      setIsDeleting(false);
    }
  }, [doc.id, documentAction]);

  const handleExport = useCallback(async () => {
    const toastId = toast.loading(`Exporting "${doc.name}.pdf"`);

    try {
      const blob = await documentService.exportToPdf(doc.id);
      if (!blob) {
        toast.error("Failed to export document");
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${doc.name}.pdf`;
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(anchor.href);

      toast.success(`Exported "${doc.name}.pdf" successfully`, { id: toastId });
    } catch {
      toast.dismiss(toastId);
      toast.error(`Failed to export "${doc.name}.pdf"`);
    }
  }, [doc.id, doc.name]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img || !src) return;

    const handleLoad = () => URL.revokeObjectURL(src);
    img.addEventListener("load", handleLoad);

    return () => img.removeEventListener("load", handleLoad);
  }, [src]);

  return (
    <div className="flex items-center justify-between w-full rounded overflow-hidden border pe-4 hover:bg-white/5 transition-colors">
      <Link href={`/documents?id=${doc.id}`} className="flex gap-3 flex-1">
        <img
          ref={imageRef}
          src={src}
          alt={doc.name}
          className="aspect-square w-24 object-cover"
        />
        <div className="ms-2 py-3 flex flex-col justify-between">
          <h5 className="font-medium text-lg">{doc.name}</h5>
          <section className="text-xs">
            <p className="inline-block font-medium">
              {doc.pageCount} page{doc.pageCount !== 1 && "s"}
            </p>
            <span>{" • "}</span>
            <time className="font-light text-muted-foreground">
              {getUpdatedAt(doc.updatedAt)}
            </time>
            <span>{" • "}</span>
            <time className="font-light text-muted-foreground">
              {`Created at ${getDateTime(doc.createdAt)}`}
            </time>
          </section>
        </div>
      </Link>
      <section className="space-x-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" asChild>
              <Link href={`/documents?id=${doc.id}`}>
                <EyeIcon />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open document</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={handleExport}>
              <FileDownIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export to PDF</p>
          </TooltipContent>
        </Tooltip>
        <ResponsiveDialog>
          <ResponsiveDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2Icon />
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Delete document?</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                This will permanently delete &quot;{doc.name}&quot; and all of
                its data. This action cannot be undone.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ResponsiveDialogFooter>
              <ResponsiveDialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </ResponsiveDialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting && <Spinner />}
                Delete
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </section>
    </div>
  );
}
