"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  FileQuestion,
  Flame,
  Lightbulb,
  MessagesSquare,
  MessagesSquare as ChatIcon,
  Play,
  Route,
  Target,
  Trophy,
  X,
} from "lucide-react";
import {
  preparationModules,
  PREPARATION_BASE,
} from "@/config/preparation";
import { PrepProgressBar } from "@/components/preparation";
import { PreparationHero } from "@/components/preparation/PreparationHero";
import type { PrepGoal } from "@/components/preparation/PreparationHeroTypes";
import { cn } from "@/lib/helpers";

/* ─────────────────────────── Goal (personalization) ─────────────────────────── */

const GOAL_PRESETS: PrepGoal[] = [
  {
    roleId: "sde-intern",
    role: "Software Engineer Internship",
    track: "Software Engineer Preparation",
    target: "Product-based companies",
    date: "December 2026",
  },
  {
    roleId: "fullstack",
    role: "Full Stack Developer",
    track: "Full Stack Developer Preparation",
    target: "Product-based companies",
    date: "May 2027",
  },
  {
    roleId: "ml-engineer",
    role: "ML Engineer",
    track: "ML Engineer Preparation",
    target: "AI-first companies",
    date: "August 2027",
  },
  {
    roleId: "data-scientist",
    role: "Data Scientist",
    track: "Data Scientist Preparation",
    target: "Analytics & product teams",
    date: "January 2027",
  },
];

const DEFAULT_GOAL = GOAL_PRESETS[0];
const GOAL_STORAGE_KEY = "byteclash.prep-goal";

/* ────────────────────────────── Mock state ────────────────────────────── */

