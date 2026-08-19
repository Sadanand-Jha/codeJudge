"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  Check,
  X,
  Minus,
  TrendingUp,
  Clock,
  ArrowRight,
  Award,
  Target,
  CheckCircle2,
} from "lucide-react";
import type { TestResultData } from "./types";
import { MOCK_RESULT } from "./mockData";
import { AIPerformanceCoach } from "./AIPerformanceCoach";
import { PrimaryButton, GhostButton } from "./ui";
import { cn } from "@/lib/helpers";

function StatCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone)}>{icon}</div>
      <div className="mt-3 text-xl font-extrabold tabular-nums text-text-primary">{value}</div>
      <div className="text-[11px] font-semibold text-text-muted">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-text-secondary">{sub}</div>}
    </div>
  );
}

const STATUS_META = {
  correct: { icon: Check, cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", mark: "+4" },
  incorrect: { icon: X, cls: "border-rose-500/30 bg-rose-500/10 text-rose-500", mark: "−1" },
  skipped: { icon: Minus, cls: "border-border bg-card-hover text-text-muted", mark: "0" },
  review: { icon: Minus, cls: "border-violet-500/30 bg-violet-500/10 text-violet-500", mark: "—" },
} as const;

export function TestResult() {
  const data: TestResultData = MOCK_RESULT;

  return (
    <div className="tests-ambient relative min-h-screen">
      <div className="mx-auto w-full max-w-[1200px] px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        {/* Confetti-ish celebratory top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_12px_36px_rgba(236,72,153,0.4)]">
              <Trophy className="h-8 w-8" />
            </div>
            <div className="absolute -inset-2 -z-10 rounded-3xl bg-gradient-to-br from-pink-500/20 to-violet-600/20 blur-xl" />
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" /> Test Completed
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            {data.testTitle}
          </h1>
          <div className="mt-1 text-xs text-text-muted">{data.examName} · Attempt #{data.attemptId.slice(-5).toUpperCase()}</div>
        </motion.div>

        {/* Score hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mt-8 overflow-hidden rounded-3xl border border-border bg-card p-6 text-center sm:p-10"
        >
          <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-pink-500/12 to-violet-600/12 blur-3xl" />

          <div className="relative">
            <div className="text-5xl font-extrabold tabular-nums tracking-tight text-text-primary sm:text-6xl">
              {data.score}
              <span className="text-xl font-bold text-text-muted sm:text-2xl"> / {data.maxScore}</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500/12 to-violet-600/12 px-4 py-1.5 text-sm font-extrabold text-pink-500 dark:text-ai-accent">
              <Award className="h-4 w-4" />
              {data.percentile.toFixed(2)} Percentile
            </div>
          </div>

          {/* Stat grid */}
          <div className="relative mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<Target className="h-4.5 w-4.5" />}
              tone="bg-violet-500/12 text-violet-500 dark:text-violet-300"
              label="Rank"
              value={data.rank.toLocaleString("en-IN")}
              sub={`of ${data.totalParticipants.toLocaleString("en-IN")} students`}
            />
            <StatCard
              icon={<TrendingUp className="h-4.5 w-4.5" />}
              tone="bg-emerald-500/12 text-emerald-500"
              label="Accuracy"
              value={`${data.accuracy}%`}
              sub="correct of attempted"
            />
            <StatCard
              icon={<Check className="h-4.5 w-4.5" />}
              tone="bg-emerald-500/12 text-emerald-500"
              label="Correct"
              value={String(data.correct)}
            />
            <StatCard
              icon={<X className="h-4.5 w-4.5" />}
              tone="bg-rose-500/12 text-rose-500"
              label="Incorrect"
              value={String(data.incorrect)}
              sub={`${data.skipped} skipped`}
            />
          </div>

          <div className="relative mt-4 flex items-center justify-center gap-2 text-xs text-text-secondary">
            <Clock className="h-3.5 w-3.5 text-text-muted" />
            Time taken: {Math.floor(data.timeTakenSec / 60)}m {data.timeTakenSec % 60}s
          </div>
        </motion.div>

        {/* Subject performance */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-10"
        >
          <h2 className="text-lg font-bold text-text-primary">Subject Performance</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {data.subjects.map((subj) => (
              <div key={subj.subject} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-primary">{subj.subject}</span>
                  <span className="text-lg font-extrabold tabular-nums text-text-primary">{subj.percent}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-card-hover">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${subj.percent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      subj.percent >= 80
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : subj.percent >= 70
                        ? "bg-gradient-to-r from-pink-500 to-violet-500"
                        : "bg-gradient-to-r from-amber-500 to-orange-400"
                    )}
                  />
                </div>
                <div className="mt-2 text-[11px] text-text-muted">
                  {subj.correct} correct of {subj.total}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Strong / weak */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-10 grid gap-4 lg:grid-cols-2"
        >
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/6 to-transparent p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Strong Areas
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.strongAreas.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  <Check className="h-3 w-3" /> {a}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/6 to-transparent p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <X className="h-4 w-4 text-rose-500" /> Needs Improvement
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.weakAreas.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500">
                  <Minus className="h-3 w-3" /> {a}
                </span>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Question analysis */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-10"
        >
          <h2 className="text-lg font-bold text-text-primary">Question Analysis</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Section</th>
                  <th className="px-4 py-3 font-semibold">Topic</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Marks</th>
                  <th className="px-4 py-3 text-right font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.analysis.map((row) => {
                  const meta = STATUS_META[row.status];
                  const Icon = meta.icon;
                  return (
                    <tr key={row.id} className="border-b border-border/60 text-sm transition-colors last:border-0 hover:bg-card-hover/50">
                      <td className="px-4 py-3 font-bold tabular-nums text-text-primary">{row.number}</td>
                      <td className="px-4 py-3 text-text-secondary">{row.section}</td>
                      <td className="px-4 py-3 text-text-secondary">{row.topic}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize", meta.cls)}>
                          <Icon className="h-3 w-3" /> {row.status}
                        </span>
                      </td>
                      <td className={cn("px-4 py-3 text-right font-bold tabular-nums", row.status === "incorrect" ? "text-rose-500" : "text-emerald-500")}>
                        {row.marks > 0 ? `+${row.marks}` : row.marks}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-muted">{row.timeSec}s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Practice weak areas CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-10"
        >
          <div className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_8px_24px_rgba(236,72,153,0.35)]">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-text-primary">Practice Your Weak Areas</h3>
                <p className="mt-1 max-w-xl text-sm text-text-secondary">
                  We built a focused practice plan for {data.weakAreas.join(", ")} — 10 targeted questions to close the gap.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <GhostButton href="/tests">Back to Tests</GhostButton>
              <PrimaryButton href="/tests/attempt/ft_phy_mechanics" className="px-5">
                Practice My Weak Areas
                <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </div>
        </motion.section>

        {/* AI coach */}
        <div className="mt-10">
          <AIPerformanceCoach data={data} />
        </div>

        <div className="mt-8 flex items-center justify-center">
          <Link href="/tests" className="text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary">
            ← Continue exploring tests
          </Link>
        </div>
      </div>
    </div>
  );
}