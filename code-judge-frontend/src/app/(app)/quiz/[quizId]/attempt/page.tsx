"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight, Clock, Loader2, Send, ShieldCheck } from "lucide-react";
import ExamModeShell, { type ViolationSummary } from "@/components/quiz/exam/ExamModeShell";
import {
  getQuizByCode,
  startQuizAttempt,
  submitQuizAttempt,
  type PublicQuizProblem,
  type QuizBasic,
} from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  clearQuizAttemptAnswers,
  readQuizAttemptAnswers,
  writeQuizAttemptAnswers,
  type StoredAttemptAnswer,
} from "@/lib/quizAttemptStorage";

type AnswerValue = StoredAttemptAnswer;

export default function QuizAttemptPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const [quiz, setQuiz] = useState<QuizBasic | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [questions, setQuestions] = useState<PublicQuizProblem[]>([]);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answersRef = useRef<Record<number, AnswerValue>>({});
  useEffect(() => {
    answersRef.current = answers;
    // Persist locally on every change so a refresh/resume never loses answers.
    // Nothing is sent to the backend until submit.
    if (attemptId !== null) {
      try {
        writeQuizAttemptAnswers(attemptId, answers);
      } catch {
        // Storage full or unavailable (private mode) — in-memory answers still work.
      }
    }
  }, [answers, attemptId]);

  // Load quiz details only — the attempt starts when the student enters
  // exam mode (user gesture, so fullscreen can engage).
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
        if (!cancelled) setQuiz(details);
      } catch (err: unknown) {
        if (!cancelled) setError(getApiErrorMessage(err, "Quiz access could not be verified."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [code]);

  const submit = useCallback(async (proctor?: { violations?: number; flagged?: boolean; flagReason?: string }) => {
    const id = attemptId;
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      await submitQuizAttempt(
        String(id),
        Object.entries(answersRef.current).map(([problemId, answer]) => ({ problemId: Number(problemId), ...answer })),
        proctor
      );
      // Backend confirmed (200) — answers are safely stored, drop the local copy.
      try {
        clearQuizAttemptAnswers(id);
      } catch {
        // Ignore storage errors on cleanup.
      }
      const resultsAvailable = quiz?.show_results_immediately === true ||
        String(quiz?.status ?? "").toLowerCase() === "ended" ||
        Boolean(quiz?.endtime && new Date(quiz.endtime).getTime() <= Date.now());
      if (resultsAvailable) {
        router.replace(`/quiz/${code}/results/${id}`);
      } else {
        toast.success({
          title: "Quiz submitted",
          description: "Your answers are secure. Results will be available after the quiz ends.",
        });
        router.replace("/quiz#activity");
      }
    } catch (err: unknown) {
      // Keep the local copy so nothing is lost; the student can retry.
      setError(getApiErrorMessage(err, "Your attempt could not be submitted. Your answers are saved on this device — try again."));
      setSubmitting(false);
    }
  }, [attemptId, submitting, code, quiz, router]);

  // Exam-cell: after 3 violations the attempt is auto-submitted and flagged.
  const handleTerminate = useCallback((summary: ViolationSummary) => {
    setAutoSubmitted(true);
    if (attemptId !== null) {
      try { clearQuizAttemptAnswers(attemptId); } catch { /* storage unavailable */ }
    }
    void submit({
      violations: summary.violations,
      flagged: true,
      flagReason: `auto-submit after ${summary.violations} violations: ${summary.types.join(", ")}`,
    });
  }, [attemptId, submit]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitting) return;
    const timer = window.setInterval(() => setTimeLeft((value) => {
      if (value === null) return null;
      if (value <= 1) {
        window.setTimeout(() => void submit(), 0);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [timeLeft, submitting, submit]);

  const current = questions[index];
  const answered = Object.keys(answers).length;
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;

  // Starts the backend attempt when the student enters exam mode.
  const handleEnterExam = useCallback(async () => {
    if (!quiz || attemptId || starting) return;
    setStarting(true);
    try {
      const started = await startQuizAttempt(String(quiz.id));
      const id = started.attempt.id as number;
      setAttemptId(id);
      setQuestions(started.problems ?? []);
      if (started.resumed) {
        setAnswers(readQuizAttemptAnswers(id));
      } else {
        // A genuinely new attempt must always start blank. Create its local
        // draft immediately so only this attempt can restore these answers.
        try { writeQuizAttemptAnswers(id, {}); } catch { /* storage unavailable */ }
        setAnswers({});
      }
      setTimeLeft(started.remainingSeconds);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Quiz attempt could not be started."));
    } finally {
      setStarting(false);
    }
  }, [quiz, attemptId, starting]);

  const persistAnswer = useCallback((problemId: number, answer: AnswerValue) => {
    setAnswers((previous) => ({ ...previous, [problemId]: answer }));
  }, []);

  const handleManualSubmit = useCallback(() => {
    void submit();
  }, [submit]);

  const formattedTime = useMemo(() => {
    if (timeLeft === null) return "No limit";
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const seconds = (timeLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

  if (loading) return <StatusScreen loading text="Preparing your secure attempt…" />;
  if (error && !quiz) return <StatusScreen text={error} />;
  if (!quiz) return <StatusScreen text="This quiz could not be loaded." />;

  return (
    <ExamModeShell
      quizName={quiz.name}
      progressLabel={questions.length ? `Q ${index + 1} / ${questions.length}` : ""}
      timeLeft={timeLeft}
      isLive
      attemptId={attemptId !== null ? String(attemptId) : null}
      onEnterExam={() => void handleEnterExam()}
      onExitPreview={() => router.replace(`/quiz/${code}`)}
      onTerminate={handleTerminate}
    >
      {starting || (!attemptId && !error) ? (
        <div className="flex h-full items-center justify-center p-6">
          <StatusScreen loading text="Starting your secure attempt…" />
        </div>
      ) : !current || !attemptId ? (
        <div className="flex h-full items-center justify-center p-6">
          <StatusScreen text={error || "This quiz has no available questions."} />
        </div>
      ) : (
      <div className="min-h-full bg-background px-4 py-4 sm:px-6 sm:py-6">
      <main className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure attempt{autoSubmitted ? " · auto-submitted" : ""}
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
              const selected = answers[current.id]?.option === String(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    const value = String(option.id);
                    persistAnswer(current.id, { option: value });
                  }}
                  className={`min-h-14 rounded-xl border p-3 text-left text-sm leading-5 transition ${selected ? "border-pink-500 bg-pink-500/[0.08] text-text-primary ring-2 ring-pink-500/10" : "border-border bg-background text-text-secondary hover:border-pink-500/30 hover:text-text-primary"}`}
                >
                  {option.option_statement}
                </button>
              );
            })}
          </div>
          {current.options.length === 0 && (
            <textarea
              value={answers[current.id]?.textAnswer ?? ""}
              onChange={(event) => {
                const textAnswer = event.target.value;
                setAnswers((previous) => ({ ...previous, [current.id]: { textAnswer } }));
              }}
              onBlur={() => persistAnswer(current.id, { textAnswer: answers[current.id]?.textAnswer ?? "" })}
              rows={8}
              maxLength={20000}
              placeholder="Write your answer here…"
              className="mt-5 w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-6 text-text-primary outline-none focus:border-pink-500"
            />
          )}
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
            <button type="button" onClick={handleManualSubmit} disabled={submitting} className="col-start-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-start-3">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit
            </button>
          )}
        </footer>
      </main>
      </div>
      )}
    </ExamModeShell>
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
