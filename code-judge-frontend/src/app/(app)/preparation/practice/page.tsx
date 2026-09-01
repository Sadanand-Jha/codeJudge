"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  Code2,
  Database,
  FileQuestion,
  FlaskConical,
  Lightbulb,
  Network,
  PencilRuler,
  Play,
  Server,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { CompactMetric, PrepPageHeader, PrepProgressBar, PrepSectionTitle } from "@/components/preparation";

/* ────────────────────────────── Mock data ────────────────────────────── */

const subjects = [
  { name: "DSA", mastery: 68, problems: 124, icon: Code2, tone: "from-[#EC4899] to-[#8B5CF6]", tag: "Data+Structures" },
  { name: "System Design", mastery: 32, problems: 12, icon: Server, tone: "from-[#8B5CF6] to-[#6366F1]", tag: "System+Design" },
  { name: "DBMS", mastery: 58, problems: 41, icon: Database, tone: "from-[#06B6D4] to-[#3B82F6]", tag: "DBMS" },
  { name: "OS", mastery: 61, problems: 38, icon: Network, tone: "from-[#22C55E] to-[#10B981]", tag: "OS" },
  { name: "CN", mastery: 47, problems: 22, icon: Network, tone: "from-[#3B82F6] to-[#06B6D4]", tag: "CN" },
  { name: "OOP", mastery: 72, problems: 30, icon: PencilRuler, tone: "from-[#F59E0B] to-[#F97316]", tag: "OOP" },
  { name: "Aptitude", mastery: 54, problems: 86, icon: FlaskConical, tone: "from-[#FBBF24] to-[#F59E0B]", tag: "Aptitude" },
  { name: "SQL", mastery: 63, problems: 45, icon: Database, tone: "from-[#10B981] to-[#22C55E]", tag: "SQL" },
  { name: "Coding", mastery: 66, problems: 124, icon: Code2, tone: "from-[#EC4899] to-[#F97316]", tag: "Coding" },
];

const todayPlan = [
  { label: "Solve 3 binary-search problems", progress: 1, total: 3, href: "/problems?tag=Binary+Search", cta: "Problems" },
  { label: "30 min — System Design fundamentals", progress: 0, total: 1, href: "/preparation/roadmaps", cta: "Study" },
  { label: "Take “DBMS Quick Test” (15 min)", progress: 0, total: 1, href: "/tests", cta: "Test" },
  { label: "Review weak topic — Graphs", progress: 0, total: 1, href: "/problems?tag=Graphs", cta: "Review" },
];

const recommended = [
  { title: "Koko Eating Bananas", reason: "Next step in Binary Search", difficulty: "Medium", href: "/problems" },
  { title: "Course Schedule", reason: "Strengthens weak Graphs topic", difficulty: "Medium", href: "/problems?tag=Graphs" },
  { title: "Word Break", reason: "Common Amazon interview question", difficulty: "Hard", href: "/problems" },
  { title: "Normalize a Database — quiz", reason: "DBMS revision before your test", difficulty: "Easy", href: "/tests" },
];

const weakAreas = [
  { topic: "Graphs", score: 42, suggestion: "BFS/DFS warm-up set", href: "/problems?tag=Graphs" },
  { topic: "Dynamic Programming", score: 51, suggestion: "1-D DP pattern drill", href: "/problems?tag=DP" },
  { topic: "CN · TCP/IP", score: 47, suggestion: "Quick 10-question quiz", href: "/tests" },
  { topic: "System Design · Caching", score: 35, suggestion: "Roadmap module + notes", href: "/preparation/roadmaps" },
];

const recentlyPracticed = [
  { title: "Binary Search on Answer — set", kind: "Problem set", when: "Today", result: "4/5 solved", href: "/problems" },
  { title: "Arrays Timed Test #11", kind: "Test", when: "Yesterday", result: "72 percentile", href: "/tests/results" },
  { title: "LRU Cache", kind: "Problem", when: "Yesterday", result: "Solved", href: "/problems" },
  { title: "Aptitude — Percentages drill", kind: "Quiz", when: "2 days ago", result: "8/10", href: "/quiz" },
  { title: "ByteClash Weekly #246", kind: "Contest", when: "Last week", result: "Rank 1,284", href: "/contests" },
];

/* ─────────────────────────────── Page ─────────────────────────────── */

