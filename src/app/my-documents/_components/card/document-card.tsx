import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { formatDate } from "@/lib/utils";
import documentService from "@/lib/services/document";

import type { Document as DocumentType } from "@/types/document";
import type { Updater } from "use-mutative";

export function DocumentCard({
  doc,
  documentAction,
}: {
  doc: DocumentType<true>;
  documentAction: Updater<DocumentType<true>[]>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const src = useMemo(
    () =>
      doc.pages?.[0]
        ? URL.createObjectURL(doc.pages?.[0].image.source)
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

  useEffect(() => {
    const img = imageRef.current;
    if (!img || !src) return;

    const handleLoad = () => URL.revokeObjectURL(src);
    img.addEventListener("load", handleLoad);

    return () => img.removeEventListener("load", handleLoad);
  }, [src]);

  return (
    <div className="flex items-center justify-between w-full rounded overflow-hidden border pe-4">
      <Link href={`/documents?id=${doc.id}`} className="flex gap-3 flex-1">
        <img
          ref={imageRef}
          src={src}
          alt={doc.name}
          className="aspect-square w-24 object-cover"
        />
        <div className="ms-2 py-2">
          <h5 className="font-medium text-lg">{doc.name}</h5>
          <time className="text-xs font-light">
            {formatDate(doc.createdAt)}
          </time>
        </div>
      </Link>
      <ResponsiveDialog>
        <ResponsiveDialogTrigger asChild>
          <Button variant="destructive">
            <Trash2Icon />
            Delete
          </Button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Delete document?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              This will permanently delete &quot;{doc.name}&quot; and all of its
              data. This action cannot be undone.
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
              {isDeleting && <Loader2Icon className="size-4 animate-spin" />}
              Delete
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
