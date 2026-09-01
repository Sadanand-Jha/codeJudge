"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  Crown,
  Medal,
  Trophy,
  Users,
  Target,
  Timer,
  Award,
  TrendingUp,
  TrendingDown,
  Download,
  ArrowLeft,
  CheckCircle2,
  X,
  UserX,
  Search,
  ChevronDown,
  Lightbulb,
  Zap,
  Heart,
  Skull,
  Activity,
  Layers,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/helpers";
import {
  PageHeader,
  StatCard,
  StatCardSkeleton,
  Panel,
  PanelSkeleton,
  EmptyState,
  ErrorState,
  BillButton,
  SegmentedControl,
} from "@/components/creator/billing/ui";
import { getQuizAnalytics, getQuizById, type QuizAnalytics, type Quiz } from "@/services/quiz";
import { MiniBarChart } from "./charts";

function formatTime(sec: number | null | undefined): string {
  if (!sec || sec === 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
}

function cleanStatement(raw: string | null | undefined): string {
  if (!raw) return "Untitled question";
  let t = String(raw);
  // Decode common entities
  t = t.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  // Strip HTML tags
  t = t.replace(/<[^>]*>/g, " ");
  // Collapse whitespace
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > 120) t = t.slice(0, 120) + "…";
  return t || "Untitled question";
}

