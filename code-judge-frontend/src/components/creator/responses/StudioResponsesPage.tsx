"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Mail, Square, Search, ChevronDown, X, Users,
  CheckCircle2, Clock, AlertTriangle, XCircle, Trophy, BarChart3,
  Eye, Pause, RotateCcw, ExternalLink, Crown, Medal,
  ChevronRight, Filter, ArrowUpDown, MoreVertical, FileDown,
  Timer, TrendingUp, TrendingDown, Minus, Circle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import Link from "next/link";
import {
  getQuizResponses,
  getStudentResponseDetail,
  getQuizAnalytics,
  getQuizByCode,
  type QuizResponseStudent,
  type StudentResponseDetail,
} from "@/services/quiz";

// ─── Types ───────────────────────────────────────────────────────────────────

type StudentStatus = "SUBMITTED" | "IN_PROGRESS" | "NOT_STARTED" | "TIMED_OUT";

interface Student {
  id: string;
  userId: number;
  attemptId: number | null;
  name: string;
  email: string | null;
  rollNo: string;
  status: StudentStatus;
  marks: number | null;
  total: number;
  percentage: number | null;
  timeTakenSec: number | null;
  timeTaken: string | null;
  submittedAt: string | null;
  avatar: string;
  rank: number | null;
  questionsAnswered: number | null;
  totalQuestions: number | null;
}

