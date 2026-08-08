"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search, Sparkles, History, BookOpen, Clock, TrendingUp,
  CheckCircle2, XCircle, AlertTriangle, Award, Trophy, Globe,
  Lock, Send, Users, Shield, Copy, Share2, LayoutDashboard,
  FileText, HelpCircle, Code2, Brain, Beaker, Calculator,
  Globe2, Palette, Database, Network, Hash, Target, Layers3,
  ChevronDown, Calendar, Timer, Plus, ArrowRight, X, Milestone,
  Filter, BarChart2, CircleDot, GraduationCap, Check
} from "lucide-react";
import { getOldQuizzes, getMyCreatedQuizzes } from "@/services/quiz";
import { formatQuizCode } from "@/utils/quizCode";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
type TabType = "recent" | "my-quizzes";

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

type MyQuiz = {
  id: number;
  name: string;
  code: string;
  starttime: string | null;
  endtime: string | null;
  total_marks: number;
  passing_marks: number;
  status: string;
  visibility: number;
  creator_name: string | null;
  participants: number;
  total_questions: number;
  completion_rate: number;
  created_at: string | null;
  updated_at: string | null;
};

const STORAGE_KEY = "your-activity-active-tab";
const STATUS_OPTIONS = ["All", "Completed", "Submitted", "Timed Out", "Left Early"] as const;
const SORT_OPTIONS = ["Newest", "Oldest", "Highest Score", "Lowest Score"] as const;
const MY_QUIZ_STATUS_OPTIONS = ["All", "draft", "published", "archived", "scheduled"] as const;
const TAB_LIST: { key: TabType; label: string; icon: React.ElementType }[] = [
  { key: "recent", label: "Recent Quizzes", icon: History },
  { key: "my-quizzes", label: "My Quizzes", icon: GraduationCap },
];

/* ─── Subject → icon + color mapping ─── */
type SubjectInfo = { icon: React.ElementType; color: string; label: string };

const SUBJECT_MAP: Record<string, SubjectInfo> = {
  "Data Structures": { icon: Layers3, color: "text-accent", label: "Data Structures" },
  "Algorithms": { icon: Brain, color: "text-pink-500", label: "Algorithms" },
  "System Design": { icon: Network, color: "text-success", label: "System Design" },
  "Database": { icon: Database, color: "text-warning", label: "Database" },
  "Operating System": { icon: Hash, color: "text-accent-secondary", label: "Operating System" },
  "Computer Networks": { icon: Globe2, color: "text-purple-500", label: "Computer Networks" },
  "Programming": { icon: Code2, color: "text-pink-500", label: "Programming" },
  "Mathematics": { icon: Calculator, color: "text-warning", label: "Mathematics" },
  "Physics": { icon: Beaker, color: "text-accent-secondary", label: "Physics" },
  "Aptitude": { icon: Target, color: "text-success", label: "Aptitude" },
  "General Knowledge": { icon: Globe, color: "text-pink-500", label: "General Knowledge" },
  "English": { icon: BookOpen, color: "text-accent", label: "English" },
  "Art": { icon: Palette, color: "text-pink-500", label: "Art" },
  "Graph Theory": { icon: BarChart2, color: "text-accent-secondary", label: "Graph Theory" },
  "Dynamic Programming": { icon: TrendingUp, color: "text-success", label: "Dynamic Programming" },
  "Web Development": { icon: Code2, color: "text-warning", label: "Web Development" },
};

const DEFAULT_SUBJECT: SubjectInfo = { icon: HelpCircle, color: "text-accent", label: "Quiz" };

function getSubjectInfo(name: string): SubjectInfo {
  const lower = name.toLowerCase();
  for (const [keyword, info] of Object.entries(SUBJECT_MAP)) {
    if (lower.includes(keyword.toLowerCase())) return info;
  }
  return DEFAULT_SUBJECT;
}

/* ─── Status chip config (recent attempts + my-quiz statuses) ─── */
type ChipCfg = {
  text: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  bar: string;      // top accent / progress gradient
  glow: string;     // soft radial atmosphere
};

