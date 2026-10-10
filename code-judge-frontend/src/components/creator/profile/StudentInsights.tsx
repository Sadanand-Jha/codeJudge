"use client";

import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { timeAgo, IST_TIMEZONE } from "@/lib/formatters";
import type { CreatorProfileOverview, CreatorRecentAttempt } from "@/services/creatorProfile";

const nf = new Intl.NumberFormat("en-IN");

function exactDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    timeZone: IST_TIMEZONE,
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
    <div className="flex h-full flex-col rounded-2xl border border-profile-border bg-profile-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-profile-text-primary">Student insights</h2>
        <Link
          href="/creator/students"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-profile-accent transition-colors hover:text-profile-accent-hover"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-profile-surface-elevated/60 p-3 text-center">
        <div>
          <p className="text-[17px] font-bold text-profile-text-primary">{nf.format(students.total)}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-profile-text-muted">Unique</p>
        </div>
        <div className="border-x border-profile-border">
          <p className="text-[17px] font-bold text-profile-text-primary">{nf.format(students.recentActive)}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-profile-text-muted">Active · 30d</p>
        </div>
        <div>
          <p className="text-[17px] font-bold text-profile-text-primary">{students.avgAttemptsPerStudent}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-profile-text-muted">Avg / student</p>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-profile-border px-4 py-8 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-profile-surface-elevated">
              <Users className="h-4 w-4 text-profile-text-muted" />
            </span>
            <p className="text-[13px] font-semibold text-profile-text-primary">No student activity yet</p>
            <p className="max-w-[240px] text-[11px] leading-relaxed text-profile-text-muted">
              Attempts on your quizzes will appear here — {nf.format(attempts.total)} total so far.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-profile-border">
            {items.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-profile-surface-elevated text-[12px] font-bold text-profile-text-secondary">
                  {(a.studentName || "S").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-profile-text-primary">
                    {a.studentName}
                    <span className="font-normal text-profile-text-muted"> attempted </span>
                    <span className="font-medium">{a.quizName || "a quiz"}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-profile-text-muted" title={exactDate(a.attemptedAt)}>
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
