"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  CheckCircle2,
  Target,
  ChevronRight,
  Star,
  Braces,
  Database,
} from "lucide-react";
import { SearchBar } from "@/components/tests/SearchBar";
import { ProductTabs } from "@/components/tests/ProductTabs";

const QUICK_CHIPS = [
  { label: "Programming & DSA", exam: "programming" },
  { label: "JEE", exam: "jee" },
  { label: "NEET", exam: "neet" },
  { label: "GATE", exam: "gate" },
  { label: "CAT", exam: "cat" },
  { label: "SSC", exam: "ssc" },
];

const RATING_TREND = [58, 64, 61, 72, 69, 81, 86];

/**
 * Problems hub hero — "Solve. Practice. Compete. Improve."
 * Competitive programming leads, with the three sibling activities
 * (Problems / Tests / Contests) laid out below the fold for context.
 */
export function ProblemsHero({
  onSearch,
  onSelectExam,
}: {
  onSearch?: (query: string) => void;
  onSelectExam?: (exam: string) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <section className="problems-hero-wrap relative overflow-hidden rounded-3xl border border-border bg-card/60 backdrop-blur-sm">
      <div className="problems-hero-glow" />

      <div className="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-6 lg:px-10 lg:py-12">
        {/* Left — copy + search */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-600 dark:border-ai-accent/30 dark:bg-ai-accent/10 dark:text-ai-accent"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-ai-accent" />
            </span>
            The ByteClash Problem Hub
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-4 text-[34px] font-extrabold leading-[1.06] tracking-tight text-text-primary sm:text-[42px] lg:text-[48px]"
          >
            Solve. Practice.
            <br />
            <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-violet-400 dark:to-fuchsia-400">
              Compete. Improve.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-3 max-w-lg text-[15px] leading-relaxed text-text-secondary"
          >
            Competitive programming first — then every competitive exam. One hub for DSA, algorithms
            and practice problems pulled straight from the database.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="relative z-20 mt-6 max-w-xl"
          >
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={() => onSearch?.(query)}
              placeholder="Search problems, topics, concepts..."
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            <span className="text-xs text-text-muted">Popular:</span>
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.exam}
                type="button"
                onClick={() => onSelectExam?.(chip.exam)}
                className="rounded-full border border-border bg-card-hover/60 px-3 py-1 text-xs font-semibold text-text-secondary transition-colors hover:border-violet-500/30 hover:text-violet-600 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
              >
                {chip.label}
              </button>
            ))}
            <span className="text-xs text-text-muted">· 12 categories</span>
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
              <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                <Braces className="h-3.5 w-3.5 text-violet-500 dark:text-ai-accent" />
                Competitive Programming
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                <Database className="h-3 w-3" /> Live
              </span>
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="text-4xl font-extrabold tabular-nums tracking-tight text-text-primary">
                1894
              </div>
              <div className="mb-1 inline-flex items-center gap-1 rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] font-bold text-violet-600 dark:bg-ai-accent/10 dark:text-ai-accent">
                <Star className="h-3.5 w-3.5" /> Expert
              </div>
              <div className="mb-1 ml-auto inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-500">
                <TrendingUp className="h-3.5 w-3.5" /> +62
              </div>
            </div>

            {/* Rating trend bars */}
            <div className="mt-5 flex h-12 items-end gap-1.5">
              {RATING_TREND.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.9, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                  className={`flex-1 rounded-md ${
                    i === RATING_TREND.length - 1
                      ? "bg-gradient-to-t from-blue-500 to-violet-500"
                      : "bg-card-hover"
                  }`}
                />
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {[
                { label: "Problems solved", value: "1,284", bar: "from-blue-500 to-violet-500", pct: 84 },
                { label: "Acceptance rate", value: "97.2%", bar: "from-violet-500 to-fuchsia-400", pct: 72 },
                { label: "Contest rating", value: "1,894", bar: "from-emerald-500 to-teal-400", pct: 88 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-text-secondary">{row.label}</span>
                    <span className="font-bold tabular-nums text-text-primary">{row.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-card-hover">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.pct}%` }}
                      transition={{ duration: 0.9, delay: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${row.bar}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Arrays", "DP", "Graphs", "Binary Search"].map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-card-hover/80 px-2 py-0.5 text-[10px] font-semibold text-text-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="problems-float-slow absolute -left-6 top-6 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-text-primary">Solved today</div>
              <div className="text-[9px] text-text-muted">7 problems · 98%</div>
            </div>
          </div>

          <div className="problems-float-slower absolute -right-4 bottom-8 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/12 text-violet-600 dark:bg-ai-accent/12 dark:text-ai-accent">
              <Target className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-text-primary">Milestone</div>
              <div className="text-[9px] text-text-muted">12-day streak</div>
            </div>
          </div>

          <Link
            href="/problems"
            className="group absolute -bottom-3 right-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-[0_4px_14px_rgba(139,92,246,0.4)] transition-transform hover:-translate-y-0.5"
          >
            Start solving
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>

      {/* Product tabs — Problems / Tests / Contests */}
      <ProductTabs active="problems" />
    </section>
  );
}