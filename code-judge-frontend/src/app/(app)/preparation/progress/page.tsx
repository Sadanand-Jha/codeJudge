"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Award,
  Brain,
  Briefcase,
  CalendarDays,
  Check,
  Code2,
  Download,
  FileQuestion,
  Flame,
  Route,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { PrepPageHeader, PrepProgressBar } from "@/components/preparation";

const TIMEFRAMES = ["This week", "This month", "All time"] as const;

const summaryMetrics = [
  { label: "Roadmap completion", value: "12 / 18", hint: "topics", icon: Route, tint: "bg-accent/10 text-accent", delta: "+2 this month" },
  { label: "Problems solved", value: "124", hint: "78% accuracy", icon: Code2, tint: "bg-violet-500/10 text-violet-500 dark:text-ai-accent dark:bg-ai-accent/10", delta: "+18 this week" },
  { label: "Tests attempted", value: "23", hint: "avg 72 percentile", icon: FileQuestion, tint: "bg-pink-500/10 text-pink-500 dark:text-ai-accent dark:bg-ai-accent/10", delta: "+3 this week" },
  { label: "Contest rating", value: "1420", hint: "best rank #512", icon: Trophy, tint: "bg-amber-500/10 text-amber-600 dark:text-amber-300", delta: "+42 this month" },
  { label: "Interview sessions", value: "8", hint: "3 mock, 5 practice", icon: Briefcase, tint: "bg-warning/10 text-warning", delta: "+2 this week" },
  { label: "Study streak", value: "12", hint: "days", icon: Flame, tint: "bg-success/10 text-success", delta: "personal best" },
];

const topicMastery = [
  { topic: "Arrays", score: 82 },
  { topic: "Strings", score: 76 },
  { topic: "Sorting", score: 71 },
  { topic: "Binary Search", score: 64 },
  { topic: "Linked List", score: 58 },
  { topic: "Dynamic Programming", score: 51 },
  { topic: "Graphs", score: 42 },
];

const strongAreas = [
  { topic: "Arrays & Hashing", detail: "92nd percentile in timed sets" },
  { topic: "SQL Queries", detail: "8/10 avg across quizzes" },
  { topic: "OOP Concepts", detail: "Consistent test performance" },
];

const weakAreas = [
  { topic: "Graphs", detail: "42% accuracy — BFS/DFS drill suggested" },
  { topic: "Dynamic Programming", detail: "51% accuracy — 1-D DP pattern set" },
  { topic: "CN · TCP/IP", detail: "47% accuracy — quick revision quiz" },
];

const weeklyActivity = [
  { day: "Mon", tasks: 3 },
  { day: "Tue", tasks: 5 },
  { day: "Wed", tasks: 2 },
  { day: "Thu", tasks: 6 },
  { day: "Fri", tasks: 4 },
  { day: "Sat", tasks: 7 },
  { day: "Sun", tasks: 5 },
];

const goalTimeline = [
  { milestone: "Arrays · Strings · Sorting", state: "done", date: "Completed" },
  { milestone: "Binary Search (current)", state: "current", date: "In progress" },
  { milestone: "Linked List → Trees", state: "next", date: "~3 weeks" },
  { milestone: "Graphs + DP deep dive", state: "planned", date: "~6 weeks" },
  { milestone: "Full revision + mocks", state: "planned", date: "Nov 2026" },
  { milestone: "Placement season target", state: "target", date: "Dec 2026" },
] as const;

