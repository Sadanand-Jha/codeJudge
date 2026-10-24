"use client";

import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { timeAgo } from "@/lib/formatters";
import { getUserTimeZone } from "@/lib/timezone";
import type { CreatorProfileOverview, CreatorRecentAttempt } from "@/services/creatorProfile";

const nf = new Intl.NumberFormat("en-IN");

function exactDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    timeZone: getUserTimeZone(),
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function scoreLabel(a: CreatorRecentAttempt): string {
  const pct = typeof a.percentage === "string" ? Number(a.percentage) : a.percentage;
  if (pct !== null && pct !== undefined && !Number.isNaN(pct)) return `${Math.round(pct)}%`;
  if (a.score !== null && a.score !== undefined) return `${a.score} pts`;
  return a.status === "completed" ? "Submitted" : "In progress";
}

export function StudentInsights({ overview }: { overview: CreatorProfileOverview }) {
  const { students, attempts } = overview;
  const items = overview.recentAttempts;

  return (
    <div className="flex h-full flex-col rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="qs-display text-[17px] font-extrabold text-[var(--qs-ink)]">Student insights</h2>
        <Link
          href="/creator/students"
          className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[var(--qs-brand)] transition-colors hover:brightness-110"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-center">
        <div>
          <p className="qs-display text-[18px] font-extrabold text-[var(--qs-ink)]">{nf.format(students.total)}</p>
          <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--qs-muted)]">Unique</p>
        </div>
        <div className="border-x border-[var(--qs-line)]">
          <p className="qs-display text-[18px] font-extrabold text-[var(--qs-ink)]">{nf.format(students.recentActive)}</p>
          <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--qs-muted)]">Active · 30d</p>
        </div>
        <div>
          <p className="qs-display text-[18px] font-extrabold text-[var(--qs-ink)]">{students.avgAttemptsPerStudent}</p>
          <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--qs-muted)]">Avg / student</p>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]">
              <Users className="h-4 w-4" />
            </span>
            <p className="text-[13px] font-extrabold text-[var(--qs-ink)]">No student activity yet</p>
            <p className="max-w-[240px] text-[11px] leading-relaxed text-[var(--qs-muted)]">
              Attempts on your quizzes will appear here — {nf.format(attempts.total)} total so far.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--qs-line)]">
            {items.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[12px] font-extrabold text-[var(--qs-ink)]">
                  {(a.studentName || "S").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--qs-ink)]">
                    {a.studentName}
                    <span className="font-normal text-[var(--qs-muted)]"> attempted </span>
                    <span className="font-medium">{a.quizName || "a quiz"}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--qs-muted)]" title={exactDate(a.attemptedAt)}>
                    {a.attemptedAt ? timeAgo(a.attemptedAt) : "recently"} · {scoreLabel(a)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
