"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
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
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import {
  PageHeader,
  StatCard,
  SegmentedControl,
  Panel,
  EmptyState,
  ErrorState,
  BillButton,
} from "@/components/creator/billing/ui";

// ---- Reuse same mock data as pre-created page (keep everything) ----
type QuizResponseStudent = {
  user_id: number;
  rollno: string | null;
  is_registered: boolean;
  registered_at: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  attempt_id: number | null;
  score: number | null;
  percentage: number | null;
  rank: number | null;
  attempt_status: string | null;
  completed_at: string | null;
  time_taken: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  skipped_questions: number | null;
};
type QuizResponsesSummary = {
  total: number;
  submitted: number;
  not_submitted: number;
  average_score: number;
  highest_score: number | null;
  lowest_score: number | null;
  total_marks: number;
};
type QuizResponsesData = {
  quiz: { id: number; name: string; code: string; total_marks: number; passing_marks: number; status: string | null; starttime: string | null; endtime: string | null; };
  students: QuizResponseStudent[];
  summary: QuizResponsesSummary;
};
type StudentResponseDetail = {
  attempt: { attempt_id: number; user_id: number; quiz_id: number; score: number; percentage: number; rank: number | null; attempt_status: string; completed_at: string | null; time_taken: number | null; total_questions: number | null; correct_answers: number | null; wrong_answers: number | null; skipped_questions: number | null; username: string | null; first_name: string | null; last_name: string | null; email: string | null; };
  review: Array<{ problem_id: number; question_number: number; problem_statement: string; problem_description: string | null; explaination: string | null; problem_type: string | null; correct_answer: string | null; selected_option: string | null; selected_statement: string | null; answered_at: string | null; status: "correct" | "wrong" | "unanswered"; }>;
};

const MOCK_RESPONSES_DATA: QuizResponsesData = {
  quiz: { id: 1, name: "Fun Math Quiz for Kids", code: "KIDS123MATH", total_marks: 50, passing_marks: 25, status: "published", starttime: "2026-01-15T10:00:00Z", endtime: "2026-01-15T11:30:00Z" },
  students: [
    { user_id: 101, rollno: "KIDS-001", is_registered: true, registered_at: "2026-01-10T09:00:00Z", username: "alice_smith", first_name: "Alice", last_name: "Smith", email: "alice@example.com", attempt_id: 201, score: 48, percentage: 96.0, rank: 1, attempt_status: "completed", completed_at: "2026-01-15T10:30:15Z", time_taken: 1815, total_questions: 50, correct_answers: 48, wrong_answers: 2, skipped_questions: 0 },
    { user_id: 102, rollno: "KIDS-002", is_registered: true, registered_at: "2026-01-10T09:05:00Z", username: "bob_jones", first_name: "Bob", last_name: "Jones", email: "bob@example.com", attempt_id: 202, score: 42, percentage: 84.0, rank: 2, attempt_status: "completed", completed_at: "2026-01-15T10:35:42Z", time_taken: 2142, total_questions: 50, correct_answers: 42, wrong_answers: 8, skipped_questions: 0 },
    { user_id: 103, rollno: "KIDS-003", is_registered: true, registered_at: "2026-01-10T09:10:00Z", username: "charlie_brown", first_name: "Charlie", last_name: "Brown", email: "charlie@example.com", attempt_id: 203, score: 38, percentage: 76.0, rank: 3, attempt_status: "completed", completed_at: "2026-01-15T10:40:10Z", time_taken: 2410, total_questions: 50, correct_answers: 38, wrong_answers: 10, skipped_questions: 2 },
    { user_id: 104, rollno: "KIDS-004", is_registered: true, registered_at: "2026-01-10T09:15:00Z", username: "diana_prince", first_name: "Diana", last_name: "Prince", email: "diana@example.com", attempt_id: 204, score: 35, percentage: 70.0, rank: 4, attempt_status: "completed", completed_at: "2026-01-15T10:42:55Z", time_taken: 2575, total_questions: 50, correct_answers: 35, wrong_answers: 12, skipped_questions: 3 },
    { user_id: 105, rollno: "KIDS-005", is_registered: true, registered_at: "2026-01-10T09:20:00Z", username: "ethan_hunt", first_name: "Ethan", last_name: "Hunt", email: "ethan@example.com", attempt_id: 205, score: 28, percentage: 56.0, rank: 5, attempt_status: "completed", completed_at: "2026-01-15T10:45:30Z", time_taken: 2730, total_questions: 50, correct_answers: 28, wrong_answers: 15, skipped_questions: 7 },
    { user_id: 106, rollno: "KIDS-006", is_registered: true, registered_at: "2026-01-10T09:25:00Z", username: "fiona_glen", first_name: "Fiona", last_name: "Glen", email: "fiona@example.com", attempt_id: 206, score: 22, percentage: 44.0, rank: 6, attempt_status: "timed_out", completed_at: "2026-01-15T11:30:00Z", time_taken: 5400, total_questions: 50, correct_answers: 22, wrong_answers: 8, skipped_questions: 20 },
    { user_id: 107, rollno: "KIDS-007", is_registered: true, registered_at: "2026-01-10T09:30:00Z", username: "george_king", first_name: "George", last_name: "King", email: "george@example.com", attempt_id: 207, score: 15, percentage: 30.0, rank: 7, attempt_status: "left_early", completed_at: "2026-01-15T10:20:00Z", time_taken: 1200, total_questions: 50, correct_answers: 15, wrong_answers: 5, skipped_questions: 30 },
    { user_id: 108, rollno: "KIDS-008", is_registered: true, registered_at: "2026-01-10T09:35:00Z", username: "hannah_lee", first_name: "Hannah", last_name: "Lee", email: "hannah@example.com", attempt_id: null, score: null, percentage: null, rank: null, attempt_status: null, completed_at: null, time_taken: null, total_questions: null, correct_answers: null, wrong_answers: null, skipped_questions: null },
    { user_id: 109, rollno: "KIDS-009", is_registered: true, registered_at: "2026-01-10T09:40:00Z", username: "ivan_moore", first_name: "Ivan", last_name: "Moore", email: "ivan@example.com", attempt_id: null, score: null, percentage: null, rank: null, attempt_status: null, completed_at: null, time_taken: null, total_questions: null, correct_answers: null, wrong_answers: null, skipped_questions: null },
    { user_id: 110, rollno: "KIDS-010", is_registered: true, registered_at: "2026-01-10T09:45:00Z", username: "julia_nash", first_name: "Julia", last_name: "Nash", email: "julia@example.com", attempt_id: null, score: null, percentage: null, rank: null, attempt_status: null, completed_at: null, time_taken: null, total_questions: null, correct_answers: null, wrong_answers: null, skipped_questions: null },
  ],
  summary: { total: 10, submitted: 5, not_submitted: 3, average_score: 32.6, highest_score: 48, lowest_score: 15, total_marks: 50 },
};

