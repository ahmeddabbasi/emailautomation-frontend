"use client";

import { useRef, useState, DragEvent } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropzone({
  value,
  onChange,
  onUpload,
  accept = "image/*",
  hint,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  if (uploading) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface-raised p-3">
        <Loader2 size={16} className="animate-spin text-muted-faint" />
        <p className="text-[13px] text-muted">Uploading…</p>
      </div>
    );
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface-raised p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Attached" className="h-14 w-14 rounded-md border border-border object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-fg">{value.split("/").pop()}</p>
          <p className="text-[11.5px] text-muted-faint">Attached to the Day 0 email</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-faint hover:bg-surface-hover hover:text-danger"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-accent bg-accent-muted/40" : "border-border hover:border-border-strong"
        )}
      >
        <ImagePlus size={18} className="text-muted-faint" />
        <p className="text-[12.5px] font-medium text-fg">
          Drop an image, or <span className="text-accent">browse</span>
        </p>
        {hint && <p className="text-[11px] text-muted-faint">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="mt-1.5 text-[11.5px] text-danger">{error}</p>}
    </div>
  );
}
