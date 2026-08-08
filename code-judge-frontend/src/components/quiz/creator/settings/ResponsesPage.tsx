"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  Download,
  Loader2,
  Mail,
  Medal,
  Search,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserX,
  Users,
  X,
} from "lucide-react";
import { SettingsCard, SettingsRow, Toggle } from "@/components/ui/settings";
import { useToast } from "@/hooks/useToast";
import { useQuizSettings } from "./QuizSettingsContext";
import { cn } from "@/lib/helpers";
import { saveQuizDetails } from "@/utils/quizStorage";
import {
  getQuizResponses,
  getStudentResponseDetail,
  generateQuizResults,
  retryQuizResultsEmail,
  updateQuiz,
  type QuizResponsesData,
  type QuizResponseStudent,
  type StudentResponseDetail,
} from "@/services/quiz";

type FilterKey = "all" | "submitted" | "not_submitted" | "timed_out" | "left_early";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "not_submitted", label: "Not Submitted" },
  { key: "timed_out", label: "Timed Out" },
  { key: "left_early", label: "Left Early" },
];

type SortKey = "rank" | "marks" | "percentage" | "time_taken" | "rollno" | "name";

function studentStatus(s: QuizResponseStudent): { key: FilterKey; label: string } {
  if (!s.attempt_id || !s.attempt_status) return { key: "not_submitted", label: "Not Submitted" };
  const st = s.attempt_status.toLowerCase();
  if (st === "completed" || st === "submitted_late") return { key: "submitted", label: st === "submitted_late" ? "Submitted Late" : "Submitted" };
  if (st === "timed_out") return { key: "timed_out", label: "Timed Out" };
  return { key: "left_early", label: "Left Early" };
}

