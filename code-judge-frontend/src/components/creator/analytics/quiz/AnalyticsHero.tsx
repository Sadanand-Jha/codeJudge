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
    <div className="relative mb-3 mr-0 sm:mb-7 sm:mr-4">
      <div aria-hidden="true" className="absolute left-3 top-3 -bottom-3 -right-3 hidden rounded-[22px] bg-[var(--qs-sun)] sm:block sm:left-4 sm:top-4 sm:-bottom-4 sm:-right-4 sm:rounded-[30px]" />
      <div className="relative overflow-hidden rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] sm:rounded-[26px] sm:border-2">
        <div className="bg-[var(--qs-brand)] px-3.5 pt-3.5 text-[var(--qs-on-brand)] sm:px-5 sm:pt-6 md:px-[26px]">
          <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="rounded-full border border-current px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.05em] sm:border-2 sm:px-[11px] sm:py-px sm:text-xs sm:font-extrabold sm:tracking-[0.06em]">
                  Analytics overview
                </span>
                {status && (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.05em] sm:border-2 sm:px-[11px] sm:py-px sm:text-xs sm:font-extrabold sm:tracking-[0.06em]",
                      isLive
                        ? "border-[var(--qs-surface)] bg-[var(--qs-surface)] text-[var(--qs-brand)]"
                        : "border-current"
                    )}
                  >
                    {isLive ? "● Live" : status}
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-[16px] font-bold leading-5 tracking-tight sm:mt-3.5 sm:text-[26px] sm:font-extrabold sm:leading-normal md:text-[32px]">
                How this quiz is performing
              </h2>
              <p className="mt-1 max-w-[60ch] text-[10.5px] font-medium leading-4 opacity-90 sm:mt-1.5 sm:text-sm">
                A focused view of participation, outcomes and question quality.
              </p>
            </div>
            {difficultyName && (
              <div className="rounded-[10px] bg-[var(--qs-surface)] px-2.5 py-1.5 text-[var(--qs-ink)] sm:rounded-[16px] sm:px-4 sm:py-2.5">
                <small className="block text-[8px] font-bold uppercase tracking-[0.05em] text-[var(--qs-muted)] sm:text-xs sm:font-extrabold sm:tracking-[0.07em]">
                  Quiz difficulty
                </small>
                <b className="text-[12px] font-bold sm:text-xl sm:font-extrabold">{difficultyName}</b>
              </div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2.5 border-t border-white/25 pt-3 pb-3.5 sm:mt-6 sm:gap-y-5 sm:border-t-2 sm:pt-5 sm:pb-6 sm:grid-cols-4">
            {kpis.map((k, i) => (
              <div
                key={k.label}
                className={cn(
                  "min-w-0 px-0.5 sm:px-1",
                  i > 0 && "sm:border-l-2 sm:border-white/25 sm:pl-5",
                  i === 0 && "sm:pl-0"
                )}
              >
                <small className="text-[8.5px] font-bold uppercase tracking-[0.05em] opacity-85 sm:text-xs sm:font-extrabold sm:tracking-[0.08em]">{k.label}</small>
                <b className="my-0.5 block text-[18px] font-bold leading-5 sm:my-1 sm:text-[32px] sm:font-extrabold sm:leading-[1.1] md:text-[42px]">{k.value}</b>
                <span className="block text-[9px] font-medium leading-3 opacity-90 sm:text-sm">{k.hint}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-[var(--qs-line)] sm:border-t-2 sm:grid-cols-4">
          {subStats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "px-2.5 py-2 sm:px-5 sm:py-3.5",
                i % 2 !== 0 && "border-l border-[var(--qs-line)] sm:border-l-2",
                i >= 2 && "border-t border-[var(--qs-line)]",
                "sm:border-t-0",
                i > 0 && "sm:border-l-2 sm:border-[var(--qs-line)]"
              )}
            >
              <small className="block text-[8px] font-bold uppercase tracking-[0.05em] text-[var(--qs-muted)] sm:text-xs sm:font-extrabold sm:tracking-[0.07em]">
                {s.label}
              </small>
              <b className="text-[12px] font-bold text-[var(--qs-ink)] sm:text-lg sm:font-extrabold sm:text-xl">{s.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
