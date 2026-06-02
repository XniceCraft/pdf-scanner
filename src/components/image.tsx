"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

export function Image({
  src,
  alt,
  ...props
}: HTMLAttributes<HTMLImageElement> & {
  src: Blob | undefined;
  alt: string;
}) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    let isDisposed = false;
    const newImageSrc = src ? URL.createObjectURL(src) : undefined;
    if (!newImageSrc) return;

    img.src = newImageSrc;
    const handleLoad = () => {
      if (!isDisposed) {
        isDisposed = true;
        URL.revokeObjectURL(newImageSrc);
      }
    };
    img.addEventListener("load", handleLoad);

    return () => {
      img.removeEventListener("load", handleLoad);
      if (!isDisposed && newImageSrc) URL.revokeObjectURL(newImageSrc);

      isDisposed = true;
    };
  }, [src]);

  return <img ref={imageRef} alt={alt} {...props} />;
}