const STATUS_STYLE: Record<string, { badge: string; dot: string }> = {
  Submitted: { badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500", dot: "bg-emerald-500" },
  "Submitted Late": { badge: "border-teal-500/30 bg-teal-500/10 text-teal-500", dot: "bg-teal-500" },
  "Not Submitted": { badge: "border-amber-500/30 bg-amber-500/10 text-amber-500", dot: "bg-amber-500" },
  "Timed Out": { badge: "border-red-500/30 bg-red-500/10 text-red-500", dot: "bg-red-500" },
  "Left Early": { badge: "border-orange-500/30 bg-orange-500/10 text-orange-500", dot: "bg-orange-500" },
};

function formatTimeTaken(sec?: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatPercent(p?: number | null): string {
  if (p == null) return "—";
  return `${Number(p).toFixed(1)}%`;
}

export default function ResponsesPage() {
  const toast = useToast();
  const { quizId, code, details, updateDetails } = useQuizSettings();

  const [data, setData] = useState<QuizResponsesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sortOpen, setSortOpen] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<QuizResponseStudent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<StudentResponseDetail | null>(null);

  const [emailBusy, setEmailBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const persistSettings = async (patch: Partial<{ leaderboard: boolean; showResultsImmediately: boolean }>) => {
    if (!quizId) return;
    setSettingsBusy(true);
    try {
      await updateQuiz(String(quizId), { ...patch, code });
    } catch (err) {
      console.error("Failed to save response settings:", err);
      toast.error({ title: "Could not save settings", description: "Something went wrong. Please try again." });
    } finally {
      setSettingsBusy(false);
    }
  };

  const load = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    try {
      const res = await getQuizResponses(String(quizId));
      setData(res);
    } catch (err) {
      console.error("Failed to load responses:", err);
      toast.error({ title: "Could not load responses", description: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [quizId, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    load();
  }, [load]);

  const handleSelectStudent = async (s: QuizResponseStudent) => {
    if (!quizId) return;
    setSelectedStudent(s);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await getStudentResponseDetail(String(quizId), s.user_id);
      setDetail(res);
    } catch {
      toast.error({ title: "Could not load student result", description: "Something went wrong." });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!quizId) return;
    setEmailBusy(true);
    try {
      const res = await generateQuizResults(String(quizId), { force: true, sendEmail: true });
      if (res.emailSent) {
        toast.success({
          title: "Results emailed",
          description: "The complete result report was sent to the quiz admin.",
        });
      } else {
        toast.warning({
          title: "Results generated, email failed",
          description: res.emailError || "The report email could not be delivered.",
        });
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        try {
          const retry = await retryQuizResultsEmail(String(quizId));
          if (retry.emailSent) {
            toast.success({ title: "Results emailed", description: "The report was sent to the quiz admin." });
          } else {
            toast.error({ title: "Email failed", description: retry.emailError || "Could not deliver the email." });
          }
        } catch {
          toast.error({ title: "Email failed", description: "Could not deliver the results email." });
        }
      } else {
        toast.error({ title: "Could not send results", description: "Something went wrong. Please try again." });
      }
    } finally {
      setEmailBusy(false);
    }
  };

  const students = useMemo(() => {
    if (!data) return [];
    let list = data.students.slice();

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => {
        const name = `${s.first_name ?? ""} ${s.last_name ?? ""} ${s.username ?? ""}`.toLowerCase();
        return (
          name.includes(q) ||
          String(s.user_id).includes(q) ||
          (s.rollno ? String(s.rollno).toLowerCase().includes(q) : false)
        );
      });
    }

    if (filter !== "all") {
      list = list.filter((s) => studentStatus(s).key === filter);
    }

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "rank": {
          const ar = a.rank ?? Infinity;
          const br = b.rank ?? Infinity;
          if (ar !== br) return (ar - br) * dir;
          return (b.score ?? 0) - (a.score ?? 0);
        }
        case "marks":
          return ((a.score ?? 0) - (b.score ?? 0)) * dir;
        case "percentage":
          return ((a.percentage ?? 0) - (b.percentage ?? 0)) * dir;
        case "time_taken":
          return ((a.time_taken ?? 0) - (b.time_taken ?? 0)) * dir;
        case "rollno":
          return String(a.rollno ?? "").localeCompare(String(b.rollno ?? "")) * dir;
        case "name": {
          const an = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
          const bn = `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim();
          return an.localeCompare(bn) * dir;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [data, search, filter, sortKey, sortDir]);

  const summary = data?.summary;
  const quizName = data?.quiz?.name || details.name;
  const totalMarks = summary?.total_marks || data?.quiz?.total_marks || 0;

  const stats = [
    {
      label: "Total Students",
      value: summary?.total ?? 0,
      icon: Users,
      card: "border-pink-500/20 bg-pink-500/[0.06] text-pink-500",
      iconBg: "bg-pink-500/10",
    },
    {
      label: "Submitted",
      value: summary?.submitted ?? 0,
      icon: CheckCircle2,
      card: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      label: "Not Submitted",
      value: summary?.not_submitted ?? 0,
      icon: UserX,
      card: "border-amber-500/20 bg-amber-500/[0.06] text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    {
      label: "Average Score",
      value: summary?.average_score ?? 0,
      icon: BarChart3,
      card: "border-violet-500/20 bg-violet-500/[0.06] text-violet-500",
      iconBg: "bg-violet-500/10",
    },
    {
      label: "Highest Score",
      value: summary?.highest_score ?? "—",
      icon: TrendingUp,
      card: "border-blue-500/20 bg-blue-500/[0.06] text-blue-500",
      iconBg: "bg-blue-500/10",
    },
    {
      label: "Lowest Score",
      value: summary?.lowest_score ?? "—",
      icon: TrendingDown,
      card: "border-orange-500/20 bg-orange-500/[0.06] text-orange-500",
      iconBg: "bg-orange-500/10",
    },
  ];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "rank" || key === "marks" || key === "percentage" ? "desc" : "asc");
    }
  };

  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: "rank", label: "Rank" },
    { key: "marks", label: "Marks" },
    { key: "percentage", label: "Percentage" },
    { key: "time_taken", label: "Time Taken" },
    { key: "rollno", label: "Roll Number" },
    { key: "name", label: "Name" },
  ];

  const currentSortLabel = sortOptions.find((o) => o.key === sortKey)?.label ?? "Rank";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8 lg:px-8">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Responses</h2>
          <p className="mt-0.5 text-sm text-text-secondary">{quizName || "Quiz Responses"}</p>
        </div>

        <button
          onClick={handleSendEmail}
          disabled={emailBusy}
          className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send Results to Admin
        </button>
      </div>

      {/* ===== Summary Cards ===== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn("rounded-2xl border p-4", stat.card)}
          >
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", stat.iconBg)}>
              <stat.icon className="h-4.5 w-4.5" />
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums text-text-primary">{stat.value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-text-secondary">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ===== Toolbar: Search + Filters + Sort ===== */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by roll number, name or user ID..."
            className="w-full h-10 rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all",
                filter === f.key
                  ? "border-pink-500 bg-pink-500/10 text-pink-500"
                  : "border-border bg-card-hover text-text-secondary hover:text-text-primary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setSortOpen((o) => !o)}
            className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card-hover px-3.5 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover"
          >
            Sort: {currentSortLabel}
            <ChevronDown className={cn("h-3.5 w-3.5 text-text-muted transition-transform", sortOpen && "rotate-180")} />
          </button>
          <AnimatePresence>
            {sortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
              >
                {sortOptions.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => {
                      toggleSort(o.key);
                      setSortOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors",
                      sortKey === o.key ? "bg-pink-500/10 font-semibold text-pink-500" : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                    )}
                  >
                    {o.label}
                    {sortKey === o.key && <span className="text-[10px] text-text-muted">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===== Students Table ===== */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Roll No.</th>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">User ID</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Marks</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Percentage</th>
                <th className="px-4 py-3 text-right font-semibold">Time Taken</th>
                <th className="px-4 py-3 font-semibold">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-text-muted">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    <p className="mt-2 text-sm">Loading responses...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-text-muted">
                    <UserX className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm font-medium">No students match your filters.</p>
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const status = studentStatus(s);
                  const style = STATUS_STYLE[status.label] || STATUS_STYLE["Not Submitted"];
                  return (
                    <tr
                      key={s.user_id}
                      onClick={() => handleSelectStudent(s)}
                      className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-pink-500/[0.04]"
                    >
                      <td className="px-4 py-3">
                        {s.rank != null ? (
                          <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold", s.rank === 1 ? "bg-amber-500/15 text-amber-500" : s.rank === 2 ? "bg-slate-400/15 text-slate-400" : s.rank === 3 ? "bg-orange-500/15 text-orange-500" : "bg-card-hover text-text-secondary")}>
                            {s.rank === 1 ? <Crown className="h-3.5 w-3.5" /> : s.rank === 2 ? <Medal className="h-3.5 w-3.5" /> : s.rank === 3 ? <Award className="h-3.5 w-3.5" /> : s.rank}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary tabular-nums">{s.rollno || "—"}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-text-primary">
                          {[s.first_name, s.last_name].filter(Boolean).join(" ") || "Student"}
                        </p>
                        {s.username && <p className="text-[11px] text-text-muted">@{s.username}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{s.user_id}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", style.badge)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-text-primary">{s.score ?? 0}</td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary tabular-nums">{totalMarks || "—"}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-violet-500">{formatPercent(s.percentage)}</td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary tabular-nums">{formatTimeTaken(s.time_taken)}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {s.completed_at ? new Date(s.completed_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 text-[11px] text-text-muted">
          {students.length} of {summary?.total ?? 0} students · Table scrolls horizontally on small screens
        </div>
      </div>

      {/* ===== Result & Email Settings ===== */}
      <SettingsCard
        title="Result & Email Settings"
        description="How results, leaderboard and the admin report behave."
        icon={<Mail className="h-5 w-5" />}
        iconClassName="bg-pink-500/10 text-pink-500"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <SettingsRow
              label="Email Quiz Results"
              description="Send the complete quiz result report to the quiz admin (never to students)."
            >
              <Toggle
                checked={details.emailResults}
                onChange={(v) => {
                  updateDetails({ emailResults: v });
                  saveQuizDetails({ ...details, emailResults: v });
                }}
              />
            </SettingsRow>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <SettingsRow label="Leaderboard" description="Show a ranked leaderboard for this quiz">
              <Toggle
                checked={details.leaderboard}
                onChange={(v) => {
                  updateDetails({ leaderboard: v });
                  saveQuizDetails({ ...details, leaderboard: v });
                  void persistSettings({ leaderboard: v });
                }}
              />
            </SettingsRow>
            {details.leaderboard && (
              <div className="mt-2 space-y-1 border-t border-border pt-3">
                <Toggle
                  checked={details.leaderboardShowRank}
                  onChange={(v) => updateDetails({ leaderboardShowRank: v })}
                  label="Show Rank"
                />
                <Toggle
                  checked={details.leaderboardShowScore}
                  onChange={(v) => updateDetails({ leaderboardShowScore: v })}
                  label="Show Score"
                />
                <Toggle
                  checked={details.leaderboardShowTime}
                  onChange={(v) => updateDetails({ leaderboardShowTime: v })}
                  label="Show Time Taken"
                />
              </div>
            )}
          </div>
          {settingsBusy && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving settings...
            </div>
          )}
          <div className="flex items-start gap-2.5 rounded-xl border border-pink-500/15 bg-pink-500/[0.05] p-3.5">
            <Download className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
            <p className="text-xs leading-relaxed text-text-secondary">
              Use <span className="font-semibold text-pink-500">Send Results to Admin</span> above to email the complete
              result report to the quiz admin. Students never receive performance emails.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* ===== Student Detail Modal ===== */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-pink-500">Student Result</p>
                  <h3 className="mt-0.5 text-lg font-bold text-text-primary">
                    {[selectedStudent.first_name, selectedStudent.last_name].filter(Boolean).join(" ") || "Student"}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Roll No: {selectedStudent.rollno || "—"} · User ID: {selectedStudent.user_id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-lg border border-border bg-card-hover p-2 text-text-muted transition-colors hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm">Loading result...</p>
                  </div>
                ) : detail?.attempt ? (
                  <>
                    {/* Score breakdown */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        { label: "Marks", value: `${detail.attempt.score} / ${detail.attempt.total_questions ?? "—"}`, icon: Medal, tone: "text-pink-500 bg-pink-500/10" },
                        { label: "Percentage", value: formatPercent(detail.attempt.percentage), icon: BarChart3, tone: "text-violet-500 bg-violet-500/10" },
                        { label: "Rank", value: detail.attempt.rank ?? "—", icon: Trophy, tone: "text-amber-500 bg-amber-500/10" },
                        { label: "Correct", value: detail.attempt.correct_answers ?? 0, icon: CheckCircle2, tone: "text-emerald-500 bg-emerald-500/10" },
                        { label: "Wrong", value: detail.attempt.wrong_answers ?? 0, icon: X, tone: "text-red-500 bg-red-500/10" },
                        { label: "Unanswered", value: detail.attempt.skipped_questions ?? 0, icon: UserX, tone: "text-orange-500 bg-orange-500/10" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-border bg-card-hover p-3.5">
                          <div className={cn("mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg", item.tone)}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          <p className="text-lg font-bold tabular-nums text-text-primary">{item.value}</p>
                          <p className="text-[11px] font-medium text-text-secondary">{item.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
                      <span className="rounded-full bg-card-hover px-3 py-1.5">
                        Time taken: <span className="font-semibold text-text-primary">{formatTimeTaken(detail.attempt.time_taken)}</span>
                      </span>
                      <span className="rounded-full bg-card-hover px-3 py-1.5">
                        Status: <span className="font-semibold capitalize text-text-primary">{detail.attempt.attempt_status.replace("_", " ")}</span>
                      </span>
                      <span className="rounded-full bg-card-hover px-3 py-1.5">
                        Submitted: <span className="font-semibold text-text-primary">{detail.attempt.completed_at ? new Date(detail.attempt.completed_at).toLocaleString() : "—"}</span>
                      </span>
                    </div>

                    {/* Question-wise */}
                    {detail.review.length > 0 && (
                      <div className="mt-6">
                        <h4 className="mb-3 text-sm font-bold text-text-primary">Question-wise Breakdown</h4>
                        <div className="space-y-2">
                          {detail.review.map((q) => (
                            <div
                              key={q.problem_id}
                              className={cn(
                                "rounded-xl border p-3.5",
                                q.status === "correct"
                                  ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                                  : q.status === "wrong"
                                  ? "border-red-500/20 bg-red-500/[0.04]"
                                  : "border-orange-500/20 bg-orange-500/[0.04]"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-text-primary">
                                    Q{q.question_number}. {q.problem_statement}
                                  </p>
                                  <p className="mt-1 text-[11px] text-text-secondary">
                                    Selected: <span className="text-text-primary">{q.selected_statement || "—"}</span>
                                  </p>
                                  {q.status !== "correct" && q.correct_answer && (
                                    <p className="mt-0.5 text-[11px] text-emerald-500">Correct answer: {q.correct_answer}</p>
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                    q.status === "correct"
                                      ? "bg-emerald-500/15 text-emerald-500"
                                      : q.status === "wrong"
                                      ? "bg-red-500/15 text-red-500"
                                      : "bg-orange-500/15 text-orange-500"
                                  )}
                                >
                                  {q.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-16 text-center text-text-muted">
                    <Clock className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm">No submission found for this student.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
