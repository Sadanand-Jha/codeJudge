"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

export function AnalyticsTopBar({
  quizName,
  status,
  questionCount,
  attemptCount,
  onExport,
  exporting,
}: {
  quizName: string;
  status: string | null;
  questionCount: number;
  attemptCount: number;
  onExport: () => void;
  exporting?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2 sm:mb-6 sm:flex-wrap sm:items-start sm:gap-4">
      <div className="flex min-w-0 items-center gap-2 sm:items-start sm:gap-3">
        <Link
          href="/creator/quizzes"
          title="Back to Quizzes"
          aria-label="Back to Quizzes"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] sm:mt-1 sm:h-[42px] sm:w-[42px] sm:rounded-[12px] sm:border-2"
        >
          <ArrowLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </Link>
        <div className="min-w-0">
          <h1 className="qs-display text-[20px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[40px] sm:font-extrabold sm:leading-[1.05]">
            {quizName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 sm:mt-2.5 sm:gap-x-3 sm:gap-y-2">
            <span className="text-[10.5px] font-medium text-[var(--qs-muted)] sm:text-sm">
              {questionCount} questions · {attemptCount} attempts
            </span>
            {status && (
              <span className="text-[10.5px] font-bold capitalize text-[var(--qs-muted)] sm:text-sm">{status}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          aria-label="Export analytics CSV"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition hover:brightness-105 disabled:opacity-60 sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-[12px] sm:border-2 sm:px-3.5 sm:py-[9px] sm:text-sm sm:font-extrabold sm:shadow-[3px_3px_0_var(--qs-sun)]"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export CSV"}</span>
        </button>
      </div>
    </div>
  );
}
