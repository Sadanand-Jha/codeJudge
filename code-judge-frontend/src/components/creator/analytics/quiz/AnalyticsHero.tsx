"use client";

import { cn } from "@/lib/helpers";
import type { AnalyticsStats } from "./types";
import { fmtPercent, fmtSec, toNumber } from "./utils";

export function AnalyticsHero({
  stats,
  totalMarks,
  gameTotalUses,
  difficultyName,
  status,
}: {
  stats: AnalyticsStats;
  totalMarks: number;
  gameTotalUses: number;
  difficultyName: string | null;
  status: string | null;
}) {
  const attempts = Math.round(toNumber(stats.total_attempts));
  const completed = Math.round(toNumber(stats.completed_attempts));
  const inProgress = Math.round(toNumber(stats.in_progress_attempts));
  const registrations = Math.round(toNumber(stats.total_registrations));
  const passed = Math.round(toNumber(stats.passed_count));

  const kpis = [
    {
      label: "Attempts",
      value: String(attempts),
      hint: `${registrations} student${registrations === 1 ? "" : "s"} registered`,
    },
    {
      label: "Completion",
      value: fmtPercent(stats.completion_rate),
      hint: `${completed} completed · ${inProgress} in progress`,
    },
    {
      label: "Average score",
      value: toNumber(stats.average_score).toFixed(1),
      hint: `Median ${toNumber(stats.median_score).toFixed(1)} · High ${Math.round(toNumber(stats.highest_score))}${totalMarks > 0 ? ` of ${totalMarks}` : ""}`,
    },
    {
      label: "Pass rate",
      value: fmtPercent(stats.pass_rate),
      hint: `${passed} of ${attempts} attempt${attempts === 1 ? "" : "s"} passed`,
    },
  ];

  const subStats = [
    { label: "Average accuracy", value: fmtPercent(stats.average_accuracy) },
    { label: "Average time", value: fmtSec(stats.average_completion_time) },
    { label: "Fastest finish", value: fmtSec(stats.fastest_time) },
    { label: "Power-up uses", value: String(Math.round(gameTotalUses)) },
  ];

  const isLive = (status ?? "").toLowerCase() === "live" || (status ?? "").toLowerCase() === "active";

  return (
    <div className="relative mb-7 mr-4">
      <div aria-hidden="true" className="absolute left-4 top-4 -bottom-4 -right-4 rounded-[30px] bg-[var(--qs-sun)]" />
      <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
        <div className="bg-[var(--qs-brand)] px-5 pt-6 text-[var(--qs-on-brand)] sm:px-[26px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border-2 border-current px-[11px] py-px text-xs font-extrabold uppercase tracking-[0.06em]">
                  Analytics overview
                </span>
                {status && (
                  <span
                    className={cn(
                      "rounded-full border-2 px-[11px] py-px text-xs font-extrabold uppercase tracking-[0.06em]",
                      isLive
                        ? "border-[var(--qs-surface)] bg-[var(--qs-surface)] text-[var(--qs-brand)]"
                        : "border-current"
                    )}
                  >
                    {isLive ? "● Live" : status}
                  </span>
                )}
              </div>
              <h2 className="mt-3.5 text-[26px] font-extrabold tracking-tight sm:text-[32px]">
                How this quiz is performing
              </h2>
              <p className="mt-1.5 max-w-[60ch] text-sm font-medium opacity-90">
                A focused view of participation, outcomes and question quality.
              </p>
            </div>
            {difficultyName && (
              <div className="rounded-[16px] bg-[var(--qs-surface)] px-4 py-2.5 text-[var(--qs-ink)]">
                <small className="block text-xs font-extrabold uppercase tracking-[0.07em] text-[var(--qs-muted)]">
                  Quiz difficulty
                </small>
                <b className="text-xl font-extrabold">{difficultyName}</b>
              </div>
            )}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-y-5 border-t-2 border-white/25 pt-5 pb-6 sm:grid-cols-4">
            {kpis.map((k, i) => (
              <div
                key={k.label}
                className={cn(
                  "min-w-0 px-1",
                  i > 0 && "sm:border-l-2 sm:border-white/25 sm:pl-5",
                  i === 0 && "sm:pl-0"
                )}
              >
                <small className="text-xs font-extrabold uppercase tracking-[0.08em] opacity-85">{k.label}</small>
                <b className="my-1 block text-[32px] font-extrabold leading-[1.1] sm:text-[42px]">{k.value}</b>
                <span className="text-sm font-medium opacity-90">{k.hint}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t-2 border-[var(--qs-line)] sm:grid-cols-4">
          {subStats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "px-4 py-3.5 sm:px-5",
                i % 2 !== 0 && "border-l-2 border-[var(--qs-line)]",
                i >= 2 && "border-t-2 border-[var(--qs-line)]",
                "sm:border-t-0",
                i > 0 && "sm:border-l-2 sm:border-[var(--qs-line)]"
              )}
            >
              <small className="block text-xs font-extrabold uppercase tracking-[0.07em] text-[var(--qs-muted)]">
                {s.label}
              </small>
              <b className="text-lg font-extrabold text-[var(--qs-ink)] sm:text-xl">{s.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
