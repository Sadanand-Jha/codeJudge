"use client";

import { useMemo, useState, useCallback } from "react";
import { Database, Loader2, ArrowRight, Terminal } from "lucide-react";
import type { ProblemListItem } from "@/types/problem";
import { fetchProblemsLive } from "@/services/problems";
import { mergeProblems } from "../marketplace";
import { ProblemBrowser } from "../ProblemBrowser";
import type { MarketplaceProblem } from "../marketplace";

const LAYOUT_CLASSES =
  "mx-auto w-full max-w-[1600px] px-5 pb-16 sm:px-8 lg:px-10 xl:px-12 2xl:px-16";

export function CompetitiveProgrammingPage({
  problems,
  initialQuery,
}: {
  problems: ProblemListItem[];
  initialQuery?: string;
}) {
  const [realProblems, setRealProblems] = useState<ProblemListItem[]>(problems);
  const [refreshing, setRefreshing] = useState(false);

  const cpProblems = useMemo<MarketplaceProblem[]>(
    () => mergeProblems(realProblems).filter((p) => p.real),
    [realProblems],
  );

  const cpCount = cpProblems.length;
  const cpRatings = cpProblems.map((p) => p.rating).filter((r) => r > 0);
  const cpAvg = cpRatings.length ? Math.round(cpRatings.reduce((s, r) => s + r, 0) / cpRatings.length) : 0;
  const cpMax = cpRatings.length ? Math.max(...cpRatings) : 0;
  const cpBands = {
    easy: cpProblems.filter((p) => p.rating > 0 && p.rating < 1200).length,
    medium: cpProblems.filter((p) => p.rating >= 1200 && p.rating < 1600).length,
    hard: cpProblems.filter((p) => p.rating >= 1600).length,
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setRealProblems(await fetchProblemsLive());
    } catch {
      // keep current data
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <div className="problems-page-shell problems-ambient relative min-h-screen">
      <div className={LAYOUT_CLASSES}>
        <div className="pt-8" />

        {/* CP banner */}
        <section>
          <div className="problems-cp-spotlight relative overflow-hidden rounded-3xl border border-border bg-card/60 backdrop-blur-sm">
            <div className="problems-cp-glow" />
            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-600 dark:border-ai-accent/30 dark:bg-ai-accent/10 dark:text-ai-accent">
                  <Terminal className="h-3 w-3" />
                  Competitive Programming
                </div>
                <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-text-primary sm:text-[30px]">
                  Live problems from the
                  <br />
                  <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-violet-400 dark:to-fuchsia-400">
                    ByteClash database.
                  </span>
                </h1>
                <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-text-secondary">
                  DSA, algorithms and coding challenges rated 800 → 2400, pulled straight from the
                  database. Every row below opens a full solve workspace.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(139,92,246,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(139,92,246,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {refreshing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Syncing with database…
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4" />
                        Refresh from database
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <span className="text-[11px] font-semibold text-text-muted">
                    {cpCount > 0 ? `${cpCount} problems synced` : "Database unreachable — showing cached list"}
                  </span>
                </div>
              </div>

              {/* Live DB stats */}
              <div className="relative">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_16px_44px_rgba(0,0,0,0.2)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Live database stats
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      {cpCount > 0 ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      { label: "Problems", value: String(cpCount), accent: "text-blue-600 dark:text-blue-300" },
                      { label: "Avg Rating", value: cpAvg ? String(cpAvg) : "—", accent: "text-violet-600 dark:text-ai-accent" },
                      { label: "Max Rating", value: cpMax ? String(cpMax) : "—", accent: "text-fuchsia-600 dark:text-fuchsia-300" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-card-hover/70 px-3 py-2.5">
                        <div className={`text-lg font-extrabold tabular-nums leading-none ${s.accent}`}>{s.value}</div>
                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-text-muted">Rating bands</span>
                      <span className="tabular-nums text-text-secondary">{cpCount} total</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-card-hover">
                      {cpCount > 0 && (
                        <>
                          <div className="bg-emerald-500" style={{ width: `${(cpBands.easy / cpCount) * 100}%` }} />
                          <div className="bg-amber-500" style={{ width: `${(cpBands.medium / cpCount) * 100}%` }} />
                          <div className="bg-rose-500" style={{ width: `${(cpBands.hard / cpCount) * 100}%` }} />
                        </>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-text-muted">
                      <span>Easy · {cpBands.easy}</span>
                      <span>Medium · {cpBands.medium}</span>
                      <span>Hard · {cpBands.hard}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Browser */}
        <div className="mt-10">
          <ProblemBrowser
            problems={cpProblems}
            lockedExam="programming"
            initialQuery={initialQuery}
            title="Competitive Programming Problems"
            subtitle="Coding and DSA challenges from the live database."
          />
        </div>
      </div>
    </div>
  );
}