const MOCK_STUDENT_DETAILS: Record<number, StudentResponseDetail> = {
  101: { attempt: { attempt_id: 201, user_id: 101, quiz_id: 1, score: 48, percentage: 96.0, rank: 1, attempt_status: "completed", completed_at: "2026-01-15T10:30:15Z", time_taken: 1815, total_questions: 50, correct_answers: 48, wrong_answers: 2, skipped_questions: 0, username: "alice_smith", first_name: "Alice", last_name: "Smith", email: "alice@example.com" }, review: [{ problem_id: 1, question_number: 1, problem_statement: "What is 2 + 2?", problem_description: null, explaination: "Basic addition", problem_type: "mcq", correct_answer: "4", selected_option: "4", selected_statement: "4", answered_at: "2026-01-15T10:01:00Z", status: "correct" }] },
};

type FilterKey = "all" | "submitted" | "not_submitted" | "timed_out" | "left_early";
type SortKey = "rank" | "marks" | "percentage" | "time_taken" | "rollno" | "name";

function studentStatus(s: QuizResponseStudent): { key: FilterKey; label: string } {
  if (!s.attempt_id || !s.attempt_status) return { key: "not_submitted", label: "Not Submitted" };
  const st = s.attempt_status.toLowerCase();
  if (st === "completed" || st === "submitted_late") return { key: "submitted", label: st === "submitted_late" ? "Submitted Late" : "Submitted" };
  if (st === "timed_out") return { key: "timed_out", label: "Timed Out" };
  return { key: "left_early", label: "Left Early" };
}
const STATUS_TONE: Record<string, { badge: string; dot: string }> = {
  Submitted: { badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500", dot: "bg-emerald-500" },
  "Not Submitted": { badge: "border-amber-500/30 bg-amber-500/10 text-amber-500", dot: "bg-amber-500" },
  "Timed Out": { badge: "border-red-500/30 bg-red-500/10 text-red-500", dot: "bg-red-500" },
  "Left Early": { badge: "border-orange-500/30 bg-orange-500/10 text-orange-500", dot: "bg-orange-500" },
};
function formatTimeTaken(sec?: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
function formatPercent(p?: number | null): string { if (p == null) return "—"; return `${Number(p).toFixed(1)}%`; }

export default function StudioResponsesPage({ quizId }: { quizId?: string | number }) {
  const toast = useToast();
  const [data, setData] = useState<QuizResponsesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedStudent, setSelectedStudent] = useState<QuizResponseStudent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<StudentResponseDetail | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setData(MOCK_RESPONSES_DATA);
    } catch {
      toast.error({ title: "Could not load responses" });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSelectStudent = async (s: QuizResponseStudent) => {
    setSelectedStudent(s); setDetail(null); setDetailLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 250));
      setDetail(MOCK_STUDENT_DETAILS[s.user_id] || { attempt: { attempt_id: s.attempt_id || 0, user_id: s.user_id, quiz_id: Number(quizId ?? 0), score: s.score || 0, percentage: s.percentage || 0, rank: s.rank || null, attempt_status: s.attempt_status || "completed", completed_at: s.completed_at, time_taken: s.time_taken, total_questions: s.total_questions, correct_answers: s.correct_answers, wrong_answers: s.wrong_answers, skipped_questions: s.skipped_questions, username: s.username, first_name: s.first_name, last_name: s.last_name, email: s.email }, review: [] });
    } catch { toast.error({ title: "Could not load student result" }); } finally { setDetailLoading(false); }
  };

  const downloadResultsCsv = () => {
    if (!data) return;
    const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const header = ["Rank","Roll No.","Student","User ID","Status","Marks","Total","Percentage","Time Taken","Submitted At"];
    const rows = data.students.map((s) => [s.rank ?? "", s.rollno ?? "", [s.first_name, s.last_name].filter(Boolean).join(" "), s.user_id, studentStatus(s).label, s.score ?? "", data.quiz.total_marks ?? "", s.percentage != null ? Number(s.percentage).toFixed(1) : "", s.time_taken != null ? formatTimeTaken(s.time_taken) : "", s.completed_at ? new Date(s.completed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : ""]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `quiz-${data.quiz.code}-results.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success({ title: "Results downloaded" });
  };
  const handleSendEmail = async () => {
    setEmailBusy(true);
    try { await new Promise((r) => setTimeout(r, 800)); toast.success({ title: "Results emailed (Demo)", description: "Mock send successful." }); } catch { toast.error({ title: "Could not send results" }); } finally { setEmailBusy(false); }
  };

  const students = useMemo(() => {
    if (!data) return [];
    let list = data.students.slice();
    if (search.trim()) { const q = search.trim().toLowerCase(); list = list.filter((s) => `${s.first_name ?? ""} ${s.last_name ?? ""} ${s.username ?? ""} ${s.user_id} ${s.rollno ?? ""}`.toLowerCase().includes(q)); }
    if (filter !== "all") list = list.filter((s) => studentStatus(s).key === filter);
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a,b)=>{ switch(sortKey){ case "rank": {const ar=a.rank??Infinity, br=b.rank??Infinity; if(ar!==br) return (ar-br)*dir; return (b.score??0)-(a.score??0);} case "marks": return ((a.score??0)-(b.score??0))*dir; case "percentage": return ((a.percentage??0)-(b.percentage??0))*dir; case "time_taken": return ((a.time_taken??0)-(b.time_taken??0))*dir; case "rollno": return String(a.rollno??"").localeCompare(String(b.rollno??""))*dir; case "name": return `${a.first_name??""} ${a.last_name??""}`.trim().localeCompare(`${b.first_name??""} ${b.last_name??""}`.trim())*dir; default: return 0; }});
    return list;
  }, [data, search, filter, sortKey, sortDir]);

  const summary = data?.summary;
  const quizName = data?.quiz?.name || "Quiz Responses";

  if (loading) return <div className="space-y-4 p-4 sm:p-6 lg:p-8"><div className="grid grid-cols-2 gap-4 lg:grid-cols-6">{Array.from({length:6}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.06]" />)}</div><div className="h-[400px] animate-pulse rounded-2xl bg-white/[0.06]" /></div>;
  if (!data) return <div className="p-4 sm:p-6 lg:p-8"><ErrorState onRetry={load} message="Could not load responses." /></div>;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <PageHeader title="Responses" subtitle={quizName} actions={
        <div className="flex flex-wrap items-center gap-2">
          <BillButton variant="ghost" icon={<Download className="h-4 w-4" />} onClick={downloadResultsCsv}>Download Results</BillButton>
          <BillButton loading={emailBusy} icon={<Mail className="h-4 w-4" />} onClick={handleSendEmail}>Send results on email</BillButton>
        </div>
      } />

      {/* Stats — studio StatCard style same as QuizzesPage */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label="Total Students" value={summary?.total ?? 0} display={String(summary?.total ?? 0)} accent="primary" icon={<Users className="h-3.5 w-3.5" />} hint="registered" />
        <StatCard label="Submitted" value={summary?.submitted ?? 0} display={String(summary?.submitted ?? 0)} accent="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} hint="completed" />
        <StatCard label="Not Submitted" value={summary?.not_submitted ?? 0} display={String(summary?.not_submitted ?? 0)} accent="warning" icon={<UserX className="h-3.5 w-3.5" />} hint="pending" />
        <StatCard label="Average Score" value={Math.round(summary?.average_score ?? 0)} display={String(summary?.average_score ?? 0)} accent="info" icon={<BarChart3 className="h-3.5 w-3.5" />} hint={`of ${summary?.total_marks ?? 0}`} />
        <StatCard label="Highest Score" value={summary?.highest_score ?? 0} display={String(summary?.highest_score ?? "—")} accent="gold" icon={<TrendingUp className="h-3.5 w-3.5" />} hint="max" />
        <StatCard label="Lowest Score" value={summary?.lowest_score ?? 0} display={String(summary?.lowest_score ?? "—")} accent="warning" icon={<TrendingDown className="h-3.5 w-3.5" />} hint="min" />
      </div>

      {/* Toolbar */}
      <Panel noPadding>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by roll number, name or user ID..." className="w-full h-10 rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(["all","submitted","not_submitted","timed_out","left_early"] as FilterKey[]).map(k=>(
              <button key={k} onClick={()=>setFilter(k)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize", filter===k ? "border-pink-500 bg-pink-500/10 text-pink-500" : "border-border bg-card-hover text-text-secondary")}>{k.replace("_"," ")}</button>
            ))}
          </div>
          <SegmentedControl options={[{id:"rank",label:"Rank"},{id:"marks",label:"Marks"},{id:"percentage",label:"%"},{id:"time_taken",label:"Time"},{id:"rollno",label:"Roll"},{id:"name",label:"Name"}] as any} value={sortKey as any} onChange={(v)=>{ if(v===sortKey) setSortDir(d=>d==="asc"?"desc":"asc"); else {setSortKey(v as SortKey); setSortDir("desc");}}} size="sm" />
        </div>
      </Panel>

      {/* Table */}
      <Panel noPadding>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">Rank</th><th className="px-4 py-3">Roll No.</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">User ID</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Marks</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">%</th><th className="px-4 py-3 text-right">Time</th><th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s)=>{ const st=studentStatus(s); const style=STATUS_TONE[st.label]||STATUS_TONE["Not Submitted"]; return (
                <tr key={s.user_id} onClick={()=>handleSelectStudent(s)} className="cursor-pointer border-b border-border/60 hover:bg-pink-500/[0.04]">
                  <td className="px-4 py-3">{s.rank!=null ? <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold", s.rank===1 ? "bg-amber-500/15 text-amber-500" : s.rank===2 ? "bg-slate-400/15 text-slate-400" : s.rank===3 ? "bg-orange-500/15 text-orange-500" : "bg-card-hover text-text-secondary")}>{s.rank===1?<Crown className="h-3.5 w-3.5"/>:s.rank===2?<Medal className="h-3.5 w-3.5"/>:s.rank===3?<Award className="h-3.5 w-3.5"/>:s.rank}</span> : <span className="text-xs text-text-muted">—</span>}</td>
                  <td className="px-4 py-3 text-sm font-medium tabular-nums">{s.rollno||"—"}</td>
                  <td className="px-4 py-3"><p className="text-sm font-semibold">{[s.first_name,s.last_name].filter(Boolean).join(" ")||"Student"}</p><p className="text-[11px] text-text-muted">@{s.username}</p></td>
                  <td className="px-4 py-3 text-sm tabular-nums">{s.user_id}</td>
                  <td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", style.badge)}><span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />{st.label}</span></td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{s.score??0}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{data.quiz.total_marks}</td>
                  <td className="px-4 py-3 text-right font-semibold text-violet-500 tabular-nums">{formatPercent(s.percentage)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTimeTaken(s.time_taken)}</td>
                  <td className="px-4 py-3 text-xs">{s.completed_at ? new Date(s.completed_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}) : "—"}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </Panel>

      <AnimatePresence>
        {selectedStudent && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={()=>setSelectedStudent(null)}>
            <motion.div initial={{scale:0.95, opacity:0, y:12}} animate={{scale:1, opacity:1, y:0}} exit={{scale:0.95, opacity:0, y:12}} onClick={(e)=>e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-pink-500">Student Result</p><h3 className="mt-0.5 text-lg font-bold">{[selectedStudent.first_name, selectedStudent.last_name].filter(Boolean).join(" ")||"Student"}</h3><p className="mt-0.5 text-xs text-text-secondary">Roll No: {selectedStudent.rollno||"—"} · User ID: {selectedStudent.user_id}</p></div>
                <button onClick={()=>setSelectedStudent(null)} className="rounded-lg border border-border bg-card-hover p-2"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {detailLoading ? <div className="flex flex-col items-center gap-2 py-16"><Loader2 className="h-6 w-6 animate-spin" /><p className="text-sm">Loading result...</p></div> : detail?.attempt ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        { label: "Marks", value: `${detail.attempt.score} / ${detail.attempt.total_questions ?? "—"}`, icon: Medal, tone: "text-pink-500 bg-pink-500/10" },
                        { label: "Percentage", value: formatPercent(detail.attempt.percentage), icon: BarChart3, tone: "text-violet-500 bg-violet-500/10" },
                        { label: "Rank", value: detail.attempt.rank ?? "—", icon: Trophy, tone: "text-amber-500 bg-amber-500/10" },
                        { label: "Correct", value: detail.attempt.correct_answers ?? 0, icon: CheckCircle2, tone: "text-emerald-500 bg-emerald-500/10" },
                        { label: "Wrong", value: detail.attempt.wrong_answers ?? 0, icon: X, tone: "text-red-500 bg-red-500/10" },
                        { label: "Unanswered", value: detail.attempt.skipped_questions ?? 0, icon: UserX, tone: "text-orange-500 bg-orange-500/10" },
                      ].map((it)=>(
                        <div key={it.label} className="rounded-xl border border-border bg-card-hover p-3.5">
                          <div className={cn("mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg", it.tone)}><it.icon className="h-4 w-4" /></div>
                          <p className="text-lg font-bold tabular-nums">{it.value}</p>
                          <p className="text-[11px] font-medium text-text-secondary">{it.label}</p>
                        </div>
                      ))}
                    </div>
                    {detail.review.length>0 && (
                      <div className="mt-6"><h4 className="mb-3 text-sm font-bold">Question-wise Breakdown</h4><div className="space-y-2">{detail.review.map((q)=>(
                        <div key={q.problem_id} className={cn("rounded-xl border p-3.5", q.status==="correct" ? "border-emerald-500/20 bg-emerald-500/[0.04]" : q.status==="wrong" ? "border-red-500/20 bg-red-500/[0.04]" : "border-orange-500/20 bg-orange-500/[0.04]")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1"><p className="text-xs font-semibold">Q{q.question_number}. {q.problem_statement}</p><p className="mt-1 text-[11px] text-text-secondary">Selected: <span className="text-text-primary">{q.selected_statement||"—"}</span></p>{q.status!=="correct" && q.correct_answer && <p className="mt-0.5 text-[11px] text-emerald-500">Correct: {q.correct_answer}</p>}</div>
                            <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", q.status==="correct" ? "bg-emerald-500/15 text-emerald-500" : q.status==="wrong" ? "bg-red-500/15 text-red-500" : "bg-orange-500/15 text-orange-500")}>{q.status}</span>
                          </div>
                        </div>
                      ))}</div></div>
                    )}
                  </>
                ) : <div className="py-16 text-center text-text-muted"><Clock className="mx-auto h-8 w-8" /><p className="mt-2 text-sm">No submission found.</p></div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
