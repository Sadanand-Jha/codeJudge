"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { btnPrimaryClass } from "./ui";

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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <Link
          href="/creator/quizzes"
          title="Back to Quizzes"
          aria-label="Back to Quizzes"
          className="mt-1 grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[40px]">
            {quizName}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-sm font-medium text-[var(--qs-muted)]">
              {questionCount} questions · {attemptCount} attempts
            </span>
            {status && (
              <span className="text-sm font-bold capitalize text-[var(--qs-muted)]">{status}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onExport} disabled={exporting} className={btnPrimaryClass}>
          <Download className="h-4 w-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
    </div>
  );
}