const STATUS_CONFIG: Record<string, ChipCfg> = {
  Completed: {
    text: "Completed", icon: CheckCircle2, color: "text-success",
    bg: "bg-success/10", border: "border-success/25",
    bar: "from-emerald-400 to-success", glow: "opacity-[0.18]",
  },
  Submitted: {
    text: "Submitted", icon: Send, color: "text-accent",
    bg: "bg-accent/10", border: "border-accent/25",
    bar: "from-accent to-fuchsia-500", glow: "opacity-[0.18]",
  },
  "Timed Out": {
    text: "Timed Out", icon: AlertTriangle, color: "text-warning",
    bg: "bg-warning/10", border: "border-warning/25",
    bar: "from-amber-400 to-orange-500", glow: "opacity-[0.16]",
  },
  "Left Early": {
    text: "Left Early", icon: XCircle, color: "text-danger",
    bg: "bg-danger/10", border: "border-danger/25",
    bar: "from-rose-400 to-danger", glow: "opacity-[0.16]",
  },
  draft: {
    text: "Draft", icon: FileText, color: "text-warning",
    bg: "bg-warning/10", border: "border-warning/25",
    bar: "from-amber-300 to-warning", glow: "opacity-[0.14]",
  },
  published: {
    text: "Published", icon: Globe, color: "text-success",
    bg: "bg-success/10", border: "border-success/25",
    bar: "from-emerald-400 to-teal-500", glow: "opacity-[0.16]",
  },
  scheduled: {
    text: "Scheduled", icon: Clock, color: "text-accent-secondary",
    bg: "bg-accent-secondary/10", border: "border-accent-secondary/25",
    bar: "from-accent-secondary to-cyan-500", glow: "opacity-[0.16]",
  },
  archived: {
    text: "Archived", icon: Lock, color: "text-text-muted",
    bg: "bg-text-muted/10", border: "border-text-muted/25",
    bar: "from-slate-400 to-slate-500", glow: "opacity-[0.10]",
  },
};

function getStatusConfig(status: string): ChipCfg {
  return STATUS_CONFIG[status] || STATUS_CONFIG["Completed"];
}

/* ─── Score → tone (user ranges) ───
   90–100 green · 70–89 purple/blue · 50–69 orange · below 50 red */
function scoreTone(pct: number): { text: string; bar: string; chipGlow: string; ring: string } {
  if (pct >= 90) return { text: "text-success", bar: "from-emerald-400 to-success", chipGlow: "shadow-[0_0_20px_rgba(34,197,94,0.35)]", ring: "ring-success/40" };
  if (pct >= 70) return { text: "text-accent", bar: "from-accent to-fuchsia-400", chipGlow: "shadow-[0_0_20px_rgba(124,58,237,0.35)]", ring: "ring-accent/40" };
  if (pct >= 50) return { text: "text-warning", bar: "from-amber-400 to-warning", chipGlow: "shadow-[0_0_20px_rgba(245,158,11,0.35)]", ring: "ring-warning/40" };
  return { text: "text-danger", bar: "from-rose-400 to-danger", chipGlow: "shadow-[0_0_20px_rgba(239,68,68,0.35)]", ring: "ring-danger/40" };
}

