"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MinusCircle,
  Percent,
  RefreshCw,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { getUserTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/helpers";
import { getOldQuizzes, type PreviousQuiz } from "@/services/quiz";
import ProfileSectionHeader from "./ProfileSectionHeader";

const PAGE_SIZE = 100;

async function loadAllAttempts(): Promise<PreviousQuiz[]> {
  const first = await getOldQuizzes({
    page: 1,
    limit: PAGE_SIZE,
    sortBy: "completed_at",
    sortOrder: "DESC",
  });
  if (first.totalPages <= 1) return first.quizzes;

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      getOldQuizzes({
        page: index + 2,
        limit: PAGE_SIZE,
        sortBy: "completed_at",
        sortOrder: "DESC",
      })
    )
  );

  return [first.quizzes, ...rest.map((page) => page.quizzes)].flat();
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, "_");
}

function statusLabel(status: string): string {
  return status
    .trim()
    .replace(/_/g, " ")
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: getUserTimeZone(),
    month: "short",
    day: "numeric",
  });
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.round(seconds)}s`;
}

function scoreTextClass(percentage: number): string {
  if (percentage >= 90) return "text-[var(--qs-ok)]";
  if (percentage >= 70) return "text-[var(--qs-brand)]";
  if (percentage >= 50) return "text-[var(--qs-ink)]";
  return "text-[var(--qs-bad)]";
}

function scoreBarClass(percentage: number): string {
  if (percentage >= 90) return "bg-[var(--qs-ok)]";
  if (percentage >= 70) return "bg-[var(--qs-brand)]";
  if (percentage >= 50) return "bg-[var(--qs-sun)]";
  return "bg-[var(--qs-bad)]";
}

function statusChipClass(status: string): string {
  switch (normalizeStatus(status)) {
    case "completed":
      return "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]";
    case "submitted":
      return "border-[var(--qs-brand)] bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]";
    case "timed_out":
      return "border-[var(--qs-ink)] bg-[var(--qs-sun)]/30 text-[var(--qs-ink)]";
    case "left_early":
      return "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]";
    default:
      return "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]";
  }
}

function statusDotClass(status: string): string {
  switch (normalizeStatus(status)) {
    case "completed":
      return "bg-[var(--qs-ok)]";
    case "submitted":
      return "bg-[var(--qs-brand)]";
    case "timed_out":
      return "bg-[var(--qs-sun)]";
    case "left_early":
      return "bg-[var(--qs-bad)]";
    default:
      return "bg-[var(--qs-muted)]";
  }
}

export default function StatisticsPage() {
  const [attempts, setAttempts] = useState<PreviousQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start request before async load
    setLoading(true);
    setError(null);

    loadAllAttempts()
      .then((list) => {
        if (!cancelled) setAttempts(list);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your quiz statistics. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const stats = useMemo(() => {
    const totalAttempts = attempts.length;
    const completed = attempts.filter((attempt) => normalizeStatus(attempt.status) === "completed").length;

    const scored = attempts.filter(
      (attempt) => attempt.result_available !== false && attempt.percentage != null
    );
    const scores = scored
      .map((attempt) => Number(attempt.percentage))
      .filter((value) => Number.isFinite(value));

    const averageScore = scores.length
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : null;
    const bestScore = scores.length ? Math.round(Math.max(...scores)) : null;

    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let totalQuestions = 0;
    let totalTime = 0;
    let passed = 0;

    for (const attempt of scored) {
      correct += Number(attempt.correct_answers) || 0;
      wrong += Number(attempt.wrong_answers) || 0;
      skipped += Number(attempt.skipped_questions) || 0;
      totalQuestions += Number(attempt.total_questions) || 0;
      totalTime += Number(attempt.time_taken) || 0;
      if (Number(attempt.score) >= Number(attempt.passing_marks)) passed += 1;
    }

    const answered = correct + wrong + skipped;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;
    const passRate = scored.length ? Math.round((passed / scored.length) * 100) : null;
    const averageTime = scored.length ? totalTime / scored.length : 0;

    const ranks = scored
      .map((attempt) => Number(attempt.rank))
      .filter((rank) => Number.isFinite(rank) && rank > 0);
    const bestRank = ranks.length ? Math.min(...ranks) : null;

    const statusCounts = attempts.reduce<Record<string, number>>((counts, attempt) => {
      const key = normalizeStatus(attempt.status);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});

    const trend = [...scored]
      .sort(
        (a, b) =>
          new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime()
      )
      .slice(-8);

    return {
      totalAttempts,
      completed,
      averageScore,
      bestScore,
      correct,
      wrong,
      skipped,
      totalQuestions,
      answered,
      accuracy,
      passRate,
      totalTime,
      averageTime,
      bestRank,
      statusCounts,
      trend,
      recent: attempts.slice(0, 5),
    };
  }, [attempts]);

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProfileSectionHeader
          title="Quiz statistics"
          description="Your quiz attempts, scores, accuracy and progress — all in one place."
          icon={BarChart3}
          iconTone="from-[#7C3AED] to-[#6366F1]"
          badge={
            !loading && stats.totalAttempts > 0 ? (
              <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">
                {stats.totalAttempts} attempts
              </span>
            ) : undefined
          }
          actions={
            <Link
              href="/quiz/attempts"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
            >
              All attempts
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        {loading ? (
          <StatisticsSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
        ) : stats.totalAttempts === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                icon={BookOpen}
                label="Total attempts"
                value={stats.totalAttempts}
                hint={`${stats.completed} completed`}
                tone="brand"
                delay={0}
              />
              <KpiCard
                icon={CheckCircle2}
                label="Completed"
                value={stats.completed}
                hint="Finished quizzes"
                tone="ok"
                delay={0.04}
              />
              <KpiCard
                icon={TrendingUp}
                label="Average score"
                value={stats.averageScore == null ? "—" : `${stats.averageScore}%`}
                hint="Across scored attempts"
                tone="sun"
                delay={0.08}
              />
              <KpiCard
                icon={Trophy}
                label="Best score"
                value={stats.bestScore == null ? "—" : `${stats.bestScore}%`}
                hint="Personal best"
                tone="brand"
                delay={0.12}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
                className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 sm:p-6"
              >
                <SectionHeading
                  icon={BarChart3}
                  title="Score trend"
                  hint="Last 8 scored attempts"
                />
                <ScoreTrend trend={stats.trend} />
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
                className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 sm:p-6"
              >
                <SectionHeading icon={Target} title="Answer accuracy" />
                <AccuracyBreakdown
                  correct={stats.correct}
                  wrong={stats.wrong}
                  skipped={stats.skipped}
                  accuracy={stats.accuracy}
                />
              </motion.section>
            </div>

            <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
                className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 sm:p-6"
              >
                <SectionHeading icon={Percent} title="Performance" />
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <MiniStat
                    label="Pass rate"
                    value={stats.passRate == null ? "—" : `${stats.passRate}%`}
                    icon={CheckCircle2}
                    tone="ok"
                  />
                  <MiniStat
                    label="Best rank"
                    value={stats.bestRank == null ? "—" : `#${stats.bestRank}`}
                    icon={Trophy}
                    tone="sun"
                  />
                  <MiniStat
                    label="Time spent"
                    value={formatDuration(stats.totalTime)}
                    icon={Clock3}
                    tone="brand"
                  />
                  <MiniStat
                    label="Avg. time"
                    value={formatDuration(stats.averageTime)}
                    icon={Timer}
                    tone="brand"
                  />
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 sm:p-6"
              >
                <SectionHeading icon={CalendarDays} title="Attempt status" />
                <StatusBreakdown counts={stats.statusCounts} total={stats.totalAttempts} />
              </motion.section>
            </div>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24, ease: "easeOut" }}
              className="overflow-hidden rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] p-5 sm:px-6">
                <SectionHeading icon={BookOpen} title="Recent attempts" />
                <Link
                  href="/quiz/attempts"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[var(--qs-brand)] transition-colors hover:text-[var(--qs-ink)]"
                >
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="divide-y-2 divide-[var(--qs-line)]">
                {stats.recent.map((attempt) => (
                  <RecentAttemptRow key={attempt.attempt_id} attempt={attempt} />
                ))}
              </div>
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  delay,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string | number;
  hint: string;
  tone: "brand" | "ok" | "sun";
  delay: number;
}) {
  const toneClass = {
    brand: "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]",
    ok: "bg-[var(--qs-ok)] text-[var(--qs-on-brand)]",
    sun: "bg-[var(--qs-sun)] text-[#1A1240]",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-3.5 shadow-[3px_3px_0_var(--qs-sun)] sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
          {label}
        </p>
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border-2 border-[var(--qs-ink)]", toneClass)}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.3} />
        </span>
      </div>
      <p className="mt-2 truncate text-[22px] font-extrabold leading-none tabular-nums text-[var(--qs-ink)] sm:text-[28px]">
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] font-semibold text-[var(--qs-muted)]">{hint}</p>
    </motion.div>
  );
}

