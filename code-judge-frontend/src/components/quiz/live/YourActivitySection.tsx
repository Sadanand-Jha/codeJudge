"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search, Sparkles, History, BookOpen, Clock, TrendingUp,
  CheckCircle2, XCircle, AlertTriangle, Award, Trophy, Globe,
  Lock, Send, Users, Shield, Copy,
  FileText, HelpCircle, Code2, Brain, Beaker, Calculator,
  Globe2, Palette, Database, Network, Hash, Target, Layers3,
  ChevronDown, Calendar, Timer, Plus, ArrowRight, X, Milestone,
  Filter, BarChart2, CircleDot, GraduationCap, Check,
  MoreVertical, CopyPlus, Trash2, Settings2, RefreshCw, Activity,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getOldQuizzes, getMyCreatedQuizzes, cloneQuiz, deleteQuiz } from "@/services/quiz";
import { formatQuizCode, generateQuizCode } from "@/utils/quizCode";
import { useToast } from "@/hooks/useToast";
import CollaboratorsSection from "./CollaboratorsSection";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
type TabType = "my-quizzes" | "recent" | "collaboration";

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
const TAB_LIST: { key: TabType; label: string; icon: React.ElementType }[] = [
  { key: "my-quizzes", label: "My Quizzes", icon: GraduationCap },
  { key: "recent", label: "Recent Quizzes", icon: History },
  { key: "collaboration", label: "Collaboration", icon: Users },
];

const TAB_META: Record<TabType, { title: string; subtitle: string }> = {
  "my-quizzes": { title: "My Quizzes", subtitle: "Create, manage and monitor your quizzes." },
  recent: { title: "Your Activity", subtitle: "Track your quiz history and manage the assessments you have created." },
  collaboration: { title: "Collaboration", subtitle: "Quizzes you collaborate on with your team." },
};

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
  bar: string;
  glow: string;
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

/* ─── Score → tone ─── */
function scoreTone(pct: number): { text: string; bar: string; chipGlow: string; ring: string } {
  if (pct >= 90) return { text: "text-success", bar: "from-emerald-400 to-success", chipGlow: "shadow-[0_0_20px_rgba(34,197,94,0.35)]", ring: "ring-success/40" };
  if (pct >= 70) return { text: "text-accent", bar: "from-accent to-fuchsia-400", chipGlow: "shadow-[0_0_20px_rgba(124,58,237,0.35)]", ring: "ring-accent/40" };
  if (pct >= 50) return { text: "text-warning", bar: "from-amber-400 to-warning", chipGlow: "shadow-[0_0_20px_rgba(245,158,11,0.35)]", ring: "ring-warning/40" };
  return { text: "text-danger", bar: "from-rose-400 to-danger", chipGlow: "shadow-[0_0_20px_rgba(239,68,68,0.35)]", ring: "ring-danger/40" };
}

