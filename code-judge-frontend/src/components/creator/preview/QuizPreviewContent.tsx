"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  CheckCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  Target,
  Award,
  Users,
  ArrowLeft,
  Eye,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { PageHeader, StatCard, Panel, EmptyState, ErrorState, BillButton, StatusBadge } from "@/components/creator/billing/ui";
import { getQuizById, getQuizProblems, type QuizProblem } from "@/services/quiz";

// ---------- Full student attempt preview (what student sees during quiz) ----------
function StudentAttemptPreview({ quiz, problems }: { quiz: any; problems: QuizProblem[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState((quiz.duration ?? 30) * 60);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // ticking preview timer (paused when showing result)
  useEffect(() => {
    if (showResult) return;
    const t = setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [showResult]);

  const current = problems[currentIdx] as any;
  const progress = ((currentIdx + 1) / Math.max(1, problems.length)) * 100;
  const attempted = Object.keys(answers).length;
  const unanswered = problems.length - attempted;

  const handleSelect = (value: any) => {
    if (!current) return;
    setAnswers((p) => ({ ...p, [current.id]: value }));
  };

  const handleSubmit = () => {
    setShowSubmit(false);
    setShowResult(true);
  };

  if (problems.length === 0) {
    return (
      <Panel title="Live Preview — Student View" subtitle="This is exactly what a student sees during the attempt.">
        <EmptyState title="No questions yet" description="Add questions in the editor to preview the attempt." />
      </Panel>
    );
  }

  if (showResult) {
    // simple preview result (client-side)
    let correct = 0;
    problems.forEach((p: any) => {
      const ans = answers[p.id];
      if (ans == null) return;
      const correctOpt = (p.options || []).find((o: any) => o.iscorrect);
      if (correctOpt && ans === correctOpt.id) correct++;
      else if (correctOpt && String(ans) === String(correctOpt.option_statement)) correct++;
    });
    return (
      <Panel title="Preview Result" subtitle="Client-side preview — real scoring happens on the server.">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-3 text-lg font-bold">Preview Submitted</h3>
          <p className="mt-1 text-sm text-text-secondary">
            {correct} / {problems.length} correct in preview
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <BillButton variant="ghost" onClick={() => setShowResult(false)}>
              Back to Preview
            </BillButton>
            <BillButton onClick={() => setAnswers({})}>Reset Answers</BillButton>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Preview banner */}
      <div className="flex items-center justify-between gap-2 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
        <span className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" /> Preview Mode — Student View (no data is saved)
        </span>
        <span className="hidden sm:inline">Anti-copy & watermark active for real attempts</span>
      </div>

      {/* Header like real attempt */}
      <div className="border-b border-border bg-[#0B0C0F]">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{quiz.name}</p>
            <p className="text-xs text-white/60">
              Q {currentIdx + 1} of {problems.length} · {attempted} answered
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-white">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </span>
            <button
              onClick={() => setShowSubmit(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-500 hover:bg-emerald-500/20"
            >
              <Send className="h-3.5 w-3.5" /> Submit
            </button>
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <motion.div className="h-full bg-pink-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.25 }} />
        </div>
      </div>

      {/* Question */}
      <div className="p-4 sm:p-5">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Q{currentIdx + 1}</span>
            <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold text-pink-500">{current?.quiz_problem_type || "MCQ"}</span>
            {current?.difficulty_name && <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">{current.difficulty_name}</span>}
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-relaxed text-text-primary">{current?.problem_statement || "Question"}</h3>
          {current?.problem_description && <p className="mt-1 text-xs text-text-secondary">{current.problem_description}</p>}

          <div className="mt-4 grid gap-2">
            {(current?.options || []).map((o: any, oi: number) => {
              const isSelected = answers[current.id] === o.id || answers[current.id] === oi;
              return (
                <button
                  key={o.id ?? oi}
                  onClick={() => handleSelect(o.id)}
                  className={cn("flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all", isSelected ? "border-pink-500 bg-pink-500/10" : "border-border bg-card hover:border-pink-500/30")}
                >
                  <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold", isSelected ? "border-pink-500 bg-pink-500 text-white" : "border-border text-text-muted")}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="flex-1">{o.option_statement}</span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-pink-500" />}
                </button>
              );
            })}
            {(!current?.options || current.options.length === 0) && (
              <div className="rounded-xl border border-dashed border-border p-3">
                <p className="text-xs text-text-muted">Free-text / numeric answer — student types the answer.</p>
                <input
                  placeholder="Type your answer..."
                  value={answers[current?.id] ?? ""}
                  onChange={(e) => handleSelect(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-pink-500"
                />
              </div>
            )}
          </div>

          {(current?.explaination || current?.hint) && (
            <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-2">
              {current?.explaination && <div className="rounded-lg bg-violet-500/10 p-2.5 text-xs"><b className="text-violet-500">Explanation</b><p className="mt-1 text-text-secondary">{current.explaination}</p></div>}
              {current?.hint && <div className="rounded-lg bg-amber-500/10 p-2.5 text-xs"><b className="text-amber-500">Hint</b><p className="mt-1 text-text-secondary">{current.hint}</p></div>}
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium disabled:opacity-40">
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <div className="flex items-center gap-1">
            {problems.map((_, i) => (
              <button key={i} onClick={() => setCurrentIdx(i)} className={cn("h-2 w-2 rounded-full", i === currentIdx ? "bg-pink-500" : answers[(problems as any)[i].id] != null ? "bg-emerald-500" : "bg-border")} />
            ))}
          </div>
          <button onClick={() => setCurrentIdx((i) => Math.min(problems.length - 1, i + 1))} disabled={currentIdx === problems.length - 1} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium disabled:opacity-40">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted">
          <span>{attempted} answered · {unanswered} unanswered</span>
          <button onClick={() => setShowSubmit(true)} className="font-semibold text-pink-500 hover:underline">
            Submit preview →
          </button>
        </div>
      </div>

      {/* Submit modal */}
      <AnimatePresence>
        {showSubmit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowSubmit(false)}>
            <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <HelpCircle className="h-4 w-4 text-amber-500" /> Submit preview?
              </h3>
              <p className="mt-1 text-xs text-text-secondary">This is a preview — nothing is saved to the server.</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-card-hover p-3">
                  <p className="font-bold">{problems.length}</p>
                  <p className="text-[10px] text-text-muted">Total</p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-3">
                  <p className="font-bold text-emerald-600">{attempted}</p>
                  <p className="text-[10px] text-text-muted">Attempted</p>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-3">
                  <p className="font-bold text-amber-600">{unanswered}</p>
                  <p className="text-[10px] text-text-muted">Unanswered</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setShowSubmit(false)} className="flex-1 rounded-xl border border-border py-2.5 text-xs font-semibold">
                  Continue
                </button>
                <button onClick={handleSubmit} className="flex-1 rounded-xl bg-pink-500 py-2.5 text-xs font-bold text-white">
                  Submit preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QuizPreviewContent({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<any>(null);
  const [problems, setProblems] = useState<QuizProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, p] = await Promise.all([getQuizById(quizId), getQuizProblems(quizId)]);
      setQuiz(q);
      setProblems(p);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.06]" />
          ))}
        </div>
        <div className="h-[520px] animate-pulse rounded-2xl bg-white/[0.06]" />
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

  if (!quiz) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState title="Quiz not found" description="This quiz does not exist or you don't have access." />
      </div>
    );
  }

  const statusTone = quiz.status === "published" || quiz.status === "live" ? "emerald" : quiz.status === "draft" ? "amber" : "slate";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader
        title={quiz.name}
        subtitle={`Code: ${quiz.code} · ${problems.length} questions · ${quiz.duration ?? 0} min`}
        badge={<StatusBadge label={quiz.status || "draft"} tone={statusTone as any} dot />}
        actions={
          <div className="flex items-center gap-2">
            <BillButton variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} href="/creator/quizzes">
              Back
            </BillButton>
            <BillButton icon={<Pencil className="h-4 w-4" />} href={`/creator/quizzes/${quizId}/edit`}>
              Edit Quiz
            </BillButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Questions" value={problems.length} display={String(problems.length)} accent="primary" icon={<BookOpen className="h-3.5 w-3.5" />} hint="total" />
        <StatCard label="Duration" value={quiz.duration ?? 0} display={`${quiz.duration ?? 0} min`} accent="warning" icon={<Clock className="h-3.5 w-3.5" />} hint="time limit" />
        <StatCard label="Total Marks" value={quiz.total_marks ?? 0} display={String(quiz.total_marks ?? 0)} accent="info" icon={<Target className="h-3.5 w-3.5" />} hint={`pass ${quiz.passing_marks ?? 0}`} />
        <StatCard label="Visibility" value={1} display={quiz.visibility_name || quiz.visibility || "—"} accent="success" icon={<Users className="h-3.5 w-3.5" />} hint={quiz.difficulty_name || ""} />
      </div>

      {/* Full student attempt preview */}
      <StudentAttemptPreview quiz={quiz} problems={problems} />

      <Panel title="Assessment Settings" subtitle="How this quiz behaves for students">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Shuffle Questions", value: quiz.shuffle_questions ? "Yes" : "No" },
            { label: "Shuffle Options", value: quiz.shuffle_options ? "Yes" : "No" },
            { label: "Show Results", value: quiz.show_results_immediately ? "Immediate" : "After end" },
            { label: "Negative Marking", value: quiz.negative_marking ? "On" : "Off" },
            { label: "Leaderboard", value: quiz.leaderboard ? "Enabled" : "Disabled" },
            { label: "Status", value: quiz.status || "draft" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card-hover p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{s.label}</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{s.value}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
