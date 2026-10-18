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
        "flex min-w-0 items-start gap-3 rounded-[16px] border-2 p-3 text-left transition-colors sm:items-center sm:gap-4 sm:p-4",
        file.valid
          ? "border-[var(--qs-ok)]/50 bg-[var(--qs-ok)]/[0.06]"
          : "border-[var(--qs-bad)]/50 bg-[var(--qs-bad)]/[0.05]"
      )}
    >
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-[12px]",
          file.valid
            ? "bg-[var(--qs-ok)]/15 text-[var(--qs-ok)]"
            : "bg-[var(--qs-bad)]/15 text-[var(--qs-bad)]"
        )}
      >
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-extrabold text-[var(--qs-ink)]">{file.name}</p>
          {file.valid ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--qs-ok)]" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-[var(--qs-muted)] sm:text-xs">
          <span className="uppercase">{file.type}</span>
          <span>·</span>
          <span>{file.pageCount} page{file.pageCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{formatSize(file.size)}</span>
        </div>
        {file.error && <p className="mt-1 text-xs font-semibold text-[var(--qs-bad)]">{file.error}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bad)]/10 hover:text-[var(--qs-bad)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