export default function ProgressPage() {
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("All time");

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-[1400px]">
        <PrepPageHeader
          section="Progress"
          title="How prepared am I?"
          subtitle="Long-term analytics across roadmaps, problems, tests, contests and interviews."
          actions={
            <button className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover">
              <Download className="h-3.5 w-3.5" />
              Export report
            </button>
          }
        />

        {/* Timeframe */}
        <div className="mb-6 flex items-center gap-2">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded-lg border px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                timeframe === tf
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-card text-text-secondary hover:border-border-hover hover:text-text-primary"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Readiness hero card */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 sm:p-7"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            <div className="lg:w-1/3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
                <h2 className="text-base font-extrabold tracking-tight text-text-primary">Overall readiness</h2>
              </div>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-[52px] font-extrabold leading-none tabular-nums tracking-tight text-text-primary">
                  68%
                </span>
                <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
                  <TrendingUp className="h-3 w-3" />
                  On track
                </span>
              </div>
              <PrepProgressBar value={68} className="mt-5 h-2" />
              <p className="mt-4 text-[13px] leading-relaxed text-text-secondary">
                You are ahead of the median candidate for{" "}
                <span className="font-bold text-text-primary">Software Engineer Internship</span> targeting December
                2026.
              </p>
            </div>

            {/* Weekly consistency chart */}
            <div className="flex-1 rounded-xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Consistency — tasks completed per day
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-success">
                  <Flame className="h-3 w-3" /> 12-day streak
                </span>
              </div>
              <div className="flex h-28 items-end gap-3">
                {weeklyActivity.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-full w-full max-w-9 items-end overflow-hidden rounded-md bg-card-hover">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.tasks / 7) * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full rounded-md bg-gradient-to-t from-pink-500 to-violet-600"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-text-muted">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Summary metric cards */}
        <section className="mt-12">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
              <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">
                Across your preparation
              </h2>
            </div>
            <p className="mt-1 text-[13px] text-text-secondary">{timeframe} · every number updates as you practice.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {summaryMetrics.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.tint}`}>
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <p className="mt-4 text-lg font-extrabold tabular-nums leading-none text-text-primary">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {metric.label}
                  </p>
                  <p className="mt-2 truncate text-[11px] font-medium text-text-secondary">{metric.hint}</p>
                  <p className="mt-1 text-[11px] font-bold text-success">{metric.delta}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <div className="mt-12 gap-y-8 xl:flex xl:gap-x-8">
          {/* Left column */}
          <div className="min-w-0 flex-1 space-y-8">
            {/* Topic mastery */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <header className="mb-6 flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
                    <h2 className="text-base font-extrabold tracking-tight text-text-primary">Topic mastery</h2>
                  </div>
                  <p className="mt-1 text-[13px] text-text-secondary">Accuracy-weighted mastery per DSA topic.</p>
                </div>
                <Link
                  href="/preparation/practice"
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent"
                >
                  Train weak topics
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </header>

              <div className="space-y-4">
                {topicMastery.map((t) => (
                  <div key={t.topic}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] font-semibold text-text-primary">{t.topic}</span>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-text-secondary">{t.score}%</span>
                    </div>
                    <PrepProgressBar
                      value={t.score}
                      animate={false}
                      className="mt-2 h-1.5"
                      barClassName={t.score >= 60 ? undefined : "bg-gradient-to-r from-[#EF4444] to-[#F59E0B]"}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Goal timeline */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <header className="mb-6">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
                  <h2 className="text-base font-extrabold tracking-tight text-text-primary">
                    Path to your goal — December 2026
                  </h2>
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">Where you are on the long-term plan.</p>
              </header>

              <div className="relative space-y-5 pl-1">
                <span className="absolute bottom-2 left-[13px] top-2 w-px bg-border" aria-hidden />
                {goalTimeline.map((step) => (
                  <div key={step.milestone} className="relative flex items-center gap-4">
                    <span
                      className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        step.state === "done"
                          ? "bg-success/15 text-success"
                          : step.state === "current"
                          ? "bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_6px_16px_-6px_rgba(139,92,246,0.6)]"
                          : step.state === "target"
                          ? "border border-dashed border-accent/50 bg-card text-accent"
                          : "border border-border bg-card text-text-muted"
                      }`}
                    >
                      {step.state === "done" ? (
                        <Check className="h-3 w-3" />
                      ) : step.state === "current" ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      ) : (
                        ""
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[13px] ${
                          step.state === "current"
                            ? "font-bold text-text-primary"
                            : step.state === "done"
                            ? "font-medium text-text-secondary line-through decoration-border"
                            : "font-medium text-text-secondary"
                        }`}
                      >
                        {step.milestone}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-text-muted">{step.date}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Side column */}
          <aside className="mt-8 w-full shrink-0 space-y-5 xl:mt-0 xl:w-80">
            {/* Strong areas */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <header className="mb-4 flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <h3 className="text-sm font-bold text-text-primary">Strong areas</h3>
              </header>
              <div className="space-y-3">
                {strongAreas.map((area) => (
                  <div key={area.topic}>
                    <p className="text-[13px] font-bold text-text-primary">{area.topic}</p>
                    <p className="mt-0.5 text-[11px] text-text-muted">{area.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Weak areas */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <header className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-danger" />
                  <h3 className="text-sm font-bold text-text-primary">Needs attention</h3>
                </div>
                <Link
                  href="/preparation/practice"
                  className="text-[11px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent"
                >
                  Fix
                </Link>
              </header>
              <div className="space-y-3">
                {weakAreas.map((area) => (
                  <div key={area.topic}>
                    <p className="text-[13px] font-bold text-text-primary">{area.topic}</p>
                    <p className="mt-0.5 text-[11px] text-text-muted">{area.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Nudge */}
            <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-500/[0.07] to-violet-600/[0.05] p-4 dark:border-ai-accent/20">
              <p className="text-xs leading-relaxed text-text-secondary">
                <span className="font-bold text-text-primary">Tip:</span> candidates who keep a 4+ day weekly
                consistency are 2.3× more likely to hit their target date.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
