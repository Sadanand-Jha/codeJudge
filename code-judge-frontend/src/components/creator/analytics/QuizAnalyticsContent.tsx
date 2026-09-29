"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Crown,
  Trophy,
  Users,
  Target,
  Download,
  ArrowLeft,
  CheckCircle2,
  Search,
  Lightbulb,
  Flame,
  Gauge,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  PageHeader,
  StatCardSkeleton,
  Panel,
  PanelSkeleton,
  EmptyState,
  ErrorState,
  BillButton,
} from "@/components/creator/billing/ui";
import { getQuizAnalytics, getAdminQuizById, type Quiz } from "@/services/quiz";
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

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value: unknown): number {
  return Math.min(100, Math.max(0, toNumber(value)));
}

type InsightTone = "rose" | "emerald" | "amber";

const insightToneStyles: Record<InsightTone, {
  icon: string;
  rank: string;
  badge: string;
  bar: string;
}> = {
  rose: {
    icon: "border-rose-500/20 bg-rose-500/10 text-rose-500",
    rank: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    bar: "bg-rose-500",
  },
  emerald: {
    icon: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    rank: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  amber: {
    icon: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    rank: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    bar: "bg-amber-500",
  },
};

function OverviewMetric({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/55 p-4 transition-colors hover:border-pink-500/25 dark:bg-white/[0.025]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-pink-500/10 text-pink-500 dark:bg-violet-500/15 dark:text-violet-300">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-text-primary tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{hint}</p>
    </div>
  );
}

function QuestionInsightPanel({
  title,
  subtitle,
  icon: Icon,
  tone,
  questions,
  metric,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: InsightTone;
  questions: any[];
  metric: (question: any) => string;
}) {
  const styles = insightToneStyles[tone];

  return (
    <section className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(17,24,39,0.04),0_12px_30px_rgba(17,24,39,0.035)] sm:p-5 dark:shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
      <div className="mb-4 flex items-start gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border", styles.icon)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-text-primary">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-text-secondary">{subtitle}</p>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="grid min-h-56 flex-1 place-items-center rounded-xl border border-dashed border-border bg-background/40 px-5 text-center">
          <div>
            <ListChecks className="mx-auto h-5 w-5 text-text-muted" />
            <p className="mt-2 text-sm font-semibold text-text-primary">No ranked questions yet</p>
            <p className="mt-1 text-xs text-text-muted">Rankings appear after students submit responses.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {questions.map((question, index) => {
            const accuracy = clampPercent(question.accuracy);
            return (
              <div key={question.id ?? question.question_number} className="group rounded-xl border border-border/70 bg-background/45 p-3 transition-colors hover:border-border-hover dark:bg-white/[0.02]">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black", styles.rank)}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Question {question.question_number}</p>
                        <p className="mt-0.5 line-clamp-2 min-h-9 text-xs font-semibold leading-[18px] text-text-primary" title={cleanStatement(question.problem_statement)}>
                          {cleanStatement(question.problem_statement)}
                        </p>
                      </div>
                      <span className={cn("shrink-0 rounded-full border px-2 py-1 text-[11px] font-black tabular-nums", styles.badge)}>
                        {metric(question)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                        <div className={cn("h-full rounded-full", styles.bar)} style={{ width: `${accuracy}%` }} />
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-text-muted tabular-nums">
                        {toNumber(question.total_responses)} responses
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
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
      const [q, a] = await Promise.all([getAdminQuizById(quizId), getQuizAnalytics(quizId)]);
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

  const completionPct = clampPercent(stats.completion_rate);
  const passRate = clampPercent(stats.pass_rate);

  // Derived stats
  const totalQuestions = questions.length;
  const attemptedQuestions = questions.filter((question: any) => toNumber(question.total_responses) > 0);
  const avgCorrectPct = attemptedQuestions.length
    ? attemptedQuestions.reduce((sum: number, question: any) => sum + clampPercent(question.accuracy), 0) / attemptedQuestions.length
    : 0;
  const hardest = [...attemptedQuestions]
    .sort((a: any, b: any) => clampPercent(a.accuracy) - clampPercent(b.accuracy) || toNumber(b.total_responses) - toNumber(a.total_responses) || toNumber(a.question_number) - toNumber(b.question_number))
    .slice(0, 5);
  const easiest = [...attemptedQuestions]
    .sort((a: any, b: any) => clampPercent(b.accuracy) - clampPercent(a.accuracy) || toNumber(b.total_responses) - toNumber(a.total_responses) || toNumber(a.question_number) - toNumber(b.question_number))
    .slice(0, 5);
  const timeConsuming = attemptedQuestions
    .filter((question: any) => toNumber(question.avg_time_ms) > 0)
    .sort((a: any, b: any) => toNumber(b.avg_time_ms) - toNumber(a.avg_time_ms) || toNumber(a.question_number) - toNumber(b.question_number))
    .slice(0, 5);
  const averageScore = toNumber(stats.average_score);
  const medianScore = toNumber(stats.median_score);
  const averageAccuracy = toNumber(stats.average_accuracy) || avgCorrectPct;
  const totalAttempts = toNumber(stats.total_attempts);
  const completedAttempts = toNumber(stats.completed_attempts);
  const totalRegistrations = toNumber(stats.total_registrations);
  const inProgressAttempts = toNumber(stats.in_progress_attempts);

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
        subtitle={`${quiz?.code || "No code"} · ${totalQuestions} questions · ${totalAttempts} attempts`}
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

      {/* Clear, compact overview */}
      <section className="overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_14px_40px_rgba(17,24,39,0.06)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-pink-500/[0.07] via-transparent to-violet-500/[0.08] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-pink-500/20 bg-pink-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-pink-600 dark:text-pink-300">
                Analytics overview
              </span>
              <span className="rounded-full border border-border bg-card/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                {quiz?.status || "Draft"}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-black tracking-tight text-text-primary sm:text-xl">How this quiz is performing</h2>
            <p className="mt-1 text-sm text-text-secondary">A focused view of participation, outcomes, and question quality.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/75 px-4 py-3 backdrop-blur-sm">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><Gauge className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Quiz difficulty</p>
              <p className="mt-0.5 text-sm font-bold text-text-primary">{quiz?.difficulty_name || "Not set"}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
          <OverviewMetric label="Attempts" value={String(totalAttempts)} hint={`${totalRegistrations} students registered`} icon={Users} />
          <OverviewMetric label="Completion" value={`${completionPct.toFixed(1)}%`} hint={`${completedAttempts} completed · ${inProgressAttempts} in progress`} icon={CheckCircle2} />
          <OverviewMetric label="Average score" value={averageScore.toFixed(1)} hint={`Median ${medianScore.toFixed(1)} · High ${toNumber(stats.highest_score).toFixed(0)}`} icon={Trophy} />
          <OverviewMetric label="Pass rate" value={`${passRate.toFixed(1)}%`} hint={`${toNumber(stats.passed_count)} of ${totalAttempts} attempts passed`} icon={Target} />
        </div>

        <div className="grid grid-cols-2 border-t border-border bg-background/30 sm:grid-cols-4 dark:bg-white/[0.015]">
          {[
            ["Average accuracy", `${averageAccuracy.toFixed(1)}%`],
            ["Average time", formatTime(toNumber(stats.average_completion_time))],
            ["Fastest finish", formatTime(toNumber(stats.fastest_time))],
            ["Power-up uses", String(totalGameUses)],
          ].map(([label, value], index) => (
            <div key={label} className={cn("px-4 py-3.5 sm:px-5", index % 2 !== 0 && "border-l border-border", index >= 2 && "border-t border-border sm:border-t-0", index === 2 && "sm:border-l")}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
              <p className="mt-1 text-sm font-black text-text-primary tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-black tracking-tight text-text-primary">Question intelligence</h2>
            <p className="mt-0.5 text-xs text-text-secondary">Only questions with at least one submitted response are ranked.</p>
          </div>
          <span className="text-[11px] font-semibold text-text-muted">Top 5 in each category</span>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
          <QuestionInsightPanel
            title="Hardest questions"
            subtitle="Lowest accuracy — review wording or concepts"
            icon={Flame}
            tone="rose"
            questions={hardest}
            metric={(question) => `${clampPercent(question.accuracy).toFixed(1)}%`}
          />
          <QuestionInsightPanel
            title="Easiest questions"
            subtitle="Highest accuracy — strongest student outcomes"
            icon={Crown}
            tone="emerald"
            questions={easiest}
            metric={(question) => `${clampPercent(question.accuracy).toFixed(1)}%`}
          />
          <QuestionInsightPanel
            title="Slowest questions"
            subtitle="Highest average response time"
            icon={Clock}
            tone="amber"
            questions={timeConsuming}
            metric={(question) => `${(toNumber(question.avg_time_ms) / 1000).toFixed(1)}s`}
          />
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Score Distribution" subtitle="Marks clustered — 10% buckets">
          {scoreDistribution.length === 0 ? (
            <div className="py-10 text-center text-sm text-text-muted">No completed attempts yet.</div>
          ) : (
            <>
              <MiniBarChart data={scoreDistChart} height={220} formatter={(v) => `${v}`} />
              <p className="mt-2 text-[11px] text-text-muted">Mean {averageScore.toFixed(1)} · Median {medianScore.toFixed(1)} · σ {toNumber(stats.stddev_score).toFixed(1)}</p>
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
                      <span className="font-semibold">{clampPercent(q.accuracy).toFixed(1)}%</span>
                      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${clampPercent(q.accuracy)}%` }} /></span>
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
          {attemptedQuestions.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No attempted questions yet.</div> : <MiniBarChart data={[...attemptedQuestions].sort((a:any,b:any)=>clampPercent(b.accuracy)-clampPercent(a.accuracy)).map((q:any)=>({label:`Q${q.question_number}`, value: clampPercent(q.accuracy)}))} height={220} formatter={(v)=>`${v}%`} barClassName="bg-emerald-500" />}
        </Panel>
        <Panel title="Time Spent by Question" subtitle="Avg time — most time-consuming">
          {timeConsuming.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No per-question timing recorded yet. Time is tracked via events once enabled.</div> : <MiniBarChart data={[...attemptedQuestions].filter((q:any)=>toNumber(q.avg_time_ms)>0).sort((a:any,b:any)=>toNumber(b.avg_time_ms)-toNumber(a.avg_time_ms)).slice(0,10).map((q:any)=>({label:`Q${q.question_number}`, value: Math.round(toNumber(q.avg_time_ms)/1000)}))} height={220} formatter={(v)=>`${v}s`} barClassName="bg-amber-500" />}
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
            <MiniBarChart data={game.by_type.map((g:any)=>({label:g.event_type, value:g.total_uses}))} height={200} formatter={(v)=>`${v}`} barClassName="bg-violet-500" />
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
          {fiftyByQ.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No 50-50 uses yet.</div> : <MiniBarChart data={fiftyByQ.slice(0,10).map((r:any)=>{ const q=questions.find((qq:any)=>String(qq.id)===String(r.question_id)); return {label: q ? `Q${q.question_number}`: `Q${r.question_id}`, value: r.uses}; })} height={220} barClassName="bg-pink-500" />}
        </Panel>
        <Panel title="Power-up Timeline (7d)" subtitle="Uses over time">
          {timeline.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No timeline data.</div> : <MiniBarChart data={timeline.slice(-12).map((t:any)=>({label: new Date(t.hour).toLocaleDateString("en-IN",{month:"short",day:"numeric"}), value: t.cnt}))} height={220} barClassName="bg-violet-500" />}
        </Panel>
      </div>

      <Panel title="Lives Analytics" subtitle="Distribution of lives remaining (from config)">
        {livesDist.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">No lives data.</div> : <MiniBarChart data={livesDist.map((d:any)=>({label: `${d.lives_remaining} ♥`, value: d.count}))} height={200} barClassName="bg-emerald-500" />}
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
