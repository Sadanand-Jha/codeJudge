"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight, Clock, Loader2, Send, ShieldCheck } from "lucide-react";
import {
  getQuizByCode,
  saveQuizResponse,
  startQuizAttempt,
  submitQuizAttempt,
  type PublicQuizProblem,
  type QuizBasic,
} from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";

export default function QuizAttemptPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const [quiz, setQuiz] = useState<QuizBasic | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<PublicQuizProblem[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isValidQuizCode(code)) {
        setError("Invalid quiz code.");
        setLoading(false);
        return;
      }
      try {
        const details = await getQuizByCode(code);
        const started = await startQuizAttempt(String(details.id));
        if (cancelled) return;
        setQuiz(details);
        setAttemptId(started.attempt.id);
        setQuestions((started.problems ?? []) as unknown as PublicQuizProblem[]);
        setTimeLeft(details.duration ? details.duration * 60 : null);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Quiz access could not be verified.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitting) return;
    const timer = window.setInterval(() => setTimeLeft((value) => value === null ? null : Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [timeLeft, submitting]);

  const current = questions[index];
  const answered = Object.keys(answers).length;
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;

  const submit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      await submitQuizAttempt(
        String(attemptId),
        Object.entries(answers).map(([problemId, option]) => ({ problemId: Number(problemId), option }))
      );
      router.replace(`/quiz/${code}/results/${attemptId}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Your attempt could not be submitted.");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (timeLeft === 0 && attemptId && !submitting) submit();
  }, [timeLeft, attemptId, submitting]);

  const formattedTime = useMemo(() => {
    if (timeLeft === null) return "No limit";
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const seconds = (timeLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

  if (loading) return <StatusScreen loading text="Preparing your secure attempt…" />;
  if (error || !quiz || !current || !attemptId) return <StatusScreen text={error || "This quiz has no available questions."} />;

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6 sm:py-6">
      <main className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure attempt
              </div>
              <h1 className="mt-1 break-words text-base font-bold text-text-primary sm:text-lg">{quiz.name}</h1>
              <p className="mt-1 text-xs text-text-secondary">Question {index + 1} of {questions.length} · {answered} answered</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm font-bold text-text-primary">
              <Clock className="h-4 w-4 text-pink-500" /> {formattedTime}
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-card-hover">
            <div className="h-full rounded-full bg-pink-500 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Question {current.question_number ?? index + 1}</p>
          <h2 className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-text-primary sm:text-base">{current.problem_statement}</h2>
          {current.problem_description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{current.problem_description}</p>}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {current.options.map((option) => {
              const selected = answers[current.id] === String(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={async () => {
                    const value = String(option.id);
                    setAnswers((previous) => ({ ...previous, [current.id]: value }));
                    try {
                      await saveQuizResponse(String(attemptId), { problemId: current.id, option: value });
                    } catch {
                      setError("Your answer could not be saved. Check your connection and try again.");
                    }
                  }}
                  className={`min-h-14 rounded-xl border p-3 text-left text-sm leading-5 transition ${selected ? "border-pink-500 bg-pink-500/[0.08] text-text-primary ring-2 ring-pink-500/10" : "border-border bg-background text-text-secondary hover:border-pink-500/30 hover:text-text-primary"}`}
                >
                  {option.option_statement}
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <footer className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_1fr_auto]">
          <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-text-primary disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          {index < questions.length - 1 ? (
            <button type="button" onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))} className="col-start-2 inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white sm:col-start-3">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} className="col-start-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-start-3">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}

function StatusScreen({ loading = false, text }: { loading?: boolean; text: string }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        {loading ? <Loader2 className="mx-auto h-7 w-7 animate-spin text-pink-500" /> : <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />}
        <p className="mt-3 text-sm leading-6 text-text-secondary">{text}</p>
      </div>
    </div>
  );
}