/* ─── My-quiz visibility ─── */
function visibilityInfo(v: number): { text: string; icon: React.ElementType; color: string; bg: string; border: string } {
  if (v === 1) return { text: "Public", icon: Globe, color: "text-success", bg: "bg-success/10", border: "border-success/25" };
  if (v === 2) return { text: "Classroom", icon: Users, color: "text-accent-secondary", bg: "bg-accent-secondary/10", border: "border-accent-secondary/25" };
  if (v === 3) return { text: "College", icon: Shield, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/25" };
  if (v === 4) return { text: "Classroom", icon: Users, color: "text-warning", bg: "bg-warning/10", border: "border-warning/25" };
  return { text: "Private", icon: Lock, color: "text-accent-secondary", bg: "bg-accent-secondary/10", border: "border-accent-secondary/25" };
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ─── My-quiz helpers ─── */
function isQuizLive(quiz: MyQuiz): boolean {
  if (quiz.status !== "published") return false;
  const now = new Date();
  const start = quiz.starttime ? new Date(quiz.starttime) : null;
  const end = quiz.endtime ? new Date(quiz.endtime) : null;
  if (start && start > now) return false;
  if (end && end <= now) return false;
  return true;
}

function isQuizCompleted(quiz: MyQuiz): boolean {
  if (quiz.status === "archived") return true;
  if (quiz.status !== "published") return false;
  if (!quiz.endtime) return false;
  return new Date(quiz.endtime) <= new Date();
}

function quizDuration(starttime: string | null, endtime: string | null): string | null {
  if (!starttime || !endtime) return null;
  const start = new Date(starttime);
  const end = new Date(endtime);
  const diffMins = Math.round((end.getTime() - start.getTime()) / 60000);
  if (diffMins <= 0) return null;
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function myQuizStatusDisplay(quiz: MyQuiz): { dot: string; text: string; tone: string } {
  if (isQuizLive(quiz)) return { dot: "bg-success", text: "Live", tone: "text-success" };
  if (quiz.status === "draft") return { dot: "bg-warning", text: "Draft", tone: "text-warning" };
  if (quiz.status === "scheduled") return { dot: "bg-accent-secondary", text: "Scheduled", tone: "text-accent-secondary" };
  if (quiz.status === "archived") return { dot: "bg-text-muted", text: "Archived", tone: "text-text-muted" };
  if (quiz.status === "published") return { dot: "bg-success", text: "Published", tone: "text-success" };
  return { dot: "bg-text-muted", text: quiz.status || "Unknown", tone: "text-text-secondary" };
}

/** Render a number safely — never NaN. Falls back to "—". */
function fmtStat(value: number | null | undefined, suffix = ""): string | number {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value}${suffix}`;
}

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

function MetricCard({ icon: Icon, label, value, hint, tone, delay = 0 }: { icon: React.ElementType; label: string; value: string | number; hint: string; tone: StatTone; delay?: number }) {
  const t = STAT_TONES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:bg-card-hover hover:shadow-[0_12px_32px_-12px_rgba(124,58,237,0.3)] sm:p-5"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.glow} to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
      <div className="flex items-center justify-between gap-2">
        <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.iconBg} ring-1 ring-inset ring-white/10`}>
          <Icon className={`h-5 w-5 ${t.iconText}`} />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">{label}</span>
      </div>
      <div className="relative">
        <p className="text-3xl font-extrabold leading-none tracking-tight text-text-primary tabular-nums">{value}</p>
        <p className="mt-1.5 text-[11px] font-medium text-text-muted">{hint}</p>
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
          <button key={tab.key} type="button" onClick={() => onChange(tab.key)} className="relative rounded-lg px-3 py-2 text-xs font-semibold sm:px-4">
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

/* ─── Ambient header decoration: slow glow + drifting particles ─── */
function AmbientDecor({ accent = true }: { accent?: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        left: `${(i * 11 + 4) % 92}%`,
        top: `${(i * 23 + 12) % 72}%`,
        size: 2 + (i % 3),
        delay: (i % 5) * 0.9,
        dur: 6 + (i % 4),
      })),
    []
  );
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-28 right-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        animate={{ x: [0, 22, 0], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl"
        animate={{ x: [0, -18, 0], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      {accent && (
        <motion.div
          className="absolute right-8 top-8 h-16 w-16 rounded-full bg-accent/20 blur-2xl"
          animate={{ y: [0, -10, 0], opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-accent/30"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -14, 0], opacity: [0, 0.5, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
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
        <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.10),transparent_55%)] transition-opacity duration-300 ${accent.glow} group-hover:opacity-100`} />
        <div className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
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

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <MetaChip icon={Calendar}>{dateFormatted}</MetaChip>
              <MetaChip icon={Timer}>{timeTaken}</MetaChip>
              <MetaChip icon={Milestone}>{totalAnswered}/{quiz.total_questions} answered</MetaChip>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AnswerChip icon={CheckCircle2} count={quiz.correct_answers} tone="success" />
              <AnswerChip icon={XCircle} count={quiz.wrong_answers} tone="danger" />
              <AnswerChip icon={AlertTriangle} count={quiz.skipped_questions} tone="muted" />
              <AnswerChip icon={CircleDot} count={quiz.total_questions} tone="accent" />
            </div>

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
   MY QUIZZES — PREMIUM REDESIGN
   ═══════════════════════════════════════════════════════════════ */

const MY_QUIZ_FILTERS_CONFIG = [
  { key: "All", label: "All", dot: null },
  { key: "Live", label: "Live", dot: "bg-success" },
  { key: "Draft", label: "Draft", dot: "bg-warning" },
  { key: "Completed", label: "Completed", dot: "bg-accent-secondary" },
] as const;

function MyQuizzesStats({ quizzes, total }: { quizzes: MyQuiz[]; total: number }) {
  const stats = useMemo(() => {
    const participants = quizzes.reduce((s, q) => s + (Number(q.participants) || 0), 0);
    const active = quizzes.filter((q) => isQuizLive(q)).length;
    const drafts = quizzes.filter((q) => q.status === "draft").length;
    const live = active;
    const completions = quizzes
      .map((q) => Number(q.completion_rate))
      .filter((v) => Number.isFinite(v));
    const avgCompletion = completions.length
      ? Math.round((completions.reduce((a, b) => a + b, 0) / completions.length) * 100)
      : null;
    return { participants, active, drafts, live, avgCompletion };
  }, [quizzes]);

  const cards = [
    {
      icon: FileText, label: "Quizzes",
      value: fmtStat(total || quizzes.length),
      hint: `${fmtStat(stats.drafts)} draft${stats.drafts === 1 ? "" : "s"} · ${fmtStat(stats.live)} live`,
      tone: "purple" as const,
    },
    {
      icon: Users, label: "Participants",
      value: fmtStat(stats.participants),
      hint: "registered students",
      tone: "blue" as const,
    },
    {
      icon: Activity, label: "Active",
      value: fmtStat(stats.active),
      hint: "live right now",
      tone: "green" as const,
    },
    {
      icon: BarChart2, label: "Completion",
      value: stats.avgCompletion === null ? "—" : `${stats.avgCompletion}%`,
      hint: "avg completion rate",
      tone: "pink" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
      {cards.map((c, i) => (
        <MetricCard key={c.label} {...c} delay={i * 0.06} />
      ))}
    </div>
  );
}

function MyQuizzesFilterBar({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {MY_QUIZ_FILTERS_CONFIG.map((f) => {
        const isActive = active === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-all duration-200",
              isActive
                ? "border border-accent/40 bg-gradient-to-r from-accent/20 to-fuchsia-500/10 text-accent"
                : "border border-border text-text-secondary hover:border-accent/20 hover:bg-card-hover hover:text-text-primary"
            )}
          >
            {f.dot && <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? f.dot : "bg-text-muted")} />}
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Row action menu (⋮) ─── */
function MyQuizMenu({ quiz, onMutated }: { quiz: MyQuiz; onMutated: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<null | "delete">(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const close = () => {
    setOpen(false);
    setConfirming(null);
  };

  const handleDuplicate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await cloneQuiz(String(quiz.id), { name: `${quiz.name} (Copy)`, code: generateQuizCode() });
      toast.success({ title: "Quiz duplicated", description: "A copy of your quiz was created." });
      close();
      onMutated();
    } catch {
      toast.error({ title: "Could not duplicate", description: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteQuiz(String(quiz.id));
      toast.success({ title: "Quiz deleted", description: "Your quiz was removed." });
      close();
      onMutated();
    } catch {
      toast.error({ title: "Could not delete", description: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Quiz actions"
        onClick={() => { setOpen((o) => !o); setConfirming(null); }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-text-muted transition-all hover:border-border hover:bg-card-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={close} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-2xl shadow-black/20"
            >
              {confirming === "delete" ? (
                <div className="p-2">
                  <p className="px-1 pb-2 text-xs font-semibold text-text-primary">Delete this quiz?</p>
                  <p className="px-1 pb-3 text-[11px] text-text-secondary">This action cannot be undone.</p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-danger/10 px-2.5 py-1.5 text-[11px] font-semibold text-danger transition-colors hover:bg-danger/20 disabled:opacity-60"
                    >
                      <Trash2 className="h-3 w-3" /> {busy ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={close}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
                  >
                    <Settings2 className="h-3.5 w-3.5" /> Edit settings
                  </button>
                  <Link
                    href={`/quiz/${quiz.code}/results`}
                    onClick={close}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
                  >
                    <BarChart2 className="h-3.5 w-3.5" /> Results
                  </Link>
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    disabled={busy}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary disabled:opacity-60"
                  >
                    <CopyPlus className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming("delete")}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border/60 px-3 py-2 pt-2.5 text-left text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MyQuizCard({ quiz, index, onMutated }: { quiz: MyQuiz; index: number; onMutated: () => void }) {
  const completionPct = Number.isFinite(Number(quiz.completion_rate))
    ? Math.max(0, Math.min(100, Math.round(Number(quiz.completion_rate) * 100)))
    : null;
  const vis = visibilityInfo(quiz.visibility);
  const sd = myQuizStatusDisplay(quiz);
  const isLive = isQuizLive(quiz);
  const dateStr = formatDateShort(quiz.created_at || quiz.starttime);
  const duration = quizDuration(quiz.starttime, quiz.endtime);
  const formattedCode = formatQuizCode(quiz.code);
  const codeShort = formattedCode.length > 12 ? `${formattedCode.slice(0, 8)}…` : formattedCode;
  const tone = completionPct === null ? null : scoreTone(completionPct);
  const subject = getSubjectInfo(quiz.name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.35), duration: 0.4, ease: EASE }}
      className="group relative h-full"
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200",
          isLive && "border-l-2 border-l-success/60",
          "group-hover:-translate-y-1 group-hover:border-accent/30 group-hover:bg-card-hover",
          "group-hover:shadow-[0_16px_40px_-16px_rgba(124,58,237,0.35)] dark:group-hover:shadow-[0_16px_40px_-16px_rgba(236,72,153,0.3)]"
        )}
      >
        {/* layered surface gradient + top hairline */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.07),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
        {isLive && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-success/0 via-success/60 to-success/0" />
        )}

        <div className="relative flex flex-1 flex-col p-4 sm:p-5">
          {/* top: subject tile + title + status + menu */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-fuchsia-500/10 ring-1 ring-inset ring-accent/20">
                <subject.icon className={cn("h-5 w-5", subject.color)} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold leading-snug text-text-primary transition-colors group-hover:text-accent sm:text-base">
                  {quiz.name}
                </h3>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-text-muted">
                  <vis.icon className={cn("h-3 w-3", vis.color)} />
                  <span className={vis.color}>{vis.text}</span>
                  <span className="text-text-muted">·</span>
                  <span className="font-mono">{codeShort}</span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  isLive ? "border-success/30 bg-success/10" : "border-border bg-card-hover",
                  sd.tone
                )}
              >
                <span className="relative flex h-1.5 w-1.5">
                  {isLive && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70 opacity-75" />
                  )}
                  <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", sd.dot)} />
                </span>
                {sd.text}
              </span>
              <MyQuizMenu quiz={quiz} onMutated={onMutated} />
            </div>
          </div>

          {/* metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-text-muted" />
              {fmtStat(Number(quiz.total_questions))} Question{quiz.total_questions !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-text-muted" />
              {fmtStat(Number(quiz.participants))} Student{quiz.participants !== 1 ? "s" : ""}
            </span>
            {duration && (
              <span className="inline-flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-text-muted" />
                {duration}
              </span>
            )}
          </div>

          {/* completion progress */}
          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-text-muted">Completion</span>
              <span className={cn("font-bold tabular-nums", tone ? tone.text : "text-text-muted")}>
                {completionPct === null ? "—" : `${completionPct}%`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-text-muted/15 dark:bg-white/10">
              <motion.div
                className={cn(
                  "relative h-full rounded-full bg-gradient-to-r",
                  tone ? tone.bar : "from-slate-400 to-slate-500"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${completionPct ?? 0}%` }}
                transition={{ duration: 0.8, ease: EASE }}
              >
                {tone && <span className="bar-shimmer absolute inset-0" />}
              </motion.div>
            </div>
          </div>

          {/* footer: date + open settings */}
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-text-muted">
              <Calendar className="h-3 w-3" />
              {dateStr}
            </span>
            <Link
              href={`/quiz/${quiz.code}/settings/info`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent opacity-60 transition-all duration-200 hover:opacity-100 group-hover:opacity-100"
            >
              Open Settings
              <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MyQuizzesEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-md flex-col items-center px-6 py-14 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent to-fuchsia-500 opacity-30 blur-xl transition-opacity duration-300 group-hover:opacity-50" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-accent/25 bg-card shadow-lg">
            <span className="text-3xl">📝</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <h3 className="text-xl font-bold tracking-tight text-text-primary">No quizzes yet</h3>
          <p className="max-w-xs text-sm leading-relaxed text-text-secondary">
            Create your first quiz and start building something amazing.
          </p>
        </div>

        <Link
          href="/quiz/create"
          className={cn(
            "mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl",
            "bg-gradient-to-r from-accent to-fuchsia-500 px-5 py-2.5",
            "text-xs font-semibold text-white shadow-lg shadow-accent/25",
            "transition-all duration-200 hover:scale-105 hover:shadow-accent/50"
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Create your first quiz
        </Link>
      </div>
    </motion.div>
  );
}

function MyQuizzesError({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative flex flex-col items-center px-6 py-14 text-center"
    >
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/25 bg-danger/10">
        <AlertTriangle className="h-6 w-6 text-danger" />
      </div>
      <h3 className="text-base font-bold text-text-primary">Couldn&apos;t load your quizzes</h3>
      <p className="mt-1.5 max-w-sm text-sm text-text-secondary">
        Something went wrong while fetching your quizzes.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-text-secondary transition-all hover:-translate-y-px hover:text-text-primary"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Try again
      </button>
    </motion.div>
  );
}

function MyQuizzesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-border/60" />
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-border/60 sm:w-48" />
                <div className="h-3 w-24 rounded bg-border/60" />
              </div>
            </div>
            <div className="h-5 w-16 rounded-full bg-border/60" />
          </div>
          <div className="mt-4 flex gap-x-4">
            <div className="h-3 w-20 rounded bg-border/60" />
            <div className="h-3 w-20 rounded bg-border/60" />
            <div className="h-3 w-14 rounded bg-border/60" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="h-3 w-16 rounded bg-border/60" />
            <div className="h-3 w-8 rounded bg-border/60" />
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-border/60" />
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <div className="h-3 w-14 rounded bg-border/60" />
            <div className="h-4 w-20 rounded bg-border/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
            <div className="h-5 w-20 rounded-full bg-border/60" />
            <div className="h-5 w-16 rounded-full bg-border/60" />
          </div>
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-border/60" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 rounded-lg bg-border/60" />
              <div className="h-3 w-1/3 rounded bg-border/60" />
            </div>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-border/60 lg:w-40" />
        <div className="flex gap-2 lg:w-56 lg:flex-col">
          <div className="h-9 flex-1 rounded-lg bg-border/60" />
          <div className="h-9 flex-1 rounded-lg bg-border/60" />
          <div className="h-9 flex-1 rounded-lg bg-border/60" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN SECTION
   ═══════════════════════════════════════════════════════════════ */
export default function YourActivitySection() {
  const [activeTab, setActiveTab] = useState<TabType>("my-quizzes");
  const [isHydrated, setIsHydrated] = useState(false);
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentSearch, setRecentSearch] = useState("");
  const [recentStatus, setRecentStatus] = useState("All");
  const [recentSort, setRecentSort] = useState("Newest");
  const [myQuizzes, setMyQuizzes] = useState<MyQuiz[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myError, setMyError] = useState(false);
  const [myRefresh, setMyRefresh] = useState(0);
  const [mySearch, setMySearch] = useState("");
  const [myStatus, setMyStatus] = useState("All");
  const [mySort, setMySort] = useState("Newest");
  const pageSize = 10;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore last active tab from localStorage on mount
    if (stored === "my-quizzes" || stored === "recent" || stored === "collaboration") setActiveTab(stored);
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
    setMyError(false);
    getMyCreatedQuizzes({
      page: 1,
      limit: pageSize,
      search: mySearch || undefined,
      sortBy: mySort === "Newest" ? "created_at" : mySort === "Oldest" ? "created_at" : "name",
      sortOrder: mySort === "Oldest" ? "ASC" : "DESC",
    })
      .then((res) => { if (!cancelled) { setMyQuizzes(res.quizzes as unknown as MyQuiz[]); } })
      .catch(() => { if (!cancelled) setMyError(true); })
      .finally(() => { if (!cancelled) setMyLoading(false); });
    return () => { cancelled = true; };
  }, [isHydrated, mySearch, mySort, myRefresh]);

  /* Unified activity overview (recent tab) */
  const overview = useMemo(() => {
    const list = recentQuizzes || [];
    const completed = list.filter((q) => q.status === "Completed").length;
    const scores = list.map((q) => Number(q.percentage)).filter((v) => Number.isFinite(v));
    const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
    return { totalAttempts: list.length, completed, created: (myQuizzes || []).length, avgScore };
  }, [recentQuizzes, myQuizzes]);

  /* Client-side filter for my-quizzes tab */
  const filteredMyQuizzes = useMemo(() => {
    if (!myQuizzes) return [];
    return myQuizzes.filter((q) => {
      if (myStatus === "Draft") return q.status === "draft";
      if (myStatus === "Live") return isQuizLive(q);
      if (myStatus === "Completed") return isQuizCompleted(q);
      return true; // "All"
    });
  }, [myQuizzes, myStatus]);

  const myQuizTotal = myQuizzes?.length ?? 0;

  if (!isHydrated) return null;

  const meta = TAB_META[activeTab];

  return (
    <section className="mb-8 sm:mb-10">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 shadow-xl backdrop-blur-sm">
        {/* ambient atmosphere */}
        <AmbientDecor accent={activeTab === "my-quizzes"} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.06),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.04),transparent_30%)]" />

        <div className="relative p-4 sm:p-6 lg:p-7">
          {/* ── HEADER ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  <Sparkles className="h-3 w-3" /> My Activity
                </span>
              </div>

              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-3xl">
                {meta.title}
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
                {meta.subtitle}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-end gap-3">
              {activeTab === "my-quizzes" && (
                <Link
                  href="/quiz/create"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl",
                    "bg-gradient-to-r from-accent to-fuchsia-500 px-4 py-2.5",
                    "text-xs font-semibold text-white shadow-lg shadow-accent/25",
                    "transition-all hover:-translate-y-0.5 hover:shadow-accent/50"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Quiz
                </Link>
              )}
              <SegmentedTabs active={activeTab} onChange={setActiveTab} />
            </div>
          </motion.div>

          {/* ── TAB CONTENT ── */}
          <AnimatePresence mode="wait">
            {activeTab === "my-quizzes" && (
              <motion.div
                key="my-quizzes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* stats */}
                <MyQuizzesStats quizzes={myQuizzes || []} total={myQuizTotal} />

                {/* toolbar */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="min-w-[200px] flex-1">
                    <SearchField value={mySearch} onChange={setMySearch} placeholder="Search your quizzes..." />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                    <MyQuizzesFilterBar active={myStatus} onChange={setMyStatus} />
                    <FilterSelect icon={TrendingUp} value={mySort} options={SORT_OPTIONS} onChange={setMySort} />
                  </div>
                </div>

                {/* quiz cards */}
                {myLoading ? (
                  <MyQuizzesSkeleton />
                ) : myError ? (
                  <MyQuizzesError onRetry={() => setMyRefresh((r) => r + 1)} />
                ) : filteredMyQuizzes.length === 0 ? (
                  <MyQuizzesEmptyState />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredMyQuizzes.map((quiz, i) => (
                      <MyQuizCard
                        key={quiz.id}
                        quiz={quiz}
                        index={i}
                        onMutated={() => setMyRefresh((r) => r + 1)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "recent" && (
              <motion.div
                key="recent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <SearchField value={recentSearch} onChange={setRecentSearch} placeholder="Search quizzes..." />
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <FilterSelect icon={Filter} value={recentStatus} options={STATUS_OPTIONS} onChange={setRecentStatus} />
                    <FilterSelect icon={TrendingUp} value={recentSort} options={SORT_OPTIONS} onChange={setRecentSort} />
                  </div>
                </div>

                {/* stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  <MetricCard icon={BookOpen} label="Total Attempts" value={overview.totalAttempts} hint="quizzes attempted" tone="purple" delay={0} />
                  <MetricCard icon={CheckCircle2} label="Completed" value={overview.completed} hint="finished attempts" tone="green" delay={0.05} />
                  <MetricCard icon={Plus} label="Quizzes Created" value={overview.created} hint="by you" tone="orange" delay={0.1} />
                  <MetricCard icon={TrendingUp} label="Avg Score" value={overview.avgScore === null ? "—" : `${overview.avgScore}%`} hint="across attempts" tone="blue" delay={0.15} />
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

            {activeTab === "collaboration" && (
              <motion.div
                key="collaboration"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <CollaboratorsSection />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
