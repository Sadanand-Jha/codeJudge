"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Mail, Square, Search, X, RefreshCw,
  MoreVertical, Pause, RotateCcw, Timer, TrendingUp, TrendingDown, Trash2,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { QuestionHtml, renderQuestionHtml } from "@/components/creator/questions/QuestionHtml";
import {
  getQuizResponses,
  getStudentResponseDetail,
  getQuizAnalytics,
  getQuizByCode,
  deleteQuizResponseAttempt,
  sendQuizResponsesEmail,
  type QuizResponseStudent,
  type StudentResponseDetail,
} from "@/services/quiz";

// ─── Types ───────────────────────────────────────────────────────────────────

type StudentStatus = "SUBMITTED" | "IN_PROGRESS" | "NOT_STARTED" | "TIMED_OUT";
const LIVE_ACTIVITY_WINDOW_MS = 75_000;

interface Student {
  id: string;
  userId: number;
  attemptId: number | null;
  attemptNumber: number | null;
  name: string;
  rollNo: string;
  status: StudentStatus;
  correct: number | null;
  percentage: number | null;
  timeTakenSec: number | null;
  timeTaken: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  avatar: string;
  avatarUrl: string | null;
  rank: number | null;
  questionsAnswered: number | null;
  totalQuestions: number | null;
  decoyHits: number | null;
  decoyQuestions: number | null;
  decoyFlagged: boolean;
}

const STATUS_CONFIG: Record<StudentStatus, { label: string; text: string }> = {
  SUBMITTED:    { label: "Submitted",      text: "text-[var(--qs-ok)]" },
  IN_PROGRESS:  { label: "In Progress",    text: "text-[#2457d6]" },
  NOT_STARTED:  { label: "Not Started",    text: "text-[#a85d00]" },
  TIMED_OUT:    { label: "Auto Submitted", text: "text-[var(--qs-bad)]" },
};

const STATUS_COLORS: Record<StudentStatus, string> = {
  SUBMITTED:   "var(--qs-ok)",
  IN_PROGRESS: "#2457d6",
  NOT_STARTED: "#a85d00",
  TIMED_OUT:   "var(--qs-bad)",
};

const FILTERS = ["ALL", "SUBMITTED", "IN_PROGRESS", "NOT_STARTED", "TIMED_OUT"] as const;

const SORT_LABELS = ["Correct (high to low)", "Fastest first", "Latest first"] as const;

const PAGE_SIZE = 8;

function pageNumbers(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const visible = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...visible].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) out.push("…");
    out.push(page);
    previous = page;
  }
  return out;
}

const DONUT_R = 54;
const DONUT_C = 2 * Math.PI * DONUT_R;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayName(s: QuizResponseStudent): string {
  const full = [s.first_name, s.last_name].filter(Boolean).join(" ").trim();
  return full || s.username || `User #${s.user_id}`;
}

function nameWithAttempt(name: string, attemptNumber: number | null): string {
  return attemptNumber && attemptNumber > 1 ? `${name}#${attemptNumber}` : name;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function nameHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
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

function InlineQuestionHtml({ html, className }: { html: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline [&_p]:m-0 [&_p]:inline [&_ul]:m-0 [&_ul]:inline [&_ol]:m-0 [&_ol]:inline [&_li]:inline",
        "[&_code]:rounded [&_code]:bg-[var(--qs-bg)] [&_code]:px-1 [&_code]:font-mono [&_code]:text-[10px]",
        "[&_strong]:font-extrabold [&_em]:italic",
        className
      )}
      dangerouslySetInnerHTML={{ __html: renderQuestionHtml(html) }}
    />
  );
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

function isLiveAttempt(student: Student, now: number): boolean {
  if (student.status !== "IN_PROGRESS" || !student.lastActivityAt) return false;
  const lastActivity = new Date(student.lastActivityAt).getTime();
  return Number.isFinite(lastActivity) && now - lastActivity >= 0 && now - lastActivity <= LIVE_ACTIVITY_WINDOW_MS;
}

function mapStudent(row: QuizResponseStudent): Student {
  const name = displayName(row);
  const status: StudentStatus =
    row.attempt_status === "completed" ? "SUBMITTED"
    : row.attempt_status === "timed_out" ? "TIMED_OUT"
    : row.attempt_id != null || row.attempt_status ? "IN_PROGRESS"
    : "NOT_STARTED";
  const percentage = toNumber(row.percentage);
  const timeTakenSec = toNumber(row.time_taken);
  const correct = toNumber(row.correct_answers);
  const wrong = toNumber(row.wrong_answers) ?? 0;
  const hasAttempt = row.attempt_id != null;
  return {
    id: row.attempt_id === null ? `${row.user_id}-registered` : `${row.user_id}-attempt-${row.attempt_id}`,
    userId: row.user_id,
    attemptId: row.attempt_id,
    attemptNumber: toNumber(row.attempt_number),
    name,
    rollNo: row.rollno || "—",
    status,
    correct,
    percentage,
    timeTakenSec,
    timeTaken: formatTaken(timeTakenSec),
    submittedAt: formatDateTime(row.completed_at),
    completedAt: row.completed_at,
    lastActivityAt: row.last_activity,
    avatar: initials(name),
    avatarUrl: row.avatar_url,
    rank: row.rank,
    questionsAnswered: hasAttempt ? (correct ?? 0) + wrong : status === "NOT_STARTED" ? 0 : null,
    totalQuestions: toNumber(row.total_questions),
    decoyHits: hasAttempt ? toNumber(row.decoy_hits) ?? 0 : null,
    decoyQuestions: hasAttempt ? toNumber(row.decoy_questions) ?? 0 : null,
    decoyFlagged: hasAttempt && row.decoy_flagged === true,
  };
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-block rounded-full border-2 border-current px-[11px] py-px text-xs font-extrabold uppercase tracking-[0.05em]", cfg.text)}>
      {cfg.label}
    </span>
  );
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="grid h-[30px] w-[30px] place-items-center text-xs font-bold text-[var(--qs-muted)]">—</span>;
  const podium =
    rank === 1 ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]"
    : rank === 2 ? "border-[var(--qs-ink)] bg-[#D8DCE6] text-[#1A1240]"
    : rank === 3 ? "border-[var(--qs-ink)] bg-[#E8B27E] text-[#1A1240]"
    : "border-[var(--qs-line)] text-[var(--qs-ink)]";
  return (
    <span className={cn("grid h-[30px] w-[30px] place-items-center rounded-full border-2 text-sm font-extrabold", podium)}>
      {rank}
    </span>
  );
}

