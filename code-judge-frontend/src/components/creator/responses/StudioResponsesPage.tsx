"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Mail, Square, Search, ChevronDown, X, Users,
  CheckCircle2, Clock, AlertTriangle, XCircle, Trophy, BarChart3,
  Eye, Pause, RotateCcw, ExternalLink, Crown, Medal,
  ChevronRight, Filter, ArrowUpDown, MoreVertical, FileDown,
  Timer, TrendingUp, TrendingDown, Minus, Circle,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import Link from "next/link";

// ─── Mock Data ───────────────────────────────────────────────────────────────

type StudentStatus = "SUBMITTED" | "IN_PROGRESS" | "NOT_STARTED" | "TIMED_OUT" | "LEFT_EARLY";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  userId: string;
  status: StudentStatus;
  marks: number | null;
  total: number;
  percentage: number | null;
  timeTaken: string | null;
  submittedAt: string | null;
  avatar: string;
  tabSwitches: number;
  fullscreenExits: number;
  usedFiftyFifty: boolean;
  questionsAnswered: number;
  totalQuestions: number;
  questionResults: ("correct" | "wrong" | "skipped")[];
}

const STATUS_CONFIG: Record<StudentStatus, { label: string; color: string; bg: string; dot: string }> = {
  SUBMITTED:    { label: "Submitted",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
  IN_PROGRESS:  { label: "In Progress",  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",    dot: "bg-blue-400" },
  NOT_STARTED:  { label: "Not Started",  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",   dot: "bg-amber-400" },
  TIMED_OUT:    { label: "Timed Out",    color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",     dot: "bg-red-400" },
  LEFT_EARLY:   { label: "Left Early",   color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20",  dot: "bg-orange-400" },
};

const MOCK_STUDENTS: Student[] = [
  { id: "1", name: "Alice Smith", rollNo: "KIDS-001", userId: "101", status: "SUBMITTED", marks: 48, total: 50, percentage: 96, timeTaken: "30m 15s", submittedAt: "4:00 PM", avatar: "AS", tabSwitches: 0, fullscreenExits: 0, usedFiftyFifty: false, questionsAnswered: 10, totalQuestions: 10, questionResults: ["correct","correct","correct","correct","correct","correct","correct","correct","correct","correct"] },
  { id: "2", name: "Bob Jones", rollNo: "KIDS-002", userId: "102", status: "SUBMITTED", marks: 42, total: 50, percentage: 84, timeTaken: "35m 42s", submittedAt: "4:05 PM", avatar: "BJ", tabSwitches: 1, fullscreenExits: 0, usedFiftyFifty: true, questionsAnswered: 10, totalQuestions: 10, questionResults: ["correct","correct","correct","wrong","correct","correct","correct","correct","correct","correct"] },
  { id: "3", name: "Charlie Brown", rollNo: "KIDS-003", userId: "103", status: "SUBMITTED", marks: 38, total: 50, percentage: 76, timeTaken: "40m 10s", submittedAt: "4:10 PM", avatar: "CB", tabSwitches: 0, fullscreenExits: 1, usedFiftyFifty: false, questionsAnswered: 10, totalQuestions: 10, questionResults: ["correct","correct","correct","correct","wrong","correct","correct","correct","wrong","correct"] },
  { id: "4", name: "Diana Prince", rollNo: "KIDS-004", userId: "104", status: "IN_PROGRESS", marks: 35, total: 50, percentage: 70, timeTaken: "42m 55s", submittedAt: null, avatar: "DP", tabSwitches: 2, fullscreenExits: 1, usedFiftyFifty: true, questionsAnswered: 8, totalQuestions: 10, questionResults: ["correct","correct","correct","correct","correct","wrong","correct","correct","skipped","skipped"] },
  { id: "5", name: "Ethan Hunt", rollNo: "KIDS-005", userId: "105", status: "IN_PROGRESS", marks: 28, total: 50, percentage: 56, timeTaken: "45m 30s", submittedAt: null, avatar: "EH", tabSwitches: 0, fullscreenExits: 0, usedFiftyFifty: false, questionsAnswered: 7, totalQuestions: 10, questionResults: ["correct","correct","correct","wrong","correct","correct","correct","skipped","skipped","skipped"] },
  { id: "6", name: "Fiona Glen", rollNo: "KIDS-006", userId: "106", status: "TIMED_OUT", marks: 22, total: 50, percentage: 44, timeTaken: "60m 00s", submittedAt: null, avatar: "FG", tabSwitches: 3, fullscreenExits: 2, usedFiftyFifty: true, questionsAnswered: 6, totalQuestions: 10, questionResults: ["correct","correct","wrong","correct","correct","correct","skipped","skipped","skipped","skipped"] },
  { id: "7", name: "George Miller", rollNo: "KIDS-007", userId: "107", status: "NOT_STARTED", marks: null, total: 50, percentage: null, timeTaken: null, submittedAt: null, avatar: "GM", tabSwitches: 0, fullscreenExits: 0, usedFiftyFifty: false, questionsAnswered: 0, totalQuestions: 10, questionResults: [] },
  { id: "8", name: "Hannah Lee", rollNo: "KIDS-008", userId: "108", status: "SUBMITTED", marks: 31, total: 50, percentage: 62, timeTaken: "51m 20s", submittedAt: "4:50 PM", avatar: "HL", tabSwitches: 1, fullscreenExits: 0, usedFiftyFifty: false, questionsAnswered: 10, totalQuestions: 10, questionResults: ["correct","correct","wrong","correct","correct","correct","wrong","correct","correct","correct"] },
  { id: "9", name: "Ian Carter", rollNo: "KIDS-009", userId: "109", status: "LEFT_EARLY", marks: 18, total: 50, percentage: 36, timeTaken: "21m 44s", submittedAt: null, avatar: "IC", tabSwitches: 0, fullscreenExits: 0, usedFiftyFifty: false, questionsAnswered: 5, totalQuestions: 10, questionResults: ["correct","correct","correct","wrong","correct","skipped","skipped","skipped","skipped","skipped"] },
  { id: "10", name: "Julia Wilson", rollNo: "KIDS-010", userId: "110", status: "IN_PROGRESS", marks: 41, total: 50, percentage: 82, timeTaken: "38m 12s", submittedAt: null, avatar: "JW", tabSwitches: 1, fullscreenExits: 0, usedFiftyFifty: true, questionsAnswered: 9, totalQuestions: 10, questionResults: ["correct","correct","correct","correct","correct","correct","correct","correct","wrong","skipped"] },
];

const LIVE_STUDENTS = MOCK_STUDENTS.filter(s => s.status === "IN_PROGRESS");

// ─── Score Distribution Data ─────────────────────────────────────────────────

const SCORE_RANGES = ["0-10", "10-20", "20-30", "30-40", "40-50"];
const SCORE_DATA = [
  { range: "0-10", count: 0 },
  { range: "10-20", count: 1 },
  { range: "20-30", count: 2 },
  { range: "30-40", count: 3 },
  { range: "40-50", count: 4 },
];

const PIE_COLORS = ["#22C55E", "#3B82F6", "#EAB308", "#EF4444", "#F97316"];

const SUBMISSION_DATA = [
  { name: "Submitted", value: 4, color: "#22C55E" },
  { name: "In Progress", value: 3, color: "#3B82F6" },
  { name: "Not Started", value: 1, color: "#EAB308" },
  { name: "Timed Out", value: 1, color: "#EF4444" },
  { name: "Left Early", value: 1, color: "#F97316" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StudentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", cfg.bg, cfg.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="flex items-center justify-center w-6 h-6"><Crown className="h-4 w-4 text-amber-400" /></span>;
  if (rank === 2) return <span className="flex items-center justify-center w-6 h-6"><Medal className="h-4 w-4 text-gray-300" /></span>;
  if (rank === 3) return <span className="flex items-center justify-center w-6 h-6"><Medal className="h-4 w-4 text-amber-600" /></span>;
  return <span className="text-xs font-semibold text-text-muted w-6 text-center">{rank}</span>;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StudioResponsesPage({ quizId }: { quizId: string }) {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StudentStatus | "ALL">("ALL");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailPanel, setDetailPanel] = useState<Student | null>(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = students;
    if (filter !== "ALL") list = list.filter(s => s.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q) || s.userId.includes(q));
    }
    return list;
  }, [students, filter, search]);

  const stats = useMemo(() => ({
    total: students.length,
    submitted: students.filter(s => s.status === "SUBMITTED").length,
    inProgress: students.filter(s => s.status === "IN_PROGRESS").length,
    notStarted: students.filter(s => s.status === "NOT_STARTED").length,
    timedOut: students.filter(s => s.status === "TIMED_OUT").length,
    leftEarly: students.filter(s => s.status === "LEFT_EARLY").length,
    avgScore: students.filter(s => s.marks !== null).reduce((a, b) => a + (b.marks ?? 0), 0) / Math.max(students.filter(s => s.marks !== null).length, 1),
    highest: Math.max(...students.filter(s => s.marks !== null).map(s => s.marks ?? 0)),
    lowest: Math.min(...students.filter(s => s.marks !== null && s.marks > 0).map(s => s.marks ?? 0)),
  }), [students]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/creator/quizzes" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-card-hover transition-colors">
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-text-primary">Responses</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-text-muted">Fun Math Quiz for Kids</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-card-hover transition-colors">
              <Download className="h-3.5 w-3.5" />
              Download Results
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-card-hover transition-colors">
              <Mail className="h-3.5 w-3.5" />
              Send on Email
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors">
              <Square className="h-3.5 w-3.5" />
              End Quiz
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6 space-y-6">

        {/* ── KPI Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
          {[
            { icon: Users, label: "Total Students", value: stats.total, sub: "registered", accent: "text-pink-400" },
            { icon: CheckCircle2, label: "Submitted", value: stats.submitted, sub: "completed", accent: "text-emerald-400" },
            { icon: Clock, label: "In Progress", value: stats.inProgress, sub: "currently taking", accent: "text-blue-400" },
            { icon: AlertTriangle, label: "Not Started", value: stats.notStarted, sub: "waiting", accent: "text-amber-400" },
            { icon: XCircle, label: "Timed Out", value: stats.timedOut, sub: "", accent: "text-red-400" },
            { icon: XCircle, label: "Left Early", value: stats.leftEarly, sub: "", accent: "text-orange-400" },
            { icon: BarChart3, label: "Avg Score", value: `${stats.avgScore.toFixed(1)}`, sub: `/ 50`, accent: "text-purple-400" },
            { icon: TrendingUp, label: "Highest", value: stats.highest, sub: "score", accent: "text-emerald-400" },
            { icon: TrendingDown, label: "Lowest", value: stats.lowest, sub: "score", accent: "text-rose-400" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <kpi.icon className={cn("h-3.5 w-3.5", kpi.accent)} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{kpi.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-text-primary">{kpi.value}</span>
                {kpi.sub && <span className="text-[10px] text-text-muted">{kpi.sub}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* ── Live Control Bar ──────────────────────────────────────── */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Now</span>
              <span className="text-[11px] text-text-muted">{LIVE_STUDENTS.length} students currently taking this quiz</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEndOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-600 transition-colors">
                <Square className="h-3.5 w-3.5" />
                End Quiz
              </button>
              <div className="relative" id="live-more-menu">
                <button
                  onClick={() => {
                    const m = document.getElementById("live-more-dropdown");
                    if (m) m.classList.toggle("hidden");
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-muted hover:bg-card-hover hover:text-text-primary transition-colors"
                  aria-label="More actions"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
                <div id="live-more-dropdown" className="hidden absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
                  <button onClick={() => { document.getElementById("live-more-dropdown")?.classList.add("hidden"); setPauseOpen(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors">
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </button>
                  <button onClick={() => { document.getElementById("live-more-dropdown")?.classList.add("hidden"); setRestartOpen(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" /> Restart
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto">
            {LIVE_STUDENTS.map(s => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 min-w-[200px]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-400">{s.avatar}</div>
                <div>
                  <p className="text-xs font-semibold text-text-primary">{s.name}</p>
                  <p className="text-[10px] text-text-muted">{s.timeTaken}</p>
                </div>
              </div>
            ))}
            <button className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] font-semibold text-text-muted hover:text-text-primary hover:border-border-hover transition-colors">
              <ExternalLink className="h-3 w-3" />
              Open Live Monitor
            </button>
          </div>
        </div>

        {/* ── Filter Bar ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by roll number, name or user ID..."
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-text-primary placeholder-text-muted outline-none focus:border-pink-500/40 focus:ring-1 focus:ring-pink-500/10"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["ALL", "SUBMITTED", "IN_PROGRESS", "NOT_STARTED", "TIMED_OUT", "LEFT_EARLY"] as const).map(f => {
              const cfg = f === "ALL" ? { label: "All", color: "text-text-primary", bg: "bg-card border-border" } : STATUS_CONFIG[f];
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-all",
                    active ? cn(cfg.bg, cfg.color) : "border-border bg-card text-text-muted hover:bg-card-hover"
                  )}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-card-hover transition-colors">
              <FileDown className="h-3 w-3" />
              Export
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-card-hover transition-colors">
              <ArrowUpDown className="h-3 w-3" />
              Sort
            </button>
          </div>
        </div>

        {/* ── Analytics Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Score Distribution — Sales This Week style */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-text-primary">Score Distribution</h3>
                <p className="mt-1 text-xs text-text-muted">{stats.total} submissions across all ranges</p>
              </div>
              <span className="shrink-0 rounded-full bg-pink-500/10 px-2.5 py-1 text-[11px] font-bold text-pink-500">Detailed stats →</span>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={SCORE_DATA} barSize={48} barCategoryGap="18%">
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, fontSize: 11 }}
                    cursor={{ fill: "rgba(236,72,153,0.06)" }}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]} label={{ position: "top", fill: "#9CA3AF", fontSize: 11, fontWeight: 800, dy: -8 }}>
                    {SCORE_DATA.map((_, i) => (
                      <Cell key={i} fill="#EC4899" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Submission Status — premium */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Submission Status</h3>
            <p className="mt-1 text-xs text-text-muted">Breakdown of {stats.total} students</p>
            <div className="mt-5 flex flex-1 items-center gap-7">
              <div className="relative h-[148px] w-[148px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={SUBMISSION_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {SUBMISSION_DATA.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.08)" strokeWidth={1.5} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[24px] font-extrabold leading-none tracking-tight text-text-primary">{stats.total}</span>
                  <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Total</span>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                {SUBMISSION_DATA.map(d => (
                  <div key={d.name} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-1 ring-white/10" style={{ background: d.color }} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none text-text-secondary">{d.name}</span>
                    <span className="text-[13px] font-extrabold leading-none text-text-primary tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Time Taken — premium */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Time Taken</h3>
            <p className="mt-1 text-xs text-text-muted">Duration insights</p>
            <div className="mt-5 flex flex-1 flex-col gap-3">
              {[
                { label: "Average", value: "41m 14s", icon: Timer, accent: "bg-violet-500 text-white", sub: "Typical completion" },
                { label: "Fastest", value: "21m 44s", icon: TrendingUp, accent: "bg-emerald-500 text-white", sub: "Best performer" },
                { label: "Slowest", value: "60m 00s", icon: TrendingDown, accent: "bg-rose-500 text-white", sub: "Needs attention" },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-3.5 rounded-xl border border-border/60 bg-gradient-to-br from-card-hover/70 to-card-hover/30 px-4 py-3.5 transition-colors hover:border-pink-500/20">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm", t.accent)}>
                    <t.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{t.label}</p>
                    <p className="text-[11px] leading-none text-text-muted">{t.sub}</p>
                  </div>
                  <p className="text-sm font-extrabold tracking-tight text-text-primary tabular-nums">{t.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Student Response Table ────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-bold text-text-primary">Student Responses</h3>
            <p className="text-[11px] text-text-muted mt-0.5">Monitor every student&apos;s quiz activity and performance in real time.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Rank", "Roll No.", "Student", "User ID", "Status", "Marks", "Total", "%", "Time Taken", "Submitted At", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    onClick={() => setDetailPanel(s)}
                    className="border-b border-border/50 hover:bg-card-hover/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3"><RankBadge rank={i + 1} /></td>
                    <td className="px-4 py-3 text-xs font-mono text-text-secondary">{s.rollNo}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500/10 text-[10px] font-bold text-pink-400">{s.avatar}</div>
                        <span className="text-xs font-semibold text-text-primary">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted font-mono">{s.userId}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-xs font-bold text-text-primary">{s.marks !== null ? s.marks : "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">{s.total}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-text-primary">{s.percentage !== null ? `${s.percentage}%` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{s.timeTaken ?? "—"}</td>
                    <td className="px-4 py-3 text-[11px] text-text-muted">{s.submittedAt ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); }} className="rounded p-1 hover:bg-card-hover transition-colors">
                        <MoreVertical className="h-3.5 w-3.5 text-text-muted" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── Student Detail Panel ────────────────────────────────────── */}
      <AnimatePresence>
        {detailPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setDetailPanel(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border bg-card shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4 sticky top-0 bg-card z-10">
                <h3 className="text-sm font-bold text-text-primary">Student Details</h3>
                <button onClick={() => setDetailPanel(null)} className="rounded-lg p-1.5 hover:bg-card-hover transition-colors">
                  <X className="h-4 w-4 text-text-muted" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Profile */}
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10 text-lg font-bold text-pink-400">{detailPanel.avatar}</div>
                  <div>
                    <h4 className="text-base font-bold text-text-primary">{detailPanel.name}</h4>
                    <p className="text-xs text-text-muted">{detailPanel.rollNo} &middot; User #{detailPanel.userId}</p>
                    <StatusBadge status={detailPanel.status} />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Score", value: detailPanel.marks !== null ? `${detailPanel.marks} / ${detailPanel.total}` : "—" },
                    { label: "Percentage", value: detailPanel.percentage !== null ? `${detailPanel.percentage}%` : "—" },
                    { label: "Time Taken", value: detailPanel.timeTaken ?? "—" },
                    { label: "Started At", value: "3:30 PM" },
                    { label: "Submitted At", value: detailPanel.submittedAt ?? "—" },
                    { label: "Questions", value: `${detailPanel.questionsAnswered} / ${detailPanel.totalQuestions}` },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">{s.label}</p>
                      <p className="text-sm font-bold text-text-primary mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Question Progress */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Question Progress</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detailPanel.questionResults.map((r, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold",
                          r === "correct" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                          r === "wrong" && "bg-red-500/10 text-red-400 border border-red-500/20",
                          r === "skipped" && "bg-card-hover text-text-muted border border-border",
                        )}
                      >
                        {r === "correct" ? "✓" : r === "wrong" ? "✕" : "—"}
                      </div>
                    ))}
                    {Array.from({ length: detailPanel.totalQuestions - detailPanel.questionResults.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] text-text-muted border border-border bg-card-hover">
                        —
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Activity</h4>
                  <div className="space-y-2">
                    {[
                      { label: "Tab switches", value: detailPanel.tabSwitches },
                      { label: "Fullscreen exits", value: detailPanel.fullscreenExits },
                      { label: "50/50 used", value: detailPanel.usedFiftyFifty ? "Yes" : "No" },
                      { label: "Questions answered", value: `${detailPanel.questionsAnswered}/${detailPanel.totalQuestions}` },
                    ].map(a => (
                      <div key={a.label} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                        <span className="text-xs text-text-secondary">{a.label}</span>
                        <span className="text-xs font-bold text-text-primary">{a.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Pause Quiz Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {pauseOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md"
              onClick={() => setPauseOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-transparent" />
                <div className="px-6 pb-6 pt-7 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-xl">
                    <Pause className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-extrabold text-text-primary">Pause this quiz?</h3>
                  <p className="mt-2 text-[13px] text-text-secondary leading-relaxed">
                    Pausing the quiz will stop the timer for all active participants. They will not be able to continue until you resume.
                  </p>
                  <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2">
                    <p className="text-[11px] text-amber-500">
                      {LIVE_STUDENTS.length} student{LIVE_STUDENTS.length !== 1 ? "s" : ""} currently taking this quiz
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2.5 border-t border-border bg-card-hover/40 px-6 py-4">
                  <button
                    onClick={() => setPauseOpen(false)}
                    className="h-10 rounded-xl border border-border px-4 text-xs font-semibold text-text-secondary hover:bg-card-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setPauseOpen(false); /* TODO: call pause API */ }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-5 text-xs font-bold text-white shadow-lg shadow-amber-500/25 hover:brightness-110 transition-all"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause Quiz
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Restart Quiz Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {restartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md"
              onClick={() => setRestartOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />
                <div className="px-6 pb-6 pt-7 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl">
                    <RotateCcw className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-extrabold text-text-primary">Restart this quiz?</h3>
                  <p className="mt-2 text-[13px] text-text-secondary leading-relaxed">
                    This will make the quiz live again. All participants will be able to start new attempts.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2.5 border-t border-border bg-card-hover/40 px-6 py-4">
                  <button
                    onClick={() => setRestartOpen(false)}
                    className="h-10 rounded-xl border border-border px-4 text-xs font-semibold text-text-secondary hover:bg-card-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setRestartOpen(false); /* TODO: call restart API */ }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restart Quiz
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── End Quiz Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {endOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md"
              onClick={() => setEndOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-red-400 to-transparent" />
                <div className="px-6 pb-6 pt-7 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-xl">
                    <Square className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-extrabold text-text-primary">End this quiz?</h3>
                  <p className="mt-2 text-[13px] text-text-secondary leading-relaxed">
                    New participants will no longer be able to start the quiz. Participants who are already taking the quiz will follow the configured end behavior.
                  </p>
                  <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-3 py-2">
                    <p className="text-[11px] text-rose-500">
                      {LIVE_STUDENTS.length} student{LIVE_STUDENTS.length !== 1 ? "s" : ""} currently active
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2.5 border-t border-border bg-card-hover/40 px-6 py-4">
                  <button
                    onClick={() => setEndOpen(false)}
                    className="h-10 rounded-xl border border-border px-4 text-xs font-semibold text-text-secondary hover:bg-card-hover transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setEndOpen(false); /* TODO: call end API */ }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-5 text-xs font-bold text-white shadow-lg shadow-rose-500/25 hover:brightness-110 transition-all"
                  >
                    <Square className="h-3.5 w-3.5" />
                    End Quiz
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
