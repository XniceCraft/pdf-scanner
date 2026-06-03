import { Image } from "@/components/image";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef } from "react";

interface CardProps {
  active?: boolean;
  blob: Blob;
  index: number;
  onClick?: (pageIndex: number) => void;
}

export function PageCard({ index, blob, active, onClick }: CardProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const src = useMemo(() => URL.createObjectURL(blob), [blob]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const handleLoad = () => URL.revokeObjectURL(src);
    img.addEventListener("load", handleLoad);

    return () => img.removeEventListener("load", handleLoad);
  }, [src]);

  return (
    <button
      type="button"
      className={cn(
        "block w-16 h-16 p-3 relative",
        active ? "bg-secondary border border-white/10" : "bg-muted/40"
      )}
      onClick={() => onClick?.(index)}
    >
      <Image
        src={blob}
        className="w-full h-full object-contain"
        alt={`Page ${index + 1} scan`}
      />
      <p className="absolute top-0 left-0 bg-white/25 px-[0.2rem] py-[0.1rem] text-[0.6rem] text-white/60">
        {index + 1}
      </p>
    </button>
  );
}
