"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, FileCheck2, Home, PartyPopper, Send, ShieldCheck, Sparkles, Target, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SecureLogo, LOADING_LOGO_SIZE } from "@/components/common/SecureLogo";
import ExamModeShell, { type ViolationSummary } from "@/components/quiz/exam/ExamModeShell";
import {
  getAttemptRegistrationState,
  getQuizByCode,
  heartbeatQuizAttempt,
  saveQuizResponse,
  startQuizAttempt,
  submitQuizAttempt,
  getSubmitStatus,
  type PublicQuizProblem,
  type QuizBasic,
} from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  clearQuizAttemptAnswers,
  readQuizAttemptAnswers,
  writeQuizAttemptAnswers,
  type StoredAttemptAnswer,
} from "@/lib/quizAttemptStorage";
import { useQuizSounds, type QuizSound } from "@/hooks/useQuizSounds";
import { useIsMobile } from "@/hooks/useIsMobile";
import QuizPageReady from "@/components/quiz/live/QuizPageReady";

type AnswerValue = StoredAttemptAnswer;

function stableShuffle<T>(items: T[], seed: number): T[] {
  const shuffled = [...items];
  let state = seed || 1;
  for (let index = shuffled.length - 1; index > 0; index--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function shuffleStudentAttempt(problems: PublicQuizProblem[], attemptId: number): PublicQuizProblem[] {
  return stableShuffle(problems, attemptId * 31 + 17).map((problem) => ({
    ...problem,
    options: stableShuffle(problem.options ?? [], attemptId * 31 + Number(problem.id)),
  }));
}

function responsesToAnswers(responses: Array<{ problem_id: number; answer: unknown }>): Record<number, AnswerValue> {
  const restored: Record<number, AnswerValue> = {};
  for (const response of responses) {
    const answer = response.answer as Record<string, unknown> | string | null;
    if (answer && typeof answer === "object" && "selectedOptionId" in answer) {
      restored[response.problem_id] = { option: String(answer.selectedOptionId) };
    } else if (answer && typeof answer === "object" && "selectedOptionIds" in answer) {
      restored[response.problem_id] = {
        options: Array.isArray(answer.selectedOptionIds) ? answer.selectedOptionIds.map(String) : [],
      };
    } else if (answer && typeof answer === "object" && "text" in answer) {
      restored[response.problem_id] = { textAnswer: String(answer.text ?? "") };
    } else if (typeof answer === "string") {
      restored[response.problem_id] = { option: answer };
    }
  }
  return restored;
}

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
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { soundEnabled, playQuizSound, toggleQuizSounds } = useQuizSounds();
  // Mobile: static exam surface — no space atmosphere behind the questions,
  // opacity-only transitions, no layout-property animation while answering.
  const isMobile = useIsMobile();
  const answersRef = useRef<Record<number, AnswerValue>>({});
  // Ref mirror of `submitting` so the submit guard never goes stale inside
  // the long-lived polling loop (state in the useCallback closure would).
  const submittingRef = useRef(false);
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

  // A student who already has an active attempt (refresh/resume) has already
  // submitted the registration form — skip it and let the server resume.
  const [skipRegistration, setSkipRegistration] = useState(false);
  useEffect(() => {
    if (!quiz) return;
    if ((quiz.registration_fields ?? []).length === 0) return;
    let cancelled = false;
    void getAttemptRegistrationState(String(quiz.id))
      .then((state) => {
        if (!cancelled && state.hasActiveAttempt) setSkipRegistration(true);
      })
      .catch(() => {
        // Non-critical: the form simply shows and the server ignores
        // duplicate values when resuming.
      });
    return () => { cancelled = true; };
  }, [quiz]);

  const submit = useCallback(async (proctor?: { violations?: number; flagged?: boolean; flagReason?: string }) => {
    const id = attemptId;
    if (!id || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmissionComplete(false);
    setError(null);
    const submissionStartedAt = Date.now();
    const finishSubmission = () => {
      const complete = () => {
        // Backend confirmed — answers are safely stored, drop the local copy.
        try {
          clearQuizAttemptAnswers(id);
        } catch {
          // Ignore storage errors on cleanup.
        }
        // Stay on the confirmation screen (submitting remains true so the
        // overlay stays mounted) — the student returns home via its button.
        setSubmissionComplete(true);
        playQuizSound("success");
      };
      // Let students perceive the confirmation sequence even when grading is
      // near-instant; the API has already confirmed success before this delay.
      const remaining = Math.max(0, 2400 - (Date.now() - submissionStartedAt));
      if (remaining > 0) window.setTimeout(complete, remaining);
      else complete();
    };
    const buildResponses = () =>
      Object.entries(answersRef.current).map(([problemId, answer]) => ({ problemId: Number(problemId), ...answer }));
    try {
      const result = await submitQuizAttempt(String(id), buildResponses(), proctor);
      if (result && typeof result === "object" && "jobId" in result) {
        // Async path (202): grading runs in a BullMQ worker — poll until done.
        // A worker or the concurrency-limited recovery queue grades this job.
        // Keep polling without resubmitting while the synchronized cohort
        // drains.
        // During a synchronized finish, grading is intentionally
        // backpressured on the server. Keep polling long enough for a large
        // cohort to drain instead of making students resubmit safe jobs.
        const deadline = Date.now() + 5 * 60_000;
        let pollCount = 0;
        let noneCount = 0;
        let pollErrors = 0;
        let retriedSubmit = false;
        for (;;) {
          pollCount += 1;
          const pollDelay = pollCount <= 10 ? 1500 : pollCount <= 30 ? 3000 : 5000;
          await new Promise((resolve) => setTimeout(resolve, pollDelay));
          let status;
          try {
            status = await getSubmitStatus(String(id));
          } catch (pollErr: unknown) {
            pollErrors += 1;
            if (pollErrors >= 3) throw pollErr;
            if (Date.now() > deadline) break;
            continue;
          }
          pollErrors = 0;
          if (status.status === "completed") {
            finishSubmission();
            return;
          }
          if (status.status === "failed") {
            throw new Error(status.error || "Grading failed on the server. Your answers are saved — try again.");
          }
          if (status.status === "none") {
            // No job tracked (Redis flush/eviction or split-brain Redis) while
            // the attempt is still ungraded — re-submit once to re-enqueue
            // instead of polling `none` after a lost queue record.
            noneCount += 1;
            if (!retriedSubmit && noneCount >= 2) {
              retriedSubmit = true;
              noneCount = 0;
              const retry = await submitQuizAttempt(String(id), buildResponses(), proctor);
              if (!(retry && typeof retry === "object" && "jobId" in retry)) {
                finishSubmission();
                return;
              }
              continue;
            }
            if (Date.now() > deadline || noneCount >= 6) {
              throw new Error("Submission status is unclear. Your answers are saved on this device — try submitting again.");
            }
            continue;
          }
          if (Date.now() > deadline) {
            break;
          }
        }
        // Worker is slow but answers are safely queued — show the
        // confirmation screen and let the student go home from there.
        setSubmissionComplete(true);
        playQuizSound("success");
        return;
      }
      finishSubmission();
    } catch (err: unknown) {
      // Keep the local copy so nothing is lost; the student can retry.
      submittingRef.current = false;
      setError(getApiErrorMessage(err, "Your attempt could not be submitted. Your answers are saved on this device — try again."));
      setSubmitting(false);
      playQuizSound("error");
    }
  }, [attemptId, playQuizSound]);

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

  // Starts the backend attempt when the student enters exam mode. The
  // registration values (when the quiz collects them) travel with the start
  // call so the attempt — and its timer — begins only after the form submit.
  const handleEnterExam = useCallback(async (registrationData?: Record<string, string>): Promise<boolean> => {
    if (!quiz || starting) return false;
    if (attemptId) return true;
    setStarting(true);
    setError(null);
    try {
      const started = await startQuizAttempt(String(quiz.id), registrationData);
      const id = started.attempt.id as number;
      setAttemptId(id);
      // Shuffle only the student attempt view. A deterministic attempt-based
      // seed preserves the same order after refresh/resume.
      setQuestions(shuffleStudentAttempt(started.problems ?? [], id));
      if (started.resumed) {
        // Server responses make resume work across devices; the local draft is
        // applied last because it may contain a newer offline edit.
        setAnswers({
          ...responsesToAnswers(started.savedResponses ?? []),
          ...readQuizAttemptAnswers(id),
        });
      } else {
        // A genuinely new attempt must always start blank. Create its local
        // draft immediately so only this attempt can restore these answers.
        try { writeQuizAttemptAnswers(id, {}); } catch { /* storage unavailable */ }
        setAnswers({});
      }
      setTimeLeft(started.remainingSeconds);
      return true;
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Quiz attempt could not be started."));
      return false;
    } finally {
      setStarting(false);
    }
  }, [quiz, attemptId, starting]);

  const persistAnswer = useCallback((problemId: number, answer: AnswerValue) => {
    setAnswers((previous) => ({ ...previous, [problemId]: answer }));
    if (attemptId !== null) {
      void saveQuizResponse(String(attemptId), { problemId, ...answer }).catch(() => {
        // The local draft remains authoritative while offline; final submit
        // sends the complete answer set again.
      });
    }
  }, [attemptId]);

  // A creator should only see this student as "Live" while this exam tab is
  // actually active. Hidden/closed tabs stop sending heartbeats and naturally
  // age out of the creator dashboard's freshness window.
  useEffect(() => {
    if (attemptId === null || submitting) return;
    let cancelled = false;
    const heartbeat = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      void heartbeatQuizAttempt(String(attemptId)).catch(() => {
        // Presence is best-effort; quiz answers and final submission remain
        // independent of this non-critical signal.
      });
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 25_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") heartbeat();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [attemptId, submitting]);

  const handleManualSubmit = useCallback(() => {
    playQuizSound("submit");
    void submit();
  }, [playQuizSound, submit]);

  const handleGoHome = useCallback(() => {
    router.replace("/quiz");
  }, [router]);

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
      onEnterExam={handleEnterExam}
      onExitPreview={() => router.replace("/quiz")}
      onViewResult={attemptId !== null ? () => router.replace(`/quiz/${code}/results/${attemptId}`) : undefined}
      entryError={error}
      onTerminate={handleTerminate}
      registrationFields={skipRegistration ? [] : quiz.registration_fields ?? []}
    >
      {submitting && <SubmissionProgressOverlay complete={submissionComplete} soundEnabled={soundEnabled} onSound={playQuizSound} onHome={handleGoHome} />}
      {starting || (!attemptId && !error) ? (
        <div className="flex h-full items-center justify-center p-6">
          <StatusScreen loading text="Starting your secure attempt…" />
        </div>
      ) : !current || !attemptId ? (
        <div className="flex h-full items-center justify-center p-6">
          <StatusScreen text={error || "This quiz has no available questions."} />
        </div>
      ) : (
      <div className="qs-ui relative h-full min-h-0 overflow-hidden bg-[var(--qs-bg)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-[var(--qs-brand)]/[0.07] blur-3xl" />
        <div className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-[var(--qs-brand)]/[0.05] blur-3xl" />
        <div className="absolute -right-16 -top-20 hidden h-64 w-64 rounded-full border-2 border-[var(--qs-line)] sm:block" />
        <div className="absolute right-[6%] top-[10%] hidden h-10 w-10 rotate-12 rounded-xl border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/40 lg:block" />
      </div>
      <div className="relative mx-auto h-full min-h-0 max-w-4xl overflow-hidden">
      <QuizPageReady className="h-full min-h-0 overflow-hidden" label="Loading question">
      <main className="relative flex h-full min-h-0 flex-col gap-3 sm:gap-4">
        <div className="shrink-0 overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
          <div className="flex items-center justify-between gap-3 px-3.5 py-3.5 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[var(--qs-ok)]">Secure channel {autoSubmitted ? "· submitted" : "· connected"}</span>
                <span className="mt-0.5 block truncate text-xs font-bold text-[var(--qs-ink)]">Question {index + 1} of {questions.length}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--qs-brand)] min-[420px]:inline-flex"><Target className="h-3.5 w-3.5" /> {answered} answered</span>
              <button type="button" onClick={toggleQuizSounds} className="grid h-9 w-9 place-items-center rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)] transition hover:border-[var(--qs-brand)]" aria-label={soundEnabled ? "Mute quiz sounds" : "Enable quiz sounds"} title={soundEnabled ? "Quiz sounds on" : "Quiz sounds off"}>
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden bg-[var(--qs-line)]">
            <motion.div className="h-full rounded-r-full bg-[var(--qs-brand)]" animate={{ width: `${progress}%` }} transition={isMobile ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }} />
          </div>
        </div>

        <div className="quiz-question-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable] sm:pr-1">
        <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={current.id}
          initial={isMobile ? false : { opacity: 0, x: 18, scale: 1 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={isMobile ? undefined : { opacity: 0, x: -14, scale: 1 }}
          transition={isMobile ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[24px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--qs-brand)]/[0.06] blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--qs-brand)]/10 text-[10px]">{index + 1}</span>
              Question
            </p>
            <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[9px] font-semibold text-[var(--qs-muted)]">
              {current.quiz_problem_type === 2 ? "Select all that apply" : current.options.length ? "Choose one answer" : "Written response"}
            </span>
          </div>
          <h2 className="relative mt-4 whitespace-pre-wrap text-base font-semibold leading-7 tracking-[-0.01em] text-[var(--qs-ink)] sm:text-lg">{current.problem_statement}</h2>
          {current.problem_description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--qs-muted)]">{current.problem_description}</p>}

          <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
            {current.options.map((option, optionIndex) => {
              const multiple = current.quiz_problem_type === 2;
              const optionId = String(option.id);
              const selected = multiple
                ? (answers[current.id]?.options ?? []).includes(optionId)
                : answers[current.id]?.option === optionId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    playQuizSound("select");
                    if (multiple) {
                      const currentOptions = answers[current.id]?.options ?? [];
                      persistAnswer(current.id, {
                        options: selected
                          ? currentOptions.filter((id) => id !== optionId)
                          : [...currentOptions, optionId],
                      });
                    } else {
                      persistAnswer(current.id, { option: optionId });
                    }
                  }}
                  className={`group flex min-h-16 items-center gap-3 rounded-2xl border-2 p-3 text-left text-sm leading-5 transition-all duration-200 ${selected ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]/10 text-[var(--qs-ink)]" : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)] hover:-translate-y-0.5 hover:border-[var(--qs-brand)]/50 hover:text-[var(--qs-ink)]"}`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border-2 text-[11px] font-bold transition-colors ${selected ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] group-hover:border-[var(--qs-brand)]/50 group-hover:text-[var(--qs-brand)]"}`}>
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="flex-1">{option.option_statement}</span>
                  <CheckCircle2 className={`h-4 w-4 shrink-0 transition-opacity ${selected ? "text-[var(--qs-brand)] opacity-100" : "opacity-0"}`} />
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
              className="mt-5 w-full resize-y rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4 text-sm leading-6 text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
            />
          )}
        </motion.section>
        </AnimatePresence>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] p-3 text-xs text-[var(--qs-bad)]">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <div className="h-1" aria-hidden="true" />
        </div>

        <footer className="grid shrink-0 grid-cols-2 gap-2 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2.5 sm:grid-cols-[auto_1fr_auto] sm:gap-3">
          <button type="button" onClick={() => { playQuizSound("navigate"); setIndex((value) => Math.max(0, value - 1)); }} disabled={index === 0} className="qs-btn qs-btn-ghost min-h-12 gap-1 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40 sm:px-4">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          {index < questions.length - 1 ? (
            <button type="button" onClick={() => { playQuizSound("navigate"); setIndex((value) => Math.min(questions.length - 1, value + 1)); }} className="qs-btn col-start-2 min-h-12 gap-1 px-3 text-sm sm:col-start-3 sm:px-5">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={handleManualSubmit} disabled={submitting} className="qs-btn col-start-2 min-h-12 gap-2 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:col-start-3 sm:px-4" style={{ background: "var(--qs-ok)", borderColor: "var(--qs-ok)" }}>
              {submitting ? <SecureLogo variant="mark" size={16} className="animate-pulse motion-reduce:animate-none" /> : <Send className="h-4 w-4" />} {submitting ? "Submitting…" : "Submit"}
            </button>
          )}
        </footer>
      </main>
      </QuizPageReady>
      </div>
      </div>
      )}
    </ExamModeShell>
  );
}

