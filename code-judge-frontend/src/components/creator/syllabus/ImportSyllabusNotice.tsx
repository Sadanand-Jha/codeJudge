"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Upload } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useSyllabusImportAccess } from "@/hooks/useSyllabusImportAccess";

interface ImportSyllabusNoticeProps {
  className?: string;
  compact?: boolean;
}

export function ImportSyllabusNotice({ className, compact = false }: ImportSyllabusNoticeProps) {
  const router = useRouter();
  const { requestImport } = useSyllabusImportAccess();
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed border-border bg-card px-4 py-3",
        compact ? "flex flex-wrap items-center gap-3 text-left" : "text-center",
        className
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pink-500/10 text-pink-500",
          !compact && "mx-auto"
        )}
      >
        <BookOpen className="h-4 w-4" />
      </span>
      <div className={cn("min-w-0", compact ? "flex-1" : "mt-2")}>
        <p className="text-xs font-bold text-text-primary">Import your syllabus first</p>
        <p className="mt-0.5 text-[11px] text-text-muted">
          Add at least one syllabus to select subjects, chapters, and topics.
        </p>
      </div>
      <button
        type="button"
        onClick={() => requestImport(() => router.push("/creator/syllabus"))}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-bold text-text-primary transition-colors hover:border-pink-500/40 hover:text-pink-500",
          !compact && "mt-3"
        )}
      >
        <Upload className="h-3 w-3" />
        Import syllabus
      </button>
    </div>
  );
}

export default ImportSyllabusNotice;
