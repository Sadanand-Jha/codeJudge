"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  CheckCircle2,
  Timer,
  Target,
  ChevronRight,
  ClipboardList,
  Code2,
  Trophy,
  ArrowRight,
  Search,
  CornerDownLeft,
} from "lucide-react";
import { SearchBar } from "./SearchBar";
import { buildSearchIndex } from "./mockData";
import type { SearchResultKind } from "./types";
import { cn } from "@/lib/helpers";

const QUICK_CHIPS = [
  { label: "JEE Main", exam: "jee" },
  { label: "NEET", exam: "neet" },
  { label: "SSC CGL", exam: "ssc" },
  { label: "UPSC", exam: "upsc" },
  { label: "CUET", exam: "cuet" },
  { label: "GATE", exam: "gate" },
];

const RESULT_GROUP: Record<SearchResultKind, string> = {
  test: "Tests",
  series: "Test Series",
  problem: "Problems",
  contest: "Contests",
  teacher: "Teachers",
  exam: "Exams",
};

const RESULT_ORDER: SearchResultKind[] = ["test", "series", "problem", "contest", "teacher", "exam"];

const PRODUCT_TABS = [
  {
    id: "tests",
    icon: ClipboardList,
    title: "TESTS",
    description: "Competitive exams and teacher-created test series.",
    href: "/tests",
    meta: "1,40,000+ tests",
  },
  {
    id: "problems",
    icon: Code2,
    title: "PROBLEMS",
    description: "Individual coding and DSA problems.",
    href: "/problems",
    meta: "12,000+ challenges",
  },
  {
    id: "contests",
    icon: Trophy,
    title: "CONTESTS",
    description: "Timed competitive programming and coding competitions.",
    href: "/contests",
    meta: "Weekly · Monthly · Live",
  },
];

/**
 * Assessment Hub hero — "Test. Practice. Compete. Improve."
 * Three sibling products (Tests / Problems / Contests) + a categorized
 * global search, so the hierarchy is obvious before you scroll.
 */
