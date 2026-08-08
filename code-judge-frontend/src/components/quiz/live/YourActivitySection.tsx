"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search, ArrowRight, Sparkles, BookOpen, Clock, BarChart3,
  FileText, CheckCircle2, XCircle, AlertTriangle, Globe,
  Lock, Send, BarChart2, Users,
  BarChart, Copy, Share2, LayoutDashboard, TrendingUp,
  Layers3, HelpCircle, Code2, Brain, Beaker, Calculator, 
  Globe2, Palette, Database, Network, Hash, Shield, BarChart3 as GraphIcon, Target, Award
} from "lucide-react";
import { getOldQuizzes, getMyCreatedQuizzes } from "@/services/quiz";


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
const TAB_LIST: { key: TabType; label: string }[] = [
  { key: "recent", label: "Recent Quizzes" },
  { key: "my-quizzes", label: "My Quizzes" },
];

/* ─── Subject → icon + color mapping ─── */
type SubjectInfo = {
  icon: React.ElementType;
  color: string;
  label: string;
};

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
  "Graph Theory": { icon: GraphIcon, color: "text-accent-secondary", label: "Graph Theory" },
  "Dynamic Programming": { icon: BarChart, color: "text-success", label: "Dynamic Programming" },
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

function colorNameFromClass(cls: string): string {
  return cls.replace("text-", "");
}

/* ─── Status → color/icon config ─── */
const STATUS_CONFIG: Record<string, {
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: React.ElementType;
  text: string;
}> = {
  Completed: { colorClass: "text-success", bgClass: "bg-success/10", borderClass: "border-success/20", icon: CheckCircle2, text: "Completed" },
  Submitted: { colorClass: "text-accent-secondary", bgClass: "bg-accent-secondary/10", borderClass: "border-accent-secondary/20", icon: Send, text: "Submitted" },
  "Timed Out": { colorClass: "text-warning", bgClass: "bg-warning/10", borderClass: "border-warning/20", icon: Clock, text: "Timed Out" },
  "Left Early": { colorClass: "text-danger", bgClass: "bg-danger/10", borderClass: "border-danger/20", icon: XCircle, text: "Left Early" },
  draft: { colorClass: "text-warning", bgClass: "bg-warning/10", borderClass: "border-warning/20", icon: FileText, text: "Draft" },
  published: { colorClass: "text-success", bgClass: "bg-success/10", borderClass: "border-success/20", icon: Globe, text: "Published" },
  scheduled: { colorClass: "text-accent-secondary", bgClass: "bg-accent-secondary/10", borderClass: "border-accent-secondary/20", icon: Clock, text: "Scheduled" },
  archived: { colorClass: "text-text-muted", bgClass: "bg-text-muted/10", borderClass: "border-text-muted/20", icon: Lock, text: "Archived" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG["Completed"];
}

/* ─── Progress bar color based on percentage ─── */
function getProgressColorClass(pct: number): string {
  if (pct >= 80) return "bg-success";
  if (pct >= 60) return "bg-accent-secondary";
  if (pct >= 40) return "bg-accent";
  if (pct >= 20) return "bg-warning";
  return "bg-danger";
}


function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 shrink-0 rounded-lg bg-white/[0.06]" />
            <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
          </div>
          <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
          <div className="h-3 w-2/3 rounded bg-white/[0.04]" />
        </div>
        <div className="h-8 w-20 rounded-lg bg-white/[0.06]" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
        <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
        <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
      </div>
    </motion.div>
  );
}

function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (<SkeletonCard key={i} />))}
    </div>
  );
}

/* ─────────────────────────────────────────
   Colorful Summary Stat Card (tinted background)
   ───────────────────────────────────────── */
type StatVariant = "purple" | "green" | "orange" | "blue" | "pink";