function StudentAvatar({ student, size = "sm" }: { student: Student; size?: "sm" | "lg" }) {
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[var(--qs-ink)] font-extrabold text-white",
        size === "lg" ? "h-14 w-14 text-lg" : "h-[38px] w-[38px] text-[13px]"
      )}
      style={student.avatarUrl ? undefined : { background: `hsl(${nameHue(student.name)} 55% 42%)` }}
    >
      {student.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar URLs are user-configured and may be remote
        <img src={student.avatarUrl} alt={`${student.name} avatar`} className="h-full w-full object-cover" />
      ) : (
        student.avatar
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StudioResponsesPage({ quizId }: { quizId: string }) {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [quizName, setQuizName] = useState("Responses");
  const [quizStatus, setQuizStatus] = useState<string | null>(null);
  const quizEnded = quizStatus === "ended" || quizStatus === "completed";
  const [resolvedQuizId, setResolvedQuizId] = useState(quizId);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeStats, setTimeStats] = useState<{ avg: number | null; fastest: number | null; slowest: number | null }>({ avg: null, fastest: null, slowest: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StudentStatus | "ALL">("ALL");
  const [sortMode, setSortMode] = useState(0);
  const [page, setPage] = useState(1);
  const [detailPanel, setDetailPanel] = useState<Student | null>(null);
  const [detailReview, setDetailReview] = useState<StudentResponseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [liveMenuOpen, setLiveMenuOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState<{ student: Student; top: number; right: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [presenceNow, setPresenceNow] = useState(() => Date.now());
  const firstResponsesLoadRef = useRef(true);

  const load = useCallback(async () => {
    if (firstResponsesLoadRef.current) setLoading(true);
    setError(null);
    try {
      let numericId = quizId;
      if (!/^\d+$/.test(quizId)) {
        const byCode = await getQuizByCode(quizId);
        numericId = String(byCode.id);
      }
      const [resp, analytics] = await Promise.all([
        getQuizResponses(numericId),
        getQuizAnalytics(numericId).catch(() => null),
      ]);

      setQuizName(resp.quiz?.name || "Responses");
      setQuizStatus(resp.quiz?.status ?? null);
      setResolvedQuizId(numericId);
      const attempts = (resp.students || []).map(mapStudent);
      const questions = attempts.find((s) => s.totalQuestions != null)?.totalQuestions ?? 0;
      setTotalQuestions(questions);
      if (attempts.some((s) => s.rank === null && s.correct !== null)) {
        const ranked = attempts
          .filter((s) => s.correct !== null)
          .sort((a, b) =>
            (b.correct ?? 0) - (a.correct ?? 0) ||
            (a.timeTakenSec ?? Infinity) - (b.timeTakenSec ?? Infinity)
          );
        ranked.forEach((s, i) => {
          if (s.rank === null) s.rank = i + 1;
        });
      }
      setStudents(attempts);

      const st = analytics?.stats;
      const fromAnalytics = {
        avg: st ? toNumber(st.average_completion_time) : null,
        fastest: st ? toNumber(st.fastest_time) : null,
        slowest: st ? toNumber(st.slowest_time) : null,
      };
      if (fromAnalytics.avg !== null || fromAnalytics.fastest !== null || fromAnalytics.slowest !== null) {
        setTimeStats(fromAnalytics);
      } else {
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
      if (firstResponsesLoadRef.current) {
        firstResponsesLoadRef.current = false;
        setLoading(false);
      }
    }
  }, [quizId]);

  useEffect(() => {
    let disposed = false;
    const tick = () => {
      if (!disposed) void load();
    };
    void Promise.resolve().then(tick);
    const interval = window.setInterval(tick, 30_000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => setPresenceNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!actionMenu) return;
    const close = () => setActionMenu(null);
    document.addEventListener("click", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [actionMenu]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
      toast.success({ title: "Refreshed", description: "Latest responses loaded." });
    } finally {
      setRefreshing(false);
    }
  }, [load, toast]);

  const openDetail = useCallback((s: Student) => {
    setDetailPanel(s);
    setDetailReview(null);
    // In-progress attempts must not expose a question-wise review.
    setDetailLoading(s.attemptId !== null && s.status !== "IN_PROGRESS");
  }, []);

  useEffect(() => {
    if (!detailPanel) return;
    if (detailPanel.attemptId === null || detailPanel.status === "IN_PROGRESS") {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const numericId = /^\d+$/.test(quizId) ? quizId : String((await getQuizByCode(quizId)).id);
        const detail = await getStudentResponseDetail(numericId, detailPanel.userId, detailPanel.attemptId ?? undefined);
        if (!cancelled) setDetailReview(detail);
      } catch {
        if (!cancelled) setDetailReview(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailPanel, quizId]);

  const openActionMenu = useCallback((e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActionMenu({ student, top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, []);

  const summaryStudents = useMemo(() => {
    const byUser = new Map<number, Student[]>();
    students.forEach((student) => {
      const rows = byUser.get(student.userId);
      if (rows) rows.push(student);
      else byUser.set(student.userId, [student]);
    });

    return [...byUser.values()].map((rows) => {
      const completed = rows.filter((row) => row.status === "SUBMITTED");
      const timedOut = rows.filter((row) => row.status === "TIMED_OUT");
      const inProgress = rows.filter((row) => row.status === "IN_PROGRESS");
      const status: StudentStatus = completed.length
        ? "SUBMITTED"
        : timedOut.length
          ? "TIMED_OUT"
          : inProgress.length
            ? "IN_PROGRESS"
            : "NOT_STARTED";
      const scoredRows = rows.filter((row) => row.correct !== null);
      const completedRows = scoredRows.filter((row) => row.status === "SUBMITTED");
      const bestAttempt = (completedRows.length ? completedRows : scoredRows)
        .sort((a, b) =>
          (b.correct ?? 0) - (a.correct ?? 0) ||
          (a.timeTakenSec ?? Infinity) - (b.timeTakenSec ?? Infinity)
        )[0];
      return { ...(bestAttempt ?? rows[0]), status };
    });
  }, [students]);

  const summary = useMemo(() => {
    const scored = summaryStudents.filter((student) => student.correct !== null);
    return {
      total: summaryStudents.length,
      submitted: summaryStudents.filter((student) => student.status === "SUBMITTED").length,
      notSubmitted: summaryStudents.filter((student) => student.status !== "SUBMITTED").length,
      avg: scored.length ? scored.reduce((a, b) => a + (b.correct ?? 0), 0) / scored.length : 0,
      highest: scored.length ? Math.max(...scored.map((s) => s.correct ?? 0)) : 0,
      lowest: scored.length ? Math.min(...scored.map((s) => s.correct ?? 0)) : null,
    };
  }, [summaryStudents]);

  const statusCounts = useMemo(() => {
    const counts: Record<StudentStatus | "ALL", number> = {
      ALL: students.length, SUBMITTED: 0, IN_PROGRESS: 0, NOT_STARTED: 0, TIMED_OUT: 0,
    };
    students.forEach((s) => { counts[s.status] += 1; });
    return counts;
  }, [students]);

  const filtered = useMemo(() => {
    let list = students;
    if (filter !== "ALL") list = list.filter((s) => s.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q));
    }
    const sorted = [...list];
    const time = (s: Student) => (s.completedAt ? Date.parse(s.completedAt) : s.lastActivityAt ? Date.parse(s.lastActivityAt) : 0) || 0;
    if (sortMode === 0) {
      sorted.sort((a, b) => (b.correct ?? -Infinity) - (a.correct ?? -Infinity) || (a.timeTakenSec ?? Infinity) - (b.timeTakenSec ?? Infinity));
    } else if (sortMode === 1) {
      sorted.sort((a, b) => (a.timeTakenSec ?? Infinity) - (b.timeTakenSec ?? Infinity));
    } else {
      sorted.sort((a, b) => time(b) - time(a));
    }
    return sorted;
  }, [students, filter, search, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const pageItems = pageNumbers(currentPage, totalPages);

  const liveStudents = useMemo(() => students.filter((student) => isLiveAttempt(student, presenceNow)), [students, presenceNow]);
  const inProgressCount = useMemo(() => summaryStudents.filter((s) => s.status === "IN_PROGRESS").length, [summaryStudents]);
  const timedOutCount = useMemo(() => summaryStudents.filter((s) => s.status === "TIMED_OUT").length, [summaryStudents]);
  const notStartedCount = useMemo(() => summaryStudents.filter((student) => student.status === "NOT_STARTED").length, [summaryStudents]);

  const submissionData = useMemo(() => ([
    { name: "Submitted", value: summary.submitted, color: STATUS_COLORS.SUBMITTED },
    { name: "In Progress", value: inProgressCount, color: STATUS_COLORS.IN_PROGRESS },
    { name: "Not Started", value: notStartedCount, color: STATUS_COLORS.NOT_STARTED },
    { name: "Auto Submitted", value: timedOutCount, color: STATUS_COLORS.TIMED_OUT },
  ]), [summary, inProgressCount, notStartedCount, timedOutCount]);

  const donutSegments = useMemo(() => {
    const total = Math.max(summary.total, 1);
    let off = 0;
    return submissionData
      .filter((d) => d.value > 0)
      .map((d) => {
        const len = (d.value / total) * DONUT_C;
        const dash = Math.max(len - 3, 2);
        const seg = { name: d.name, color: d.color, dash: `${dash} ${DONUT_C - dash}`, offset: -off };
        off += len;
        return seg;
      });
  }, [submissionData, summary.total]);

  const scoreData = useMemo(() => {
    const BUCKETS = 5;
    const max = totalQuestions > 0 ? totalQuestions : 100;
    const size = max / BUCKETS;
    const counts = new Array(BUCKETS).fill(0);
    summaryStudents.forEach((s) => {
      if (s.correct === null) return;
      const idx = Math.min(BUCKETS - 1, Math.floor(s.correct / size));
      counts[idx] += 1;
    });
    return counts.map((count, i) => {
      const lo = Math.round(i * size);
      const hi = Math.round((i + 1) * size);
      return { range: i === BUCKETS - 1 ? `${lo}-${max}` : `${lo}-${hi}`, count };
    });
  }, [summaryStudents, totalQuestions]);

  const maxBucket = useMemo(() => Math.max(...scoreData.map((s) => s.count), 1), [scoreData]);

  const timeCards = useMemo(() => ([
    { label: "Average", value: timeStats.avg !== null ? formatTaken(timeStats.avg) ?? "—" : "—", icon: Timer, accent: "bg-[var(--qs-brand)]", sub: "Typical completion" },
    { label: "Fastest", value: timeStats.fastest !== null ? formatTaken(timeStats.fastest) ?? "—" : "—", icon: TrendingUp, accent: "bg-[var(--qs-ok)]", sub: "Best performer" },
    { label: "Slowest", value: timeStats.slowest !== null ? formatTaken(timeStats.slowest) ?? "—" : "—", icon: TrendingDown, accent: "bg-[var(--qs-bad)]", sub: "Needs attention" },
  ]), [timeStats]);

  const handleDeleteAttempt = useCallback(async () => {
    if (!deleteTarget?.attemptId || deleting) return;
    setDeleting(true);
    try {
      await deleteQuizResponseAttempt(resolvedQuizId, deleteTarget.attemptId);
      if (detailPanel?.attemptId === deleteTarget.attemptId) setDetailPanel(null);
      setDeleteTarget(null);
      toast.success({ title: "Attempt deleted", description: `The attempt for ${deleteTarget.name} has been removed from this report.` });
      await load();
    } catch {
      toast.error({ title: "Could not delete attempt", description: "Please try again in a moment." });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, resolvedQuizId, detailPanel, toast, load]);

  const handleSendEmail = useCallback(async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    try {
      const result = await sendQuizResponsesEmail(resolvedQuizId);
      toast.success({
        title: "Report sent",
        description: result?.to ? `The Excel report was emailed to ${result.to}.` : "The Excel report has been emailed to you.",
      });
    } catch (error) {
      toast.error({
        title: "Could not send email",
        description: apiErrorMessage(error, "Please check your email settings and try again."),
      });
    } finally {
      setSendingEmail(false);
    }
  }, [sendingEmail, resolvedQuizId, toast]);

  const kpis = [
    { label: "Total students", value: summary.total, sub: "registered", color: "var(--qs-brand)" },
    { label: "Submitted", value: summary.submitted, sub: "completed", color: "var(--qs-ok)" },
    { label: "In progress", value: inProgressCount, sub: "currently taking", color: "#2457d6" },
    { label: "Not started", value: notStartedCount, sub: "waiting", color: "#a85d00" },
    { label: "Auto submitted", value: timedOutCount, sub: "time expired", color: "var(--qs-bad)" },
    { label: "Avg correct", value: summary.avg.toFixed(1), sub: `/ ${totalQuestions}`, color: "#1A1240", hi: true },
    { label: "Highest", value: summary.highest, sub: "correct", color: "var(--qs-ok)" },
    { label: "Lowest", value: summary.lowest ?? "—", sub: "correct", color: "var(--qs-bad)" },
  ];

  const topBtn = "inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-[9px] text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";

  return (
    <div className="min-h-full bg-[var(--qs-bg)]">
      <div className="mx-auto max-w-[1280px] px-4 py-6 pb-20 sm:px-6">

        {/* ── Top ───────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <Link
              href="/creator/quizzes"
              aria-label="Back"
              className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] transition-colors hover:border-[var(--qs-brand)]"
            >
              <ArrowLeft className="h-4.5 w-4.5 text-[var(--qs-ink)]" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[34px]">Responses</h1>
                {liveStudents.length > 0 && !quizEnded && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ok)]/40 bg-[var(--qs-ok)]/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ok)]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--qs-ok)]" />
                    Live
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[var(--qs-muted)]">{quizName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void handleRefresh()} className={topBtn}>
              <RefreshCw className={cn("h-4 w-4", (refreshing || loading) && "animate-spin")} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleSendEmail()}
              disabled={sendingEmail}
              className={cn(topBtn, "disabled:cursor-not-allowed disabled:opacity-60")}
            >
              <Mail className={cn("h-4 w-4", sendingEmail && "animate-pulse")} />
              {sendingEmail ? "Sending…" : "Send on Email"}
            </button>
            {!quizEnded && (
              <button
                type="button"
                onClick={() => setEndOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-surface)] px-3.5 py-[9px] text-sm font-bold text-[var(--qs-bad)] transition-colors hover:bg-[var(--qs-bad)] hover:text-white"
              >
                <Square className="h-4 w-4" />
                End Quiz
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-[16px] border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-bad)]/[0.04] px-4 py-3">
            <p className="text-xs font-bold text-[var(--qs-bad)]">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-bad)]/40 px-3 py-1.5 text-[11px] font-extrabold text-[var(--qs-bad)] transition-colors hover:bg-[var(--qs-bad)] hover:text-white"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {/* ── Stat tiles ────────────────────────────────────────────── */}
        <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
                <div className="app-skeleton h-3 w-20 rounded" />
                <div className="app-skeleton mt-3 h-7 w-14 rounded" />
              </div>
            ))
          ) : (
            kpis.map((kpi) => (
              <div
                key={kpi.label}
                className={cn(
                  "rounded-[18px] border-2 p-4 sm:px-[18px]",
                  kpi.hi ? "border-[var(--qs-ink)] bg-[var(--qs-sun)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
                )}
              >
                <small className={cn(
                  "flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em]",
                  kpi.hi ? "text-[#1A1240]" : "text-[var(--qs-muted)]"
                )}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: kpi.color }} />
                  {kpi.label}
                </small>
                <b className={cn("mt-2 block text-[32px] font-extrabold leading-[1.1] sm:text-[36px]", kpi.hi ? "text-[#1A1240]" : "text-[var(--qs-ink)]")}>
                  {kpi.value}
                  <span className={cn("ml-1 text-sm font-medium", kpi.hi ? "text-[#1A1240]" : "text-[var(--qs-muted)]")}>{kpi.sub}</span>
                </b>
              </div>
            ))
          )}
        </div>

        {/* ── Live Now ──────────────────────────────────────────────── */}
        {liveStudents.length > 0 && !quizEnded && (
          <div className="mb-6 rounded-[18px] border-2 border-[var(--qs-ok)]/40 bg-[var(--qs-ok)]/[0.05] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--qs-ok)] animate-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ok)]">Live Now</span>
                <span className="text-[11px] font-medium text-[var(--qs-muted)]">
                  {liveStudents.length} student{liveStudents.length !== 1 ? "s" : ""} currently taking this quiz
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEndOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-bad)] px-3.5 py-2 text-xs font-extrabold text-white transition-colors hover:brightness-110"
                >
                  <Square className="h-3.5 w-3.5" />
                  End Quiz
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLiveMenuOpen((open) => !open)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
                    aria-label="More actions"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                  {liveMenuOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1.5 shadow-[4px_4px_0_var(--qs-sun)]">
                      <button
                        type="button"
                        onClick={() => { setLiveMenuOpen(false); setPauseOpen(true); }}
                        className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-xs font-bold text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-bg)]"
                      >
                        <Pause className="h-3.5 w-3.5" /> Pause
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLiveMenuOpen(false); setRestartOpen(true); }}
                        className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-xs font-bold text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-bg)]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restart
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 overflow-x-auto pb-1">
              {liveStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openDetail(s)}
                  className="flex min-w-[200px] items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-left transition-colors hover:border-[var(--qs-brand)]"
                >
                  <StudentAvatar student={s} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold text-[var(--qs-ink)]">{nameWithAttempt(s.name, s.attemptNumber)}</span>
                    <span className="block text-[10px] font-medium text-[var(--qs-muted)]">{s.timeTaken ? `Elapsed ${s.timeTaken}` : "Just started"}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Analytics panels ──────────────────────────────────────── */}
        <div className="mb-7 grid grid-cols-1 gap-[18px] lg:grid-cols-3">
          <section className="rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-[22px]">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[19px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-[21px]">Score Distribution</h2>
                <p className="mt-0.5 text-[13px] text-[var(--qs-muted)]">{summary.submitted} completed students across all ranges</p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--qs-sun)] px-3 py-1 text-xs font-extrabold text-[#1A1240]">
                Detailed stats →
              </span>
            </header>
            <div className="flex h-[200px] items-end gap-3 border-b-2 border-[var(--qs-ink)]">
              {scoreData.map((s) => (
                <div key={s.range} className="group flex h-full flex-1 flex-col items-center justify-end">
                  <em className="mb-1 text-[13px] font-extrabold not-italic text-[var(--qs-ink)]">{s.count}</em>
                  <div
                    className={cn(
                      "w-full rounded-t-[10px] border-2 border-b-0 border-[var(--qs-ink)] transition-[filter] group-hover:brightness-110",
                      s.count === maxBucket && s.count > 0 ? "bg-[var(--qs-sun)]" : "bg-[var(--qs-brand)]"
                    )}
                    style={{ height: s.count === 0 ? "4px" : `calc(${(s.count / maxBucket) * 84}%)` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-3 text-xs font-bold text-[var(--qs-muted)]">
              {scoreData.map((s) => (
                <span key={s.range} className="flex-1 text-center">{s.range}</span>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-[22px]">
            <header className="mb-4">
              <h2 className="text-[19px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-[21px]">Submission Status</h2>
              <p className="mt-0.5 text-[13px] text-[var(--qs-muted)]">Breakdown of {summary.total} students</p>
            </header>
            <div className="flex min-h-[200px] flex-wrap items-center justify-center gap-5 sm:gap-[22px]">
              <svg viewBox="0 0 150 150" role="img" aria-label="Submission status" className="h-[150px] w-[150px] shrink-0">
                <circle cx="75" cy="75" r={DONUT_R} fill="none" stroke="var(--qs-line)" strokeWidth="20" />
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.name}
                    cx="75"
                    cy="75"
                    r={DONUT_R}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="20"
                    strokeDasharray={seg.dash}
                    strokeDashoffset={seg.offset}
                    transform="rotate(-90 75 75)"
                  />
                ))}
                <text x="75" y="76" textAnchor="middle" fontWeight="800" fontSize="30" fill="var(--qs-ink)">{summary.total}</text>
                <text x="75" y="94" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="1.5" fill="var(--qs-muted)">STUDENTS</text>
              </svg>
              <ul className="grid min-w-[150px] flex-1 gap-2.5">
                {submissionData.map((d) => (
                  <li key={d.name} className="flex items-center gap-2.5 text-sm font-medium text-[var(--qs-ink)]">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="min-w-0 truncate">{d.name}</span>
                    <b className="ml-auto font-extrabold tabular-nums">{d.value}</b>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-[22px]">
            <header className="mb-4">
              <h2 className="text-[19px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-[21px]">Time Taken</h2>
              <p className="mt-0.5 text-[13px] text-[var(--qs-muted)]">Duration insights</p>
            </header>
            <div className="flex flex-col gap-3">
              {timeCards.map((t) => (
                <div key={t.label} className="flex items-center gap-3.5 rounded-[16px] border-2 border-[var(--qs-line)] p-3">
                  <i className={cn("grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] not-italic text-white", t.accent)}>
                    <t.icon className="h-4.5 w-4.5" />
                  </i>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ink)]">{t.label}</strong>
                    <small className="block text-[13px] text-[var(--qs-muted)]">{t.sub}</small>
                  </div>
                  <output className="shrink-0 text-[20px] font-extrabold tracking-tight text-[var(--qs-ink)] tabular-nums sm:text-[22px]">{t.value}</output>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Filter bar ────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-[0_1_290px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or roll no…"
              aria-label="Search students"
              className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-2.5 pl-9 pr-3.5 text-sm text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
            {FILTERS.map((f) => {
              const active = filter === f;
              const label = f === "ALL" ? "All" : STATUS_CONFIG[f].label;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-full border-2 px-[13px] py-1.5 text-xs font-extrabold uppercase tracking-[0.06em] transition-colors",
                    active
                      ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                  )}
                >
                  {label}
                  <i className={cn("ml-1.5 not-italic", active ? "opacity-70" : "text-[var(--qs-muted)]")}>{statusCounts[f]}</i>
                </button>
              );
            })}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setSortMode((m) => (m + 1) % SORT_LABELS.length);
                setPage(1);
              }}
              className={cn(topBtn, "flex-1 justify-center sm:flex-none")}
            >
              Sort: {SORT_LABELS[sortMode]}
            </button>
          </div>
        </div>

        {/* ── Student Responses ─────────────────────────────────────── */}
        <div className="relative mb-4 mr-4">
          <div aria-hidden className="absolute left-4 top-4 -bottom-4 -right-4 rounded-[30px] bg-[var(--qs-sun)]" />
          <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
            <header className="px-4 pb-4 pt-5 sm:px-[26px]">
              <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">Student Responses</h2>
              <p className="mt-0.5 text-sm text-[var(--qs-muted)]">Monitor every student&apos;s quiz activity and performance in real time.</p>
            </header>
            {/* Mobile cards */}
            <div className="space-y-2.5 border-t-2 border-[var(--qs-line)] p-4 md:hidden">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="app-skeleton h-[92px] rounded-[16px]" />
                ))
              ) : filtered.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm font-medium text-[var(--qs-muted)]">
                  {students.length === 0 ? "No responses yet — students haven't been registered or attempted this quiz." : "No records match this filter."}
                </p>
              ) : (
                paged.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => openDetail(s)}
                    className="cursor-pointer rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 transition-colors active:bg-[var(--qs-bg)]"
                  >
                    <div className="flex items-start gap-3">
                      <RankBadge rank={s.rank} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StudentAvatar student={s} />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[var(--qs-ink)]">{nameWithAttempt(s.name, s.attemptNumber)}</p>
                            <p className="truncate text-[11px] text-[var(--qs-muted)]">
                              {s.rollNo || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={s.status} />
                          <span className="text-xs font-bold text-[var(--qs-ink)]">
                            {s.correct !== null ? s.correct : "—"}
                            <span className="font-medium text-[var(--qs-muted)]"> / {s.totalQuestions ?? "—"} correct</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--qs-ink)]">
                            {s.percentage !== null ? `${Math.round(s.percentage)}%` : "—"}
                            <span className="h-1.5 w-[40px] overflow-hidden rounded-full bg-[var(--qs-line)]">
                              <i
                                className="block h-full rounded-full bg-[var(--qs-brand)]"
                                style={{ width: `${Math.min(100, Math.max(0, s.percentage ?? 0))}%` }}
                              />
                            </span>
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-[var(--qs-muted)]">
                          {s.timeTaken ?? "—"} · {s.submittedAt ?? "—"}
                        </p>
                        <p className={cn("mt-1 text-[11px] font-bold", s.decoyFlagged ? "text-[var(--qs-bad)]" : "text-[var(--qs-muted)]")}>
                          Decoy hits: {s.decoyHits !== null ? `${s.decoyHits}/${s.decoyQuestions ?? 0}` : "—"}
                          {s.decoyFlagged ? " · Flagged" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Actions for ${s.name}`}
                        onClick={(e) => openActionMenu(e, s)}
                        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-line)]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto border-t-2 border-[var(--qs-line)] md:block">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr>
                    {["Rank", "Student", "Roll no.", "Status", "Correct", "%", "Decoy hits", "Time taken", "Submitted at", "Actions"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={10} className="border-t-2 border-[var(--qs-line)]/60 px-3 py-3">
                          <div className="app-skeleton h-8 rounded" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border-t-2 border-[var(--qs-line)]/60 px-4 py-10 text-center text-sm font-medium text-[var(--qs-muted)]">
                        {students.length === 0 ? "No responses yet — students haven't been registered or attempted this quiz." : "No records match this filter."}
                      </td>
                    </tr>
                  ) : (
                    paged.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => openDetail(s)}
                        className="cursor-pointer border-t-2 border-[var(--qs-line)]/60 transition-colors hover:bg-[var(--qs-bg)]"
                      >
                        <td className="px-3 py-3"><RankBadge rank={s.rank} /></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <StudentAvatar student={s} />
                            <span className="max-w-[180px] truncate font-bold text-[var(--qs-ink)]">{nameWithAttempt(s.name, s.attemptNumber)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[var(--qs-muted)]">{s.rollNo}</td>
                        <td className="px-3 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-3 py-3 font-bold text-[var(--qs-ink)]">
                          {s.correct !== null ? s.correct : "—"}
                          <span className="font-medium text-[var(--qs-muted)]"> / {s.totalQuestions ?? "—"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5 font-extrabold text-[var(--qs-ink)]">
                            {s.percentage !== null ? `${Math.round(s.percentage)}%` : "—"}
                            <span className="h-1.5 w-[54px] overflow-hidden rounded-full bg-[var(--qs-line)]">
                              <i
                                className="block h-full rounded-full bg-[var(--qs-brand)]"
                                style={{ width: `${Math.min(100, Math.max(0, s.percentage ?? 0))}%` }}
                              />
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 font-bold", s.decoyFlagged ? "text-[var(--qs-bad)]" : "text-[var(--qs-ink)]")}>
                            {s.decoyHits !== null ? `${s.decoyHits}/${s.decoyQuestions ?? 0}` : "—"}
                            {s.decoyFlagged && (
                              <span className="rounded-full border border-current px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.05em]">
                                Flag
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[var(--qs-ink)]">{s.timeTaken ?? "—"}</td>
                        <td className="px-3 py-3 text-[var(--qs-muted)]">{s.submittedAt ?? "—"}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            aria-label={`Actions for ${s.name}`}
                            onClick={(e) => openActionMenu(e, s)}
                            className="grid h-[34px] w-[34px] place-items-center rounded-[10px] text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-line)]"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t-2 border-[var(--qs-line)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-[26px]">
              <p className="text-sm font-medium text-[var(--qs-muted)]">
                Showing {filtered.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length} records
              </p>
              {totalPages > 1 && (
                <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                    className="grid h-8 min-w-8 place-items-center rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {pageItems.map((item, i) =>
                    item === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs font-bold text-[var(--qs-muted)]" aria-hidden>
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        aria-current={item === currentPage ? "page" : undefined}
                        className={cn(
                          "grid h-8 min-w-8 place-items-center rounded-[9px] border-2 px-2 text-xs font-extrabold transition-colors",
                          item === currentPage
                            ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                            : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                        )}
                      >
                        {item}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                    className="grid h-8 min-w-8 place-items-center rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row action menu ───────────────────────────────────────────── */}
      {actionMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: actionMenu.top, right: actionMenu.right }}
          className="fixed z-50 min-w-[170px] rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1.5 shadow-[4px_4px_0_var(--qs-sun)]"
        >
          {actionMenu.student.status === "IN_PROGRESS" ? (
            <span className="block w-full rounded-[8px] px-2.5 py-2 text-left text-[13px] font-bold text-[var(--qs-muted)]">
              Attempt in progress
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { setActionMenu(null); void openDetail(actionMenu.student); }}
              className="block w-full rounded-[8px] px-2.5 py-2 text-left text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-bg)]"
            >
              View attempt
            </button>
          )}
          {/* <button
            type="button"
            onClick={() => { setActionMenu(null); toast.info({ title: "Coming soon", description: "Re-opening attempts is not available yet." }); }}
            className="block w-full rounded-[8px] px-2.5 py-2 text-left text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-bg)]"
          >
            Re-open attempt
          </button> */}
          {actionMenu.student.attemptId !== null && (
            <button
              type="button"
              onClick={() => { setDeleteTarget(actionMenu.student); setActionMenu(null); }}
              className="block w-full rounded-[8px] px-2.5 py-2 text-left text-[13px] font-bold text-[var(--qs-bad)] transition-colors hover:bg-[var(--qs-bg)]"
            >
              Delete attempt
            </button>
          )}
        </div>
      )}

      {/* ── Student Detail Panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {detailPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#1A1240]/55 backdrop-blur-sm"
              onClick={() => setDetailPanel(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 py-4">
                <h3 className="text-base font-extrabold text-[var(--qs-ink)]">Student Details</h3>
                <button
                  type="button"
                  onClick={() => setDetailPanel(null)}
                  className="grid h-8 w-8 place-items-center rounded-[10px] border-2 border-[var(--qs-line)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div className="flex items-center gap-4">
                  <StudentAvatar student={detailPanel} size="lg" />
                  <div className="min-w-0">
                    <h4 className="truncate text-lg font-extrabold text-[var(--qs-ink)]">{nameWithAttempt(detailPanel.name, detailPanel.attemptNumber)}</h4>
                    <p className="text-xs font-medium text-[var(--qs-muted)]">{detailPanel.rollNo}</p>
                    <div className="mt-1.5"><StatusBadge status={detailPanel.status} /></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Correct", value: detailPanel.correct !== null ? `${detailPanel.correct} / ${detailPanel.totalQuestions ?? "—"}` : "—" },
                    { label: "Percentage", value: detailPanel.percentage !== null ? `${Math.round(detailPanel.percentage)}%` : "—" },
                    { label: "Rank", value: detailReview?.attempt.rank ?? detailPanel.rank ?? "—" },
                    { label: "Time Taken", value: detailPanel.timeTaken ?? "—" },
                    { label: "Submitted At", value: detailPanel.submittedAt ?? "—" },
                    { label: "Answered", value: detailReview?.attempt
                      ? `${(detailReview.attempt.correct_answers ?? 0) + (detailReview.attempt.wrong_answers ?? 0)} / ${detailReview.attempt.total_questions ?? "—"}`
                      : detailPanel.questionsAnswered !== null && detailPanel.totalQuestions !== null
                        ? `${detailPanel.questionsAnswered} / ${detailPanel.totalQuestions}`
                        : "—" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{s.label}</p>
                      <p className="mt-0.5 text-sm font-extrabold text-[var(--qs-ink)]">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Question Progress</h4>
                  {detailLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="app-skeleton h-14 rounded-[12px]" />
                      ))}
                    </div>
                  ) : detailPanel.attemptId === null ? (
                    <p className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-3 text-xs font-medium text-[var(--qs-muted)]">
                      {detailPanel.status === "NOT_STARTED" ? "This student hasn't started the quiz yet." : "Attempt details not available."}
                    </p>
                  ) : detailPanel.status === "IN_PROGRESS" ? (
                    <p className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-3 text-xs font-medium text-[var(--qs-muted)]">
                      This attempt is still in progress. Question-wise review will be available after submission.
                    </p>
                  ) : !detailReview ? (
                    <p className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-3 text-xs font-medium text-[var(--qs-muted)]">
                      Could not load question-wise details.
                    </p>
                  ) : detailReview.review.length === 0 ? (
                    <p className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-3 text-xs font-medium text-[var(--qs-muted)]">
                      No questions found for this attempt.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detailReview.review.map((q) => (
                        <div key={q.problem_id} className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "grid h-6 w-6 shrink-0 place-items-center rounded-[8px] border-2 text-[10px] font-extrabold",
                              q.status === "correct" && "border-[var(--qs-ok)] bg-[var(--qs-ok)]/10 text-[var(--qs-ok)]",
                              q.status === "wrong" && "border-[var(--qs-bad)] bg-[var(--qs-bad)]/10 text-[var(--qs-bad)]",
                              q.status === "unanswered" && "border-[var(--qs-line)] bg-[var(--qs-line)]/40 text-[var(--qs-muted)]",
                            )}>
                              {q.status === "correct" ? "✓" : q.status === "wrong" ? "✕" : "—"}
                            </span>
                            <p className="text-xs font-extrabold text-[var(--qs-ink)]">Q{q.question_number}</p>
                            <span className={cn(
                              "ml-auto rounded-full border-2 border-current px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.05em]",
                              q.status === "correct" && "text-[var(--qs-ok)]",
                              q.status === "wrong" && "text-[var(--qs-bad)]",
                              q.status === "unanswered" && "text-[var(--qs-muted)]",
                            )}>
                              {q.status === "unanswered" ? "Skipped" : q.status}
                            </span>
                          </div>
                          <QuestionHtml
                            html={q.problem_statement}
                            className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-snug text-[var(--qs-muted)] [&_p]:mb-1 [&_p:last-child]:mb-0 [&_code]:text-[10px]"
                          />
                          {(q.selected_statement || q.correct_answer) && (
                            <div className="mt-1.5 space-y-1 text-[11px]">
                              {q.selected_statement && (
                                <p className="text-[var(--qs-muted)]">
                                  Your answer:{" "}
                                  <InlineQuestionHtml html={q.selected_statement} className="font-bold text-[var(--qs-ink)]" />
                                </p>
                              )}
                              {q.status !== "correct" && q.correct_answer && (
                                <p className="text-[var(--qs-muted)]">
                                  Correct:{" "}
                                  <InlineQuestionHtml html={q.correct_answer} className="font-bold text-[var(--qs-ok)]" />
                                </p>
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

      {/* ── Delete Attempt Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-[#1A1240]/55 backdrop-blur-sm"
              onClick={() => { if (!deleting) setDeleteTarget(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
                <div className="px-6 pb-6 pt-7 text-center">
                  <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] text-white">
                    <Trash2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[var(--qs-ink)]">Delete this attempt?</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--qs-muted)]">
                    This hides {deleteTarget.name}&apos;s attempt from responses, leaderboard and analytics. The data is kept for audit and can be restored later.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2.5 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="h-10 rounded-[12px] border-2 border-[var(--qs-line)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAttempt()}
                    disabled={deleting}
                    className="inline-flex h-10 items-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] px-5 text-xs font-extrabold text-white shadow-[3px_3px_0_var(--qs-sun)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleting ? "Deleting…" : "Delete attempt"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Pause Quiz Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {pauseOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-[#1A1240]/55 backdrop-blur-sm"
              onClick={() => setPauseOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
                <div className="px-6 pb-6 pt-7 text-center">
                  <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                    <Pause className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[var(--qs-ink)]">Pause this quiz?</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--qs-muted)]">
                    Pausing the quiz will stop the timer for all active participants. They will not be able to continue until you resume.
                  </p>
                  <div className="mt-4 rounded-[12px] border-2 border-[#a85d00]/30 bg-[var(--qs-sun)]/25 px-3 py-2">
                    <p className="text-[11px] font-bold text-[#a85d00]">
                      {liveStudents.length} student{liveStudents.length !== 1 ? "s" : ""} currently taking this quiz
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2.5 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setPauseOpen(false)}
                    className="h-10 rounded-[12px] border-2 border-[var(--qs-line)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPauseOpen(false); }}
                    className="inline-flex h-10 items-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-5 text-xs font-extrabold text-[#1A1240] shadow-[3px_3px_0_var(--qs-line)] transition hover:brightness-105"
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

      {/* ── Restart Quiz Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {restartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-[#1A1240]/55 backdrop-blur-sm"
              onClick={() => setRestartOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
                <div className="px-6 pb-6 pt-7 text-center">
                  <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] text-white">
                    <RotateCcw className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[var(--qs-ink)]">Restart this quiz?</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--qs-muted)]">
                    This will make the quiz live again. All participants will be able to start new attempts.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2.5 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setRestartOpen(false)}
                    className="h-10 rounded-[12px] border-2 border-[var(--qs-line)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRestartOpen(false); }}
                    className="inline-flex h-10 items-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] px-5 text-xs font-extrabold text-white shadow-[3px_3px_0_var(--qs-sun)] transition hover:brightness-110"
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

      {/* ── End Quiz Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {endOpen && !quizEnded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-[#1A1240]/55 backdrop-blur-sm"
              onClick={() => setEndOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
                <div className="px-6 pb-6 pt-7 text-center">
                  <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] text-white">
                    <Square className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[var(--qs-ink)]">End this quiz?</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--qs-muted)]">
                    New participants will no longer be able to start the quiz. Participants who are already taking the quiz will follow the configured end behavior.
                  </p>
                  <div className="mt-4 rounded-[12px] border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-bad)]/[0.05] px-3 py-2">
                    <p className="text-[11px] font-bold text-[var(--qs-bad)]">
                      {liveStudents.length} student{liveStudents.length !== 1 ? "s" : ""} currently active
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2.5 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setEndOpen(false)}
                    className="h-10 rounded-[12px] border-2 border-[var(--qs-line)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEndOpen(false); }}
                    className="inline-flex h-10 items-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] px-5 text-xs font-extrabold text-white shadow-[3px_3px_0_var(--qs-sun)] transition hover:brightness-110"
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
