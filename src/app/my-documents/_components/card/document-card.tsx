import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import type { Document as DocumentType } from "@/types/document";
import Link from "next/link";

export function DocumentCard({ doc }: { doc: DocumentType<true> }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const src = useMemo(
    () =>
      doc.pages?.[0]
        ? URL.createObjectURL(doc.pages?.[0].image.source)
        : undefined,
    [doc.pages]
  );

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
      <Button variant="destructive">
        <Trash2Icon />
        Delete
      </Button>
    </div>
  );
}
