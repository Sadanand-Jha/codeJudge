"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  History, BookOpen, TrendingUp,
  CheckCircle2, Trophy,
  HelpCircle, Code2, Brain, Beaker, Calculator,
  Globe2, Palette, Database, Network, Hash, Target, Layers3,
  Calendar, Timer, ArrowRight, ArrowUpRight, Milestone, Filter,
  BarChart2, ChevronDown, ChevronLeft, ChevronRight, Globe,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getOldQuizzes } from "@/services/quiz";

/* ═══════════════════════════════════════════════════════════════
   TYPES (unchanged — same data as current implementation)
   ═══════════════════════════════════════════════════════════════ */
type RecentQuiz = {
  attempt_id: number;
  quiz_id: number;
  name: string;
  code?: string;
  total_marks: number;
  passing_marks: number;
  score: number;
  percentage: number;
  rank: number | null;
  status: string;
  completed_at: string | null;
  time_taken: number | null;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions: number;
};

const STATUS_OPTIONS = ["All", "Completed", "Submitted", "Timed Out", "Left Early"] as const;
const SORT_OPTIONS = ["Newest", "Oldest", "Highest Score", "Lowest Score"] as const;

/* ─── Subject → icon + qs-ui tone mapping ─── */
type SubjectInfo = { icon: React.ElementType; color: string; label: string };

const TONE_BRAND = "text-[var(--qs-brand)]";
const TONE_OK = "text-[var(--qs-ok)]";
const TONE_MUTED = "text-[var(--qs-muted)]";

const SUBJECT_MAP: Record<string, SubjectInfo> = {
  "Data Structures": { icon: Layers3, color: TONE_BRAND, label: "Data Structures" },
  "Algorithms": { icon: Brain, color: TONE_MUTED, label: "Algorithms" },
  "System Design": { icon: Network, color: TONE_OK, label: "System Design" },
  "Database": { icon: Database, color: TONE_BRAND, label: "Database" },
  "Operating System": { icon: Hash, color: TONE_MUTED, label: "Operating System" },
  "Computer Networks": { icon: Globe2, color: TONE_BRAND, label: "Computer Networks" },
  "Programming": { icon: Code2, color: TONE_MUTED, label: "Programming" },
  "Mathematics": { icon: Calculator, color: TONE_OK, label: "Mathematics" },
  "Physics": { icon: Beaker, color: TONE_BRAND, label: "Physics" },
  "Aptitude": { icon: Target, color: TONE_OK, label: "Aptitude" },
  "General Knowledge": { icon: Globe, color: TONE_MUTED, label: "General Knowledge" },
  "English": { icon: BookOpen, color: TONE_BRAND, label: "English" },
  "Art": { icon: Palette, color: TONE_MUTED, label: "Art" },
  "Graph Theory": { icon: BarChart2, color: TONE_BRAND, label: "Graph Theory" },
  "Dynamic Programming": { icon: TrendingUp, color: TONE_OK, label: "Dynamic Programming" },
  "Web Development": { icon: Code2, color: TONE_OK, label: "Web Development" },
};

const DEFAULT_SUBJECT: SubjectInfo = { icon: HelpCircle, color: TONE_BRAND, label: "Quiz" };

function getSubjectInfo(name: string): SubjectInfo {
  const lower = name.toLowerCase();
  for (const [keyword, info] of Object.entries(SUBJECT_MAP)) {
    if (lower.includes(keyword.toLowerCase())) return info;
  }
  return DEFAULT_SUBJECT;
}

/* ─── Status → compact qs-ui tone ─── */
function statusTone(status: string): { text: string; dot: string; chip: string } {
  switch (status.trim().toLowerCase()) {
    case "completed":
      return { text: "text-[var(--qs-ok)]", dot: "bg-[var(--qs-ok)]", chip: "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]" };
    case "submitted":
      return { text: "text-[var(--qs-brand)]", dot: "bg-[var(--qs-brand)]", chip: "border-[var(--qs-brand)] bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]" };
    case "timed out":
      return { text: "text-[var(--qs-ink)]", dot: "bg-[var(--qs-sun)]", chip: "border-[var(--qs-ink)] bg-[var(--qs-sun)]/30 text-[var(--qs-ink)]" };
    case "left early":
      return { text: "text-[var(--qs-bad)]", dot: "bg-[var(--qs-bad)]", chip: "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]" };
    default:
      return { text: "text-[var(--qs-ok)]", dot: "bg-[var(--qs-ok)]", chip: "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]" };
  }
}