/* ─── My-quiz visibility → label/icon ─── */
function visibilityInfo(v: number): { text: string; icon: React.ElementType; color: string; bg: string; border: string } {
  if (v === 1) return { text: "Public", icon: Globe, color: "text-success", bg: "bg-success/10", border: "border-success/25" };
  if (v === 2) return { text: "Classroom", icon: Users, color: "text-accent-secondary", bg: "bg-accent-secondary/10", border: "border-accent-secondary/25" };
  if (v === 3) return { text: "College", icon: Shield, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/25" };
  if (v === 4) return { text: "Classroom", icon: Users, color: "text-warning", bg: "bg-warning/10", border: "border-warning/25" };
  return { text: "Private", icon: Lock, color: "text-accent-secondary", bg: "bg-accent-secondary/10", border: "border-accent-secondary/25" };
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];


/* ═══════════════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */

function StatusChip({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full border ${cfg.border} ${cfg.bg} px-2.5 py-1 text-[11px] font-semibold ${cfg.color}`}
    >
      <cfg.icon className="h-3.5 w-3.5" />
      {cfg.text}
    </motion.span>
  );
}

function RankChip({ rank }: { rank: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">
      <Trophy className="h-3.5 w-3.5" />
      #{rank}
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
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition-colors ${copied ? "border-success/40 bg-success/10" : "border-border bg-card-hover"}`}
      title="Quiz code"
    >
      <code className="text-[11px] font-bold tracking-wider text-text-primary">{formatted}</code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy quiz code"
        className={`rounded-md p-0.5 transition-colors ${copied ? "text-success" : "text-text-muted hover:text-accent"}`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

function ProgressTrack({ value, max = 100, barClass }: { value: number; max?: number; barClass: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-text-muted/15 dark:bg-white/10">
      <motion.div
        className={`relative h-full rounded-full bg-gradient-to-r ${barClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: EASE }}
      >
        <span className="bar-shimmer absolute inset-0" />
      </motion.div>
    </div>
  );
}

function ScoreBlock({ pct, score, totalMarks }: { pct: number; score: number; totalMarks: number }) {
  const tone = scoreTone(pct);
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-2">
        <span className={`text-3xl font-extrabold leading-none tracking-tight ${tone.text}`}>{pct}%</span>
        <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tone.text} border-current/20 bg-current/10`}>
          {pct >= 90 ? "Elite" : pct >= 70 ? "Strong" : pct >= 50 ? "Good" : "Needs work"}
        </span>
      </div>
      <div className="mt-2.5 w-full sm:w-44">
        <ProgressTrack value={pct} barClass={tone.bar} />
      </div>
      <p className="mt-1.5 text-[11px] font-medium text-text-secondary">{score} / {totalMarks} marks</p>
    </div>
  );
}

type StatTone = "purple" | "green" | "blue" | "orange" | "pink";
const STAT_TONES: Record<StatTone, { iconBg: string; iconText: string; glow: string }> = {
  purple: { iconBg: "bg-accent/10", iconText: "text-accent", glow: "from-accent/20" },
  green: { iconBg: "bg-success/10", iconText: "text-success", glow: "from-success/20" },
  blue: { iconBg: "bg-accent-secondary/10", iconText: "text-accent-secondary", glow: "from-accent-secondary/20" },
  orange: { iconBg: "bg-warning/10", iconText: "text-warning", glow: "from-warning/20" },
  pink: { iconBg: "bg-pink-500/10", iconText: "text-pink-500", glow: "from-pink-500/20" },
};

function StatItem({ icon: Icon, label, value, tone, delay = 0 }: { icon: React.ElementType; label: string; value: string | number; tone: StatTone; delay?: number }) {
  const t = STAT_TONES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
      className="group relative flex items-center gap-3 overflow-hidden bg-card/70 px-4 py-4 backdrop-blur-sm sm:px-5"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.glow} to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
      <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.iconBg} ring-1 ring-inset ring-white/10`}>
        <Icon className={`h-5 w-5 ${t.iconText}`} />
      </div>
      <div className="relative min-w-0">
        <p className="text-xl font-extrabold leading-none tracking-tight text-text-primary sm:text-2xl">{value}</p>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</p>
      </div>
    </motion.div>
  );
}

function SubjectTile({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card-hover ring-1 ring-inset ring-border ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}


function MetaChip({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
      <Icon className="h-3.5 w-3.5 text-text-muted" />
      {children}
    </span>
  );
}

function AnswerChip({ icon: Icon, count, tone }: { icon: React.ElementType; count: number; tone: "success" | "danger" | "muted" | "accent" }) {
  const map = {
    success: "border-success/25 bg-success/10 text-success",
    danger: "border-danger/25 bg-danger/10 text-danger",
    muted: "border-border bg-card-hover text-text-secondary",
    accent: "border-accent/25 bg-accent/10 text-accent",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${map}`}>
      <Icon className="h-3 w-3" />
      {count}
    </span>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search quizzes..."}
        className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-9 text-sm text-text-primary shadow-sm outline-none transition-all placeholder:text-text-muted focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.13)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-muted transition-colors hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}