export default function PracticePage() {
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  return (
    <div className="px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <PrepPageHeader
          section="Practice"
          title="Practice"
          subtitle="The execution layer of your preparation — Problems, Tests and Contests organized into a daily plan."
        />

        {/* Compact metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          <CompactMetric label="Solved today" value="1 / 5" icon={Check} iconClassName="text-success bg-success/10" />
          <CompactMetric label="Streak" value={12} hint="days" icon={Timer} iconClassName="text-[#EC4899] bg-[#EC4899]/10" />
          <CompactMetric label="Tests this week" value={3} icon={FileQuestion} iconClassName="text-accent bg-accent/10" />
          <CompactMetric label="Weak topics" value={4} icon={Brain} iconClassName="text-warning bg-warning/10" />
        </div>

        {/* Subjects rail */}
        <section className="mb-6">
          <PrepSectionTitle
            icon={Code2}
            title="Subjects"
            action={<span className="text-[11px] text-text-muted">Mastery based on your attempts</span>}
          />
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {subjects.map((subject, idx) => {
              const Icon = subject.icon;
              const isActive = activeSubject === subject.name;
              return (
                <motion.div
                  key={subject.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                >
                  <button
                    onClick={() => setActiveSubject(isActive ? null : subject.name)}
                    className={`group w-full rounded-xl border p-3 text-left transition-all ${
                      isActive
                        ? "border-accent/50 bg-accent/10"
                        : "border-border bg-card hover:border-border-hover hover:bg-card-hover"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${subject.tone} ${
                        isActive ? "" : "opacity-80 group-hover:opacity-100"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
                    </span>
                    <p className="mt-2 truncate text-xs font-bold text-text-primary">{subject.name}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <PrepProgressBar value={subject.mastery} animate={false} className="h-1 flex-1" />
                      <span className="text-[9px] font-semibold tabular-nums text-text-muted">{subject.mastery}%</span>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Today's practice */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <PrepSectionTitle
                icon={Target}
                title="Today's practice"
                action={
                  <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
                    <Play className="w-3 h-3" /> resets at midnight
                  </span>
                }
              />
              <div className="space-y-1.5">
                {todayPlan.map((task) => {
                  const done = task.progress >= task.total;
                  return (
                    <Link
                      key={task.label}
                      href={task.href}
                      className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-card-hover"
                    >
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
                          done ? "border-success bg-success/15 text-success" : "border-border text-transparent"
                        }`}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </span>
                      <span className={`flex-1 min-w-0 truncate text-xs ${done ? "text-text-muted line-through" : "text-text-primary"}`}>
                        {task.label}
                      </span>
                      {task.total > 1 && (
                        <span className="shrink-0 text-[10px] text-text-muted">
                          {task.progress}/{task.total}
                        </span>
                      )}
                      <span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                        {task.cta}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Recommended practice */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <PrepSectionTitle icon={Sparkles} title="Recommended for you" />
              <div className="divide-y divide-border">
                {recommended.map((rec) => (
                  <Link
                    key={rec.title}
                    href={rec.href}
                    className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
                        {rec.title}
                      </span>
                      <span className="block truncate text-[10px] text-text-muted">{rec.reason}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-medium ${
                        rec.difficulty === "Easy"
                          ? "border-success/30 bg-success/10 text-success"
                          : rec.difficulty === "Medium"
                          ? "border-warning/30 bg-warning/10 text-warning"
                          : "border-danger/30 bg-danger/10 text-danger"
                      }`}
                    >
                      {rec.difficulty}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </section>

            {/* Weak areas */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <PrepSectionTitle
                icon={Brain}
                title="Weak areas"
                action={<span className="text-[11px] text-text-muted">lowest accuracy topics</span>}
              />
              <div className="space-y-3.5">
                {weakAreas.map((area) => (
                  <div key={area.topic}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-text-primary">{area.topic}</span>
                      <span className="shrink-0 text-[10px] font-bold text-danger">{area.score}%</span>
                    </div>
                    <PrepProgressBar value={area.score} animate={false} barClassName="bg-gradient-to-r from-[#EF4444] to-[#F59E0B]" />
                    <Link
                      href={area.href}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:text-accent-secondary transition-colors"
                    >
                      {area.suggestion} <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Side column */}
          <div className="w-full xl:w-80 shrink-0 space-y-4">
            {/* Recently practiced */}
            <section className="rounded-2xl border border-border bg-card p-4">
              <PrepSectionTitle icon={Lightbulb} title="Recently practiced" />
              <div className="space-y-1">
                {recentlyPracticed.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="block rounded-lg px-2.5 py-2 transition-colors hover:bg-card-hover"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-text-primary">{item.title}</p>
                      <span className="shrink-0 text-[9px] text-text-muted">{item.when}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      {item.kind} · <span className="font-medium text-text-secondary">{item.result}</span>
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Connect to contests/tests */}
            <section className="rounded-2xl border border-border bg-card p-4">
              <PrepSectionTitle icon={Trophy} title="Put it to the test" />
              <div className="space-y-2">
                <Link
                  href="/contests"
                  className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.05] px-3 py-2.5 transition-colors hover:border-amber-500/40"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-[10px] font-bold text-amber-500">
                    W
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-xs font-semibold text-text-primary">ByteClash Weekly #247</span>
                    <span className="block text-[10px] text-text-muted">Starts in 2 days · apply DSA skills</span>
                  </span>
                </Link>
                <Link
                  href="/tests"
                  className="flex items-center gap-3 rounded-xl border border-pink-500/20 bg-gradient-to-r from-pink-500/[0.07] to-violet-600/[0.05] px-3 py-2.5 transition-colors hover:border-pink-500/40 dark:hover:border-ai-accent/40"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-pink-500/15 text-[10px] font-bold text-pink-500 dark:text-ai-accent">
                    T
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-xs font-semibold text-text-primary">DBMS Quick Test</span>
                    <span className="block text-[10px] text-text-muted">15 min · scheduled today</span>
                  </span>
                </Link>
              </div>
            </section>

            {/* Tip */}
            <div className="rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/[0.07] to-transparent p-4">
              <p className="text-xs font-semibold text-text-primary">Practice tip</p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                End every session with one problem from a weak area — spaced repetition beats marathon sessions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