const SUBMISSION_STAGES = [
  { after: 0, title: "Securing your answers", detail: "Saving every response safely…", icon: ShieldCheck },
  { after: 600, title: "Checking your exam", detail: "Making sure your submission is complete…", icon: FileCheck2 },
  { after: 1200, title: "Analyzing your responses", detail: "Reviewing your answers question by question…", icon: BrainCircuit },
  { after: 1800, title: "Generating your result", detail: "Turning your attempt into meaningful feedback…", icon: Sparkles },
] as const;

const SUBMIT_PARTY_BITS = Array.from({ length: 30 }, (_, index) => {
  const angle = (index / 30) * Math.PI * 2;
  const distance = 150 + (index % 6) * 24;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 45,
    rotate: 160 + index * 31,
    color: ["#FF5FA2", "#7C6CFF", "#22C8E5", "#FFB62E", "#43D39E"][index % 5],
    delay: (index % 5) * 0.025,
  };
});

function SubmissionProgressOverlay({ complete, soundEnabled, onSound, onHome }: { complete: boolean; soundEnabled: boolean; onSound: (sound: QuizSound) => void; onHome: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return () => window.clearInterval(timer);
  }, []);

  const stageIndex = SUBMISSION_STAGES.reduce(
    (active, stage, index) => elapsed >= stage.after ? index : active,
    0,
  );
  const stage = SUBMISSION_STAGES[stageIndex];
  const StageIcon = stage.icon;
  // Deliberately stops short of 100%; completion is controlled by the real API.
  const progress = Math.min(94, 12 + (1 - Math.exp(-elapsed / 4800)) * 84);

  useEffect(() => {
    if (soundEnabled && stageIndex > 0) onSound("stage");
  }, [onSound, soundEnabled, stageIndex]);

  if (complete) {
    return (
      <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-slate-950/80 px-4 backdrop-blur-md" role="status" aria-live="polite" aria-label="Quiz submitted successfully">
        {!isMobile && (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {SUBMIT_PARTY_BITS.map((bit, index) => (
              <motion.span
                key={index}
                className="absolute left-1/2 top-1/2 h-2 w-4 rounded-full"
                style={{ backgroundColor: bit.color }}
                initial={{ x: 0, y: 0, rotate: 0, scale: 0, opacity: 0 }}
                animate={{ x: bit.x, y: bit.y, rotate: bit.rotate, scale: [0, 1.15, 1], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.2, delay: bit.delay, ease: "easeOut" }}
              />
            ))}
            <motion.div initial={{ x: -120, y: 120, rotate: -28, opacity: 0 }} animate={{ x: -210, y: 50, rotate: -12, opacity: [0, 1, 1] }} transition={{ duration: 0.55 }} className="absolute left-1/2 top-1/2 text-pink-400">
              <PartyPopper className="h-20 w-20" />
            </motion.div>
            <motion.div initial={{ x: 60, y: 120, rotate: 28, opacity: 0 }} animate={{ x: 135, y: 50, rotate: 12, opacity: [0, 1, 1] }} transition={{ duration: 0.55 }} className="absolute left-1/2 top-1/2 text-amber-400">
              <PartyPopper className="h-20 w-20 -scale-x-100" />
            </motion.div>
          </div>
        )}

        <motion.div
          initial={isMobile ? false : { opacity: 0, scale: 0.75, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={isMobile ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
          className="qs-ui relative w-full max-w-md rounded-[2rem] border-2 border-[var(--qs-line)] px-6 py-8 text-center shadow-[0_10px_0_rgba(26,18,64,0.35)] sm:px-9 sm:py-10"
          style={{ background: "var(--qs-surface)", color: "var(--qs-ink)" }}
        >
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.65rem] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
            {isMobile ? <CheckCircle2 className="h-10 w-10" /> : <PartyPopper className="h-10 w-10" />}
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--qs-ok)]">Submission complete</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">You did it!</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--qs-muted)]">Your quiz responses have been submitted. You can go back now.</p>
          <button
            type="button"
            onClick={onHome}
            className="qs-btn mt-6 h-12 w-full gap-2 text-sm"
          >
            <Home className="h-4 w-4" /> Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-md" role="status" aria-live="polite" aria-label={stage.title}>
      <div className="qs-ui relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-[var(--qs-line)] p-6 shadow-[0_10px_0_rgba(26,18,64,0.35)] sm:p-8" style={{ background: "var(--qs-surface)", color: "var(--qs-ink)" }}>
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--qs-brand)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-[var(--qs-brand)]/10 blur-3xl" />

        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
            <StageIcon key={stageIndex} className="h-8 w-8 animate-[quiz-submit-pop_.35s_ease-out] motion-reduce:animate-none" />
          </div>
          <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--qs-brand)]">Submission in progress</p>
          <h2 key={`title-${stageIndex}`} className="mt-2 animate-[quiz-submit-rise_.3s_ease-out] text-center text-xl font-bold tracking-tight motion-reduce:animate-none sm:text-2xl">
            {stage.title}
          </h2>
          <p key={`detail-${stageIndex}`} className="mt-2 min-h-10 animate-[quiz-submit-rise_.3s_ease-out] text-center text-sm leading-5 text-[var(--qs-muted)] motion-reduce:animate-none">
            {stage.detail}
          </p>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--qs-line)]">
            <div className="h-full rounded-full bg-[var(--qs-brand)] transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2" aria-hidden="true">
            {SUBMISSION_STAGES.map((item, itemIndex) => (
              <div key={item.title} className="flex flex-col items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors duration-300 ${itemIndex < stageIndex ? "border-[var(--qs-ok)] bg-[var(--qs-ok)] text-[var(--qs-on-brand)]" : itemIndex === stageIndex ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"}`}>
                  {itemIndex < stageIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : itemIndex + 1}
                </span>
                <span className={`hidden text-center text-[9px] leading-3 sm:block ${itemIndex <= stageIndex ? "text-[var(--qs-ink)]" : "text-[var(--qs-muted)]"}`}>
                  {item.title.replace(" your", "")}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-[11px] text-[var(--qs-muted)]">Please keep this window open. Your answers are safe.</p>
        </div>
      </div>
      <style jsx>{`
        @keyframes quiz-submit-pop {
          from { opacity: 0; transform: scale(.72) rotate(-8deg); }
          to { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes quiz-submit-rise {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { scroll-behavior: auto !important; }
        }
      `}</style>
    </div>
  );
}

function StatusScreen({ loading = false, text }: { loading?: boolean; text: string }) {
  if (loading) {
    return (
      <div className="qs-ui flex min-h-[70vh] items-center justify-center bg-[var(--qs-bg)] px-4">
        <SecureLogo variant="mark" size={LOADING_LOGO_SIZE} className="animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }
  return (
    <div className="qs-ui flex min-h-[70vh] items-center justify-center bg-[var(--qs-bg)] px-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-[var(--qs-bad)]" />
        <p className="mt-3 text-sm leading-6 text-[var(--qs-muted)]">{text}</p>
      </div>
    </div>
  );
}
