"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { btnClass, btnPrimaryClass } from "./ui";

export function AnalyticsTopBar({
  quizName,
  code,
  status,
  questionCount,
  attemptCount,
  onExport,
  exporting,
}: {
  quizName: string;
  code: string;
  status: string | null;
  questionCount: number;
  attemptCount: number;
  onExport: () => void;
  exporting?: boolean;
}) {
  const toast = useToast();

  const copyCode = () => {
    if (!code) return;
    try {
      void navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    toast.success({ title: "Copied", description: "Quiz code copied to clipboard." });
  };

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[40px]">
          {quizName}
        </h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          {code && (
            <button
              type="button"
              onClick={copyCode}
              title="Copy quiz code"
              className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-dashed border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-0.5 text-[13px] font-extrabold uppercase tracking-[0.1em] text-[#1A1240] transition hover:brightness-105"
            >
              {code}
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="text-sm font-medium text-[var(--qs-muted)]">
            {questionCount} questions · {attemptCount} attempts
          </span>
          {status && (
            <span className="text-sm font-bold capitalize text-[var(--qs-muted)]">{status}</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/creator/quizzes" className={btnClass}>
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
        </Link>
        <button type="button" onClick={onExport} disabled={exporting} className={btnPrimaryClass}>
          <Download className="h-4 w-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
    </div>
  );
}
