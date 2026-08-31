"use client";

import { useEffect, useState } from "react";
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
} from "@/components/creator/billing/ui";
import { getQuizAnalytics, getQuizById, type QuizAnalytics } from "@/services/quiz";
import { MiniBarChart } from "./charts";

function formatTime(sec: number | null): string {
  if (!sec || sec === 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
}

export default function QuizAnalyticsContent({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<any>(null);
  const [data, setData] = useState<QuizAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, a] = await Promise.all([getQuizById(quizId), getQuizAnalytics(quizId)]);
      setQuiz(q);
      setData(a);
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
  const questions = data?.question_stats ?? [];

  // Prepare chart data: correct % per question
  const chartData = questions.map((q) => ({
    label: `Q${q.question_number}`,
    value: q.total_attempts ? Math.round((q.correct_responses / Math.max(1, q.total_responses)) * 100) : 0,
  }));

  const handleExport = () => {
    if (!data || !quiz) return;
    const header = ["Q#", "Statement", "Type", "Difficulty", "Attempts", "Responses", "Correct", "Correct %"];
    const rows = questions.map((q) => [
      q.question_number,
      `"${(q.problem_statement || "").replace(/"/g, '""')}"`,
      q.problem_type || "",
      q.difficulty_name || "",
      q.total_attempts,
      q.total_responses,
      q.correct_responses,
      q.total_responses ? ((q.correct_responses / q.total_responses) * 100).toFixed(1) + "%" : "0%",
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-${quiz.code}-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <EmptyState title="No analytics yet" description="Once students attempt this quiz, analytics will appear here." action={<BillButton href={`/creator/quizzes/${quizId}/edit`}>Edit Quiz</BillButton>} />
      </div>
    );
  }

  const completionPct = parseFloat(String(stats.completion_rate)) || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Link href="/creator/quizzes" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <PageHeader
        title={quiz?.name || "Quiz Analytics"}
        subtitle={`${quiz?.code || ""} · ${stats.total_attempts} attempts · ${stats.total_registrations} registered`}
        actions={
          <div className="flex items-center gap-2">
            <BillButton variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} href="/creator/quizzes">
              Back to Quizzes
            </BillButton>
            <BillButton variant="ghost" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Export CSV
            </BillButton>
          </div>
        }
      />

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Attempts" value={stats.total_attempts} display={String(stats.total_attempts)} accent="info" icon={<BarChart3 className="h-3.5 w-3.5" />} hint={`${stats.total_registrations} registered`} />
        <StatCard label="Completion Rate" value={completionPct} display={`${completionPct.toFixed(1)}%`} accent="success" icon={<Target className="h-3.5 w-3.5" />} hint={`${stats.total_attempts} / ${stats.total_registrations || 0}`} />
        <StatCard label="Average Score" value={Math.round(stats.average_score)} display={stats.average_score.toFixed(1)} accent="primary" icon={<Trophy className="h-3.5 w-3.5" />} hint="out of max" />
        <StatCard label="Avg. Time" value={Math.round(stats.average_completion_time)} display={formatTime(stats.average_completion_time)} accent="warning" icon={<Timer className="h-3.5 w-3.5" />} hint="per attempt" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Highest Score" value={stats.highest_score} display={String(stats.highest_score)} accent="gold" icon={<Crown className="h-3.5 w-3.5" />} hint="top" />
        <StatCard label="Lowest Score" value={stats.lowest_score} display={String(stats.lowest_score)} accent="warning" icon={<TrendingDown className="h-3.5 w-3.5" />} hint="low" />
        <StatCard label="Registered" value={stats.total_registrations} display={String(stats.total_registrations)} accent="info" icon={<Users className="h-3.5 w-3.5" />} hint="total" />
        <StatCard label="Completion" value={completionPct} display={`${stats.total_attempts} attempts`} accent="success" icon={<Award className="h-3.5 w-3.5" />} hint={`${completionPct.toFixed(1)}% rate`} />
      </div>

      {/* Correct % per question chart */}
      {chartData.length > 0 && (
        <Panel title="Correct % per Question" subtitle={`${questions.length} questions · higher is easier`}>
          <MiniBarChart data={chartData} height={220} formatter={(v) => `${v}%`} />
        </Panel>
      )}

      {/* Question breakdown */}
      <Panel title="Question-wise Breakdown" subtitle="Attempts, responses and correct rate per question">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-3 py-2.5">Q#</th>
                <th className="px-3 py-2.5">Statement</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Difficulty</th>
                <th className="px-3 py-2.5 text-right">Attempts</th>
                <th className="px-3 py-2.5 text-right">Responses</th>
                <th className="px-3 py-2.5 text-right">Correct</th>
                <th className="px-3 py-2.5 text-right">Correct %</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, i) => {
                const pct = q.total_responses ? (q.correct_responses / q.total_responses) * 100 : 0;
                return (
                  <motion.tr
                    key={q.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/60 text-xs hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3 font-bold tabular-nums">{q.question_number}</td>
                    <td className="px-3 py-3 max-w-[320px] truncate font-medium text-text-primary" title={q.problem_statement}>
                      {q.problem_statement}
                    </td>
                    <td className="px-3 py-3 text-text-secondary">{q.problem_type || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          q.difficulty_name === "Easy" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
                          q.difficulty_name === "Medium" && "border-amber-500/20 bg-amber-500/10 text-amber-500",
                          q.difficulty_name === "Hard" && "border-red-500/20 bg-red-500/10 text-red-500",
                          !q.difficulty_name && "border-border bg-card text-text-muted"
                        )}
                      >
                        {q.difficulty_name || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{q.total_attempts}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{q.total_responses}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-emerald-500">{q.correct_responses}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-semibold tabular-nums">{pct.toFixed(1)}%</span>
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                          <span className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500" style={{ width: `${Math.min(100, pct)}%` }} />
                        </span>
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-sm text-text-muted">
                    No questions found for this quiz.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Hardest / Easiest */}
      {questions.length >= 2 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Hardest Questions" subtitle="Lowest correct %">
            {[...questions]
              .sort((a, b) => (a.correct_responses / Math.max(1, a.total_responses)) - (b.correct_responses / Math.max(1, b.total_responses)))
              .slice(0, 3)
              .map((q) => {
                const pct = q.total_responses ? (q.correct_responses / q.total_responses) * 100 : 0;
                return (
                  <div key={q.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-white/[0.02] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">Q{q.question_number}. {q.problem_statement}</p>
                      <p className="text-[11px] text-text-muted">{q.problem_type} · {q.difficulty_name || "—"}</p>
                    </div>
                    <span className="ml-3 shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-500">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
          </Panel>
          <Panel title="Easiest Questions" subtitle="Highest correct %">
            {[...questions]
              .sort((a, b) => (b.correct_responses / Math.max(1, b.total_responses)) - (a.correct_responses / Math.max(1, a.total_responses)))
              .slice(0, 3)
              .map((q) => {
                const pct = q.total_responses ? (q.correct_responses / q.total_responses) * 100 : 0;
                return (
                  <div key={q.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-white/[0.02] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">Q{q.question_number}. {q.problem_statement}</p>
                      <p className="text-[11px] text-text-muted">{q.problem_type} · {q.difficulty_name || "—"}</p>
                    </div>
                    <span className="ml-3 shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-500">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
          </Panel>
        </div>
      )}
    </div>
  );
}
