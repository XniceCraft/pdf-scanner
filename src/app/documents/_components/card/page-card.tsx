import Link from "next/link";
import { Image } from "@/components/image";

export function PageCard({
  documentId,
  pageId,
  thumbnail,
  index,
}: {
  documentId: number;
  pageId: number;
  thumbnail: Blob;
  index: number;
}) {
  return (
    <Link
      href={{
        pathname: "/documents/edit",
        query: { id: documentId, page: pageId },
      }}
      className="relative"
    >
      <Image
        src={thumbnail}
        alt={`Page ${index + 1}`}
        className="w-full h-full object-cover"
      />
      <section className="absolute inset-x-0 bottom-0 flex items-center justify-center h-8 bg-black/60">
        <p className="text-xs text-white">{index + 1}</p>
      </section>
    </Link>
  );
}
