
"use client";

import { use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, FileCheck2, Home, PartyPopper, Send, ShieldCheck, Volume2, VolumeX } from "lucide-react";
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
  type PublicQuizProblem,
  type QuizBasic,
} from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { getApiErrorMessage } from "@/lib/apiError";
import { consumeQuizBackNavigation } from "@/lib/quizBackNavigation";
import {
  clearQuizAttemptAnswers,
  readQuizAttemptAnswers,
  writeQuizAttemptAnswers,
  type StoredAttemptAnswer,
} from "@/lib/quizAttemptStorage";
import { useQuizSounds, type QuizSound } from "@/hooks/useQuizSounds";
import { useIsMobile } from "@/hooks/useIsMobile";
import QuizPageReady from "@/components/quiz/live/QuizPageReady";
import { QuizRichText } from "@/components/quiz/QuizRichText";

type AnswerValue = StoredAttemptAnswer;

const ATTEMPT_BTN_SECONDARY =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-5 text-[15px] font-bold text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-line)] transition-[transform,box-shadow,border-color,background-color,color] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--qs-line)] focus-visible:[outline:3px_solid_#2A4FD6] focus-visible:[outline-offset:3px] disabled:cursor-not-allowed disabled:opacity-40";
const ATTEMPT_BTN_PRIMARY =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 text-[15px] font-bold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-[transform,box-shadow] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--qs-sun)] focus-visible:[outline:3px_solid_#2A4FD6] focus-visible:[outline-offset:3px] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
const ATTEMPT_BTN_SUBMIT =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-5 text-[15px] font-bold text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-ink)] transition-[transform,box-shadow] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--qs-ink)] focus-visible:[outline:3px_solid_#2A4FD6] focus-visible:[outline-offset:3px] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
const ATTEMPT_PALETTE_BTN =
  "relative grid h-11 place-items-center rounded-[12px] border-2 text-[15px] font-bold transition-colors focus-visible:[outline:3px_solid_#2A4FD6] focus-visible:[outline-offset:3px]";

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
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(() => new Set());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedByBackNavigation, setBlockedByBackNavigation] = useState(false);
  const { soundEnabled, playQuizSound, toggleQuizSounds } = useQuizSounds();
  // Mobile: static exam surface — no space atmosphere behind the questions,
  // opacity-only transitions, no layout-property animation while answering.
  const isMobile = useIsMobile();
  const answersRef = useRef<Record<number, AnswerValue>>({});
  // Ref mirror of `submitting` so the submit guard never goes stale inside
  // the long-lived polling loop (state in the useCallback closure would).
  const submittingRef = useRef(false);

  // A live or submitted attempt must not reopen through browser history.
  // Normal reloads and lobby/reattempt links are not history traversals and
  // keep working. BFCache restores are treated the same as back navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot navigation guard
    if (consumeQuizBackNavigation()) setBlockedByBackNavigation(true);
  }, []);
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBlockedByBackNavigation(true);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
    try {
      await submitQuizAttempt(String(id), Object.entries(answersRef.current).map(([problemId, answer]) => ({ problemId: Number(problemId), ...answer })), proctor);
      finishSubmission();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        // The window closed before final submit. Autosaved answers remain and
        // will be graded with the rest of the cohort after the quiz ends.
        finishSubmission();
        return;
      }
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

  // Scheduled attempts can resume with zero seconds left (the window ended
  // between loading the quiz and starting/resuming the attempt).
  useEffect(() => {
    if (timeLeft !== 0 || attemptId === null || submitting) return;
    void submit();
  }, [attemptId, submit, submitting, timeLeft]);

  const current = questions[index];
  const answeredCount = Object.values(answers).filter((answer) =>
    answer.option !== undefined || (answer.options?.length ?? 0) > 0 || Boolean(answer.textAnswer?.trim()),
  ).length;
  const remainingCount = Math.max(questions.length - answeredCount, 0);
  const currentMarked = current ? markedForReview.has(current.id) : false;
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;

  const goToQuestion = (nextIndex: number) => {
    if (nextIndex === index) return;
    playQuizSound("navigate");
    setIndex(nextIndex);
  };

  const toggleMarkedForReview = (problemId: number) => {
    playQuizSound("select");
    setMarkedForReview((previous) => {
      const next = new Set(previous);
      if (next.has(problemId)) next.delete(problemId);
      else next.add(problemId);
      return next;
    });
  };

  // Starts the backend attempt when the student enters exam mode. The
  // registration values (when the quiz collects them) travel with the start
  // call so the attempt begins only after the form submit.
  const handleEnterExam = useCallback(async (registrationData?: Record<string, string>): Promise<boolean> => {
    if (blockedByBackNavigation || !quiz || starting) return false;
    if (attemptId) return true;
    setStarting(true);
    setError(null);
    try {
      const started = await startQuizAttempt(String(quiz.id), registrationData);
      const id = started.attempt.id as number;
      setAttemptId(id);
      // The server returns the final per-attempt option order. The decoy label
      // is derived from that exact order, so the client must not shuffle it.
      setQuestions(started.problems ?? []);
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
      const endMs = quiz.endtime ? new Date(quiz.endtime).getTime() : Number.NaN;
      setTimeLeft(Number.isFinite(endMs)
        ? Math.max(0, Math.ceil((endMs - Date.now()) / 1000))
        : started.remainingSeconds);
      return true;
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Quiz attempt could not be started."));
      return false;
    } finally {
      setStarting(false);
    }
  }, [blockedByBackNavigation, quiz, attemptId, starting]);

  // The server rejects saves/heartbeats once the teacher stops the quiz or
  // the scheduled window ends. Stop accepting local answers and submit the
  // answers that were already saved before the window closed.
  const handleResponseWindowClosed = useCallback((err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status !== 409) return false;
    setError("The quiz has ended. Your saved answers are being submitted.");
    setTimeLeft(0);
    return true;
  }, []);

  const persistAnswer = useCallback((problemId: number, answer: AnswerValue) => {
    setAnswers((previous) => ({ ...previous, [problemId]: answer }));
    if (attemptId !== null) {
      void saveQuizResponse(String(attemptId), { problemId, ...answer }).catch((err: unknown) => {
        // The local draft remains authoritative while offline; after the quiz
        // closes the server grades only responses saved before the cutoff.
        handleResponseWindowClosed(err);
      });
    }
  }, [attemptId, handleResponseWindowClosed]);

  // A creator should only see this student as "Live" while this exam tab is
  // actually active. Hidden/closed tabs stop sending heartbeats and naturally
  // age out of the creator dashboard's freshness window.
  useEffect(() => {
    if (attemptId === null || submitting) return;
    let cancelled = false;
    const heartbeat = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      void heartbeatQuizAttempt(String(attemptId)).catch((err: unknown) => {
        // Presence is best-effort, but a 409 means the response window has
        // closed: stop the attempt and submit its saved answers.
        if (!handleResponseWindowClosed(err)) {
          // Other failures are non-critical; autosave and final submit remain
          // independent of this signal.
        }
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
  }, [attemptId, submitting, handleResponseWindowClosed]);

  const handleManualSubmit = useCallback(() => {
    playQuizSound("submit");
    void submit();
  }, [playQuizSound, submit]);

  const handleGoHome = useCallback(() => {
    router.replace("/quiz");
  }, [router]);

  // Cross (X) quit: confirm already happened in ExamModeShell. Submit current
  // answers so the result is generated; a completed attempt can never resume,
  // so the student cannot continue this attempt afterwards.
  const [quitSubmitting, setQuitSubmitting] = useState(false);
  const handleQuitAttempt = useCallback(() => {
    if (attemptId === null || submittingRef.current) {
      if (attemptId !== null) router.replace(`/quiz/${code}/results/${attemptId}`);
      else router.replace("/quiz");
      return;
    }
    setQuitSubmitting(true);
    // Fire the submit (grades server-side, marks attempt completed so it can
    // never resume) and go straight to the result page — don't wait for the
    // grading poll, which can take minutes for a large cohort. The result page
    // polls/shows the graded result once ready.
    void submit({ flagReason: "student quit via cross button" }).finally(() => {
      setQuitSubmitting(false);
    });
    router.replace(`/quiz/${code}/results/${attemptId}`);
  }, [attemptId, code, router, submit]);

  if (blockedByBackNavigation) {
    return (
      <StatusScreen
        text="This attempt was reopened from browser history, so it is locked here. Open the quiz from the lobby to continue."
        action={
          <button
            type="button"
            onClick={() => router.replace("/quiz")}
            className="rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-brand)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
          >
            Go to quiz home
          </button>
        }
      />
    );
  }
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
      onQuitAttempt={() => void handleQuitAttempt()}
      quitSubmitting={quitSubmitting || submitting}
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
          <div className="absolute -right-16 -top-20 hidden h-64 w-64 rounded-full border-2 border-[var(--qs-line)] sm:block" />
          <div className="absolute right-[6%] top-[10%] hidden h-10 w-10 rotate-12 rounded-xl border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/40 lg:block" />
          <pre className="absolute bottom-6 right-6 hidden select-none text-right font-mono text-[13px] leading-[1.9] tracking-[0.06em] text-[var(--qs-brand)]/10 lg:block">3f9a·c21e·7b04·d8e1
4be7·0a95·f3c2·61bd
e90c·5d17·a2f6·83b0</pre>
        </div>
        <div className="relative mx-auto h-full min-h-0 max-w-6xl overflow-hidden">
          <QuizPageReady className="h-full min-h-0 overflow-hidden" label="Loading question">
            <main className="relative h-full min-h-0">
              <div className="quiz-question-scroll h-full min-h-0 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable] sm:pr-1">
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="min-w-0">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.section
                        key={current.id}
                        initial={isMobile ? false : { opacity: 0, x: 18, scale: 1 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={isMobile ? undefined : { opacity: 0, x: -14, scale: 1 }}
                        transition={isMobile ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
                        className="relative overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[6px_6px_0_var(--qs-sun)] sm:p-8"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#5B34D8]">
                            Question {index + 1} of {questions.length}
                          </span>
                          <span className="rounded-full border-[1.5px] border-[var(--qs-line)] px-3 py-1.5 text-[12px] font-bold leading-none text-[var(--qs-muted)]">
                            {current.quiz_problem_type === 2 ? "Select all that apply" : current.options.length ? "Choose one answer" : "Written response"}
                          </span>
                        </div>
                        <div
                          className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-[#EDE8FF]"
                          role="progressbar"
                          aria-label="Question progress"
                          aria-valuenow={Math.round(progress)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <motion.div
                            className="h-full rounded-full bg-[var(--qs-brand)]"
                            animate={{ width: `${progress}%` }}
                            transition={isMobile ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
                          />
                        </div>
                        <QuizRichText
                          html={current.problem_statement}
                          className="qs-display relative mt-7 text-[22px] font-extrabold leading-[1.25] tracking-[-0.01em] text-[var(--qs-ink)] sm:text-[26px]"
                        />
                        {current.problem_description && (
                          <QuizRichText
                            html={current.problem_description}
                            className="mt-2 text-sm leading-6 text-[var(--qs-muted)]"
                          />
                        )}

                        <div className="relative mt-6 flex flex-col gap-3" role="radiogroup" aria-label="Answer options">
                          {current.options.map((option, optionIndex) => {
                            const multiple = current.quiz_problem_type === 2;
                            const optionId = String(option.id);
                            const selected = multiple
                              ? (answers[current.id]?.options ?? []).includes(optionId)
                              : answers[current.id]?.option === optionId;
                            const optionLabel = String.fromCharCode(65 + optionIndex);
                            return (
                              <button
                                key={option.id}
                                type="button"
                                role={multiple ? "checkbox" : "radio"}
                                aria-checked={selected}
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
                                className={`group relative flex w-full items-center gap-3.5 rounded-2xl border-2 px-[18px] py-4 text-left text-[15px] leading-[1.4] text-[var(--qs-ink)] transition-[border-color,background-color,box-shadow] duration-150 sm:text-base ${selected ? "border-[var(--qs-brand)] bg-[#F3EFFF] shadow-[4px_4px_0_var(--qs-brand)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"}`}
                              >
                                <span className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] text-sm font-bold transition-colors ${selected ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "bg-[#EDE8FF] text-[var(--qs-ink)]"}`}>
                                  {optionLabel}
                                </span>
                                <QuizRichText
                                  as="span"
                                  html={option.option_statement}
                                  className="flex-1"
                                />
                                <span className={`ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-[var(--qs-brand)]" : "border-[var(--qs-line)]"}`}>
                                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-[var(--qs-brand)]" />}
                                </span>
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
                            className="mt-6 w-full resize-y rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 text-sm leading-6 text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                          />
                        )}

                        <div className="mt-8 flex flex-wrap items-center gap-3.5 border-t-2 border-[#EDE8FF] pt-6">
                          <button
                            type="button"
                            onClick={() => goToQuestion(index - 1)}
                            disabled={index === 0}
                            className={ATTEMPT_BTN_SECONDARY}
                          >
                            <ChevronLeft className="h-4 w-4" /> Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleMarkedForReview(current.id)}
                            aria-pressed={currentMarked}
                            className={`${ATTEMPT_BTN_SECONDARY} ${currentMarked ? "border-[var(--qs-brand)] bg-[#F3EFFF] text-[var(--qs-brand)]" : ""}`}
                          >
                            {currentMarked ? "Marked for review" : "Mark for review"}
                          </button>
                          {index < questions.length - 1 ? (
                            <button
                              type="button"
                              onClick={() => goToQuestion(index + 1)}
                              className={`${ATTEMPT_BTN_PRIMARY} ml-auto`}
                            >
                              Next question <ChevronRight className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleManualSubmit}
                              disabled={submitting}
                              className={`${ATTEMPT_BTN_SUBMIT} ml-auto`}
                            >
                              {submitting ? <SecureLogo variant="mark" size={16} className="animate-pulse motion-reduce:animate-none" /> : <Send className="h-4 w-4" />} {submitting ? "Submitting…" : "Submit quiz"}
                            </button>
                          )}
                        </div>
                        <p className="mt-5 flex items-center gap-2 text-[13px] leading-5 text-[var(--qs-muted)]">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--qs-ok)]" />
                          Your answers are saved as you go. Stay in fullscreen until you submit.
                        </p>
                      </motion.section>
                    </AnimatePresence>

                    {error && (
                      <div className="mt-4 flex items-start gap-2 rounded-xl border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] p-3 text-xs text-[var(--qs-bad)]">
                        <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                      </div>
                    )}
                    <div className="h-1" aria-hidden="true" />
                  </div>

                  <aside className="flex flex-col gap-6 self-start lg:sticky lg:top-0">
                    <section className="rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="qs-display text-[20px] font-extrabold text-[var(--qs-ink)]">Questions</h3>
                        <button
                          type="button"
                          onClick={toggleQuizSounds}
                          className="grid h-9 w-9 place-items-center rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)] transition hover:border-[var(--qs-brand)]"
                          aria-label={soundEnabled ? "Mute quiz sounds" : "Enable quiz sounds"}
                          title={soundEnabled ? "Quiz sounds on" : "Quiz sounds off"}
                        >
                          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {questions.map((question, questionIndex) => {
                          const answer = answers[question.id];
                          const isAnswered =
                            answer?.option !== undefined ||
                            (answer?.options?.length ?? 0) > 0 ||
                            Boolean(answer?.textAnswer?.trim());
                          const isCurrent = questionIndex === index;
                          const isMarked = markedForReview.has(question.id);
                          return (
                            <button
                              key={question.id}
                              type="button"
                              onClick={() => goToQuestion(questionIndex)}
                              aria-label={`Question ${questionIndex + 1}${isAnswered ? ", answered" : ""}${isCurrent ? ", current" : ""}${isMarked ? ", marked for review" : ""}`}
                              aria-current={isCurrent ? "step" : undefined}
                              className={`${ATTEMPT_PALETTE_BTN} ${isCurrent ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-ink)]" : isAnswered ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"}`}
                            >
                              {questionIndex + 1}
                              {isMarked && (
                                <span aria-hidden="true" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--qs-sun)] ring-1 ring-[var(--qs-ink)]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-4 text-[13px] leading-5 text-[var(--qs-muted)]">
                        {answeredCount} answered · 1 current · {remainingCount} to go
                      </p>
                    </section>

                    <section className="relative overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[#241F4A] p-6 text-white shadow-[6px_6px_0_var(--qs-sun)]">
                      <pre aria-hidden="true" className="pointer-events-none absolute bottom-2 right-3 select-none text-right font-mono text-[11px] leading-[1.9] tracking-[0.06em] text-white/10">3f9a·c21e
7b04·d8e1
4be7·0a95</pre>
                      <div className="relative flex items-center justify-between gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1C1840]">
                          <ShieldCheck className="h-5 w-5" />
                        </span>
                        <span className="rounded-full border-2 border-[var(--qs-sun)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] leading-none text-[var(--qs-sun)]">
                          {autoSubmitted ? "Submitted" : "Protected"}
                        </span>
                      </div>
                      <h3 className="qs-display relative mt-4 text-[20px] font-extrabold">Secure session</h3>
                      <p className="mt-1.5 text-sm leading-6 text-[#DCD6F7]">
                        This attempt is monitored in fullscreen. Your responses are saved as you go.
                      </p>
                    </section>
                  </aside>
                </div>
              </div>
            </main>
          </QuizPageReady>
        </div>
      </div>
      )}
    </ExamModeShell>
  );
}

const SUBMISSION_STAGES = [
  { after: 0, title: "Saving your answers", detail: "Saving every response safely…", icon: ShieldCheck },
  { after: 600, title: "Checking your exam", detail: "Making sure your submission is complete…", icon: FileCheck2 },
  { after: 1200, title: "Locking your responses", detail: "Your answers are being sealed for evaluation…", icon: FileCheck2 },
  { after: 1800, title: "Submission confirmed", detail: "Your answers are ready for result calculation…", icon: CheckCircle2 },
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
      <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-slate-950/80 px-4" role="status" aria-live="polite" aria-label="Quiz submitted successfully">
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
          className="qs-ui relative w-full max-w-md rounded-[2rem] border-2 border-[var(--qs-ink)] px-6 py-8 text-center shadow-[6px_6px_0_var(--qs-sun)] sm:px-9 sm:py-10"
          style={{ background: "var(--qs-surface)", color: "var(--qs-ink)" }}
        >
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.65rem] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
            {isMobile ? <CheckCircle2 className="h-10 w-10" /> : <PartyPopper className="h-10 w-10" />}
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--qs-ok)]">Submission complete</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">You did it!</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--qs-muted)]">Your answers are saved. Results will be calculated after the quiz ends.</p>
          <button
            type="button"
            onClick={onHome}
            className="b b-pri mt-6 w-full gap-2"
          >
            <Home className="h-4 w-4" /> Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/75 px-4" role="status" aria-live="polite" aria-label={stage.title}>
      <div className="qs-ui relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-[var(--qs-ink)] p-6 shadow-[6px_6px_0_var(--qs-sun)] sm:p-8" style={{ background: "var(--qs-surface)", color: "var(--qs-ink)" }}>
        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-2xl border-2 border-[var(--qs-line)]" />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rotate-12 rounded-xl border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/20" />

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

function StatusScreen({ loading = false, text, action }: { loading?: boolean; text: string; action?: ReactNode }) {
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
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
