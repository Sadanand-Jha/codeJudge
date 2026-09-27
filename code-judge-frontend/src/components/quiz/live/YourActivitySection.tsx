"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, History, BookOpen, TrendingUp,
  CheckCircle2, Trophy, Copy,
  Send, Check, HelpCircle, Code2, Brain, Beaker, Calculator,
  Globe2, Palette, Database, Network, Hash, Target, Layers3,
  Calendar, Timer, ArrowRight, ArrowUpRight, X, Milestone, Filter,
  BarChart2, ChevronDown, Award, Globe,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getOldQuizzes } from "@/services/quiz";
import { formatQuizCode } from "@/utils/quizCode";

/* ═══════════════════════════════════════════════════════════════
   TYPES (unchanged — same data as current implementation)
   ═══════════════════════════════════════════════════════════════ */
type RecentQuiz = {
  attempt_id: number;
  quiz_id: number;
  name: string;
  code: string;
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

/* ─── Subject → icon + color mapping (unchanged data, theme-aware tones) ─── */
type SubjectInfo = { icon: React.ElementType; color: string; label: string };

const SUBJECT_MAP: Record<string, SubjectInfo> = {
  "Data Structures": { icon: Layers3, color: "text-[#6B5CFF] dark:text-[#8B7CFF]", label: "Data Structures" },
  "Algorithms": { icon: Brain, color: "text-[#667085] dark:text-[#9AA4B5]", label: "Algorithms" },
  "System Design": { icon: Network, color: "text-[#039855] dark:text-[#20D889]", label: "System Design" },
  "Database": { icon: Database, color: "text-[#B54708] dark:text-[#FFB84D]", label: "Database" },
  "Operating System": { icon: Hash, color: "text-[#1570EF] dark:text-[#4F9DFF]", label: "Operating System" },
  "Computer Networks": { icon: Globe2, color: "text-[#6B5CFF] dark:text-[#8B7CFF]", label: "Computer Networks" },
  "Programming": { icon: Code2, color: "text-[#667085] dark:text-[#9AA4B5]", label: "Programming" },
  "Mathematics": { icon: Calculator, color: "text-[#B54708] dark:text-[#FFB84D]", label: "Mathematics" },
  "Physics": { icon: Beaker, color: "text-[#1570EF] dark:text-[#4F9DFF]", label: "Physics" },
  "Aptitude": { icon: Target, color: "text-[#039855] dark:text-[#20D889]", label: "Aptitude" },
  "General Knowledge": { icon: Globe, color: "text-[#667085] dark:text-[#9AA4B5]", label: "General Knowledge" },
  "English": { icon: BookOpen, color: "text-[#6B5CFF] dark:text-[#8B7CFF]", label: "English" },
  "Art": { icon: Palette, color: "text-[#667085] dark:text-[#9AA4B5]", label: "Art" },
  "Graph Theory": { icon: BarChart2, color: "text-[#1570EF] dark:text-[#4F9DFF]", label: "Graph Theory" },
  "Dynamic Programming": { icon: TrendingUp, color: "text-[#039855] dark:text-[#20D889]", label: "Dynamic Programming" },
  "Web Development": { icon: Code2, color: "text-[#B54708] dark:text-[#FFB84D]", label: "Web Development" },
};

const DEFAULT_SUBJECT: SubjectInfo = { icon: HelpCircle, color: "text-[#6B5CFF] dark:text-[#8B7CFF]", label: "Quiz" };

function getSubjectInfo(name: string): SubjectInfo {
  const lower = name.toLowerCase();
  for (const [keyword, info] of Object.entries(SUBJECT_MAP)) {
    if (lower.includes(keyword.toLowerCase())) return info;
  }
  return DEFAULT_SUBJECT;
}

/* ─── Status → compact tone (readable on white + dark) ─── */
function statusTone(status: string): { text: string; dot: string; chip: string } {
  switch (status) {
    case "Completed":
      return { text: "text-[#039855] dark:text-[#20D889]", dot: "bg-[#12B76A] dark:bg-[#20D889]", chip: "border-[#12B76A]/30 bg-[#12B76A]/10 text-[#039855] dark:border-[#20D889]/25 dark:bg-[#20D889]/10 dark:text-[#20D889]" };
    case "Submitted":
      return { text: "text-[#6B5CFF] dark:text-[#8B7CFF]", dot: "bg-[#8B7CFF]", chip: "border-[#8B7CFF]/30 bg-[#8B7CFF]/10 text-[#6B5CFF] dark:text-[#8B7CFF]" };
    case "Timed Out":
      return { text: "text-[#B54708] dark:text-[#FFB84D]", dot: "bg-[#F79009] dark:bg-[#FFB84D]", chip: "border-[#F79009]/30 bg-[#F79009]/10 text-[#B54708] dark:border-[#FFB84D]/25 dark:bg-[#FFB84D]/10 dark:text-[#FFB84D]" };
    case "Left Early":
      return { text: "text-[#D92D20] dark:text-[#FF4D5D]", dot: "bg-[#F04438] dark:bg-[#FF4D5D]", chip: "border-[#F04438]/30 bg-[#F04438]/10 text-[#D92D20] dark:border-[#FF4D5D]/25 dark:bg-[#FF4D5D]/10 dark:text-[#FF4D5D]" };
    default:
      return { text: "text-[#039855] dark:text-[#20D889]", dot: "bg-[#12B76A] dark:bg-[#20D889]", chip: "border-[#12B76A]/30 bg-[#12B76A]/10 text-[#039855] dark:border-[#20D889]/25 dark:bg-[#20D889]/10 dark:text-[#20D889]" };
  }
}

function scoreColor(pct: number): string {
  if (pct >= 90) return "text-[#039855] dark:text-[#20D889]";
  if (pct >= 70) return "text-[#101828] dark:text-[#F4F6FA]";
  if (pct >= 50) return "text-[#B54708] dark:text-[#FFB84D]";
  return "text-[#D92D20] dark:text-[#FF4D5D]";
}

function scoreBar(pct: number): string {
  if (pct >= 90) return "bg-[#12B76A] dark:bg-[#20D889]";
  if (pct >= 70) return "bg-[#8B7CFF]";
  if (pct >= 50) return "bg-[#F79009] dark:bg-[#FFB84D]";
  return "bg-[#F04438] dark:bg-[#FF4D5D]";
}

/* ═══════════════════════════════════════════════════════════════
   COMPACT PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */

function StatusChip({ status }: { status: string }) {
  const t = statusTone(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold", t.chip)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />
      {status}
    </span>
  );
}

function CodeCopyChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const formatted = formatQuizCode(code);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = formatted;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 transition-colors duration-150",
        copied
          ? "border-[#12B76A]/40 bg-[#12B76A]/10 dark:border-[#20D889]/40 dark:bg-[#20D889]/10"
          : "border-[#E4E7EC] bg-[#F2F4F7] dark:border-[#252D3A] dark:bg-[#19202C]"
      )}
      title="Quiz code"
    >
      <code className="text-[11px] font-semibold tracking-wider text-[#475467] dark:text-[#9AA4B5]">{formatted}</code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy quiz code"
        className={cn("rounded p-0.5 transition-colors duration-150", copied ? "text-[#039855] dark:text-[#20D889]" : "text-[#98A2B3] hover:text-[#6B5CFF] dark:text-[#687386] dark:hover:text-[#8B7CFF]")}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
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
    <div className="flex min-h-[104px] flex-col justify-between rounded-xl border border-[#E4E7EC] bg-white p-3.5 transition-colors duration-150 hover:border-[#D0D5DD] dark:border-[#252D3A] dark:bg-[#151A24] dark:hover:border-[#353f52] sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3] dark:text-[#687386]">{label}</span>
        <Icon className={cn("h-4 w-4", accent)} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-[26px] font-bold leading-none tracking-tight text-[#101828] tabular-nums dark:text-[#F4F6FA] sm:text-[28px]">{value}</p>
        <p className="mt-1.5 text-[11px] text-[#98A2B3] dark:text-[#687386]">{hint}</p>
      </div>
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3] dark:text-[#687386]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search quizzes..."}
        className="h-9 w-full rounded-lg border border-[#E4E7EC] bg-white pl-9 pr-8 text-[13px] text-[#101828] outline-none transition-colors duration-150 placeholder:text-[#98A2B3] focus:border-[#8B7CFF]/60 dark:border-[#252D3A] dark:bg-[#151A24] dark:text-[#F4F6FA] dark:placeholder:text-[#687386] dark:focus:border-[#8B7CFF]/50"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#98A2B3] transition-colors duration-150 hover:text-[#101828] dark:text-[#687386] dark:hover:text-[#F4F6FA]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function FilterSelect({ icon: Icon, value, options, onChange, label }: { icon: React.ElementType; value: string; options: readonly string[]; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E4E7EC] bg-white px-2.5 text-xs font-medium text-[#475467] transition-colors duration-150 hover:border-[#D0D5DD] hover:text-[#101828] dark:border-[#252D3A] dark:bg-[#151A24] dark:text-[#9AA4B5] dark:hover:border-[#353f52] dark:hover:text-[#F4F6FA]",
          open && "border-[#8B7CFF]/50 text-[#101828] dark:border-[#8B7CFF]/40 dark:text-[#F4F6FA]"
        )}
      >
        <Icon className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#687386]" />
        <span className="max-w-[88px] truncate">{value}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-[#98A2B3] transition-transform duration-150 dark:text-[#687386]", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-30 mt-1.5 w-40 overflow-hidden rounded-xl border border-[#E4E7EC] bg-white p-1 shadow-xl shadow-black/10 dark:border-[#252D3A] dark:bg-[#151A24] dark:shadow-black/40 sm:left-0 sm:right-auto">
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors duration-150",
                    value === opt
                      ? "bg-[#8B7CFF]/10 text-[#6B5CFF] dark:bg-[#8B7CFF]/12 dark:text-[#8B7CFF]"
                      : "text-[#475467] hover:bg-[#F2F4F7] hover:text-[#101828] dark:text-[#9AA4B5] dark:hover:bg-[#19202C] dark:hover:text-[#F4F6FA]"
                  )}
                >
                  {opt}
                  {value === opt && <span className="h-1.5 w-1.5 rounded-full bg-[#8B7CFF]" />}
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

  return (
    <div className="transition-colors duration-150 hover:bg-[#F2F4F7] dark:hover:bg-[#19202C]/60">
      {/* Mobile: stacked multi-line card — one piece of info per line */}
      <div className="space-y-2.5 px-4 py-3.5 lg:hidden">
        {/* Line 1: quiz identity */}
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#F2F4F7] dark:border-[#252D3A] dark:bg-[#19202C]", subject.color)}>
            <subject.icon className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold leading-snug text-[#101828] dark:text-[#F4F6FA]">{quiz.name}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#98A2B3] dark:text-[#687386]">
              {subject.label} ·
              <CodeCopyChip code={quiz.code} />
            </p>
          </div>
        </div>
        {/* Line 2: status */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={quiz.status} />
          {quiz.rank != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#F79009]/30 bg-[#F79009]/10 px-2 py-0.5 text-[11px] font-semibold text-[#B54708] dark:border-[#FFB84D]/25 dark:bg-[#FFB84D]/10 dark:text-[#FFB84D]">
              <Trophy className="h-3 w-3" />#{quiz.rank}
            </span>
          )}
        </div>
        {/* Line 3: score */}
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className={cn("text-lg font-bold tabular-nums", scoreColor(pct))}>{pct}%</span>
          <span className="text-[11px] text-[#98A2B3] tabular-nums dark:text-[#687386]">{quiz.score}/{quiz.total_marks} marks</span>
        </div>
        {/* Line 4: time + date */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#475467] dark:text-[#9AA4B5]">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Timer className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#687386]" />
            {timeTaken}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#687386]" />
            {dateFormatted}
          </span>
        </div>
        {/* Line 5: actions */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#F2F4F7] px-2.5 text-xs font-semibold text-[#475467] transition-colors duration-150 hover:border-[#D0D5DD] hover:text-[#101828] dark:border-[#252D3A] dark:bg-[#19202C] dark:text-[#9AA4B5] dark:hover:border-[#353f52] dark:hover:text-[#F4F6FA]"
          >
            {expanded ? "Less" : "Details"}
          </button>
          <Link
            href={`/quiz/${quiz.code}/results`}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-[#8B7CFF]/10 px-2.5 text-xs font-semibold text-[#6B5CFF] transition-colors duration-150 hover:bg-[#8B7CFF]/20 dark:bg-[#8B7CFF]/12 dark:text-[#8B7CFF] dark:hover:bg-[#8B7CFF]/20"
          >
            View <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Desktop (≥1024px): wide table row */}
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_112px_72px_84px_150px] items-center gap-3 px-5 py-3 lg:grid">
        {/* Quiz */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#F2F4F7] dark:border-[#252D3A] dark:bg-[#19202C]", subject.color)}>
            <subject.icon className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#101828] dark:text-[#F4F6FA]">{quiz.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#98A2B3] dark:text-[#687386]">
              {subject.label} ·
              <CodeCopyChip code={quiz.code} />
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusChip status={quiz.status} />
          {quiz.rank != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#F79009]/30 bg-[#F79009]/10 px-2 py-0.5 text-[11px] font-semibold text-[#B54708] dark:border-[#FFB84D]/25 dark:bg-[#FFB84D]/10 dark:text-[#FFB84D]">
              <Trophy className="h-3 w-3" />#{quiz.rank}
            </span>
          )}
        </div>

        {/* Score */}
        <div className="min-w-0">
          <span className={cn("text-sm font-bold tabular-nums", scoreColor(pct))}>{pct}%</span>
          <span className="text-[11px] text-[#98A2B3] tabular-nums dark:text-[#687386]"> · {quiz.score}/{quiz.total_marks}</span>
        </div>

        {/* Time */}
        <div>
          <span className="text-xs text-[#475467] tabular-nums dark:text-[#9AA4B5]">
            {timeTaken}
          </span>
        </div>

        {/* Date */}
        <div>
          <span className="text-xs text-[#475467] dark:text-[#9AA4B5]">
            {dateFormatted}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex h-7 items-center rounded-lg border border-[#E4E7EC] bg-[#F2F4F7] px-2.5 text-[11px] font-semibold text-[#475467] transition-colors duration-150 hover:border-[#D0D5DD] hover:text-[#101828] dark:border-[#252D3A] dark:bg-[#19202C] dark:text-[#9AA4B5] dark:hover:border-[#353f52] dark:hover:text-[#F4F6FA]"
          >
            {expanded ? "Less" : "Details"}
          </button>
          <Link
            href={`/quiz/${quiz.code}/results`}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#8B7CFF]/10 px-2.5 text-[11px] font-semibold text-[#6B5CFF] transition-colors duration-150 hover:bg-[#8B7CFF]/20 dark:bg-[#8B7CFF]/12 dark:text-[#8B7CFF] dark:hover:bg-[#8B7CFF]/20"
          >
            View <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Score bar (visual density, same data) */}
      <div className="px-4 pb-1 sm:px-5 lg:pl-[68px] lg:pr-[190px]">
        <div className="h-1 overflow-hidden rounded-full bg-[#E4E7EC] dark:bg-[#252D3A]/60">
          <div className={cn("h-full rounded-full", scoreBar(pct))} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
        </div>
      </div>

      {/* Expanded detail (same breakdown data, compact) */}
      {expanded && (
        <div className="mx-4 mb-3 mt-1 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#E4E7EC] bg-[#E4E7EC] dark:border-[#252D3A] dark:bg-[#252D3A] sm:mx-5 sm:grid-cols-5">
          {[
            { label: "Correct", value: quiz.correct_answers, cls: "text-[#039855] dark:text-[#20D889]" },
            { label: "Wrong", value: quiz.wrong_answers, cls: "text-[#D92D20] dark:text-[#FF4D5D]" },
            { label: "Skipped", value: quiz.skipped_questions, cls: "text-[#475467] dark:text-[#9AA4B5]" },
            { label: "Questions", value: quiz.total_questions, cls: "text-[#1570EF] dark:text-[#4F9DFF]" },
            { label: "Status", value: quiz.status, cls: tone.text, small: true },
          ].map((it) => (
            <div key={it.label} className="bg-white px-3 py-2.5 dark:bg-[#12161d]">
              <p className={cn("truncate font-bold tabular-nums", it.small ? "text-xs" : "text-base text-[#101828] dark:text-[#F4F6FA]")}>{it.value}</p>
              <p className={cn("mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", it.cls)}>{it.label}</p>
            </div>
          ))}
          <div className="col-span-2 flex items-center justify-between gap-2 bg-white px-3 py-2.5 dark:bg-[#12161d] sm:col-span-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#98A2B3] dark:text-[#687386]">
              <Milestone className="h-3.5 w-3.5" />
              {quiz.correct_answers + quiz.wrong_answers + quiz.skipped_questions}/{quiz.total_questions} answered
            </span>
            <Link
              href={`/quiz/${quiz.code}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B5CFF] transition-colors duration-150 hover:text-[#5248d4] dark:text-[#8B7CFF] dark:hover:text-[#a394ff]"
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
function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E4E7EC] bg-[#F2F4F7] dark:border-[#252D3A] dark:bg-[#19202C]">
        <History className="h-5 w-5 text-[#6B5CFF] dark:text-[#8B7CFF]" strokeWidth={1.8} />
      </span>
      <h3 className="mt-3 text-[15px] font-semibold text-[#101828] dark:text-[#F4F6FA]">No quiz attempts yet</h3>
      <p className="mt-1 max-w-xs text-[13px] leading-5 text-[#475467] dark:text-[#9AA4B5]">
        Join your first assessment to start building your activity history.
      </p>
      <Link
        href="/quiz/join"
        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#8B7CFF] px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#7A6BF5]"
      >
        Join a quiz <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-[#E4E7EC] dark:bg-[#252D3A]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-1/2 rounded bg-[#E4E7EC] dark:bg-[#252D3A]" />
          <div className="h-2.5 w-1/4 rounded bg-[#E4E7EC]/70 dark:bg-[#252D3A]/70" />
        </div>
        <div className="h-6 w-16 rounded-full bg-[#E4E7EC] dark:bg-[#252D3A]" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN SECTION
   ═══════════════════════════════════════════════════════════════ */
export default function YourActivitySection() {
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentSearch, setRecentSearch] = useState("");
  const [recentStatus, setRecentStatus] = useState<string>("All");
  const [recentSort, setRecentSort] = useState<string>("Newest");
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- set loading before async request kick-off
    setRecentLoading(true);
    getOldQuizzes({
      page: 1,
      limit: pageSize,
      search: recentSearch || undefined,
      sortBy: recentSort === "Newest" ? "completed_at" : recentSort === "Oldest" ? "completed_at" : "percentage",
      sortOrder: recentSort === "Oldest" || recentSort === "Lowest Score" ? "ASC" : "DESC",
    })
      .then((res) => { if (!cancelled) { setRecentQuizzes(res.quizzes); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRecentLoading(false); });
    return () => { cancelled = true; };
  }, [recentSearch, recentStatus, recentSort]);

  const overview = useMemo(() => {
    const list = recentQuizzes || [];
    const completed = list.filter((q) => q.status === "Completed").length;
    const scores = list.map((q) => Number(q.percentage)).filter((v) => Number.isFinite(v));
    const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
    const bestScore = scores.length ? Math.round(Math.max(...scores)) : null;
    return { totalAttempts: list.length, completed, avgScore, bestScore };
  }, [recentQuizzes]);

  const filtered = useMemo(() => {
    if (recentStatus === "All") return recentQuizzes;
    return recentQuizzes.filter((q) => q.status === recentStatus);
  }, [recentQuizzes, recentStatus]);

  const performance = useMemo(() => {
    const list = [...recentQuizzes]
      .filter((q) => Number.isFinite(Number(q.percentage)))
      .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())
      .slice(0, 5);
    const buckets = [0, 0, 0, 0];
    for (const q of recentQuizzes) {
      const p = Number(q.percentage);
      if (!Number.isFinite(p)) continue;
      if (p >= 90) buckets[3] += 1;
      else if (p >= 70) buckets[2] += 1;
      else if (p >= 50) buckets[1] += 1;
      else buckets[0] += 1;
    }
    const maxBucket = Math.max(1, ...buckets);
    return { recent: list, buckets, maxBucket };
  }, [recentQuizzes]);

  return (
    <section aria-label="My activity" className="mx-auto w-full max-w-[1280px]">
      {/* ── Analytics header: title left, Filter + Sort right (same row on desktop) ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3] dark:text-[#687386]">My Activity</p>
          <h2 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-[#101828] dark:text-[#F4F6FA] sm:text-[24px]">
            Your Activity
          </h2>
          <p className="mt-1 text-[13px] text-[#475467] dark:text-[#9AA4B5] sm:text-sm">
            Track your quiz attempts, scores and progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterSelect icon={Filter} value={recentStatus} options={STATUS_OPTIONS} onChange={setRecentStatus} label="Filter by status" />
          <FilterSelect icon={TrendingUp} value={recentSort} options={SORT_OPTIONS} onChange={setRecentSort} label="Sort attempts" />
        </div>
      </div>

      {/* ── Stat cards (compact, 100–120px) ── */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Total Attempts" value={overview.totalAttempts} hint="quizzes attempted" accent="text-[#6B5CFF] dark:text-[#8B7CFF]" />
        <StatCard icon={CheckCircle2} label="Completed" value={overview.completed} hint="finished attempts" accent="text-[#039855] dark:text-[#20D889]" />
        <StatCard icon={Trophy} label="Best Score" value={overview.bestScore === null ? "—" : `${overview.bestScore}%`} hint="highest score" accent="text-[#6B5CFF] dark:text-[#8B7CFF]" />
        <StatCard icon={TrendingUp} label="Average Score" value={overview.avgScore === null ? "—" : `${overview.avgScore}%`} hint="across attempts" accent="text-[#B54708] dark:text-[#FFB84D]" />
      </div>

      {/* ── Recent attempts: full-width table (no narrow side column) ── */}
      <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-[#E4E7EC] bg-white dark:border-[#252D3A] dark:bg-[#151A24]">
        <div className="flex flex-col gap-2 border-b border-[#E4E7EC] p-3 dark:border-[#252D3A] sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-[#101828] dark:text-[#F4F6FA]">Recent Attempts</h3>
            <span className="text-xs text-[#98A2B3] tabular-nums dark:text-[#687386]">
              {filtered.length} attempt{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="hidden items-center gap-1 text-[11px] text-[#98A2B3] dark:text-[#687386] lg:inline-flex">
              <BarChart2 className="h-3.5 w-3.5" /> Latest first
            </span>
            <div className="lg:w-72">
              <SearchField value={recentSearch} onChange={setRecentSearch} placeholder="Search quizzes..." />
            </div>
          </div>
        </div>

          {/* Desktop column labels */}
          {filtered.length > 0 && (
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_112px_72px_84px_150px] gap-3 border-b border-[#E4E7EC] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3] dark:border-[#252D3A] dark:text-[#687386] lg:grid">
              <span>Quiz</span>
              <span>Status</span>
              <span>Score</span>
              <span>Time</span>
              <span>Date</span>
              <span className="text-right">Action</span>
            </div>
          )}

          <div className="divide-y divide-[#E4E7EC] dark:divide-[#252D3A]">
            {recentLoading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
                ? <EmptyState />
                : filtered.map((quiz, i) => <AttemptRow key={quiz.attempt_id} quiz={quiz} index={i} />)}
          </div>
        </div>

        {/* ── Performance strip: full-width panels below the table ── */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="min-w-0 rounded-xl border border-[#E4E7EC] bg-white p-4 dark:border-[#252D3A] dark:bg-[#151A24] sm:p-5">
            <h3 className="text-[15px] font-semibold text-[#101828] dark:text-[#F4F6FA]">Score Summary</h3>

          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3] dark:text-[#687386]">Average Score</span>
              <span className="text-[26px] font-bold leading-none text-[#101828] tabular-nums dark:text-[#F4F6FA]">
                {overview.avgScore === null ? "—" : `${overview.avgScore}%`}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E4E7EC] dark:bg-[#252D3A]/70">
              <div
                className={cn("h-full rounded-full", scoreBar(overview.avgScore ?? 0))}
                style={{ width: `${Math.min(100, Math.max(0, overview.avgScore ?? 0))}%` }}
              />
            </div>
            <div className="mt-3 space-y-2 border-t border-[#E4E7EC] pt-3 text-[13px] dark:border-[#252D3A]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[#475467] dark:text-[#9AA4B5]">
                  <Award className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#687386]" /> Best score
                </span>
                <span className="font-bold text-[#101828] tabular-nums dark:text-[#F4F6FA]">{overview.bestScore === null ? "—" : `${overview.bestScore}%`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[#475467] dark:text-[#9AA4B5]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#687386]" /> Total completed
                </span>
                <span className="font-bold text-[#101828] tabular-nums dark:text-[#F4F6FA]">{overview.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[#475467] dark:text-[#9AA4B5]">
                  <Send className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#687386]" /> Completion rate
                </span>
                <span className="font-bold text-[#101828] tabular-nums dark:text-[#F4F6FA]">
                  {overview.totalAttempts ? `${Math.round((overview.completed / overview.totalAttempts) * 100)}%` : "—"}
                </span>
              </div>
            </div>
          </div>

          </section>

          {/* Score distribution (derived from existing data) */}
          <section className="min-w-0 rounded-xl border border-[#E4E7EC] bg-white p-4 dark:border-[#252D3A] dark:bg-[#151A24] sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3] dark:text-[#687386]">Score distribution</p>
            <div className="mt-4 flex items-end gap-2 pb-1 pt-1">
              {[
                { label: "<50", count: performance.buckets[0], cls: "bg-[#F04438]/70 dark:bg-[#FF4D5D]/70" },
                { label: "50–69", count: performance.buckets[1], cls: "bg-[#F79009]/70 dark:bg-[#FFB84D]/70" },
                { label: "70–89", count: performance.buckets[2], cls: "bg-[#8B7CFF]/70" },
                { label: "90+", count: performance.buckets[3], cls: "bg-[#12B76A]/70 dark:bg-[#20D889]/70" },
              ].map((b) => (
                <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center">
                  <span className="mb-1.5 text-[11px] font-semibold leading-none text-[#475467] tabular-nums dark:text-[#9AA4B5]">{b.count}</span>
                  <div className="flex h-12 w-full items-end rounded-md bg-[#F2F4F7] p-1 dark:bg-[#252D3A]/40">
                    <div
                      className={cn("w-full rounded-sm", b.cls)}
                      style={{ height: `${Math.max(b.count > 0 ? 12 : 4, (b.count / performance.maxBucket) * 100)}%` }}
                    />
                  </div>
                  <span className="mt-1.5 text-[10px] leading-none text-[#98A2B3] dark:text-[#687386]">{b.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Latest trend (same attempts, compact) */}
          {performance.recent.length > 0 && (
            <section className="min-w-0 rounded-xl border border-[#E4E7EC] bg-white p-4 dark:border-[#252D3A] dark:bg-[#151A24] sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3] dark:text-[#687386]">Latest results</p>
              <ul className="mt-2 space-y-2">
                {performance.recent.map((q) => {
                  const p = Math.round(Number(q.percentage) || 0);
                  return (
                    <li key={q.attempt_id}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate text-[#475467] dark:text-[#9AA4B5]">{q.name}</span>
                        <span className={cn("shrink-0 font-bold tabular-nums", scoreColor(p))}>{p}%</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#E4E7EC] dark:bg-[#252D3A]/60">
                        <div className={cn("h-full rounded-full", scoreBar(p))} style={{ width: `${Math.min(100, Math.max(0, p))}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/quiz/join"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#6B5CFF] transition-colors duration-150 hover:text-[#5248d4] dark:text-[#8B7CFF] dark:hover:text-[#a394ff]"
              >
                Join another quiz <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          )}

        </div>
    </section>
  );
}
