"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, FileCheck2, Loader2, Send, ShieldCheck, Sparkles, Target, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ExamModeShell, { type ViolationSummary } from "@/components/quiz/exam/ExamModeShell";
import {
  getQuizByCode,
  saveQuizResponse,
  startQuizAttempt,
  submitQuizAttempt,
  getSubmitStatus,
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
import { useQuizSounds, type QuizSound } from "@/hooks/useQuizSounds";
import { useIsMobile } from "@/hooks/useIsMobile";
import QuizSpaceAtmosphere from "@/components/quiz/live/QuizSpaceAtmosphere";
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

  const submit = useCallback(async (proctor?: { violations?: number; flagged?: boolean; flagReason?: string }) => {
    const id = attemptId;
    if (!id || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
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
        const resultsAvailable = quiz?.show_results_immediately === true ||
          String(quiz?.status ?? "").toLowerCase() === "ended" ||
          Boolean(quiz?.endtime && new Date(quiz.endtime).getTime() <= Date.now());
        // Release the button before navigating: if router.replace is slow or
        // blocked, the spinner must not stick forever.
        submittingRef.current = false;
        setSubmitting(false);
        playQuizSound("success");
        if (resultsAvailable) {
          router.replace(`/quiz/${code}/results/${id}`);
        } else {
          toast.success({
            title: "Quiz submitted",
            description: "Your answers are secure. Results will be available after the quiz ends.",
          });
          router.replace("/quiz#activity");
        }
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
        // The backend now grades inline when no worker is live, so a healthy
        // submit resolves in one or two polls. Anything longer means the
        // worker is slow or the job record was lost — recover instead of
        // spinning forever.
        const deadline = Date.now() + 45000;
        let noneCount = 0;
        let pollErrors = 0;
        let retriedSubmit = false;
        for (;;) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
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
            // (backend grades inline if no worker), instead of polling `none`.
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
        // Worker is slow but answers are safely queued; stop blocking the UI.
        submittingRef.current = false;
        setSubmitting(false);
        playQuizSound("success");
        toast.success({
          title: "Quiz submitted",
          description: "Grading is taking longer than usual. Results will appear shortly.",
        });
        router.replace("/quiz#activity");
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
  }, [attemptId, code, playQuizSound, quiz, router]);

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
  const handleEnterExam = useCallback(async (): Promise<boolean> => {
    if (!quiz || starting) return false;
    if (attemptId) return true;
    setStarting(true);
    setError(null);
    try {
      const started = await startQuizAttempt(String(quiz.id));
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

  const handleManualSubmit = useCallback(() => {
    playQuizSound("submit");
    void submit();
  }, [playQuizSound, submit]);

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
      entryError={error}
      onTerminate={handleTerminate}
    >
      {submitting && <SubmissionProgressOverlay soundEnabled={soundEnabled} onSound={playQuizSound} />}
      {starting || (!attemptId && !error) ? (
        <div className="flex h-full items-center justify-center p-6">
          <StatusScreen loading text="Starting your secure attempt…" />
        </div>
      ) : !current || !attemptId ? (
        <div className="flex h-full items-center justify-center p-6">
          <StatusScreen text={error || "This quiz has no available questions."} />
        </div>
      ) : (
      <div className="relative min-h-full overflow-hidden bg-[#F7F7FB] px-4 py-4 dark:bg-[#090A10] sm:px-6 sm:py-6">
      {!isMobile && <QuizSpaceAtmosphere />}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-violet-500/[0.06] blur-3xl dark:bg-violet-500/[0.09]" />
        <div className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-pink-500/[0.05] blur-3xl dark:bg-pink-500/[0.08]" />
        <div className="absolute -right-24 top-[18%] hidden h-56 w-56 rounded-full border border-violet-200/[0.05] dark:block" />
        <div className="absolute -right-10 top-[23%] hidden h-28 w-44 rotate-[-18deg] rounded-[50%] border border-cyan-100/[0.045] dark:block" />
        <span className="absolute left-[8%] top-[16%] hidden h-1 w-1 rounded-full bg-white/45 shadow-[0_0_8px_rgba(255,255,255,.55)] dark:block" />
        <span className="absolute right-[12%] top-[9%] hidden h-1.5 w-1.5 rounded-full bg-violet-200/50 shadow-[0_0_10px_rgba(196,181,253,.55)] dark:block" />
        <span className="absolute bottom-[18%] left-[14%] hidden h-1 w-1 rounded-full bg-cyan-100/50 shadow-[0_0_9px_rgba(165,243,252,.5)] dark:block" />
      </div>
      <QuizPageReady className="relative mx-auto max-w-4xl" label="Loading question">
      <main className="relative space-y-4">
        <div className="overflow-hidden rounded-[22px] border border-pink-200/75 bg-white/90 shadow-[0_18px_55px_-38px_rgba(244,114,182,.75)] dark:border-violet-400/15 dark:bg-[#111624]/92 dark:shadow-[0_20px_60px_-36px_rgba(124,92,255,.65)]">
          <div className="flex items-center justify-between gap-3 px-3.5 py-3.5 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-[0_10px_22px_-14px_rgba(16,185,129,.9)]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">Secure channel {autoSubmitted ? "· submitted" : "· connected"}</span>
                <span className="mt-0.5 block truncate text-xs font-bold text-text-primary">Question {index + 1} of {questions.length}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-xl border border-pink-100 bg-pink-50 px-2.5 py-1.5 text-[10px] font-bold text-pink-600 dark:border-violet-400/15 dark:bg-violet-500/[0.07] dark:text-violet-200 min-[420px]:inline-flex"><Target className="h-3.5 w-3.5" /> {answered} answered</span>
              <button type="button" onClick={toggleQuizSounds} className="grid h-9 w-9 place-items-center rounded-xl border border-pink-100 bg-pink-50 text-pink-600 transition hover:border-pink-300 hover:bg-pink-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-violet-200 dark:hover:border-violet-400/25" aria-label={soundEnabled ? "Mute quiz sounds" : "Enable quiz sounds"} title={soundEnabled ? "Quiz sounds on" : "Quiz sounds off"}>
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden bg-pink-100 dark:bg-white/[0.055]">
            <motion.div className="h-full rounded-r-full bg-gradient-to-r from-violet-500 via-pink-500 to-rose-400" animate={{ width: `${progress}%` }} transition={isMobile ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }} />
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={current.id}
          initial={{ opacity: 0, x: isMobile ? 0 : 18, scale: 1 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: isMobile ? 0 : -14, scale: 1 }}
          transition={isMobile ? { duration: 0.12 } : { duration: 0.22, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[24px] border border-border/80 bg-card/90 p-4 shadow-[0_18px_60px_-42px_rgba(42,23,90,.75)] backdrop-blur-xl sm:p-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-500/[0.06] blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-500/10 text-[10px]">{index + 1}</span>
              Question
            </p>
            <span className="rounded-full border border-border bg-background/65 px-2.5 py-1 text-[9px] font-semibold text-text-muted">
              {current.quiz_problem_type === 2 ? "Select all that apply" : current.options.length ? "Choose one answer" : "Written response"}
            </span>
          </div>
          <h2 className="relative mt-4 whitespace-pre-wrap text-base font-semibold leading-7 tracking-[-0.01em] text-text-primary sm:text-lg">{current.problem_statement}</h2>
          {current.problem_description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{current.problem_description}</p>}

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
                  className={`group flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left text-sm leading-5 transition-all duration-200 ${selected ? "border-pink-500/70 bg-gradient-to-r from-pink-500/[0.11] to-violet-500/[0.06] text-text-primary shadow-[0_8px_24px_-18px_rgba(236,72,153,.9)] ring-2 ring-pink-500/10" : "border-border bg-background/65 text-text-secondary hover:-translate-y-0.5 hover:border-violet-500/30 hover:bg-card-hover/60 hover:text-text-primary"}`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border text-[11px] font-bold transition-colors ${selected ? "border-pink-500 bg-pink-500 text-white" : "border-border bg-card text-text-muted group-hover:border-violet-500/30 group-hover:text-violet-500"}`}>
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="flex-1">{option.option_statement}</span>
                  <CheckCircle2 className={`h-4 w-4 shrink-0 transition-opacity ${selected ? "text-pink-500 opacity-100" : "opacity-0"}`} />
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
        </motion.section>
        </AnimatePresence>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <footer className="sticky bottom-3 grid grid-cols-2 gap-3 rounded-2xl border border-border/80 bg-card/85 p-2.5 shadow-[0_14px_38px_-18px_rgba(17,12,40,.55)] backdrop-blur-xl sm:grid-cols-[auto_1fr_auto]">
          <button type="button" onClick={() => { playQuizSound("navigate"); setIndex((value) => Math.max(0, value - 1)); }} disabled={index === 0} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border bg-background/70 px-4 text-sm font-semibold text-text-primary transition hover:border-violet-500/30 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          {index < questions.length - 1 ? (
            <button type="button" onClick={() => { playQuizSound("navigate"); setIndex((value) => Math.min(questions.length - 1, value + 1)); }} className="col-start-2 inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(219,39,119,.8)] transition hover:-translate-y-0.5 sm:col-start-3">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={handleManualSubmit} disabled={submitting} className="col-start-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-start-3">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send className="h-4 w-4" />} {submitting ? "Submitting…" : "Submit"}
            </button>
          )}
        </footer>
      </main>
      </QuizPageReady>
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

function SubmissionProgressOverlay({ soundEnabled, onSound }: { soundEnabled: boolean; onSound: (sound: QuizSound) => void }) {
  const [elapsed, setElapsed] = useState(0);

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

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-md" role="status" aria-live="polite" aria-label={stage.title}>
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-white p-6 text-slate-950 shadow-[0_30px_100px_rgba(0,0,0,.45)] dark:bg-[#101016] dark:text-white sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-pink-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_12px_36px_rgba(236,72,153,.3)]">
            <StageIcon key={stageIndex} className="h-8 w-8 animate-[quiz-submit-pop_.35s_ease-out] motion-reduce:animate-none" />
          </div>
          <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-pink-600 dark:text-pink-400">Submission in progress</p>
          <h2 key={`title-${stageIndex}`} className="mt-2 animate-[quiz-submit-rise_.3s_ease-out] text-center text-xl font-bold tracking-tight motion-reduce:animate-none sm:text-2xl">
            {stage.title}
          </h2>
          <p key={`detail-${stageIndex}`} className="mt-2 min-h-10 animate-[quiz-submit-rise_.3s_ease-out] text-center text-sm leading-5 text-slate-500 motion-reduce:animate-none dark:text-white/55">
            {stage.detail}
          </p>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2" aria-hidden="true">
            {SUBMISSION_STAGES.map((item, itemIndex) => (
              <div key={item.title} className="flex flex-col items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition-colors duration-300 ${itemIndex < stageIndex ? "border-emerald-500 bg-emerald-500 text-white" : itemIndex === stageIndex ? "border-pink-500 bg-pink-500 text-white" : "border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white/30"}`}>
                  {itemIndex < stageIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : itemIndex + 1}
                </span>
                <span className={`hidden text-center text-[9px] leading-3 sm:block ${itemIndex <= stageIndex ? "text-slate-600 dark:text-white/65" : "text-slate-400 dark:text-white/30"}`}>
                  {item.title.replace(" your", "")}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-white/35">Please keep this window open. Your answers are safe.</p>
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
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        {loading ? <Loader2 className="mx-auto h-7 w-7 animate-spin text-pink-500" /> : <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />}
        <p className="mt-3 text-sm leading-6 text-text-secondary">{text}</p>
      </div>
    </div>
  );
}