function prettyType(t: string | null | undefined): string {
  if (!t) return "—";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Tooltip({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-text-primary shadow-xl group-hover:block">
        {tip}
      </span>
    </span>
  );
}

export default function QuizAnalyticsContent({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [studentSort, setStudentSort] = useState<"rank" | "score" | "time">("rank");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, a] = await Promise.all([getQuizById(quizId), getQuizAnalytics(quizId)]);
      setQuiz(q as any);
      setData(a as any);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const stats = data?.stats;
  const questions: any[] = data?.question_stats || [];
  const scoreDistribution: any[] = data?.score_distribution || [];
  const scoreVsTime: any[] = data?.score_vs_time || [];
  const funnel: any[] = data?.funnel || [];
  const students: any[] = data?.students || [];
  const insights: string[] = data?.insights || [];
  const game = data?.game || { by_type: [] as any[] };
  const fiftyByQ: any[] = data?.fifty_fifty_by_question || [];
  const timeline: any[] = data?.powerup_timeline || [];
  const livesDist: any[] = data?.lives_distribution || [];
  const difficultyStats: any[] = data?.difficulty_stats || [];

  const filteredStudents = useMemo(() => {
    let list = [...students];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => `${s.username} ${s.user_id}`.toLowerCase().includes(q));
    }
    if (studentSort === "score") list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    else if (studentSort === "time") list.sort((a, b) => (a.time_taken ?? 0) - (b.time_taken ?? 0));
    else list.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    return list;
  }, [students, search, studentSort]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <StatCardSkeleton />
        <PanelSkeleton title="Overview" />
        <PanelSkeleton title="Questions" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }
  if (!data || !stats) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState title="No analytics yet" description="Once students attempt this quiz, analytics will appear here." />
      </div>
    );
  }

  const completionPct = parseFloat(String(stats.completion_rate)) || 0;
  const passRate = parseFloat(String(stats.pass_rate)) || 0;

  // Derived stats
  const totalQuestions = questions.length;
  const avgCorrectPct = questions.length ? (questions.reduce((a: number, q: any) => a + (q.accuracy || 0), 0) / questions.length).toFixed(1) : "0";
  const hardest = [...questions].sort((a: any, b: any) => a.accuracy - b.accuracy).slice(0, 5);
  const easiest = [...questions].sort((a: any, b: any) => b.accuracy - a.accuracy).slice(0, 5);
  const timeConsuming = [...questions].sort((a: any, b: any) => (b.avg_time_ms || 0) - (a.avg_time_ms || 0)).slice(0, 5);

  // Score distribution chart labels
  const scoreDistChart = scoreDistribution.map((b: any) => {
    const bucket = parseInt(b.bucket);
    const start = (bucket - 1) * 10;
    const end = bucket * 10;
    return { label: `${start}-${end}%`, value: b.count };
  });

  // Game usage total
  const totalGameUses = game.by_type?.reduce((a: number, b: any) => a + b.total_uses, 0) || 0;

  return (
    <div className="min-w-0 w-full p-4 sm:p-6 lg:p-8 space-y-5">
      <PageHeader
        title={quiz?.name || "Quiz Analytics"}
        subtitle={`${quiz?.code || ""} · Subject: ${quiz?.subject_id || "—"} · Difficulty: ${quiz?.difficulty_name || "—"} · Status: ${quiz?.status || "draft"} · ${stats.total_attempts} attempts · ${stats.total_registrations} registered`}
        actions={
          <div className="flex items-center gap-2">
            <BillButton variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} href="/creator/quizzes">
              Back to Quizzes
            </BillButton>
            <BillButton
              variant="ghost"
              icon={<Download className="h-4 w-4" />}
              onClick={() => {
                const header = ["Q#", "Statement", "Type", "Difficulty", "Attempts", "Responses", "Correct", "Accuracy", "Avg Time"];
                const rows = questions.map((q: any) => [q.question_number, `"${(q.problem_statement || "").replace(/"/g, '""')}"`, q.problem_type || "", q.difficulty_name || "", q.total_responses, q.correct_responses, q.accuracy + "%", q.avg_time_ms ? (q.avg_time_ms / 1000).toFixed(1) + "s" : "—"]);
                const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `quiz-${quiz?.code || quizId}-analytics.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </BillButton>
          </div>
        }
      />

      {/* KPI: Participation */}
      <div className="min-w-0">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Participation</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Tooltip tip="Total registered for this quiz">
            <StatCard label="Registered" value={stats.total_registrations} display={String(stats.total_registrations)} accent="info" icon={<Users className="h-3.5 w-3.5" />} hint="registered" />
          </Tooltip>
          <Tooltip tip="Attempts started (any status)">
            <StatCard label="Started" value={stats.total_attempts} display={String(stats.total_attempts)} accent="primary" icon={<Activity className="h-3.5 w-3.5" />} hint={`${stats.completed_attempts} completed`} />
          </Tooltip>
          <Tooltip tip="Completed attempts">
            <StatCard label="Completed" value={stats.completed_attempts} display={String(stats.completed_attempts)} accent="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} hint={`${stats.in_progress_attempts} in progress`} />
          </Tooltip>
          <Tooltip tip="Abandoned = started - completed">
            <StatCard label="Abandoned" value={Math.max(0, stats.total_attempts - stats.completed_attempts)} display={String(Math.max(0, stats.total_attempts - stats.completed_attempts))} accent="warning" icon={<X className="h-3.5 w-3.5" />} hint="not submitted" />
          </Tooltip>
          <StatCard label="Completion Rate" value={completionPct} display={`${completionPct.toFixed(1)}%`} accent="success" icon={<Target className="h-3.5 w-3.5" />} hint="completed / registered" />
        </div>
      </div>

      {/* KPI: Performance */}
      <div className="min-w-0">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Performance</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Average Score" value={Math.round(stats.average_score)} display={stats.average_score.toFixed(1)} accent="primary" icon={<Trophy className="h-3.5 w-3.5" />} hint={`median ${Number(stats.median_score).toFixed(1)}`} />
          <StatCard label="Median Score" value={Math.round(stats.median_score)} display={Number(stats.median_score).toFixed(1)} accent="info" icon={<BarChart3 className="h-3.5 w-3.5" />} hint={`std ${Number(stats.stddev_score).toFixed(1)}`} />
          <StatCard label="Highest" value={stats.highest_score} display={String(stats.highest_score)} accent="gold" icon={<Crown className="h-3.5 w-3.5" />} hint="max" />
          <StatCard label="Lowest" value={stats.lowest_score} display={String(stats.lowest_score)} accent="warning" icon={<TrendingDown className="h-3.5 w-3.5" />} hint="min" />
          <StatCard label="Pass Rate" value={parseFloat(passRate as any)} display={`${passRate}%`} accent="success" icon={<Award className="h-3.5 w-3.5" />} hint={`${stats.passed_count}/${stats.total_attempts} passed`} />
          <StatCard label="Avg Accuracy" value={Math.round(parseFloat(String(stats.average_accuracy)) || Number(avgCorrectPct))} display={`${Number(stats.average_accuracy || avgCorrectPct).toFixed(1)}%`} accent="primary" icon={<Target className="h-3.5 w-3.5" />} hint="avg correct" />
        </div>
      </div>

      {/* KPI: Timing & Engagement */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Timing</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Avg Time" value={Math.round(stats.average_completion_time || 0)} display={formatTime(stats.average_completion_time)} accent="warning" icon={<Timer className="h-3.5 w-3.5" />} hint={`median ${formatTime(stats.median_time)}`} />
            <StatCard label="Fastest" value={stats.fastest_time || 0} display={formatTime(stats.fastest_time)} accent="success" icon={<TrendingUp className="h-3.5 w-3.5" />} hint="min" />
            <StatCard label="Slowest" value={stats.slowest_time || 0} display={formatTime(stats.slowest_time)} accent="warning" icon={<TrendingDown className="h-3.5 w-3.5" />} hint="max" />
            <StatCard label="Avg per Q" value={questions.length ? Math.round((stats.average_completion_time || 0) / Math.max(1, totalQuestions)) : 0} display={questions.length ? formatTime((stats.average_completion_time || 0) / totalQuestions) : "—"} accent="info" icon={<Clock className="h-3.5 w-3.5" />} hint={`${totalQuestions} Qs`} />
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Engagement</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Avg Attempted" value={questions.length ? Math.round(questions.reduce((a: number, q: any) => a + (q.total_responses || 0), 0) / Math.max(1, stats.total_attempts)) : 0} display={`${questions.length ? (questions.reduce((a: number, q: any) => a + (q.total_responses || 0), 0) / Math.max(1, stats.total_attempts)).toFixed(1) : "0"} / ${totalQuestions}`} accent="info" icon={<Layers className="h-3.5 w-3.5" />} hint="per student" />
            <StatCard label="Avg Skipped" value={questions.length ? Math.round(questions.reduce((a: number, q: any) => a + (q.skipped_count || 0), 0) / Math.max(1, stats.total_attempts)) : 0} display={`${questions.length ? (questions.reduce((a: number, q: any) => a + (q.skipped_count || 0), 0) / Math.max(1, stats.total_attempts)).toFixed(1) : "0"}`} accent="warning" icon={<UserX className="h-3.5 w-3.5" />} hint="per student" />
            <StatCard label="Game Uses" value={totalGameUses} display={String(totalGameUses)} accent="primary" icon={<Zap className="h-3.5 w-3.5" />} hint={`${game.by_type?.length || 0} types`} />
            <StatCard label="Lives (cfg)" value={data?.quiz?.total_marks || 0} display={String(data?.quiz?.total_marks ?? "—")} accent="gold" icon={<Heart className="h-3.5 w-3.5" />} hint="see lives dist below" />
          </div>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Score Distribution" subtitle="Marks clustered — 10% buckets">
          {scoreDistribution.length === 0 ? (
            <div className="py-10 text-center text-sm text-text-muted">No completed attempts yet.</div>
          ) : (
            <>
              <MiniBarChart data={scoreDistChart} height={180} formatter={(v) => `${v}`} />
              <p className="mt-2 text-[11px] text-text-muted">Mean {stats.average_score.toFixed(1)} · Median {Number(stats.median_score).toFixed(1)} · σ {Number(stats.stddev_score).toFixed(1)}</p>
            </>
          )}
        </Panel>
        <Panel title="Score vs Time" subtitle="X=time, Y=score — identify fast vs slow performers">
          {scoreVsTime.length === 0 ? (
            <div className="py-10 text-center text-sm text-text-muted">No timing data.</div>
          ) : (
            <div className="relative h-[180px] w-full overflow-hidden rounded-xl border border-border bg-card">
              {(() => {
                const maxTime = Math.max(...scoreVsTime.map((p: any) => p.x), 1);
                const maxScore = Math.max(...scoreVsTime.map((p: any) => p.y), 1);
                return scoreVsTime.map((p: any, i: number) => (
                  <div
                    key={i}
                    className="group absolute h-2 w-2 -translate-x-1 -translate-y-1 rounded-full bg-pink-500"
                    style={{ left: `${(p.x / maxTime) * 100}%`, bottom: `${(p.y / maxScore) * 100}%` }}
                  >
                    <span className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] shadow-xl group-hover:block">
                      {p.username || p.user_id}: {p.y} pts · {formatTime(p.x)}
                    </span>
                  </div>
                ));
              })()}
            </div>
          )}
        </Panel>
        <Panel title="Completion Funnel" subtitle="Reached per question — drop-off">
          {funnel.length === 0 ? (
            <div className="py-10 text-center text-sm text-text-muted">No funnel data.</div>
          ) : (
            <div className="space-y-1.5">
              {funnel.map((f: any, i: number) => {
                const max = Math.max(...funnel.map((x: any) => x.reached), 1);
                const drop = i > 0 ? funnel[i - 1].reached - f.reached : 0;
                return (
                  <div key={f.question_number} className="flex items-center gap-2">
                    <span className="w-8 text-[11px] font-bold tabular-nums">Q{f.question_number}</span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500" style={{ width: `${(f.reached / max) * 100}%` }} />
                      </div>
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums">{f.reached}</span>
                    {drop > 0 && <span className="w-12 text-right text-[10px] text-red-500">-{drop}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Question Analytics */}
      <Panel title="Question Analytics" subtitle={`Accuracy & time for ${totalQuestions} questions`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-3 py-2.5">Q#</th>
                <th className="px-3 py-2.5">Statement</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Difficulty</th>
                <th className="px-3 py-2.5 text-right">Attempts</th>
                <th className="px-3 py-2.5 text-right">Correct</th>
                <th className="px-3 py-2.5 text-right">Incorrect</th>
                <th className="px-3 py-2.5 text-right">Skipped</th>
                <th className="px-3 py-2.5 text-right">Accuracy</th>
                <th className="px-3 py-2.5 text-right">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q: any) => (
                <tr key={q.id} className="border-b border-border/60 text-xs hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 font-bold">{q.question_number}</td>
                  <td className="max-w-[260px] truncate px-3 py-2.5 font-medium" title={cleanStatement(q.problem_statement)}>{cleanStatement(q.problem_statement)}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{prettyType(q.problem_type)}</td>
                  <td className="px-3 py-2.5"><span className="rounded-full border border-border px-2 py-0.5 text-[10px]">{q.difficulty_name || "—"}</span></td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{q.total_responses}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-500 tabular-nums">{q.correct_responses}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{q.incorrect_responses}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{q.skipped_count}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-semibold">{q.accuracy}%</span>
                      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.06]"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, q.accuracy)}%` }} /></span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{q.avg_time_ms ? `${(q.avg_time_ms / 1000).toFixed(1)}s` : "—"}</td>
                </tr>
              ))}
              {questions.length === 0 && <tr><td colSpan={10} className="py-12 text-center text-sm text-text-muted">No questions.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Accuracy by Question (easiest → hardest)" subtitle="Higher is easier">
          {questions.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No data</div> : <MiniBarChart data={[...questions].sort((a:any,b:any)=>b.accuracy-a.accuracy).map((q:any)=>({label:`Q${q.question_number}`, value: q.accuracy}))} height={180} formatter={(v)=>`${v}%`} barClassName="bg-emerald-500" />}
        </Panel>
        <Panel title="Time Spent by Question" subtitle="Avg time — most time-consuming">
          {questions.every((q:any)=>!q.avg_time_ms) ? <div className="py-8 text-center text-sm text-text-muted">No per-question timing recorded yet. Time is tracked via events once enabled.</div> : <MiniBarChart data={[...questions].sort((a:any,b:any)=>(b.avg_time_ms||0)-(a.avg_time_ms||0)).slice(0,10).map((q:any)=>({label:`Q${q.question_number}`, value: Math.round((q.avg_time_ms||0)/1000)}))} height={180} formatter={(v)=>`${v}s`} barClassName="bg-amber-500" />}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Hardest Questions" subtitle="Lowest accuracy">
          {hardest.length === 0 ? <div className="py-6 text-center text-sm text-text-muted">No data</div> : hardest.map((q:any)=>(<div key={q.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-white/[0.02] p-3"><div className="min-w-0"><p className="truncate text-xs font-semibold">Q{q.question_number}. {cleanStatement(q.problem_statement)}</p><p className="text-[11px] text-text-muted">{q.accuracy}% · {q.total_responses} attempts</p></div><span className="ml-2 rounded-full bg-red-500/10 px-2 py-1 text-xs font-bold text-red-500">{q.accuracy}%</span></div>))}
        </Panel>
        <Panel title="Easiest Questions" subtitle="Highest accuracy">
          {easiest.length === 0 ? <div className="py-6 text-center text-sm text-text-muted">No data</div> : easiest.map((q:any)=>(<div key={q.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-white/[0.02] p-3"><div className="min-w-0"><p className="truncate text-xs font-semibold">Q{q.question_number}. {cleanStatement(q.problem_statement)}</p><p className="text-[11px] text-text-muted">{q.accuracy}% · {q.total_responses} attempts</p></div><span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-500">{q.accuracy}%</span></div>))}
        </Panel>
        <Panel title="Most Time-Consuming" subtitle="Avg time spent">
          {timeConsuming.length === 0 || timeConsuming.every((q:any)=>!q.avg_time_ms) ? <div className="py-6 text-center text-sm text-text-muted">No timing data</div> : timeConsuming.map((q:any)=>(<div key={q.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-white/[0.02] p-3"><div className="min-w-0"><p className="truncate text-xs font-semibold">Q{q.question_number}. {cleanStatement(q.problem_statement)}</p><p className="text-[11px] text-text-muted">{q.accuracy}% correct</p></div><span className="ml-2 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-500">{q.avg_time_ms ? (q.avg_time_ms/1000).toFixed(1)+"s" : "—"}</span></div>))}
        </Panel>
      </div>

      {/* Correct/Incorrect/Skipped stacked */}
      <Panel title="Correct / Incorrect / Skipped per Question" subtitle="Stacked view — problematic questions obvious">
        {questions.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No data</div> : (
          <div className="space-y-1.5">
            {questions.map((q:any)=>{
              const total = Math.max(1, q.total_responses + q.skipped_count);
              const cPct = (q.correct_responses/total)*100;
              const iPct = (q.incorrect_responses/total)*100;
              const sPct = (q.skipped_count/total)*100;
              return (
                <div key={q.id} className="flex items-center gap-2 text-xs">
                  <span className="w-8 font-bold">Q{q.question_number}</span>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <span className="bg-emerald-500" style={{width: `${cPct}%`}} />
                    <span className="bg-red-500" style={{width: `${iPct}%`}} />
                    <span className="bg-amber-500" style={{width: `${sPct}%`}} />
                  </div>
                  <span className="w-28 text-right text-[11px] text-text-muted">{q.correct_responses} ✓ · {q.incorrect_responses} ✗ · {q.skipped_count} ∅</span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Game Analytics */}
      <Panel title="Game Analytics — Power-ups & Lifelines" subtitle="Real event data; empty until students use mechanics">
        {game.by_type.length === 0 ? (
          <div className="py-8 text-center">
            <Flame className="mx-auto h-6 w-6 text-text-muted" />
            <p className="mt-2 text-sm font-medium">No game events recorded yet.</p>
            <p className="text-xs text-text-muted">50-50, hints, power-ups and lives will appear here once used.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <MiniBarChart data={game.by_type.map((g:any)=>({label:g.event_type, value:g.total_uses}))} height={160} formatter={(v)=>`${v}`} barClassName="bg-violet-500" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead><tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted"><th className="px-2 py-2">Mechanic</th><th className="px-2 py-2 text-right">Total Uses</th><th className="px-2 py-2 text-right">Unique Users</th><th className="px-2 py-2 text-right">Usage %</th></tr></thead>
                <tbody>{game.by_type.map((g:any)=>(<tr key={g.event_type} className="border-b border-border/60"><td className="px-2 py-2 font-medium">{g.event_type}</td><td className="px-2 py-2 text-right tabular-nums">{g.total_uses}</td><td className="px-2 py-2 text-right tabular-nums">{g.unique_users}</td><td className="px-2 py-2 text-right tabular-nums">{stats.total_attempts ? ((g.unique_users/stats.total_attempts)*100).toFixed(1)+"%" : "—"}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="50-50 Usage by Question" subtitle="Question → uses">
          {fiftyByQ.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No 50-50 uses yet.</div> : <MiniBarChart data={fiftyByQ.slice(0,10).map((r:any)=>{ const q=questions.find((qq:any)=>String(qq.id)===String(r.question_id)); return {label: q ? `Q${q.question_number}`: `Q${r.question_id}`, value: r.uses}; })} height={180} barClassName="bg-pink-500" />}
        </Panel>
        <Panel title="Power-up Timeline (7d)" subtitle="Uses over time">
          {timeline.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No timeline data.</div> : <MiniBarChart data={timeline.slice(-12).map((t:any)=>({label: new Date(t.hour).toLocaleDateString("en-IN",{month:"short",day:"numeric"}), value: t.cnt}))} height={180} barClassName="bg-violet-500" />}
        </Panel>
      </div>

      <Panel title="Lives Analytics" subtitle="Distribution of lives remaining (from config)">
        {livesDist.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No lives data.</div> : <MiniBarChart data={livesDist.map((d:any)=>({label: `${d.lives_remaining} ♥`, value: d.count}))} height={160} barClassName="bg-emerald-500" />}
      </Panel>

      {/* Difficulty & Topic */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Performance by Difficulty" subtitle="Easy / Medium / Hard">
          {difficultyStats.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No difficulty data.</div> : (
            <div className="space-y-2">
              {difficultyStats.map((d:any)=>(
                <div key={d.difficulty} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="w-16 text-xs font-bold">{d.difficulty_name || "—"}</span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full bg-emerald-500" style={{width: `${d.accuracy}%`}} /></div>
                  </div>
                  <span className="w-12 text-right text-xs font-bold">{Number(d.accuracy).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Automated Insights" subtitle="Generated only if data supports">
          {insights.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">Not enough data for insights.</div> : (
            <ul className="space-y-2">
              {insights.map((ins, i)=>(
                <li key={i} className="flex gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-xs">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />{ins}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Student Table */}
      <Panel title="Student Analytics" subtitle="Sortable — click a row for drill-down">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search username or ID" className="h-9 w-full rounded-xl border border-input-border bg-input-bg pl-9 pr-3 text-sm outline-none focus:border-pink-500" />
          </div>
          <div className="flex items-center gap-1">
            {(["rank","score","time"] as const).map(k=>(
              <button key={k} onClick={()=>setStudentSort(k)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold capitalize", studentSort===k ? "border-pink-500 bg-pink-500/10 text-pink-500" : "border-border bg-card")}>{k}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead><tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted"><th className="px-3 py-2">Rank</th><th className="px-3 py-2">Student</th><th className="px-3 py-2 text-right">Score</th><th className="px-3 py-2 text-right">Accuracy</th><th className="px-3 py-2 text-right">Correct</th><th className="px-3 py-2 text-right">Skipped</th><th className="px-3 py-2 text-right">Time</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>
              {filteredStudents.slice(0,50).map((s:any)=>(
                <tr key={s.attempt_id || s.user_id} onClick={()=>setSelectedStudent(s)} className="cursor-pointer border-b border-border/60 hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 font-bold">{s.rank ?? "—"}</td>
                  <td className="px-3 py-2.5"><p className="font-semibold">{s.username}</p><p className="text-[11px] text-text-muted">ID {s.user_id}</p></td>
                  <td className="px-3 py-2.5 text-right font-bold">{s.score ?? 0}</td>
                  <td className="px-3 py-2.5 text-right">{s.percentage != null ? `${Number(s.percentage).toFixed(1)}%` : "—"}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-500">{s.correct_answers ?? 0}</td>
                  <td className="px-3 py-2.5 text-right">{s.skipped_questions ?? 0}</td>
                  <td className="px-3 py-2.5 text-right">{formatTime(s.time_taken)}</td>
                  <td className="px-3 py-2.5"><span className="rounded-full border border-border px-2 py-0.5 text-[10px]">{s.status}</span></td>
                </tr>
              ))}
              {filteredStudents.length===0 && <tr><td colSpan={8} className="py-10 text-center text-sm text-text-muted">No students match.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Individual drill-down */}
      {selectedStudent && (
        <Panel title={`Student: ${selectedStudent.username}`} subtitle={`ID ${selectedStudent.user_id} · Rank ${selectedStudent.rank ?? "—"} · ${selectedStudent.score} pts`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border p-3 text-center"><p className="text-lg font-bold">{selectedStudent.score}</p><p className="text-[11px] text-text-muted">Score</p></div>
            <div className="rounded-xl border border-border p-3 text-center"><p className="text-lg font-bold">{selectedStudent.percentage != null ? `${Number(selectedStudent.percentage).toFixed(1)}%` : "—"}</p><p className="text-[11px] text-text-muted">Accuracy</p></div>
            <div className="rounded-xl border border-border p-3 text-center"><p className="text-lg font-bold">{formatTime(selectedStudent.time_taken)}</p><p className="text-[11px] text-text-muted">Time</p></div>
            <div className="rounded-xl border border-border p-3 text-center"><p className="text-lg font-bold">{selectedStudent.correct_answers ?? 0} ✓ / {selectedStudent.wrong_answers ?? 0} ✗</p><p className="text-[11px] text-text-muted">Correct / Wrong</p></div>
          </div>
          <button onClick={()=>setSelectedStudent(null)} className="mt-4 rounded-xl border border-border px-4 py-2 text-xs font-semibold">Close</button>
        </Panel>
      )}
    </div>
  );
}