const STATUS_CONFIG: Record<StudentStatus, { label: string; color: string; bg: string; dot: string }> = {
  SUBMITTED:    { label: "Submitted",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
  IN_PROGRESS:  { label: "In Progress",  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",    dot: "bg-blue-400" },
  NOT_STARTED:  { label: "Not Started",  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",   dot: "bg-amber-400" },
  TIMED_OUT:    { label: "Timed Out",    color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",     dot: "bg-red-400" },
};

const PIE_COLORS: Record<string, string> = {
  Submitted: "#22C55E",
  "In Progress": "#3B82F6",
  "Not Started": "#EAB308",
  "Timed Out": "#EF4444",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayName(s: QuizResponseStudent): string {
  const full = [s.first_name, s.last_name].filter(Boolean).join(" ").trim();
  return full || s.username || s.email || `User #${s.user_id}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** seconds → "30m 15s" / "45s" / "1h 05m" */
function formatTaken(sec: number | null): string | null {
  if (sec === null) return null;
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(r).padStart(2, "0")}s`;
  return `${r}s`;
}

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const response = (err as { response?: unknown }).response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = (response as { data?: unknown }).data;
      if (typeof data === "object" && data !== null && "message" in data) {
        const message = (data as { message?: unknown }).message;
        if (typeof message === "string" && message) return message;
      }
    }
  }
  return fallback;
}

function mapStudent(row: QuizResponseStudent, totalMarks: number): Student {
  const name = displayName(row);
  const status: StudentStatus =
    row.attempt_status === "completed" ? "SUBMITTED"
    : row.attempt_status === "timed_out" ? "TIMED_OUT"
    : row.attempt_id != null || row.attempt_status ? "IN_PROGRESS"
    : "NOT_STARTED";
  const marks = toNumber(row.score);
  const percentage = toNumber(row.percentage);
  const timeTakenSec = toNumber(row.time_taken);
  const correct = toNumber(row.correct_answers) ?? 0;
  const wrong = toNumber(row.wrong_answers) ?? 0;
  const hasAttempt = row.attempt_id != null;
  return {
    id: String(row.user_id),
    userId: row.user_id,
    attemptId: row.attempt_id,
    name,
    email: row.email,
    rollNo: row.rollno || "—",
    status,
    marks,
    total: totalMarks,
    percentage,
    timeTakenSec,
    timeTaken: formatTaken(timeTakenSec),
    submittedAt: formatDateTime(row.completed_at),
    avatar: initials(name),
    rank: row.rank,
    questionsAnswered: hasAttempt ? correct + wrong : status === "NOT_STARTED" ? 0 : null,
    totalQuestions: toNumber(row.total_questions),
  };
}

/**
 * Backend returns one row per attempt, so a student with multiple attempts
 * appears multiple times. Keep a single row per student: prefer a submitted
 * attempt, then timed-out, then in-progress — breaking ties by higher marks.
 */
const STATUS_RANK: Record<StudentStatus, number> = {
  SUBMITTED: 0,
  TIMED_OUT: 1,
  IN_PROGRESS: 2,
  NOT_STARTED: 3,
};

function pickBestAttempt(group: Student[]): Student {
  return [...group].sort((a, b) => {
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
    return (b.marks ?? -1) - (a.marks ?? -1);
  })[0];
}

function dedupeStudents(rows: Student[]): Student[] {
  const byUser = new Map<string, Student[]>();
  rows.forEach((s) => {
    const list = byUser.get(s.id);
    if (list) list.push(s);
    else byUser.set(s.id, [s]);
  });
  return [...byUser.values()].map(pickBestAttempt);
}

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
  const [students, setStudents] = useState<Student[]>([]);
  const [quizName, setQuizName] = useState("Responses");
  const [totalMarks, setTotalMarks] = useState(0);
  const [summary, setSummary] = useState({ total: 0, submitted: 0, notSubmitted: 0, avg: 0, highest: 0, lowest: null as number | null });
  const [timeStats, setTimeStats] = useState<{ avg: number | null; fastest: number | null; slowest: number | null }>({ avg: null, fastest: null, slowest: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StudentStatus | "ALL">("ALL");
  const [detailPanel, setDetailPanel] = useState<Student | null>(null);
  const [detailReview, setDetailReview] = useState<StudentResponseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Route param is usually the numeric id, but may be the quiz code
      // (e.g. /creator/quizzes/<code>/responses) — resolve it first.
      let numericId = quizId;
      if (!/^\d+$/.test(quizId)) {
        const byCode = await getQuizByCode(quizId);
        numericId = String(byCode.id);
      }
      const [resp, analytics] = await Promise.all([
        getQuizResponses(numericId),
        getQuizAnalytics(numericId).catch(() => null),
      ]);

      const marks = resp.quiz?.total_marks ?? 0;
      setQuizName(resp.quiz?.name || "Responses");
      setTotalMarks(marks);
      const unique = dedupeStudents((resp.students || []).map((r) => mapStudent(r, marks)));
      setStudents(unique);
      const scored = unique.filter((s) => s.marks !== null);
      setSummary({
        total: unique.length,
        submitted: unique.filter((s) => s.status === "SUBMITTED").length,
        notSubmitted: unique.filter((s) => s.status !== "SUBMITTED").length,
        avg: scored.length ? scored.reduce((a, b) => a + (b.marks ?? 0), 0) / scored.length : 0,
        highest: scored.length ? Math.max(...scored.map((s) => s.marks ?? 0)) : 0,
        lowest: scored.length ? Math.min(...scored.map((s) => s.marks ?? 0)) : null,
      });

      const st = analytics?.stats;
      const fromAnalytics = {
        avg: st ? toNumber(st.average_completion_time) : null,
        fastest: st ? toNumber(st.fastest_time) : null,
        slowest: st ? toNumber(st.slowest_time) : null,
      };
      if (fromAnalytics.avg !== null || fromAnalytics.fastest !== null || fromAnalytics.slowest !== null) {
        setTimeStats(fromAnalytics);
      } else {
        // Fallback: derive from student time_taken values
        const secs = (resp.students || [])
          .map((r) => toNumber(r.time_taken))
          .filter((n): n is number => n !== null);
        setTimeStats({
          avg: secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : null,
          fastest: secs.length ? Math.min(...secs) : null,
          slowest: secs.length ? Math.max(...secs) : null,
        });
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load responses"));
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = useCallback(async (s: Student) => {
    setDetailPanel(s);
    setDetailReview(null);
    if (s.attemptId === null) return;
    setDetailLoading(true);
    try {
      const numericId = /^\d+$/.test(quizId) ? quizId : String((await getQuizByCode(quizId)).id);
      const detail = await getStudentResponseDetail(numericId, s.userId);
      setDetailReview(detail);
    } catch {
      setDetailReview(null);
    } finally {
      setDetailLoading(false);
    }
  }, [quizId]);

  const filtered = useMemo(() => {
    let list = students;
    if (filter !== "ALL") list = list.filter(s => s.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, filter, search]);

  const liveStudents = useMemo(() => students.filter(s => s.status === "IN_PROGRESS"), [students]);
  const inProgressCount = useMemo(() => students.filter(s => s.status === "IN_PROGRESS").length, [students]);
  const timedOutCount = useMemo(() => students.filter(s => s.status === "TIMED_OUT").length, [students]);
  const notStartedCount = useMemo(() => Math.max(0, summary.total - summary.submitted - inProgressCount - timedOutCount), [summary, inProgressCount, timedOutCount]);

  const submissionData = useMemo(() => ([
    { name: "Submitted", value: summary.submitted, color: PIE_COLORS.Submitted },
    { name: "In Progress", value: inProgressCount, color: PIE_COLORS["In Progress"] },
    { name: "Not Started", value: notStartedCount, color: PIE_COLORS["Not Started"] },
    { name: "Timed Out", value: timedOutCount, color: PIE_COLORS["Timed Out"] },
  ]), [summary, inProgressCount, notStartedCount, timedOutCount]);

  const scoreData = useMemo(() => {
    const BUCKETS = 5;
    const max = totalMarks > 0 ? totalMarks : 100;
    const size = max / BUCKETS;
    const counts = new Array(BUCKETS).fill(0);
    students.forEach(s => {
      if (s.marks === null) return;
      const idx = Math.min(BUCKETS - 1, Math.floor(s.marks / size));
      counts[idx] += 1;
    });
    return counts.map((count, i) => {
      const lo = Math.round(i * size);
      const hi = Math.round((i + 1) * size);
      return { range: i === BUCKETS - 1 ? `${lo}-${max}` : `${lo}-${hi}`, count };
    });
  }, [students, totalMarks]);

  const timeCards = useMemo(() => ([
    { label: "Average", value: timeStats.avg !== null ? formatTaken(timeStats.avg) ?? "—" : "—", icon: Timer, accent: "bg-violet-500 text-white", sub: "Typical completion" },
    { label: "Fastest", value: timeStats.fastest !== null ? formatTaken(timeStats.fastest) ?? "—" : "—", icon: TrendingUp, accent: "bg-emerald-500 text-white", sub: "Best performer" },
    { label: "Slowest", value: timeStats.slowest !== null ? formatTaken(timeStats.slowest) ?? "—" : "—", icon: TrendingDown, accent: "bg-rose-500 text-white", sub: "Needs attention" },
  ]), [timeStats]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/creator/quizzes" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card hover:bg-card-hover transition-colors">
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-text-primary">Responses</h1>
                {liveStudents.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] text-text-muted">{quizName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={load} title="Refresh" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold text-text-secondary hover:bg-card-hover transition-colors sm:px-3">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span className="hidden lg:inline">Refresh</span>
            </button>
            <button title="Download Results" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold text-text-secondary hover:bg-card-hover transition-colors sm:px-3">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Download Results</span>
            </button>
            <button title="Send on Email" className="hidden items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold text-text-secondary hover:bg-card-hover transition-colors sm:inline-flex sm:px-3">
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Send on Email</span>
            </button>
            <button onClick={() => setEndOpen(true)} title="End Quiz" className="inline-flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors sm:px-3">
              <Square className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">End Quiz</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 space-y-6 sm:px-6">

        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
            <p className="text-xs font-medium text-red-400">{error}</p>
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/10 transition-colors">
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3">
                <div className="h-3 w-16 animate-pulse rounded bg-card-hover" />
                <div className="mt-2 h-6 w-12 animate-pulse rounded bg-card-hover" />
              </div>
            ))
          ) : (
            ([
              { icon: Users, label: "Total Students", value: summary.total, sub: "registered", accent: "text-pink-400" },
              { icon: CheckCircle2, label: "Submitted", value: summary.submitted, sub: "completed", accent: "text-emerald-400" },
              { icon: Clock, label: "In Progress", value: inProgressCount, sub: "currently taking", accent: "text-blue-400" },
              { icon: AlertTriangle, label: "Not Started", value: notStartedCount, sub: "waiting", accent: "text-amber-400" },
              { icon: XCircle, label: "Timed Out", value: timedOutCount, sub: "expired", accent: "text-red-400" },
              { icon: BarChart3, label: "Avg Score", value: summary.avg.toFixed(1), sub: `/ ${totalMarks}`, accent: "text-purple-400" },
              { icon: TrendingUp, label: "Highest", value: summary.highest, sub: "score", accent: "text-emerald-400" },
              { icon: TrendingDown, label: "Lowest", value: summary.lowest ?? "—", sub: "score", accent: "text-rose-400" },
            ]).map((kpi) => (
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
            ))
          )}
        </div>

        {/* ── Live Control Bar ──────────────────────────────────────── */}
        {liveStudents.length > 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Now</span>
                <span className="text-[11px] text-text-muted">{liveStudents.length} student{liveStudents.length !== 1 ? "s" : ""} currently taking this quiz</span>
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
              {liveStudents.map(s => (
                <div key={s.id} onClick={() => openDetail(s)} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 min-w-[200px] cursor-pointer hover:border-blue-500/30 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-400">{s.avatar}</div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{s.name}</p>
                    <p className="text-[10px] text-text-muted">{s.timeTaken ? `Elapsed ${s.timeTaken}` : "Just started"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filter Bar ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:max-w-xs sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by roll number, name or email..."
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-text-primary placeholder-text-muted outline-none focus:border-pink-500/40 focus:ring-1 focus:ring-pink-500/10"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["ALL", "SUBMITTED", "IN_PROGRESS", "NOT_STARTED", "TIMED_OUT"] as const).map(f => {
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
          {/* Score Distribution */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-text-primary">Score Distribution</h3>
                <p className="mt-1 text-xs text-text-muted">{summary.submitted} submissions across all ranges</p>
              </div>
              <span className="shrink-0 rounded-full bg-pink-500/10 px-2.5 py-1 text-[11px] font-bold text-pink-500">Detailed stats →</span>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scoreData} barSize={48} barCategoryGap="18%">
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis hide domain={[0, "auto"]} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, fontSize: 11 }}
                    cursor={{ fill: "rgba(236,72,153,0.06)" }}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]} label={{ position: "top", fill: "#9CA3AF", fontSize: 11, fontWeight: 800, dy: -8 }}>
                    {scoreData.map((_, i) => (
                      <Cell key={i} fill="#EC4899" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Submission Status */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Submission Status</h3>
            <p className="mt-1 text-xs text-text-muted">Breakdown of {summary.total} students</p>
            <div className="mt-5 flex flex-1 items-center gap-7">
              <div className="relative h-[148px] w-[148px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={submissionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {submissionData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.08)" strokeWidth={1.5} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[24px] font-extrabold leading-none tracking-tight text-text-primary">{summary.total}</span>
                  <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Total</span>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                {submissionData.map(d => (
                  <div key={d.name} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-1 ring-white/10" style={{ background: d.color }} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none text-text-secondary">{d.name}</span>
                    <span className="text-[13px] font-extrabold leading-none text-text-primary tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Time Taken */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Time Taken</h3>
            <p className="mt-1 text-xs text-text-muted">Duration insights</p>
            <div className="mt-5 flex flex-1 flex-col gap-3">
              {timeCards.map(t => (
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
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Rank", "Roll No.", "Student", "Status", "Marks", "Total", "%", "Time Taken", "Submitted At", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={10} className="px-4 py-3">
                        <div className="h-5 animate-pulse rounded bg-card-hover" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center">
                      <p className="text-sm font-semibold text-text-secondary">
                        {students.length === 0 ? "No responses yet — students haven't been registered or attempted this quiz." : "No students match your search/filter."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, i) => (
                    <tr
                      key={s.id}
                      onClick={() => openDetail(s)}
                      className="border-b border-border/50 hover:bg-card-hover/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3"><RankBadge rank={s.rank ?? i + 1} /></td>
                      <td className="px-4 py-3 text-xs font-mono text-text-secondary">{s.rollNo}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500/10 text-[10px] font-bold text-pink-400">{s.avatar}</div>
                          <div>
                            <span className="block text-xs font-semibold text-text-primary">{s.name}</span>
                            {s.email && <span className="block text-[10px] text-text-muted">{s.email}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-xs font-bold text-text-primary">{s.marks !== null ? s.marks : "—"}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{s.total}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-text-primary">{s.percentage !== null ? `${Math.round(s.percentage)}%` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{s.timeTaken ?? "—"}</td>
                      <td className="px-4 py-3 text-[11px] text-text-muted">{s.submittedAt ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={(e) => { e.stopPropagation(); openDetail(s); }} className="rounded p-1 hover:bg-card-hover transition-colors">
                          <MoreVertical className="h-3.5 w-3.5 text-text-muted" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
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
                    <p className="text-xs text-text-muted">{detailPanel.rollNo}{detailPanel.email ? ` · ${detailPanel.email}` : ""}</p>
                    {detailPanel.email && <p className="text-xs text-text-muted">{detailPanel.email}</p>}
                    <div className="mt-1"><StatusBadge status={detailPanel.status} /></div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Score", value: detailPanel.marks !== null ? `${detailPanel.marks} / ${detailPanel.total}` : "—" },
                    { label: "Percentage", value: detailPanel.percentage !== null ? `${Math.round(detailPanel.percentage)}%` : "—" },
                    { label: "Rank", value: detailReview?.attempt.rank ?? detailPanel.rank ?? "—" },
                    { label: "Time Taken", value: detailPanel.timeTaken ?? "—" },
                    { label: "Submitted At", value: detailPanel.submittedAt ?? "—" },
                    { label: "Questions", value: detailReview?.attempt
                      ? `${(detailReview.attempt.correct_answers ?? 0) + (detailReview.attempt.wrong_answers ?? 0)} / ${detailReview.attempt.total_questions ?? "—"}`
                      : detailPanel.questionsAnswered !== null && detailPanel.totalQuestions !== null
                        ? `${detailPanel.questionsAnswered} / ${detailPanel.totalQuestions}`
                        : "—" },
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
                  {detailLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-lg bg-card-hover" />
                      ))}
                    </div>
                  ) : detailPanel.attemptId === null ? (
                    <p className="rounded-lg border border-border bg-background px-3 py-3 text-xs text-text-muted">
                      {detailPanel.status === "NOT_STARTED" ? "This student hasn't started the quiz yet." : "Attempt details not available."}
                    </p>
                  ) : !detailReview ? (
                    <p className="rounded-lg border border-border bg-background px-3 py-3 text-xs text-text-muted">
                      Could not load question-wise details.
                    </p>
                  ) : detailReview.review.length === 0 ? (
                    <p className="rounded-lg border border-border bg-background px-3 py-3 text-xs text-text-muted">
                      No questions found for this attempt.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detailReview.review.map((q) => (
                        <div key={q.problem_id} className="rounded-lg border border-border bg-background px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold border",
                              q.status === "correct" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                              q.status === "wrong" && "bg-red-500/10 text-red-400 border-red-500/20",
                              q.status === "unanswered" && "bg-card-hover text-text-muted border-border",
                            )}>
                              {q.status === "correct" ? "✓" : q.status === "wrong" ? "✕" : "—"}
                            </span>
                            <p className="text-xs font-bold text-text-primary">Q{q.question_number}</p>
                            <span className={cn(
                              "ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                              q.status === "correct" && "bg-emerald-500/10 text-emerald-400",
                              q.status === "wrong" && "bg-red-500/10 text-red-400",
                              q.status === "unanswered" && "bg-card-hover text-text-muted",
                            )}>
                              {q.status === "unanswered" ? "Skipped" : q.status}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-[11px] text-text-secondary">{q.problem_statement}</p>
                          {(q.selected_statement || q.correct_answer) && (
                            <div className="mt-1.5 space-y-1 text-[11px]">
                              {q.selected_statement && (
                                <p className="text-text-muted">Your answer: <span className="font-semibold text-text-secondary">{q.selected_statement}</span></p>
                              )}
                              {q.status !== "correct" && q.correct_answer && (
                                <p className="text-text-muted">Correct: <span className="font-semibold text-emerald-400">{q.correct_answer}</span></p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
                      {liveStudents.length} student{liveStudents.length !== 1 ? "s" : ""} currently taking this quiz
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
                      {liveStudents.length} student{liveStudents.length !== 1 ? "s" : ""} currently active
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