function scoreColor(pct: number): string {
  if (pct >= 90) return "text-[var(--qs-ok)]";
  if (pct >= 70) return "text-[var(--qs-ink)]";
  if (pct >= 50) return "text-[var(--qs-brand)]";
  return "text-[var(--qs-bad)]";
}

function scoreBar(pct: number): string {
  if (pct >= 90) return "bg-[var(--qs-ok)]";
  if (pct >= 70) return "bg-[var(--qs-brand)]";
  if (pct >= 50) return "bg-[var(--qs-sun)]";
  return "bg-[var(--qs-bad)]";
}

/* ═══════════════════════════════════════════════════════════════
   COMPACT PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */

function statusLabel(status: string) {
  return status
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function StatusChip({ status }: { status: string }) {
  const t = statusTone(status);
  const label = statusLabel(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border-2 px-2 py-0.5 text-[11px] font-bold", t.chip)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />
      {label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  hint: string;
  accent: string;
}) {
  return (
    <div className="group relative flex min-h-[116px] flex-col justify-between overflow-hidden rounded-2xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[4px_4px_0_var(--qs-sun)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--qs-sun)] sm:p-4.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)]">
          <Icon className={cn("h-4 w-4", accent)} strokeWidth={1.8} />
        </span>
      </div>
      <div>
        <p className="qs-display text-[26px] font-extrabold leading-none tracking-tight text-[var(--qs-ink)] tabular-nums sm:text-[28px]">{value}</p>
        <p className="mt-1.5 text-[11px] text-[var(--qs-muted)]">{hint}</p>
      </div>
    </div>
  );
}

function FilterSelect({ icon: Icon, value, options, onChange, label }: { icon: React.ElementType; value: string; options: readonly string[]; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "b sm inline-flex min-h-11 w-full items-center justify-start gap-1.5 px-2.5 text-[var(--qs-muted)] hover:text-[var(--qs-ink)] sm:w-auto",
          open && "border-[var(--qs-brand)] text-[var(--qs-ink)]"
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)]" />
        <span className="min-w-0 flex-1 truncate text-left sm:max-w-[88px] sm:flex-none">{value}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)] transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1 shadow-[4px_4px_0_var(--qs-sun)] sm:left-0 sm:right-auto">
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-bold transition-colors duration-150",
                    value === opt
                      ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                      : "text-[var(--qs-muted)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
                  )}
                >
                  {opt}
                  {value === opt && <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-on-brand)]" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPACT ATTEMPT ROW (same info, dense table-style layout)
   ═══════════════════════════════════════════════════════════════ */
