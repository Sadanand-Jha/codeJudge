"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Plus,
  Pencil,
  Copy,
  Eye,
  BarChart3,
  Trash2,
  Star,
  Users,
  Timer,
  HelpCircle,
  Radio,
} from "lucide-react";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  PageHeader,
  MockDataTag,
  SegmentedControl,
  BillButton,
  StatCard,
  StatCardSkeleton,
  StatusBadge,
  Skeleton,
  EmptyState,
  ErrorState,
} from "@/components/creator/billing/ui";
import type { StatusTone } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";

type QuizStatus = "live" | "draft" | "scheduled" | "completed";

interface MockQuiz {
  id: string;
  title: string;
  subject: string;
  questions: number;
  durationMin: number;
  attempts: number;
  completionRate: number;
  rating: number;
  status: QuizStatus;
}

const MOCK_QUIZZES: MockQuiz[] = [
  { id: "q_01", title: "Rotational Motion Quick Quiz", subject: "Physics", questions: 12, durationMin: 15, attempts: 8420, completionRate: 78, rating: 4.7, status: "live" },
  { id: "q_02", title: "Quant Aptitude Sprint 10", subject: "Quantitative Aptitude", questions: 10, durationMin: 12, attempts: 12040, completionRate: 71, rating: 4.4, status: "live" },
  { id: "q_03", title: "Name Reactions in Organic Chemistry", subject: "Chemistry", questions: 15, durationMin: 20, attempts: 5310, completionRate: 64, rating: 4.2, status: "live" },
  { id: "q_04", title: "Critical Reasoning Basics", subject: "Verbal Ability", questions: 10, durationMin: 15, attempts: 3250, completionRate: 58, rating: 3.9, status: "live" },
  { id: "q_05", title: "Indian Polity Rapid Fire", subject: "General Knowledge", questions: 20, durationMin: 25, attempts: 0, completionRate: 0, rating: 0, status: "draft" },
  { id: "q_06", title: "Calculus Fundamentals Check", subject: "Mathematics", questions: 15, durationMin: 18, attempts: 0, completionRate: 0, rating: 0, status: "draft" },
  { id: "q_07", title: "Human Physiology Quiz", subject: "Biology", questions: 15, durationMin: 20, attempts: 0, completionRate: 0, rating: 0, status: "scheduled" },
  { id: "q_08", title: "Vocabulary Booster 5", subject: "English", questions: 12, durationMin: 10, attempts: 0, completionRate: 0, rating: 0, status: "scheduled" },
  { id: "q_09", title: "Daily GK Quiz — Aug 2026 Set 4", subject: "General Knowledge", questions: 10, durationMin: 10, attempts: 21300, completionRate: 66, rating: 4.1, status: "completed" },
  { id: "q_10", title: "Seating Arrangement Puzzle", subject: "Reasoning", questions: 8, durationMin: 12, attempts: 19880, completionRate: 61, rating: 4.0, status: "completed" },
];

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "draft", label: "Draft" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
];

type TabId = "all" | "live" | "draft" | "scheduled" | "completed";

const STATUS_META: Record<QuizStatus, { label: string; tone: StatusTone }> = {
  live: { label: "Live", tone: "emerald" },
  draft: { label: "Draft", tone: "amber" },
  scheduled: { label: "Scheduled", tone: "violet" },
  completed: { label: "Completed", tone: "slate" },
};

const CARD_ACTIONS = [
  { label: "Edit", icon: Pencil },
  { label: "Duplicate", icon: Copy },
  { label: "Preview", icon: Eye },
  { label: "Analytics", icon: BarChart3 },
] as const;

export function QuizzesPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(() => MOCK_QUIZZES, { delayMs: 650, demoState });
  const [filter, setFilter] = useState<TabId>("all");

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (filter === "all") return list;
    return list.filter((q) => q.status === filter);
  }, [data, filter]);

  const stats = useMemo(() => {
    const live = filtered.filter((q) => q.status === "live").length;
    const engaged = filtered.filter((q) => q.attempts > 0);
    const completion = engaged.length ? engaged.reduce((s, q) => s + q.completionRate, 0) / engaged.length : 0;
    const rating = engaged.length ? engaged.reduce((s, q) => s + q.rating, 0) / engaged.length : 0;
    return { live, completion, rating };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Quizzes"
        subtitle="Manage your quick assessments and quizzes"
        badge={<MockDataTag />}
        actions={
          <BillButton href="/creator/quizzes/create" icon={<Plus className="h-4 w-4" />}>
            New Quiz
          </BillButton>
        }
      />

      {state === "loading" && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No quizzes yet"
          description="Create a quick assessment to engage students and gather instant feedback."
          action={<BillButton href="/creator/quizzes/create">New Quiz</BillButton>}
        />
      )}

      {state === "ready" && data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl options={TABS} value={filter} onChange={setFilter} size="md" />
            <span className="text-[11px] font-semibold text-text-muted">
              Showing {filtered.length} of {data.length} quizzes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Quizzes"
              value={filtered.length}
              display={String(filtered.length)}
              hint="across all statuses"
              accent="primary"
              icon={<ClipboardList className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Live Now"
              value={stats.live}
              display={String(stats.live)}
              hint="accepting attempts"
              accent="success"
              icon={<Radio className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Completion Rate"
              value={Math.round(stats.completion)}
              display={`${stats.completion.toFixed(0)}%`}
              hint="avg across attempts"
              accent="info"
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Avg Rating"
              value={Math.round(stats.rating)}
              display={stats.rating.toFixed(1)}
              hint="student rating / 5"
              accent="gold"
              icon={<Star className="h-3.5 w-3.5" />}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No quizzes in this view"
              description="Try a different status filter or create a new quiz."
              action={<BillButton href="/creator/quizzes/create">New Quiz</BillButton>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((q, i) => {
                const meta = STATUS_META[q.status];
                const engaged = q.attempts > 0;
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.3 }}
                    className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors duration-200 hover:border-border-hover"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-text-primary">{q.title}</h3>
                        <p className="mt-0.5 text-[11px] text-text-muted">{q.subject}</p>
                      </div>
                      <StatusBadge label={meta.label} tone={meta.tone} dot />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <MiniStat label="Questions" value={String(q.questions)} icon={HelpCircle} />
                      <MiniStat label="Duration" value={`${q.durationMin} min`} icon={Timer} />
                      <MiniStat label="Attempts" value={q.attempts.toLocaleString("en-IN")} icon={Users} />
                      <MiniStat label="Completion" value={engaged ? `${q.completionRate}%` : "—"} icon={BarChart3} />
                    </div>

                    {engaged && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-text-muted">Completion</span>
                          <span className="font-bold text-text-primary tabular-nums">{q.completionRate}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-600"
                            style={{ width: `${q.completionRate}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <Stars rating={q.rating} />
                    </div>

                    <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                      {CARD_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.label}
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-pink-500 dark:hover:text-ai-accent"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {action.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-danger/80 transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.02] px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] text-text-muted">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-bold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  if (rating <= 0) {
    return <span className="text-[11px] text-text-muted">No ratings yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border")}
        />
      ))}
      <span className="ml-1.5 text-xs font-bold text-text-primary tabular-nums">{rating.toFixed(1)}</span>
    </span>
  );
}

function QuizCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px] w-full" />
        ))}
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <div className="mt-3 flex justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}