function FilterSelect({ icon: Icon, value, options, onChange }: { icon: React.ElementType; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-text-secondary shadow-sm transition-all hover:bg-card-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${open ? "border-accent/40 text-text-primary" : ""}`}
      >
        <Icon className="h-3.5 w-3.5 text-accent" />
        <span className="max-w-[88px] truncate">{value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.ul
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute left-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-2xl shadow-black/20"
            >
              {options.map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt); setOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${value === opt ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-card-hover hover:text-text-primary"}`}
                  >
                    {opt}
                    {value === opt && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                  </button>
                </li>
              ))}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SegmentedTabs({ active, onChange }: { active: TabType; onChange: (t: TabType) => void }) {
  return (
    <div className="relative flex items-center gap-1 rounded-xl border border-border bg-card/60 p-1 shadow-inner">
      {TAB_LIST.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button key={tab.key} type="button" onClick={() => onChange(tab.key)} className="relative rounded-lg px-3.5 py-2 text-xs font-semibold sm:px-4">
            {isActive && (
              <motion.span
                layoutId="activity-tab-pill"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent to-fuchsia-500 shadow-lg shadow-accent/40"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className={`relative z-10 flex items-center gap-1.5 ${isActive ? "text-white" : "text-text-secondary hover:text-text-primary"}`}>
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, href, variant = "ghost" }: { icon: React.ElementType; label: string; onClick?: () => void; href?: string; variant?: "ghost" | "accent" | "filled" }) {
  const styles = {
    ghost: "border border-border bg-card-hover text-text-secondary hover:-translate-y-px hover:border-border-hover hover:text-text-primary",
    accent: "border border-accent/25 bg-accent/10 text-accent hover:-translate-y-px hover:bg-accent/15",
    filled: "bg-gradient-to-r from-accent to-fuchsia-500 text-white shadow-lg shadow-accent/30 hover:-translate-y-px hover:shadow-accent/60",
  }[variant];
  const cls = `inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 active:scale-[0.97] ${styles}`;
  const body = (<><Icon className="h-3.5 w-3.5" />{label}</>);
  if (href) return <Link href={href} className={cls}>{body}</Link>;
  return (
    <button type="button" onClick={onClick} className={cls}>{body}</button>
  );
}


/* ═══════════════════════════════════════════════════════════════
   RECENT QUIZ ROW  (student participated)
   ═══════════════════════════════════════════════════════════════ */
function RecentQuizRow({ quiz, index }: { quiz: RecentQuiz; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const accent = getStatusConfig(quiz.status);

  const timeTaken = useMemo(() => {
    if (!quiz.time_taken) return "—";
    const mins = Math.floor(quiz.time_taken / 60);
    const secs = quiz.time_taken % 60;
    return `${mins}m ${secs}s`;
  }, [quiz.time_taken]);

  const dateFormatted = useMemo(() => {
    if (!quiz.completed_at) return "—";
    return new Date(quiz.completed_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }, [quiz.completed_at]);

  const subject = getSubjectInfo(quiz.name);
  const totalAnswered = quiz.correct_answers + quiz.wrong_answers + quiz.skipped_questions;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.45, ease: EASE }}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-border-hover hover:shadow-2xl hover:shadow-black/10 dark:hover:border-accent/30 dark:hover:shadow-black/40">
        {/* status accent glow + top bar */}
        <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.10),transparent_55%)] transition-opacity duration-300 ${accent.glow} group-hover:opacity-100`} />
        <div className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
          {/* ── LEFT: identity + meta ── */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusChip status={quiz.status} />
              {quiz.rank != null && <RankChip rank={quiz.rank} />}
              <CodeCopyChip code={quiz.code} />
            </div>

            <div className="flex items-start gap-3">
              <SubjectTile icon={subject.icon} color={subject.color} />
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold leading-snug text-text-primary transition-colors group-hover:text-accent sm:text-xl">
                  {quiz.name}
                </h3>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {subject.label} <span className="mx-1 text-text-muted">·</span> Attempt #{quiz.attempt_id}
                </p>
              </div>
            </div>

            {/* metadata */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <MetaChip icon={Calendar}>{dateFormatted}</MetaChip>
              <MetaChip icon={Timer}>{timeTaken}</MetaChip>
              <MetaChip icon={Milestone}>{totalAnswered}/{quiz.total_questions} answered</MetaChip>
            </div>

            {/* answer summary */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AnswerChip icon={CheckCircle2} count={quiz.correct_answers} tone="success" />
              <AnswerChip icon={XCircle} count={quiz.wrong_answers} tone="danger" />
              <AnswerChip icon={AlertTriangle} count={quiz.skipped_questions} tone="muted" />
              <AnswerChip icon={CircleDot} count={quiz.total_questions} tone="accent" />
            </div>


            {/* expandable breakdown */}
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-card-hover/50 p-3 sm:grid-cols-4">
                    {[
                      { label: "Correct", value: quiz.correct_answers, cls: "text-success" },
                      { label: "Wrong", value: quiz.wrong_answers, cls: "text-danger" },
                      { label: "Skipped", value: quiz.skipped_questions, cls: "text-text-secondary" },
                      { label: "Total Marks", value: quiz.total_marks, cls: "text-accent" },
                    ].map((it) => (
                      <div key={it.label} className="flex flex-col">
                        <span className="text-lg font-extrabold leading-none tracking-tight text-text-primary">{it.value}</span>
                        <span className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wider ${it.cls}`}>{it.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT: score + actions ── */}
          <div className="flex shrink-0 flex-col gap-4 lg:w-60 lg:border-l lg:border-border lg:pl-6">
            <ScoreBlock pct={quiz.percentage} score={quiz.score} totalMarks={quiz.total_marks} />
            <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
              <ActionButton icon={BarChart2} label={expanded ? "Less" : "Details"} onClick={() => setExpanded((e) => !e)} />
              <ActionButton icon={Award} label="View Result" href={`/quiz/${quiz.code}/results`} variant="accent" />
              <ActionButton icon={History} label="Reattempt" href={`/quiz/${quiz.code}`} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MY QUIZ ROW  (created by user)
   ═══════════════════════════════════════════════════════════════ */