function AttemptRow({ quiz, index }: { quiz: RecentQuiz; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const tone = statusTone(quiz.status);

  const timeTaken = useMemo(() => {
    if (quiz.time_taken == null) return "—";
    const mins = Math.floor(quiz.time_taken / 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      return `${h}h ${mins % 60}m`;
    }
    if (mins > 0) return `${mins}m`;
    return `${quiz.time_taken % 60}s`;
  }, [quiz.time_taken]);

  const dateFormatted = useMemo(() => {
    if (!quiz.completed_at) return "—";
    return new Date(quiz.completed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, [quiz.completed_at]);

  const subject = getSubjectInfo(quiz.name);
  const pct = Math.round(Number(quiz.percentage) || 0);
  const breakdownTotal = Math.max(
    1,
    quiz.total_questions || quiz.correct_answers + quiz.wrong_answers + quiz.skipped_questions || 1
  );
  const correctPct = (quiz.correct_answers / breakdownTotal) * 100;
  const wrongPct = (quiz.wrong_answers / breakdownTotal) * 100;
  const skippedPct = Math.max(0, 100 - correctPct - wrongPct);

  return (
    <div className="group/row relative transition-all duration-200 hover:bg-[var(--qs-brand)]/[0.04]">
      <span className={cn("absolute bottom-3 left-0 top-3 w-[3px] scale-y-50 rounded-r-full opacity-0 transition-all duration-200 group-hover/row:scale-y-100 group-hover/row:opacity-100", scoreBar(pct))} />
      {/* Mobile: stacked multi-line card — one piece of info per line */}
      <div className="space-y-2.5 px-4 py-3.5 lg:hidden">
        {/* Line 1: quiz identity */}
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-bg)]", subject.color)}>
            <subject.icon className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-bold leading-snug text-[var(--qs-ink)]">{quiz.name}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--qs-muted)]">
              {subject.label}
            </p>
          </div>
        </div>
        {/* Line 2: status */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={quiz.status} />
          {quiz.rank != null && (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/25 px-2 py-0.5 text-[11px] font-bold text-[var(--qs-ink)]">
              <Trophy className="h-3 w-3" />#{quiz.rank}
            </span>
          )}
        </div>
        {/* Line 3: score */}
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className={cn("text-lg font-extrabold tabular-nums", scoreColor(pct))}>{pct}%</span>
          <span className="text-[11px] text-[var(--qs-muted)] tabular-nums">{quiz.score}/{quiz.total_marks} marks</span>
        </div>
        {/* Line 4: time + date */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--qs-muted)]">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Timer className="h-3.5 w-3.5 text-[var(--qs-muted)]" />
            {timeTaken}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[var(--qs-muted)]" />
            {dateFormatted}
          </span>
        </div>
        {/* Line 5: actions */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="b sm flex-1"
          >
            {expanded ? "Less" : "Details"}
          </button>
          <Link
            href={`/quiz/${quiz.quiz_id}/results/${quiz.attempt_id}`}
            className="b b-pri sm flex-1 gap-1"
          >
            View <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Desktop (≥1024px): wide table row */}
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_112px_72px_84px_150px] items-center gap-3 px-5 py-4 lg:grid">
        {/* Quiz */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] transition-transform duration-200 group-hover/row:scale-105", subject.color)}>
            <subject.icon className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--qs-ink)]">{quiz.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--qs-muted)]">
              {subject.label}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusChip status={quiz.status} />
          {quiz.rank != null && (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/25 px-2 py-0.5 text-[11px] font-bold text-[var(--qs-ink)]">
              <Trophy className="h-3 w-3" />#{quiz.rank}
            </span>
          )}
        </div>

        {/* Score */}
        <div className="min-w-0">
          <span className={cn("text-sm font-extrabold tabular-nums", scoreColor(pct))}>{pct}%</span>
          <span className="text-[11px] text-[var(--qs-muted)] tabular-nums"> · {quiz.score}/{quiz.total_marks}</span>
        </div>

        {/* Time */}
        <div>
          <span className="text-xs text-[var(--qs-muted)] tabular-nums">
            {timeTaken}
          </span>
        </div>

        {/* Date */}
        <div>
          <span className="text-xs text-[var(--qs-muted)]">
            {dateFormatted}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="b sm"
          >
            {expanded ? "Less" : "Details"}
          </button>
          <Link
            href={`/quiz/${quiz.quiz_id}/results/${quiz.attempt_id}`}
            className="b b-pri sm gap-1"
          >
            View <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Score bar (visual density, same data) */}
      <div className="px-4 pb-2 sm:px-5 lg:pl-[76px] lg:pr-[210px]">
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--qs-line)]">
          <div className={cn("h-full rounded-full transition-[width] duration-500", scoreBar(pct))} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
        </div>
      </div>

      {/* Expanded detail — answer breakdown */}
      {expanded && (
        <div className="mx-4 mb-3.5 mt-1.5 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-3 sm:mx-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--qs-muted)]">Answer breakdown</span>
            <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold", tone.text)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
              {statusLabel(quiz.status)}
            </span>
          </div>

          <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
            <span className="bg-[var(--qs-ok)]" style={{ width: `${correctPct}%` }} />
            <span className="bg-[var(--qs-bad)]" style={{ width: `${wrongPct}%` }} />
            <span className="bg-[var(--qs-muted)]" style={{ width: `${skippedPct}%` }} />
          </div>

          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {[
              { label: "Correct", value: quiz.correct_answers, dot: "bg-[var(--qs-ok)]", cls: "text-[var(--qs-ok)]" },
              { label: "Wrong", value: quiz.wrong_answers, dot: "bg-[var(--qs-bad)]", cls: "text-[var(--qs-bad)]" },
              { label: "Skipped", value: quiz.skipped_questions, dot: "bg-[var(--qs-muted)]", cls: "text-[var(--qs-muted)]" },
              { label: "Total", value: quiz.total_questions, dot: "bg-[var(--qs-brand)]", cls: "text-[var(--qs-brand)]" },
            ].map((it) => (
              <div key={it.label}>
                <p className={cn("text-base font-extrabold leading-none tabular-nums", it.cls)}>{it.value}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                  <span className={cn("h-1.5 w-1.5 rounded-full", it.dot)} />
                  {it.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t-2 border-[var(--qs-line)] pt-2.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--qs-muted)]">
              <Milestone className="h-3.5 w-3.5" />
              {quiz.correct_answers + quiz.wrong_answers + quiz.skipped_questions}/{quiz.total_questions} answered
            </span>
            <Link
              href={`/quiz/${quiz.quiz_id}`}
              className="b b-text sm gap-1"
            >
              <History className="h-3 w-3" /> Reattempt
            </Link>
          </div>
        </div>
      )}
      <span className="sr-only">{index}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EMPTY + SKELETON (compact)
   ═══════════════════════════════════════════════════════════════ */
function EmptyState({ missionMode = false }: { missionMode?: boolean }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)]">
        <History className="h-5 w-5 text-[var(--qs-brand)]" strokeWidth={1.8} />
      </span>
      <h3 className="mt-3 text-[15px] font-bold text-[var(--qs-ink)]">
        {missionMode ? "No missions launched yet" : "No quiz attempts yet"}
      </h3>
      <p className="mt-1 max-w-xs text-[13px] leading-5 text-[var(--qs-muted)]">
        {missionMode ? "Enter your first launch code to begin your mission history." : "Join your first assessment to start building your activity history."}
      </p>
      <Link
        href="/quiz/join"
        className="b b-pri mt-4 gap-1.5"
      >
        {missionMode ? "Launch first mission" : "Join a quiz"} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="px-4 py-3 sm:px-5" role="status" aria-label="Loading quiz activity">
      <div className="flex items-center gap-3">
        <div className="app-skeleton h-8 w-8 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <div className="app-skeleton h-3.5 w-1/2 rounded" />
          <div className="app-skeleton h-2.5 w-1/4 rounded" />
        </div>
        <div className="app-skeleton h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN SECTION
   ═══════════════════════════════════════════════════════════════ */
export default function YourActivitySection({
  missionMode = false,
  view = "recent",
}: {
  missionMode?: boolean;
  view?: "recent" | "all";
}) {
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentStatus, setRecentStatus] = useState<string>("All");
  const [recentSort, setRecentSort] = useState<string>("Newest");
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotal, setRecentTotal] = useState(0);
  const [recentTotalPages, setRecentTotalPages] = useState(1);
  const isAllAttemptsView = view === "all";
  const pageSize = isAllAttemptsView ? 10 : 5;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- set loading before async request kick-off
    setRecentLoading(true);
    getOldQuizzes({
      page: recentPage,
      limit: pageSize,
      status: recentStatus === "All" ? undefined : recentStatus,
      sortBy: recentSort === "Newest" ? "completed_at" : recentSort === "Oldest" ? "completed_at" : "percentage",
      sortOrder: recentSort === "Oldest" || recentSort === "Lowest Score" ? "ASC" : "DESC",
    })
      .then((res) => {
        if (!cancelled) {
          setRecentQuizzes(res.quizzes);
          setRecentTotal(res.total);
          setRecentTotalPages(res.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRecentLoading(false); });
    return () => { cancelled = true; };
  }, [pageSize, recentPage, recentStatus, recentSort]);

  const paginationPages = useMemo(() => {
    const visibleCount = Math.min(5, recentTotalPages);
    const start = Math.max(1, Math.min(recentPage - 2, recentTotalPages - visibleCount + 1));
    return Array.from({ length: visibleCount }, (_, index) => start + index);
  }, [recentPage, recentTotalPages]);

  const overview = useMemo(() => {
    const list = recentQuizzes || [];
    const completed = list.filter((q) => q.status.trim().toLowerCase() === "completed").length;
    const scores = list.map((q) => Number(q.percentage)).filter((v) => Number.isFinite(v));
    const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
    const bestScore = scores.length ? Math.round(Math.max(...scores)) : null;
    return { totalAttempts: recentTotal, completed, avgScore, bestScore };
  }, [recentQuizzes, recentTotal]);

  // Status filtering happens in the parameterized backend query so pagination
  // counts and page contents always describe the same result set.
  const filtered = recentQuizzes;

  return (
    <section aria-label={missionMode ? "Mission logs" : "My activity"} className="mx-auto w-full max-w-[1280px]">
      {/* ── Single analytics header: title + all controls in one place ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight text-[var(--qs-ink)] sm:text-[24px]">
            {isAllAttemptsView ? "All Attempts" : missionMode ? "Your Mission Logs" : "Your Activity"}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--qs-muted)] sm:text-sm">
            {isAllAttemptsView ? "Review your complete quiz history, scores, and results." : missionMode ? "Review completed expeditions, scores, and flight performance." : "Track your quiz attempts, scores and progress."}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {!isAllAttemptsView && (
            <Link href="/quiz/attempts" className="b sm inline-flex min-h-11 w-full items-center justify-between gap-1.5 sm:w-auto sm:justify-center">
              View all attempts <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          )}
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <FilterSelect icon={Filter} value={recentStatus} options={STATUS_OPTIONS} onChange={(value) => { setRecentStatus(value); setRecentPage(1); }} label="Filter by status" />
            <FilterSelect icon={TrendingUp} value={recentSort} options={SORT_OPTIONS} onChange={(value) => { setRecentSort(value); setRecentPage(1); }} label="Sort attempts" />
          </div>
        </div>
      </div>

      {/* ── Stat cards (compact, 100–120px) ── */}
      {!isAllAttemptsView && <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={BookOpen} label={missionMode ? "Total Missions" : "Total Attempts"} value={overview.totalAttempts} hint={missionMode ? "missions attempted" : "quizzes attempted"} accent={TONE_BRAND} />
        <StatCard icon={CheckCircle2} label={missionMode ? "Successful Landings" : "Completed"} value={overview.completed} hint={missionMode ? "completed missions" : "finished attempts"} accent={TONE_OK} />
        <StatCard icon={Trophy} label={missionMode ? "Best Mission Score" : "Best Score"} value={overview.bestScore === null ? "—" : `${overview.bestScore}%`} hint="highest score" accent={TONE_BRAND} />
        <StatCard icon={TrendingUp} label={missionMode ? "Average Flight Score" : "Average Score"} value={overview.avgScore === null ? "—" : `${overview.avgScore}%`} hint={missionMode ? "across missions" : "across attempts"} accent={TONE_MUTED} />
      </div>}

      {/* ── Recent attempts: full-width table (no narrow side column) ── */}
      <div className="relative mt-5 min-w-0 overflow-hidden rounded-2xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[5px_5px_0_var(--qs-sun)]">
        {/* Desktop column labels */}
        {filtered.length > 0 && (
          <div className="relative hidden grid-cols-[minmax(0,1fr)_120px_112px_72px_84px_150px] gap-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--qs-muted)] lg:grid">
            <span>{missionMode ? "Mission" : "Quiz"}</span>
            <span>Status</span>
            <span>Score</span>
            <span>Time</span>
            <span>Date</span>
            <span className="text-right">Action</span>
          </div>
        )}

        <div className="relative divide-y-2 divide-[var(--qs-line)]">
          {recentLoading
            ? Array.from({ length: isAllAttemptsView ? 10 : 5 }).map((_, i) => <SkeletonRow key={i} />)
            : filtered.length === 0
              ? <EmptyState missionMode={missionMode} />
              : filtered.map((quiz, i) => <AttemptRow key={quiz.attempt_id} quiz={quiz} index={(recentPage - 1) * pageSize + i} />)}
        </div>

        {isAllAttemptsView && !recentLoading && recentTotalPages > 1 && (
          <nav className="relative flex flex-col gap-3 border-t-2 border-[var(--qs-line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5" aria-label="Attempts pagination">
            <p className="text-center text-[11px] font-medium text-[var(--qs-muted)] sm:text-left">
              Showing {(recentPage - 1) * pageSize + 1}–{Math.min(recentPage * pageSize, recentTotal)} of {recentTotal}
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <button type="button" onClick={() => setRecentPage((page) => Math.max(1, page - 1))} disabled={recentPage === 1} aria-label="Previous page" className="b b-icon sm">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {paginationPages.map((page) => (
                <button key={page} type="button" onClick={() => setRecentPage(page)} aria-current={page === recentPage ? "page" : undefined} className={cn("b sm min-w-9 px-2", page === recentPage && "b-pri")}>
                  {page}
                </button>
              ))}
              <button type="button" onClick={() => setRecentPage((page) => Math.min(recentTotalPages, page + 1))} disabled={recentPage === recentTotalPages} aria-label="Next page" className="b b-icon sm">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </section>
  );
}
