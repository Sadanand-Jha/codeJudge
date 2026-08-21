"use client";

import { FileText, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { UploadedFile } from "./types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileCard({
  file,
  onRemove,
}: {
  file: UploadedFile;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 transition-colors",
        file.valid
          ? "border-emerald-500/20 bg-emerald-500/[0.04]"
          : "border-rose-500/20 bg-rose-500/[0.04]"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          file.valid
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        )}
      >
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-text-primary">{file.name}</p>
          {file.valid ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-text-secondary">
          <span className="uppercase font-medium">{file.type}</span>
          <span>·</span>
          <span>{file.pageCount} page{file.pageCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{formatSize(file.size)}</span>
        </div>
        {file.error && <p className="mt-1 text-xs text-rose-500">{file.error}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-500"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