const STAT_VARIANTS: Record<StatVariant, {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  labelColor: string;
}> = {
  purple: {
    bg: "bg-accent/5",
    border: "border-accent/20",
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    labelColor: "text-text-muted",
  },
  green: {
    bg: "bg-success/5",
    border: "border-success/20",
    iconBg: "bg-success/15",
    iconColor: "text-success",
    labelColor: "text-text-muted",
  },
  orange: {
    bg: "bg-warning/5",
    border: "border-warning/20",
    iconBg: "bg-warning/15",
    iconColor: "text-warning",
    labelColor: "text-text-muted",
  },
  blue: {
    bg: "bg-accent-secondary/5",
    border: "border-accent-secondary/20",
    iconBg: "bg-accent-secondary/15",
    iconColor: "text-accent-secondary",
    labelColor: "text-text-muted",
  },
  pink: {
    bg: "bg-pink-500/5",
    border: "border-pink-500/20",
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-500",
    labelColor: "text-text-muted",
  },
};

function ColorfulStatCard({
  label,
  value,
  icon: Icon,
  variant = "purple",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  variant?: StatVariant;
}) {
  const v = STAT_VARIANTS[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2.5 rounded-xl border ${v.border} ${v.bg} px-3 py-2.5 transition-transform hover:scale-[1.02]`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${v.iconBg}`}>
        <Icon className={`h-4 w-4 ${v.iconColor}`} />
      </div>
      <div>
        <p className="text-sm font-bold text-text-primary leading-none">{value}</p>
        <p className={`text-[9px] ${v.labelColor}`}>{label}</p>
      </div>
    </motion.div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "Search..."}
        className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:border-accent/40 focus:shadow-[0_0_12px_rgba(124,58,237,0.08)]" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <div>
      <label className="block text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-text-primary outline-none transition-all focus:border-accent/40">
        {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
      </select>
    </div>
  );
}

/* ─────────────────────────────────────────
   Colorful Status Badge
   ───────────────────────────────────────── */
function ColorfulStatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 rounded-full border ${cfg.borderClass} ${cfg.bgClass} px-2.5 py-0.5 text-[10px] font-semibold ${cfg.colorClass}`}
    >
      <cfg.icon className="h-3 w-3" />
      {cfg.text}
    </motion.span>
  );
}

/* ─────────────────────────────────────────
   Progress Bar
   ───────────────────────────────────────── */
function ProgressBar({
  value,
  max = 100,
  colorClass,
  size = "sm",
}: {
  value: number;
  max?: number;
  colorClass?: string;
  size?: "sm" | "md";
}) {
  const pct = Math.round((value / max) * 100);
  const clamped = Math.max(0, Math.min(100, pct));
  const barColor = colorClass || getProgressColorClass(clamped);
  const heightClass = size === "md" ? "h-2" : "h-1.5";
  return (
    <div className={`w-full ${heightClass} rounded-full bg-text-muted/15 overflow-hidden`}>
      <motion.div
        className={`h-full rounded-full ${barColor} transition-all duration-300`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        style={{ maxWidth: `${clamped}%` }}
      />
    </div>
  );
}

function EmptyState({ title, description, buttonText, buttonHref }: { title: string; description: string; buttonText: string; buttonHref: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="absolute -right-16 top-4 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card-hover">
          <BookOpen className="h-7 w-7 text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-1.5 text-sm text-text-secondary">{description}</p>
        <Link href={buttonHref}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]">
          {buttonText}<ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}


function RecentQuizCard({ quiz }: { quiz: RecentQuiz }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeTakenFormatted = useMemo(() => {
    if (!quiz.time_taken) return "—";
    const mins = Math.floor(quiz.time_taken / 60);
    const secs = quiz.time_taken % 60;
    return `${mins}m ${secs}s`;
  }, [quiz.time_taken]);
  const dateFormatted = useMemo(() => {
    if (!quiz.completed_at) return "—";
    return new Date(quiz.completed_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }, [quiz.completed_at]);
  const subjectInfo = getSubjectInfo(quiz.name);
  const SubjectIcon = subjectInfo.icon;
  const progressColor = getProgressColorClass(quiz.percentage);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all hover:border-border-hover hover:shadow-lg hover:shadow-black/5"
    >
      {/* Colored accent strip at top */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${progressColor.replace('bg-', 'bg-')} opacity-70`} />

      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Header: subject icon + title + status badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-${colorNameFromClass(subjectInfo.color)}/10`}>
                <SubjectIcon className={`h-3.5 w-3.5 ${subjectInfo.color}`} />
              </div>
              <h3 className="truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-accent">
                {quiz.name}
              </h3>
            </div>
            <ColorfulStatusBadge status={quiz.status} />
          </div>

          <p className="mt-0.5 text-[11px] text-text-secondary">Code: {quiz.code} · {dateFormatted}</p>

          {/* Score progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[10px] font-semibold text-text-secondary">Score</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-text-primary">{quiz.score}/{quiz.total_marks}</span>
                <span className={`text-[10px] font-bold ${progressColor.replace('bg-', 'text-')}`}>({quiz.percentage}%)</span>
              </div>
            </div>
            <ProgressBar value={quiz.percentage} max={100} colorClass={progressColor} />
          </div>

          
          {/* Colorful compact metrics */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-accent-secondary/20 bg-accent-secondary/5 px-2.5 py-1.5">
              <p className="text-[9px] text-text-muted">Percentage</p>
              <p className="text-xs font-bold text-accent-secondary">{quiz.percentage}%</p>
            </div>
            <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 px-2.5 py-1.5">
              <p className="text-[9px] text-text-muted">Time</p>
              <p className="text-xs font-bold text-pink-400">{timeTakenFormatted}</p>
            </div>
            <div className="rounded-lg border border-warning/20 bg-warning/5 px-2.5 py-1.5">
              <p className="text-[9px] text-text-muted">Rank</p>
              <p className="text-xs font-bold text-warning">{quiz.rank ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-success/20 bg-success/5 px-2.5 py-1.5">
              <p className="text-[9px] text-text-muted">Accuracy</p>
              <p className="text-xs font-bold text-success">
                {quiz.total_questions > 0
                  ? `${Math.round((quiz.correct_answers / quiz.total_questions) * 100)}%`
                  : "—"}
              </p>
            </div>
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden">
                                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-card-hover px-2.5 py-1 text-[10px] text-text-secondary flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" /> Total: {quiz.total_questions}
                  </span>
                  <span className="rounded-full border border-success/20 bg-success/5 px-2.5 py-1 text-[10px] text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Correct: {quiz.correct_answers}
                  </span>
                  <span className="rounded-full border border-danger/20 bg-danger/5 px-2.5 py-1 text-[10px] text-danger flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Wrong: {quiz.wrong_answers}
                  </span>
                  <span className="rounded-full border border-border bg-card-hover px-2.5 py-1 text-[10px] text-text-muted flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Skipped: {quiz.skipped_questions}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex sm:flex-col gap-2 shrink-0">
          <button onClick={() => setIsExpanded(!isExpanded)} className="rounded-lg border border-border bg-card-hover px-3 py-1.5 text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors">{isExpanded ? "Less" : "Details"}</button>
          <Link href={`/quiz/${quiz.code}/results`} className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/10 transition-colors text-center">View Result</Link>
          <Link href={`/quiz/${quiz.code}`} className="rounded-lg border border-border bg-card-hover px-3 py-1.5 text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors text-center">View Quiz</Link>
        </div>
      </div>
    </motion.div>
  );
}


function MyQuizCard({ quiz }: { quiz: MyQuiz }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibilityLabel = useMemo(() => {
    if (quiz.visibility === 1) return { text: "Public", icon: Globe, color: "text-success", bg: "bg-success/5 border-success/20" };
    if (quiz.visibility === 2) return { text: "Classroom", icon: Users, color: "text-accent-secondary", bg: "bg-accent-secondary/5 border-accent-secondary/20" };
    if (quiz.visibility === 3) return { text: "College", icon: Shield, color: "text-pink-500", bg: "bg-pink-500/5 border-pink-500/20" };
    if (quiz.visibility === 4) return { text: "Classroom", icon: Users, color: "text-warning", bg: "bg-warning/5 border-warning/20" };
    return { text: "Private", icon: Lock, color: "text-accent-secondary", bg: "bg-accent-secondary/5 border-accent-secondary/20" };
  }, [quiz.visibility]);

  const subjectInfo = getSubjectInfo(quiz.name);
  const SubjectIcon = subjectInfo.icon;

  const isLive = quiz.status === "published" && quiz.starttime && quiz.endtime
    ? new Date(quiz.starttime) <= new Date() && new Date(quiz.endtime) > new Date()
    : false;

  // Status-based accent gradient for the top card strip
  const statusAccent = useMemo(() => {
    const s = quiz.status;
    if (s === "published") return "from-success to-success/70";
    if (s === "draft") return "from-warning to-warning/70";
    if (s === "scheduled") return "from-accent-secondary to-accent-secondary/70";
    if (s === "archived") return "from-text-muted to-text-muted/70";
    return "from-accent to-accent-secondary";
  }, [quiz.status]);

  const completionPct = Math.round(quiz.completion_rate * 100);
  const completionColorClass = getProgressColorClass(completionPct);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all hover:border-border-hover hover:shadow-lg hover:shadow-black/5"
    >
      {/* Colored gradient header strip */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${statusAccent}`} />

      {/* Live pulse indicator for published quizzes */}
      {isLive && (
        <motion.div
          className="absolute top-0 right-0 m-3 flex items-center gap-1"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/50 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
          </span>
          <span className="text-[9px] font-semibold text-success">Live</span>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Header: subject icon + title + status badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-${colorNameFromClass(subjectInfo.color)}/10`}>
                <SubjectIcon className={`h-3.5 w-3.5 ${subjectInfo.color}`} />
              </div>
              <h3 className="truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-accent">
                {quiz.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <ColorfulStatusBadge status={quiz.status} />
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${visibilityLabel.bg} ${visibilityLabel.color}`}>
                <visibilityLabel.icon className="h-3 w-3" />
                {visibilityLabel.text}
              </span>
            </div>
          </div>

          <p className="mt-0.5 text-[11px] text-text-secondary">
            Code: {quiz.code} · Created {quiz.created_at ? new Date(quiz.created_at).toLocaleDateString() : "—"}
          </p>
                    {/* Colorful compact metrics */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1.5">
              <p className="text-[9px] text-text-muted">Participants</p>
              <p className="text-xs font-bold text-accent flex items-center gap-1">
                <Users className="h-3 w-3" /> {quiz.participants}
              </p>
            </div>
            <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 px-2.5 py-1.5">
              <p className="text-[9px] text-text-muted">Questions</p>
              <p className="text-xs font-bold text-pink-400 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> {quiz.total_questions}
              </p>
            </div>
            <div className="rounded-lg border border-success/20 bg-success/5 px-2.5 py-1.5">
              <p className="text-[9px] text-text-muted">Total Marks</p>
              <p className="text-xs font-bold text-success flex items-center gap-1">
                <Award className="h-3 w-3" /> {quiz.total_marks}
              </p>
            </div>
            <div className="rounded-lg border border-accent-secondary/20 bg-accent-secondary/5 px-2.5 py-1.5">
              <p className="text-[9px] text-text-muted">Completion</p>
              <p className={`text-xs font-bold ${completionColorClass} flex items-center gap-1`}>
                <BarChart2 className="h-3 w-3" /> {completionPct}%
              </p>
            </div>
          </div>

          {/* Completion progress bar */}
          <div className="mt-2">
            <ProgressBar value={completionPct} max={100} colorClass={completionColorClass.replace('text-', 'bg-')} />
          </div>

          {quiz.status === "draft" && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/5 px-2.5 py-1 text-[10px] font-semibold text-warning">
              <AlertTriangle className="h-3 w-3" /> Results Pending
            </div>
          )}
        </div>
        <div className="flex sm:flex-col gap-2 shrink-0">
          {/* Details toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg border border-border bg-card-hover px-3 py-1.5 text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            {isExpanded ? "Less" : "Details"}
          </button>

          {/* Primary: Dashboard (gradient fill) */}
          {isLive && (
            <Link
              href={`/quiz/${quiz.code}/dashboard`}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-accent/20 bg-gradient-to-r from-accent to-accent-secondary px-3 py-1.5 text-[10px] font-semibold text-white shadow transition-transform hover:scale-[1.02]"
            >
              <LayoutDashboard className="h-3 w-3" /> Dashboard
            </Link>
          )}

          {/* Secondary: Edit (soft tinted) */}
          <Link
            href={`/quiz/${quiz.code}/edit`}
            className="rounded-lg border border-accent-secondary/20 bg-accent-secondary/5 px-3 py-1.5 text-[10px] font-semibold text-accent-secondary hover:bg-accent-secondary/10 transition-colors text-center"
          >
            Edit
          </Link>

          {/* Secondary: Duplicate (soft tinted) */}
          <button
            className="rounded-lg border border-border bg-card-hover px-3 py-1.5 text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
            title="Duplicate"
          >
            <Copy className="h-3 w-3" /> Duplicate
          </button>

          {/* Secondary: Share (soft tinted) */}
          <button
            className="rounded-lg border border-border bg-card-hover px-3 py-1.5 text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
            title="Share"
          >
            <Share2 className="h-3 w-3" /> Share
          </button>

          {/* Danger: Send Results (green) */}
          {isLive && (
            <button
              className="rounded-lg border border-success/20 bg-success/5 px-3 py-1.5 text-[10px] font-semibold text-success hover:bg-success/10 transition-colors flex items-center gap-1"
              title="Send Results"
            >
              <Send className="h-3 w-3" /> Send Results
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}


export default function YourActivitySection() {
  const [activeTab, setActiveTab] = useState<TabType>("recent");
  const [isHydrated, setIsHydrated] = useState(false);
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentSearch, setRecentSearch] = useState("");
  const [recentStatus, setRecentStatus] = useState("All");
  const [recentSort, setRecentSort] = useState("Newest");
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotal, setRecentTotal] = useState(0);
  const [myQuizzes, setMyQuizzes] = useState<MyQuiz[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [mySearch, setMySearch] = useState("");
  const [myStatus, setMyStatus] = useState("All");
  const [mySort, setMySort] = useState("Newest");
  const [myPage, setMyPage] = useState(1);
  const [myTotal, setMyTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "recent" || stored === "my-quizzes") {
      setActiveTab(stored);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, activeTab);
    }
  }, [activeTab, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;
    setRecentLoading(true);
    setRecentPage(1);
    getOldQuizzes({
      page: 1,
      limit: pageSize,
      search: recentSearch || undefined,
      sortBy: recentSort === "Newest" ? "completed_at" : recentSort === "Oldest" ? "completed_at" : "percentage",
      sortOrder: recentSort === "Oldest" || recentSort === "Lowest Score" ? "ASC" : "DESC",
    })
      .then((res) => {
        if (!cancelled) {
          setRecentQuizzes(res.quizzes);
          setRecentTotal(res.total);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRecentLoading(false); });
    return () => { cancelled = true; };
  }, [isHydrated, recentSearch, recentStatus, recentSort]);

  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;
    setMyLoading(true);
    setMyPage(1);
    getMyCreatedQuizzes({
      page: 1,
      limit: pageSize,
      search: mySearch || undefined,
      status: myStatus === "All" ? undefined : myStatus,
      sortBy: mySort === "Newest" ? "created_at" : mySort === "Oldest" ? "created_at" : "name",
      sortOrder: mySort === "Oldest" ? "ASC" : "DESC",
    })
      .then((res) => {
        if (!cancelled) {
          setMyQuizzes(res.quizzes as unknown as MyQuiz[]);
          setMyTotal(res.pagination.total);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMyLoading(false); });
    return () => { cancelled = true; };
  }, [isHydrated, mySearch, myStatus, mySort]);

  const recentSummary = useMemo(() => {
    const list = recentQuizzes || [];
    const completed = list.filter((q) => q.status === "Completed").length;
    const avgScore = list.length > 0 ? Math.round(list.reduce((s, q) => s + q.percentage, 0) / list.length) : 0;
    const avgTime = list.length > 0 ? Math.round(list.reduce((s, q) => s + (q.time_taken || 0), 0) / list.length / 60) : 0;
    return { total: list.length, completed, avgScore, avgTime };
  }, [recentQuizzes]);

  const mySummary = useMemo(() => {
    const list = myQuizzes || [];
    const published = list.filter((q) => q.status === "published").length;
    const draft = list.filter((q) => q.status === "draft").length;
    const avgCompletion = list.length > 0
      ? Math.round(list.reduce((s, q) => s + q.completion_rate, 0) / list.length * 100)
      : 0;
    return { total: list.length, published, draft, avgCompletion };
  }, [myQuizzes]);

  if (!isHydrated) return null;

  return (
    <section className="mb-8 sm:mb-10">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(124,58,237,0.06),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.04),_transparent_28%)]" />
        <div className="relative rounded-2xl bg-card backdrop-blur-xl p-3 sm:p-4 lg:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-accent/20 bg-accent/10 text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
                  <Sparkles className="w-2.5 h-2.5" />Your Activity
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">Your Activity</h2>
              <p className="mt-1 max-w-2xl text-xs text-text-secondary">Track your quiz history and manage the assessments you have created.</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-border w-fit">
              {TAB_LIST.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${activeTab === tab.key ? "bg-gradient-to-r from-accent to-accent-secondary text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]" : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"}`}>
                  {tab.key === "recent" ? <Clock className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "recent" && (
              <motion.div key="recent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <ColorfulStatCard label="Total" value={recentSummary.total} icon={BookOpen} variant="purple" />
                  <ColorfulStatCard label="Completed" value={recentSummary.completed} icon={CheckCircle2} variant="green" />
                  <ColorfulStatCard label="Avg Score" value={`${recentSummary.avgScore}%`} icon={TrendingUp} variant="blue" />
                  <ColorfulStatCard label="Avg Time" value={`${recentSummary.avgTime}m`} icon={Clock} variant="pink" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <SearchInput value={recentSearch} onChange={setRecentSearch} placeholder="Search quizzes..." />
                  <SelectField label="Status" value={recentStatus} onChange={setRecentStatus} options={STATUS_OPTIONS} />
                  <SelectField label="Sort" value={recentSort} onChange={setRecentSort} options={SORT_OPTIONS} />
                </div>
                {recentLoading ? (
                  <SkeletonGrid count={4} />
                ) : recentQuizzes?.length === 0 ? (
                  <EmptyState title="Looks like you haven't joined any quizzes yet." description="Start by joining a quiz to track your scores, rankings, and progress." buttonText="Join Quiz" buttonHref="#join-quiz" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentQuizzes?.map((quiz) => (<RecentQuizCard key={quiz.attempt_id} quiz={quiz} />))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "my-quizzes" && (
              <motion.div key="my-quizzes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <ColorfulStatCard label="Total" value={mySummary.total} icon={BookOpen} variant="purple" />
                  <ColorfulStatCard label="Published" value={mySummary.published} icon={Globe} variant="green" />
                  <ColorfulStatCard label="Drafts" value={mySummary.draft} icon={FileText} variant="orange" />
                  <ColorfulStatCard label="Avg Completion" value={`${mySummary.avgCompletion}%`} icon={BarChart2} variant="blue" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <SearchInput value={mySearch} onChange={setMySearch} placeholder="Search my quizzes..." />
                  <SelectField label="Status" value={myStatus} onChange={setMyStatus} options={MY_QUIZ_STATUS_OPTIONS} />
                  <SelectField label="Sort" value={mySort} onChange={setMySort} options={SORT_OPTIONS} />
                </div>
                {myLoading ? (
                  <SkeletonGrid count={4} />
                ) : (myQuizzes || []).length === 0 ? (
                  <EmptyState title="You haven't created any quizzes yet." description="Design your first assessment, add questions, set timing, and publish." buttonText="Create Quiz" buttonHref="/quiz/create" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(myQuizzes || []).map((quiz) => (<MyQuizCard key={quiz.id} quiz={quiz} />))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