function ScoreTrend({ trend }: { trend: PreviousQuiz[] }) {
  if (!trend.length) {
    return (
      <p className="mt-6 rounded-[14px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-8 text-center text-xs font-semibold text-[var(--qs-muted)]">
        Scores will appear here once your quiz results are available.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex h-44 items-end gap-2">
        {trend.map((attempt) => {
          const percentage = Math.max(0, Math.min(100, Math.round(Number(attempt.percentage) || 0)));
          return (
            <div key={attempt.attempt_id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end rounded-t-[6px] bg-[var(--qs-bg)]">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(6, percentage)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={cn("w-full rounded-t-[6px]", scoreBarClass(percentage))}
                  title={`${attempt.name}: ${percentage}%`}
                />
              </div>
              <span className={cn("text-[10px] font-extrabold tabular-nums", scoreTextClass(percentage))}>
                {percentage}%
              </span>
              <span className="w-full truncate text-center text-[9px] font-semibold text-[var(--qs-muted)]">
                {formatDate(attempt.completed_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccuracyBreakdown({
  correct,
  wrong,
  skipped,
  accuracy,
}: {
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number | null;
}) {
  const answered = correct + wrong + skipped;
  const correctPct = answered ? (correct / answered) * 100 : 0;
  const wrongPct = answered ? (wrong / answered) * 100 : 0;
  const skippedPct = answered ? Math.max(0, 100 - correctPct - wrongPct) : 0;

  return (
    <div className="mt-5">
      <div className="flex items-end justify-between gap-3">
        <p className="text-4xl font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
          {accuracy == null ? "—" : `${accuracy}%`}
        </p>
        <p className="text-[11px] font-bold text-[var(--qs-muted)]">
          {answered} answers
        </p>
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)]">
        <span className="bg-[var(--qs-ok)]" style={{ width: `${correctPct}%` }} />
        <span className="bg-[var(--qs-bad)]" style={{ width: `${wrongPct}%` }} />
        <span className="bg-[var(--qs-muted)]" style={{ width: `${skippedPct}%` }} />
      </div>

      <div className="mt-4 space-y-2.5">
        <LegendRow icon={CheckCircle2} label="Correct" value={correct} tone="ok" />
        <LegendRow icon={XCircle} label="Wrong" value={wrong} tone="bad" />
        <LegendRow icon={MinusCircle} label="Skipped" value={skipped} tone="muted" />
      </div>
    </div>
  );
}

function LegendRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  tone: "ok" | "bad" | "muted";
}) {
  const toneClass = {
    ok: "text-[var(--qs-ok)]",
    bad: "text-[var(--qs-bad)]",
    muted: "text-[var(--qs-muted)]",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2">
      <span className="flex items-center gap-2 text-xs font-bold text-[var(--qs-ink)]">
        <Icon className={cn("h-3.5 w-3.5", toneClass)} strokeWidth={2.3} />
        {label}
      </span>
      <span className={cn("text-sm font-extrabold tabular-nums", toneClass)}>{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "brand" | "ok" | "sun";
}) {
  const toneClass = {
    brand: "text-[var(--qs-brand)]",
    ok: "text-[var(--qs-ok)]",
    sun: "text-[var(--qs-ink)]",
  }[tone];

  return (
    <div className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", toneClass)} strokeWidth={2.3} />
        <p className="truncate text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
          {label}
        </p>
      </div>
      <p className="mt-1.5 truncate text-lg font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
        {value}
      </p>
    </div>
  );
}

function StatusBreakdown({ counts, total }: { counts: Record<string, number>; total: number }) {
  const order = ["completed", "submitted", "timed_out", "left_early"];
  const entries = [
    ...order.map((status) => [status, counts[status] || 0] as const),
    ...Object.entries(counts).filter(([status]) => !order.includes(status)),
  ];

  return (
    <div className="mt-4 space-y-3">
      {entries.map(([status, count]) => {
        const percentage = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={status}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--qs-ink)]">
                <span className={cn("h-2 w-2 rounded-full", statusDotClass(status))} />
                {statusLabel(status)}
              </span>
              <span className="text-[11px] font-bold tabular-nums text-[var(--qs-muted)]">
                {count} · {percentage}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)]">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", statusDotClass(status))}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentAttemptRow({ attempt }: { attempt: PreviousQuiz }) {
  const resultHidden = attempt.result_available === false;
  const percentage = resultHidden ? 0 : Math.round(Number(attempt.percentage) || 0);

  return (
    <div className="flex flex-col gap-2.5 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-[var(--qs-ink)]">{attempt.name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-[var(--qs-muted)]">
          <span>{formatDate(attempt.completed_at)}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--qs-line)]" />
          <span>{attempt.total_questions} questions</span>
          <span className="h-1 w-1 rounded-full bg-[var(--qs-line)]" />
          <span>{formatDuration(Number(attempt.time_taken) || 0)}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em]", statusChipClass(attempt.status))}>
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDotClass(attempt.status))} />
          {statusLabel(attempt.status)}
        </span>
        {resultHidden ? (
          <span className="text-[11px] font-bold text-[var(--qs-muted)]">Result soon</span>
        ) : (
          <span className={cn("min-w-14 text-right text-lg font-extrabold tabular-nums", scoreTextClass(percentage))}>
            {percentage}%
          </span>
        )}
        {!resultHidden && (
          <Link
            href={`/quiz/${attempt.quiz_id}/results/${attempt.attempt_id}`}
            aria-label={`View result for ${attempt.name}`}
            className="grid h-8 w-8 place-items-center rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
        <Icon className="h-4 w-4" strokeWidth={2.3} />
      </span>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-extrabold text-[var(--qs-ink)]">{title}</h2>
        {hint ? <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--qs-muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="app-skeleton h-28 rounded-[16px] border-2 border-[var(--qs-line)]" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="app-skeleton h-72 rounded-[20px]" />
        <div className="app-skeleton h-72 rounded-[20px]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="app-skeleton h-52 rounded-[20px]" />
        <div className="app-skeleton h-52 rounded-[20px]" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] text-[var(--qs-bad)]">
        <RefreshCw className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-extrabold text-[var(--qs-ink)]">Statistics unavailable</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--qs-muted)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-[20px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
        <BookOpen className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-extrabold text-[var(--qs-ink)]">No quiz attempts yet</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--qs-muted)]">
        Join your first quiz to start building your performance statistics.
      </p>
      <Link
        href="/quiz/join"
        className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
      >
        Join a quiz
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