function MyQuizRow({ quiz, index }: { quiz: MyQuiz; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const accent = getStatusConfig(quiz.status);
  const vis = visibilityInfo(quiz.visibility);
  const subject = getSubjectInfo(quiz.name);

  const isLive = quiz.status === "published" && quiz.starttime && quiz.endtime
    ? new Date(quiz.starttime) <= new Date() && new Date(quiz.endtime) > new Date()
    : false;

  const completionPct = Math.round(quiz.completion_rate * 100);
  const createdFormatted = quiz.created_at
    ? new Date(quiz.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—";
  const completionTone = scoreTone(completionPct);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.45, ease: EASE }}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-border-hover hover:shadow-2xl hover:shadow-black/10 dark:hover:border-accent/30 dark:hover:shadow-black/40">
        <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.10),transparent_55%)] transition-opacity duration-300 ${accent.glow} group-hover:opacity-100`} />
        <div className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
          {/* ── LEFT ── */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusChip status={quiz.status} />
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${vis.border} ${vis.bg} ${vis.color}`}>
                <vis.icon className="h-3 w-3" />{vis.text}
              </span>
              <CodeCopyChip code={quiz.code} />
              {isLive && (
                <motion.span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  Live
                </motion.span>
              )}
            </div>

            <div className="flex items-start gap-3">
              <SubjectTile icon={subject.icon} color={subject.color} />
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold leading-snug text-text-primary transition-colors group-hover:text-accent sm:text-xl">
                  {quiz.name}
                </h3>
                <p className="mt-0.5 text-xs text-text-secondary">{subject.label} <span className="mx-1 text-text-muted">·</span> Created {createdFormatted}</p>
              </div>
            </div>

            {/* metrics */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <MetaChip icon={Users}>{quiz.participants} participants</MetaChip>
              <MetaChip icon={Milestone}>{quiz.total_questions} questions</MetaChip>
              <MetaChip icon={Award}>{quiz.total_marks} marks</MetaChip>
            </div>

            {/* completion performance */}
            <div className="mt-4 max-w-xs">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Completion</span>
                <span className={`text-xs font-bold ${completionTone.text}`}>{completionPct}%</span>
              </div>
              <ProgressTrack value={completionPct} barClass={completionTone.bar} />
            </div>


            {/* expandable result details */}
            <AnimatePresence initial={false}>
              {expanded && quiz.status === "published" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">
                    <AlertTriangle className="h-3 w-3" /> Results ready — {completionPct}% completed
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT: actions ── */}
          <div className="flex shrink-0 items-center gap-2 lg:w-56 lg:flex-col lg:items-stretch lg:border-l lg:border-border lg:pl-6">
            <ActionButton icon={BarChart2} label={expanded ? "Less" : "Details"} onClick={() => setExpanded((e) => !e)} />
            <ActionButton icon={FileText} label="Edit" href={`/quiz/${quiz.code}/edit`} variant="accent" />
            <ActionButton icon={Copy} label="Duplicate" />
            <ActionButton icon={Share2} label="Share" />
            {isLive && <ActionButton icon={Send} label="Send Results" />}
            {isLive && <ActionButton icon={LayoutDashboard} label="Dashboard" href={`/quiz/${quiz.code}/dashboard`} variant="filled" />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   EMPTY STATE + SKELETON
   ═══════════════════════════════════════════════════════════════ */
function EmptyState({ variant }: { variant: "recent" | "my-quizzes" }) {
  const isRecent = variant === "recent";
  const title = isRecent ? "No quiz attempts yet" : "No quizzes created yet";
  const desc = isRecent
    ? "You haven't participated in any quizzes yet. Join one to start tracking your scores, rankings and progress."
    : "Create your first assessment, add questions, set timing and start challenging your students.";
  const cta = isRecent ? "Join a Quiz" : "Create Quiz";
  const href = isRecent ? "#join-quiz" : "/quiz/create";
  const Icon = isRecent ? History : Plus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-md flex-col items-center px-6 py-14 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent to-fuchsia-500 opacity-30 blur-xl transition-opacity duration-300 group-hover:opacity-50" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-accent/25 bg-card shadow-lg">
            <Icon className="h-9 w-9 text-accent" strokeWidth={1.6} />
          </div>
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card">
            <Sparkles className="h-3 w-3 text-fuchsia-500" />
          </span>
        </div>

        <h3 className="text-xl font-bold tracking-tight text-text-primary">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{desc}</p>

        <div className="mt-6">
          <ActionButton icon={isRecent ? ArrowRight : Plus} label={cta} href={href} variant="filled" />
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonRow() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-5 w-20 rounded-full bg-white/5 dark:bg-white/5" />
            <div className="h-5 w-16 rounded-full bg-white/5 dark:bg-white/5" />
          </div>
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/5 dark:bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 rounded-lg bg-white/5 dark:bg-white/5" />
              <div className="h-3 w-1/3 rounded bg-white/5 dark:bg-white/5" />
            </div>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-white/5 dark:bg-white/5 lg:w-40" />
        <div className="flex gap-2 lg:w-56 lg:flex-col">
          <div className="h-9 flex-1 rounded-lg bg-white/5 dark:bg-white/5" />
          <div className="h-9 flex-1 rounded-lg bg-white/5 dark:bg-white/5" />
          <div className="h-9 flex-1 rounded-lg bg-white/5 dark:bg-white/5" />
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MAIN SECTION
   ═══════════════════════════════════════════════════════════════ */
export default function YourActivitySection() {
  const [activeTab, setActiveTab] = useState<TabType>("recent");
  const [isHydrated, setIsHydrated] = useState(false);
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentSearch, setRecentSearch] = useState("");
  const [recentStatus, setRecentStatus] = useState("All");
  const [recentSort, setRecentSort] = useState("Newest");
  const [myQuizzes, setMyQuizzes] = useState<MyQuiz[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [mySearch, setMySearch] = useState("");
  const [myStatus, setMyStatus] = useState("All");
  const [mySort, setMySort] = useState("Newest");
  const pageSize = 10;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore last active tab from localStorage on mount
    if (stored === "recent" || stored === "my-quizzes") setActiveTab(stored);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
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
  }, [isHydrated, recentSearch, recentStatus, recentSort]);

  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- set loading before async request kick-off
    setMyLoading(true);
    getMyCreatedQuizzes({
      page: 1,
      limit: pageSize,
      search: mySearch || undefined,
      status: myStatus === "All" ? undefined : myStatus,
      sortBy: mySort === "Newest" ? "created_at" : mySort === "Oldest" ? "created_at" : "name",
      sortOrder: mySort === "Oldest" ? "ASC" : "DESC",
    })
      .then((res) => { if (!cancelled) { setMyQuizzes(res.quizzes as unknown as MyQuiz[]); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMyLoading(false); });
    return () => { cancelled = true; };
  }, [isHydrated, mySearch, myStatus, mySort]);

  /* Unified activity overview ribbon */
  const overview = useMemo(() => {
    const list = recentQuizzes || [];
    const completed = list.filter((q) => q.status === "Completed").length;
    const avgScore = list.length ? Math.round(list.reduce((s, q) => s + q.percentage, 0) / list.length) : 0;
    return { totalAttempts: list.length, completed, created: (myQuizzes || []).length, avgScore };
  }, [recentQuizzes, myQuizzes]);

  if (!isHydrated) return null;

  return (
    <section className="mb-8 sm:mb-10">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 shadow-xl backdrop-blur-sm">
        {/* ambient lavender / pink atmosphere */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.08),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.06),transparent_30%)]" />

        <div className="relative p-4 sm:p-6 lg:p-7">
          {/* ── HEADER ── */}
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  <Sparkles className="h-3 w-3" /> Your Activity
                </span>
              </div>
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-3xl">
                Your Activity
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
                Track your quiz history and manage the assessments you have created.
              </p>
            </div>

            <div className="shrink-0">
              <SegmentedTabs active={activeTab} onChange={setActiveTab} />
            </div>
          </div>

          {/* ── STATS RIBBON ── */}
          <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 md:grid-cols-4">
            <StatItem icon={BookOpen} label="Total Attempts" value={overview.totalAttempts} tone="purple" delay={0} />
            <StatItem icon={CheckCircle2} label="Completed" value={overview.completed} tone="green" delay={0.05} />
            <StatItem icon={Plus} label="Quizzes Created" value={overview.created} tone="orange" delay={0.1} />
            <StatItem icon={TrendingUp} label="Avg Score" value={`${overview.avgScore}%`} tone="blue" delay={0.15} />
          </div>


          <AnimatePresence mode="wait">
            {activeTab === "recent" && (
              <motion.div
                key="recent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <SearchField value={recentSearch} onChange={setRecentSearch} placeholder="Search quizzes..." />
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <FilterSelect icon={Filter} value={recentStatus} options={STATUS_OPTIONS} onChange={setRecentStatus} />
                    <FilterSelect icon={TrendingUp} value={recentSort} options={SORT_OPTIONS} onChange={setRecentSort} />
                  </div>
                </div>

                {/* list */}
                <div className="flex flex-col gap-3.5">
                  {recentLoading
                    ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                    : (recentQuizzes || []).length === 0
                      ? <EmptyState variant="recent" />
                      : (recentQuizzes || []).map((quiz, i) => <RecentQuizRow key={quiz.attempt_id} quiz={quiz} index={i} />)}
                </div>
              </motion.div>
            )}

            {activeTab === "my-quizzes" && (
              <motion.div
                key="my-quizzes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <SearchField value={mySearch} onChange={setMySearch} placeholder="Search my quizzes..." />
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <FilterSelect icon={Filter} value={myStatus} options={MY_QUIZ_STATUS_OPTIONS} onChange={setMyStatus} />
                    <FilterSelect icon={TrendingUp} value={mySort} options={SORT_OPTIONS} onChange={setMySort} />
                  </div>
                </div>

                {/* list */}
                <div className="flex flex-col gap-3.5">
                  {myLoading
                    ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                    : (myQuizzes || []).length === 0
                      ? <EmptyState variant="my-quizzes" />
                      : (myQuizzes || []).map((quiz, i) => <MyQuizRow key={quiz.id} quiz={quiz} index={i} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

