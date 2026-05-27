import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

export function PageCard({
  documentId,
  thumbnail,
  index,
}: {
  documentId: number;
  thumbnail: Blob;
  index: number;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const src = useMemo(() => URL.createObjectURL(thumbnail), [thumbnail]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const handleLoad = () => URL.revokeObjectURL(src);
    img.addEventListener("load", handleLoad);

    return () => img.removeEventListener("load", handleLoad);
  }, [src]);

  return (
    <Link
      href={{ pathname: "/documents/edit", query: { id: documentId } }}
      className="relative"
    >
      <img
        src={src}
        ref={imageRef}
        alt={`Page ${index + 1}`}
        className="w-full h-full object-cover"
      />
      <section className="absolute inset-x-0 bottom-0 flex items-center justify-center h-8 bg-black/60">
        <p className="text-xs text-white">{index + 1}</p>
      </section>
    </Link>
  );
}