const productEntries = [
  {
    title: "Problems",
    description:
      "A curated problem bank spanning DSA, competitive programming and placement exams — with patterns guided by your goal.",
    meta: "Live database",
    href: "/problems",
    icon: Code2,
    tint: "bg-violet-500/10 text-violet-500 dark:text-ai-accent dark:bg-ai-accent/10",
  },
  {
    title: "Tests",
    description:
      "Timed test series and exam simulations created by teachers and mentors, so practice always happens under real conditions.",
    meta: "1,40,000+ tests",
    href: "/tests",
    icon: FileQuestion,
    tint: "bg-pink-500/10 text-pink-500 dark:text-ai-accent dark:bg-ai-accent/10",
  },
  {
    title: "Contests",
    description:
      "Weekly and monthly coding contests that sharpen accuracy and speed when the clock is actually running.",
    meta: "Weekly · Monthly · Live",
    href: "/contests",
    icon: Trophy,
    tint: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
];

const overviewMetrics = [
  { label: "Roadmap progress", value: "12 / 18", hint: "topics" },
  { label: "Problems solved", value: "124" },
  { label: "Interviews practiced", value: "8" },
  { label: "Current streak", value: "12", hint: "days" },
];

const resumePoints = [
  { kind: "Roadmap topic", label: "Binary Search on Answer", context: "DSA Roadmap · Step 13 of 18", href: `${PREPARATION_BASE}/roadmaps`, icon: Route },
  { kind: "Problem", label: "Koko Eating Bananas", context: "Binary Search · Medium · unsolved", href: "/problems", icon: Code2 },
  { kind: "Test", label: "Arrays Timed Test #12", context: "Attempted 8 / 20 questions", href: "/tests", icon: FileQuestion },
  { kind: "Mock interview", label: "Amazon SDE — DSA Round", context: "Paused mid-session", href: `${PREPARATION_BASE}/interviews`, icon: ChatIcon },
];

const roadmapMilestones = [
  { name: "Arrays", state: "done" },
  { name: "Strings", state: "done" },
  { name: "Sorting", state: "done" },
  { name: "Binary Search", state: "current" },
  { name: "Linked List", state: "next" },
  { name: "Stacks & Queues", state: "locked" },
] as const;

const todayPlan = [
  { label: "Solve 3 binary-search problems", progress: 1, total: 3, href: "/problems?tag=Binary+Search", cta: "Practice" },
  { label: "30 min — System Design fundamentals", progress: 0, total: 1, href: `${PREPARATION_BASE}/roadmaps`, cta: "Study" },
  { label: "Take “DBMS Quick Test” (15 min)", progress: 0, total: 1, href: "/tests", cta: "Start" },
  { label: "Review weak topic — Graphs", progress: 0, total: 1, href: `${PREPARATION_BASE}/practice`, cta: "Review" },
];

const weakAreas = [
  { topic: "Graphs", score: 42 },
  { topic: "Dynamic Programming", score: 51 },
  { topic: "DBMS · Normalization", score: 58 },
];

const upcomingInterviews = [
  { company: "Amazon", role: "SDE Intern", round: "Technical Round", when: "In 3 days" },
  { company: "Google", role: "SDE Intern", round: "DSA Round", when: "In 6 days" },
];

const recommendedResources = [
  { title: "Binary Search on Answer — pattern guide", meta: "Article · 12 min", href: `${PREPARATION_BASE}/roadmaps` },
  { title: "Graph traversal cheat sheet", meta: "Notes · 6 min", href: `${PREPARATION_BASE}/practice` },
  { title: "Amazon SDE internship — 6 real experiences", meta: "Community · interviews", href: `${PREPARATION_BASE}/interviews` },
];

const recentDiscussions = [
  { title: "How to structure DSA revision 2 months before placements?", replies: 34, href: `${PREPARATION_BASE}/discussions` },
  { title: "Google SDE Intern interview experience — all rounds", replies: 89, href: `${PREPARATION_BASE}/discussions` },
  { title: "Is System Design needed for intern roles?", replies: 21, href: `${PREPARATION_BASE}/discussions` },
];

/* ─────────────────────────────── Page ─────────────────────────────── */

export default function PreparationPage() {
  // Persisted goal — read once at first render (codebase-standard lazy init).
  const [goal, setGoal] = useState<PrepGoal>(() => {
    if (typeof window === "undefined") return DEFAULT_GOAL;
    try {
      const raw = window.localStorage.getItem(GOAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PrepGoal;
        if (parsed?.roleId && GOAL_PRESETS.some((g) => g.roleId === parsed.roleId)) return parsed;
      }
    } catch {
      // ignore malformed storage
    }
    return DEFAULT_GOAL;
  });
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  const saveGoal = (next: PrepGoal) => {
    setGoal(next);
    try {
      window.localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setGoalModalOpen(false);
  };

  const quickModules = useMemo(
    () => preparationModules.filter((m) => m.id !== "overview"),
    []
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 pb-16 pt-6 sm:px-8 lg:px-10 xl:px-12">
      {/* ── Hero ── */}
      <PreparationHero goal={goal} onChangeGoal={() => setGoalModalOpen(true)} />

      {/* ── Product entry points ── */}
      <section className="mt-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {productEntries.map((entry, i) => {
            const Icon = entry.icon;
            return (
              <motion.div
                key={entry.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
              >
                <Link
                  href={entry.href}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#7C3AED]/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.12)] dark:hover:border-ai-accent/40"
                >
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", entry.tint)}>
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-5 text-[15px] font-extrabold tracking-tight text-text-primary">{entry.title}</h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-text-secondary">{entry.description}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-[12px] font-bold tabular-nums text-text-secondary">{entry.meta}</span>
                    <ArrowRight className="h-4 w-4 text-text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#7C3AED] dark:group-hover:text-ai-accent" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Metrics ── */}
      <section className="mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
              <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">
                Your preparation at a glance
              </h2>
            </div>
            <p className="mt-1 text-[13px] text-text-secondary">Live numbers across every part of your journey.</p>
          </div>
          <Link
            href={`${PREPARATION_BASE}/progress`}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent"
          >
            Full analytics
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {overviewMetrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <p className="text-lg font-extrabold tabular-nums leading-none text-text-primary">
                {metric.value}
                {metric.hint && (
                  <span className="ml-1.5 align-baseline text-xs font-semibold text-text-secondary">{metric.hint}</span>
                )}
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{metric.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Continue where you left off ── */}
      <section className="mt-12">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
            <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">
              Continue where you left off
            </h2>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">Pick up any thread in one click.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {resumePoints.map((item, idx) => {
            const Icon = item.icon;
            const featured = idx === 0;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-card-hover sm:px-6",
                  idx > 0 && "border-t border-border",
                  featured && "bg-accent/[0.04]"
                )}
              >
                {featured && (
                  <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-pink-500 to-violet-600" />
                )}
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    featured ? "bg-accent/10" : "bg-card-hover"
                  )}
                >
                  <Icon className="h-4 w-4 text-ai-accent" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="flex items-center gap-2.5">
                    <span className="truncate text-sm font-bold text-text-primary transition-colors group-hover:text-[#7C3AED] dark:group-hover:text-ai-accent">
                      {item.label}
                    </span>
                    {featured && (
                      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                        Resume
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-medium text-text-muted">
                    {item.kind} · {item.context}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Main chapters ── */}
      <div className="mt-12 gap-y-12 xl:flex xl:gap-x-8">
        {/* ── Left column ── */}
        <div className="min-w-0 flex-1 space-y-12">
          {/* Current roadmap */}
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
                  <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">
                    Current roadmap
                  </h2>
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Data Structures &amp; Algorithms · Step 13 of 18 · Binary Search
                </p>
              </div>
              <Link
                href={`${PREPARATION_BASE}/roadmaps`}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent"
              >
                All roadmaps
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[13px] font-semibold text-text-secondary">68% complete</span>
                <span className="text-xs text-text-muted">~6 weeks left at current pace</span>
              </div>
              <PrepProgressBar value={68} className="mt-3 h-2" />

              {/* Milestones */}
              <div className="mt-9 flex items-start justify-between gap-1 overflow-x-auto pb-1">
                {roadmapMilestones.map((ms) => (
                  <div key={ms.name} className="flex min-w-fit flex-col items-center gap-2.5 px-1">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full",
                        ms.state === "done" && "bg-success/15 text-success",
                        ms.state === "current" &&
                          "bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_8px_20px_-8px_rgba(139,92,246,0.6)]",
                        ms.state === "next" && "border border-dashed border-accent/40 text-accent",
                        ms.state === "locked" && "border border-border text-text-muted"
                      )}
                    >
                      {ms.state === "done" ? (
                        <Check className="h-3 w-3" />
                      ) : ms.state === "current" ? (
                        <span className="text-[9px] font-bold">13</span>
                      ) : ms.state === "next" ? (
                        <span className="text-[9px] font-semibold">14</span>
                      ) : (
                        "·"
                      )}
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap text-[11px]",
                        ms.state === "current"
                          ? "font-bold text-text-primary"
                          : ms.state === "locked"
                          ? "text-text-muted"
                          : "font-medium text-text-secondary"
                      )}
                    >
                      {ms.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
                <Link
                  href={`${PREPARATION_BASE}/roadmaps`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(139,92,246,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(139,92,246,0.45)]"
                >
                  Continue Roadmap
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/problems?tag=Binary+Search"
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-text-secondary transition-colors hover:text-text-primary"
                >
                  <Code2 className="h-3.5 w-3.5" /> Practice problems
                </Link>
                <Link
                  href="/tests"
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-text-secondary transition-colors hover:text-text-primary"
                >
                  <FileQuestion className="h-3.5 w-3.5" /> Take a test
                </Link>
              </div>
            </div>
          </section>

          {/* Today's practice */}
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
                  <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">
                    Today&apos;s practice
                  </h2>
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">Four focused blocks — resets at midnight.</p>
              </div>
              <Link
                href={`${PREPARATION_BASE}/practice`}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent"
              >
                Open Practice
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-card p-2">
              {todayPlan.map((task, idx) => {
                const done = task.progress >= task.total;
                return (
                  <Link
                    key={task.label}
                    href={task.href}
                    className={cn(
                      "group flex items-center gap-3.5 rounded-xl px-4 py-3.5 transition-colors duration-150 hover:bg-card-hover",
                      idx > 0 && "mt-0.5"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        done ? "border-success bg-success/15 text-success" : "border-border text-transparent"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13px]",
                        done ? "font-medium text-text-muted line-through" : "font-semibold text-text-primary"
                      )}
                    >
                      {task.label}
                    </span>
                    {task.total > 1 && (
                      <span className="shrink-0 tabular-nums text-[11px] font-semibold text-text-muted">
                        {task.progress}/{task.total}
                      </span>
                    )}
                    <span className="shrink-0 text-[11px] font-bold text-[#7C3AED] opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:text-ai-accent">
                      {task.cta}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Explore */}
          <section>
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
                <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">
                  Explore your preparation
                </h2>
              </div>
              <p className="mt-1 text-[13px] text-text-secondary">Everything else, organized around your goal.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {quickModules.map((module, i) => {
                const Icon = module.icon;
                return (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
                  >
                    <Link
                      href={module.href}
                      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#7C3AED]/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.12)] dark:hover:border-ai-accent/40"
                    >
                      <div className="flex items-start justify-between">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/[0.08]">
                          <Icon className="h-4 w-4 text-accent" strokeWidth={1.8} />
                        </span>
                        <ArrowRight className="h-4 w-4 -translate-x-1 text-text-muted opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-[#7C3AED] group-hover:opacity-100 dark:group-hover:text-ai-accent" />
                      </div>
                      <span className="mt-4 block text-[15px] font-extrabold tracking-tight text-text-primary">
                        {module.label}
                      </span>
                      <span className="mt-1.5 block text-[13px] leading-relaxed text-text-muted">
                        {module.description}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Side rail ── */}
        <aside className="mt-12 w-full shrink-0 space-y-5 xl:mt-0 xl:w-80">
          {/* Upcoming interviews */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-bold text-text-primary">Upcoming interviews</h3>
              </div>
              <Link
                href={`${PREPARATION_BASE}/interviews`}
                className="text-[11px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent"
              >
                All
              </Link>
            </header>
            <div className="space-y-1">
              {upcomingInterviews.map((iv) => (
                <Link
                  key={`${iv.company}-${iv.round}`}
                  href={`${PREPARATION_BASE}/interviews`}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-card-hover"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-xs font-bold text-warning">
                    {iv.company.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="block truncate text-[13px] font-bold text-text-primary">
                      {iv.company} · {iv.role}
                    </span>
                    <span className="block text-[11px] text-text-muted">{iv.round}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-warning">{iv.when}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Weak areas */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-danger" />
                <h3 className="text-sm font-bold text-text-primary">Weak areas</h3>
              </div>
              <Link
                href={`${PREPARATION_BASE}/practice`}
                className="text-[11px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent"
              >
                Fix
              </Link>
            </header>
            <div className="space-y-4">
              {weakAreas.map((area) => (
                <div key={area.topic}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] font-medium text-text-primary">{area.topic}</span>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-danger">{area.score}%</span>
                  </div>
                  <PrepProgressBar
                    value={area.score}
                    animate={false}
                    className="mt-2 h-1"
                    barClassName="bg-gradient-to-r from-[#EF4444] to-[#F59E0B]"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Recommended */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-4 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-success" />
              <h3 className="text-sm font-bold text-text-primary">Recommended for you</h3>
            </header>
            <div className="space-y-1">
              {recommendedResources.map((res) => (
                <Link
                  key={res.title}
                  href={res.href}
                  className="-mx-2 block rounded-lg px-2 py-2.5 leading-snug transition-colors hover:bg-card-hover"
                >
                  <p className="text-[13px] font-semibold text-text-primary">{res.title}</p>
                  <p className="mt-0.5 text-[11px] text-text-muted">{res.meta}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Discussions */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessagesSquare className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-text-primary">From Discussions</h3>
              </div>
              <Link
                href={`${PREPARATION_BASE}/discussions`}
                className="text-[11px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent"
              >
                Browse
              </Link>
            </header>
            <div className="space-y-1">
              {recentDiscussions.map((d) => (
                <Link
                  key={d.title}
                  href={d.href}
                  className="-mx-2 block rounded-lg px-2 py-2.5 leading-snug transition-colors hover:bg-card-hover"
                >
                  <p className="line-clamp-2 text-[13px] font-medium text-text-primary">{d.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-muted">
                    <BookOpen className="h-3 w-3" /> {d.replies} replies
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Streak nudge */}
          <div className="flex items-start gap-3 rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-500/[0.07] to-violet-600/[0.05] p-4 dark:border-ai-accent/20">
            <Flame className="mt-0.5 h-4 w-4 shrink-0 text-pink-500 dark:text-ai-accent" />
            <p className="text-xs leading-relaxed text-text-secondary">
              <span className="font-bold text-text-primary">12-day streak.</span> Practice today to keep it alive.
            </p>
          </div>
        </aside>
      </div>

      {/* ── Goal modal ── */}
      <AnimatePresence>
        {goalModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setGoalModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-lg rounded-2xl border border-border bg-card p-7 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-text-primary">
                    Set your preparation goal
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                    Roadmaps, practice, tests and interviews organize themselves around this.
                  </p>
                </div>
                <button
                  onClick={() => setGoalModalOpen(false)}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                {GOAL_PRESETS.map((preset) => {
                  const selected = preset.roleId === goal.roleId;
                  return (
                    <button
                      key={preset.roleId}
                      onClick={() => saveGoal(preset)}
                      className={cn(
                        "flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-colors duration-150",
                        selected
                          ? "border-accent/40 bg-accent/[0.06]"
                          : "border-border hover:border-border-hover hover:bg-card-hover/60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          selected ? "bg-accent/10 text-accent" : "bg-card-hover text-text-muted"
                        )}
                      >
                        <Trophy className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">
                        <span className="block truncate text-sm font-bold text-text-primary">{preset.role}</span>
                        <span className="block truncate text-[11px] text-text-secondary">
                          Target: {preset.target} · {preset.date}
                        </span>
                      </span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </div>

              <p className="mt-6 flex items-center gap-1.5 text-[11px] text-text-muted">
                <Clock className="h-3 w-3" />
                Your goal syncs across Roadmaps, Practice, Interviews and Companies.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