export function TestsHero({ onSearch }: { onSearch?: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Close the results dropdown when clicking anywhere outside the search box.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = useMemo(() => buildSearchIndex(query), [query]);
  const showResults = focused && query.trim().length > 0;

  const grouped = useMemo(() => {
    const g: { kind: SearchResultKind; label: string; items: typeof results }[] = [];
    for (const kind of RESULT_ORDER) {
      const items = results.filter((r) => r.kind === kind).slice(0, 4);
      if (items.length) g.push({ kind, label: RESULT_GROUP[kind], items });
    }
    return g;
  }, [results]);

  return (
    <section className="tests-hero-wrap relative overflow-hidden rounded-3xl border border-border bg-card/60 backdrop-blur-sm">
      <div className="tests-hero-glow" />

      <div className="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-6 lg:px-10 lg:py-12">
        {/* Left — copy + search */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-[11px] font-semibold text-pink-500 dark:border-ai-accent/30 dark:bg-ai-accent/10 dark:text-ai-accent"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink-500" />
            </span>
            The ByteClash Assessment Hub
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-4 text-[34px] font-extrabold leading-[1.06] tracking-tight text-text-primary sm:text-[42px] lg:text-[48px]"
          >
            Test. Practice.
            <br />
            <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 bg-clip-text text-transparent dark:from-pink-400 dark:via-fuchsia-400 dark:to-violet-400">
              Compete. Improve.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-3 max-w-lg text-[15px] leading-relaxed text-text-secondary"
          >
            Prepare for competitive exams, sharpen your coding skills, and compete with thousands of learners.
          </motion.p>

          {/* Search + categorized results */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            ref={searchWrapRef}
            className="relative z-20 mt-6 max-w-xl"
            onFocusCapture={() => setFocused(true)}
          >
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={() => onSearch?.(query)}
              placeholder="Search tests, test series, exams, problems, contests..."
            />

            {/* Results panel */}
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="tests-search-panel absolute left-0 right-0 top-[58px] z-30 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl shadow-black/40 backdrop-blur-xl"
              >
                {grouped.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Search className="mx-auto h-5 w-5 text-text-muted" />
                    <p className="mt-2 text-sm font-semibold text-text-primary">No results for “{query}”</p>
                    <p className="mt-0.5 text-xs text-text-muted">Try an exam name, topic or teacher.</p>
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {grouped.map((g) => (
                      <div key={g.kind} className="mb-1">
                        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          {g.label}
                        </div>
                        {g.items.map((r) => (
                          <Link
                            key={r.id}
                            href={r.href}
                            onClick={() => setFocused(false)}
                            className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-ai-accent-soft"
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold",
                                RESULT_ICON[r.kind].cls
                              )}
                            >
                              {r.badge?.[0] ?? r.kind[0].toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-text-primary">
                                {r.title}
                              </span>
                              <span className="block truncate text-[11px] text-text-secondary">{r.subtitle}</span>
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                        ))}
                      </div>
                    ))}
                    <div className="mt-1 flex items-center justify-between border-t border-border px-2 py-2">
                      <span className="text-[11px] text-text-muted">{results.length} matches</span>
                      <button
                        onClick={() => {
                          onSearch?.(query);
                          setFocused(false);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-500 dark:text-ai-accent"
                      >
                        View all in marketplace
                        <CornerDownLeft className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            <span className="text-xs text-text-muted">Popular:</span>
            {QUICK_CHIPS.map((chip) => {
              return (
                <Link
                  key={chip.exam}
                  href={`/tests?exam=${chip.exam}`}
                  className="rounded-full border border-border bg-card-hover/60 px-3 py-1 text-xs font-semibold text-text-secondary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
                >
                  {chip.label}
                </Link>
              );
            })}
            <span className="text-xs text-text-muted">· 20+ exams</span>
          </motion.div>
        </div>

        {/* Right — dashboard-style visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="relative mx-auto max-w-[380px] rounded-2xl border border-border bg-card p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-text-secondary">Latest Mock Score</div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                <TrendingUp className="h-3 w-3" /> +4.2%
              </span>
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="text-4xl font-extrabold tabular-nums tracking-tight text-text-primary">
                172<span className="text-lg font-bold text-text-muted">/200</span>
              </div>
              <div className="mb-1 inline-flex items-center gap-1 rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] font-bold text-violet-500 dark:text-violet-300">
                <Target className="h-3.5 w-3.5" /> 97.35 percentile
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                { label: "Physics", value: 88, bar: "from-pink-500 to-rose-400" },
                { label: "Chemistry", value: 79, bar: "from-violet-500 to-fuchsia-400" },
                { label: "Mathematics", value: 68, bar: "from-blue-500 to-cyan-400" },
              ].map((row, i) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-text-secondary">{row.label}</span>
                    <span className="font-bold tabular-nums text-text-primary">{row.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-card-hover">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.value}%` }}
                      transition={{ duration: 0.9, delay: 0.5 + i * 0.12, ease: "easeOut" }}
                      className={cnBar(row.bar)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-card-hover/70 px-3 py-2.5 text-[11px]">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <Timer className="h-3.5 w-3.5 text-text-muted" /> 1h 41m spent
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" /> 43 correct
              </span>
            </div>
          </div>

          <div className="tests-float-slow absolute -left-6 top-6 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-500">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-text-primary">Rank improved</div>
              <div className="text-[9px] text-text-muted">#1,284 → #612</div>
            </div>
          </div>

          <div className="tests-float-slower absolute -right-4 bottom-8 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/12 text-violet-500 dark:text-violet-300">
              <Target className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-text-primary">Weak topic cleared</div>
              <div className="text-[9px] text-text-muted">Electrostatics · 92%</div>
            </div>
          </div>

          <div className="tests-float-slow absolute -left-3 bottom-16 hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 shadow-lg xl:flex">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[10px] font-semibold text-text-primary">14-day streak</span>
          </div>

          <Link
            href="/tests/results/atn_9f3k2"
            className="group absolute -bottom-3 right-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-[0_4px_14px_rgba(236,72,153,0.4)] transition-transform hover:-translate-y-0.5"
          >
            View my result
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>

      {/* Product tabs — the three sibling activities */}
      <div className="relative border-t border-border bg-card/40 px-5 py-4 sm:px-8 sm:py-5 lg:px-10">
        <div className="grid gap-3 sm:grid-cols-3">
          {PRODUCT_TABS.map((tab, i) => {
            const active = tab.id === "tests";
            const Icon = tab.icon;
            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 + i * 0.08 }}
              >
                <Link
                  href={tab.href}
                  className={cn(
                    "group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-all duration-200",
                    active
                      ? "border-pink-500/40 bg-gradient-to-br from-pink-500/10 to-violet-600/10 shadow-[0_0_0_1px_rgba(236,72,153,0.2)]"
                      : "border-border bg-card hover:-translate-y-0.5 hover:border-pink-500/25 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:hover:border-ai-accent/30"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-pink-500 to-violet-600" />
                  )}
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      active
                        ? "bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)]"
                        : "bg-card-hover text-text-secondary ring-1 ring-border group-hover:text-pink-500 dark:group-hover:text-ai-accent"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-extrabold tracking-wide",
                          active ? "text-pink-500 dark:text-ai-accent" : "text-text-primary"
                        )}
                      >
                        {tab.title}
                      </span>
                      {active && (
                        <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-pink-500 dark:bg-ai-accent/15 dark:text-ai-accent">
                          Viewing
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-text-secondary">{tab.description}</span>
                    <span className="mt-1 block text-[10px] font-semibold text-text-muted">{tab.meta}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-pink-500 dark:group-hover:text-ai-accent" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const RESULT_ICON: Record<SearchResultKind, { cls: string }> = {
  test: { cls: "bg-pink-500/15 text-pink-500 dark:text-ai-accent" },
  series: { cls: "bg-violet-500/15 text-violet-500 dark:text-violet-300" },
  problem: { cls: "bg-blue-500/15 text-blue-500 dark:text-blue-300" },
  contest: { cls: "bg-amber-500/15 text-amber-500 dark:text-amber-300" },
  teacher: { cls: "bg-emerald-500/15 text-emerald-500 dark:text-emerald-300" },
  exam: { cls: "bg-slate-500/15 text-slate-500 dark:text-slate-300" },
};

function cnBar(cls: string) {
  return `bg-gradient-to-t ${cls}`;
}