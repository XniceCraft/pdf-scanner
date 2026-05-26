"use client";

import { GripVertical, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
} from "@/components/ui/file-upload";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableFileItemProps {
  file: File;
  id: string;
}

export function SortableFileItemField({ file, id }: SortableFileItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-0 w-full">
      <FileUploadItem value={file} className="pr-1">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <FileUploadItemPreview />
        <FileUploadItemMetadata />
        <FileUploadItemDelete asChild>
          <Button variant="ghost" size="icon" className="size-7 shrink-0">
            <XIcon />
          </Button>
        </FileUploadItemDelete>
      </FileUploadItem>
    </div>
  );
}
