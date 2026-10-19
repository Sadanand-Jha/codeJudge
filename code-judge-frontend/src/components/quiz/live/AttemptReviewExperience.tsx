"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  LayoutGrid,
  Medal,
  PieChart,
  Star,
  Target,
  Timer,
  Trophy,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getQuizResult,
  getQuizRating,
  getQuizReview,
  submitQuizRating,
  type QuestionReview,
  type QuizRatingState,
  type QuizResult,
  type ReviewOption,
} from "@/services/quiz";
import { getApiErrorMessage } from "@/lib/apiError";
import { QuizStateScreen } from "./StudentQuizShell";
import { useQuizSounds } from "@/hooks/useQuizSounds";
import { useIsMobile } from "@/hooks/useIsMobile";

type QuestionStatus = "correct" | "wrong" | "skipped" | "answered";
type RatingCategory = "quiz" | "questions" | "teacher" | "platform";
type RatingSelection = Record<RatingCategory, number>;

const EMPTY_RATINGS: RatingSelection = { quiz: 0, questions: 0, teacher: 0, platform: 0 };

/** All answer shapes the attempt screen persists (see attempt page restore logic). */
type SelectedAnswer =
  | { kind: "single"; id: string }
  | { kind: "multi"; ids: string[] }
  | { kind: "text"; text: string };

interface AttemptReviewQuestion {
  id: string;
  number: number;
  statement: string;
  difficulty: "Easy" | "Medium" | "Hard";
  options: Array<{ id: string; label: string; text: string }>;
  correctOptionId: string;
  correctOptionIds: string[];
  selected?: SelectedAnswer;
  /** For text answers: whether the response matches an accepted answer. */
  textMatched?: boolean;
  explanation?: string;
  marksObtained: number;
  maxMarks: number;
  timeSpent: string;
}

interface AttemptReviewData {
  quizName: string;
  subject: string;
  attemptDate: string;
  duration: string;
  score: string;
  percentage: number;
  rank?: number;
  submittedAt: string;
  submittedAtShort: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  percentile: number | null;
  avgTimePerQuestion: string;
  flagged: boolean;
  flagReason: string | null;
  insights: {
    strongestTopic?: string;
    weakestTopic?: string;
    longestQuestions: string[];
    fastestQuestions: string[];
    topicAccuracy: Array<{ topic: string; accuracy: number }>;
    difficultyPerformance: Array<{ difficulty: string; accuracy: number }>;
  };
  questions: AttemptReviewQuestion[];
}

/* ─── Data helpers — unchanged logic ─── */

function questionStatus(question: AttemptReviewQuestion): QuestionStatus {
  const selected = question.selected;
  if (!selected) return "skipped";
  if (selected.kind === "single") {
    return selected.id === question.correctOptionId ? "correct" : "wrong";
  }
  if (selected.kind === "multi") {
    const correct = new Set(question.correctOptionIds);
    const picked = new Set(selected.ids);
    const exact =
      picked.size === correct.size && [...picked].every((id) => correct.has(id));
    return exact ? "correct" : "wrong";
  }
  // Text answers are only auto-verified against the visible accepted answers
  // (the backend also checks hidden matching targets). A non-matching text
  // response was still attempted, so it is "answered", never "skipped".
  return question.textMatched ? "correct" : "answered";
}

function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(Number(totalSeconds))) return "—";
  const total = Math.max(0, Math.floor(Number(totalSeconds)));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact variant for narrow metric cards (drops the year so it fits on mobile). */
function formatDateTimeShort(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeDifficulty(value: unknown): "Easy" | "Medium" | "Hard" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.startsWith("easy")) return "Easy";
  if (normalized.startsWith("hard")) return "Hard";
  return "Medium";
}

/**
 * The saved answer is stored as JSONB. Autosave/submit persist one of:
 * `{ type: "MCQ", selectedOptionId }`, `{ type: "MULTI", selectedOptionIds }`,
 * `{ type: "TEXT", text }` (or the same keys without `type`, or a legacy raw
 * option id), so resolve all of them back to a structured selected answer.
 */
function parseSelectedAnswer(selected: unknown): SelectedAnswer | undefined {
  if (selected === null || selected === undefined) return undefined;
  let value: unknown;
  try {
    value = typeof selected === "string" ? JSON.parse(selected) : selected;
  } catch {
    return typeof selected === "string" && selected.length > 0
      ? { kind: "single", id: selected }
      : undefined;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj.selectedOptionId != null) {
      return { kind: "single", id: String(obj.selectedOptionId) };
    }
    if (Array.isArray(obj.selectedOptionIds)) {
      const ids = obj.selectedOptionIds.map(String).filter(Boolean);
      return ids.length > 0 ? { kind: "multi", ids } : undefined;
    }
    if (obj.text != null) {
      const text = String(obj.text);
      return text.trim().length > 0 ? { kind: "text", text } : undefined;
    }
    return undefined;
  }
  if (typeof value === "number" || (typeof value === "string" && value.length > 0)) {
    return { kind: "single", id: String(value) };
  }
  return undefined;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/**
 * Map the live result + question-wise review rows onto the shape the
 * review UI renders. Per-question marks are derived from the quiz total
 * (total_marks / total_questions); topic-level insights and percentile have
 * no backend source, so they are left empty and hidden in the UI.
 */
function buildAttemptReviewData(result: QuizResult, review: QuestionReview[]): AttemptReviewData {
  const totalQuestions = Number(result.total_questions) || review.length;
  const totalMarks = Number(result.total_marks) || 0;
  const perQuestionMarks =
    totalQuestions > 0 ? Math.round((totalMarks / totalQuestions) * 100) / 100 : 0;
  const percentage = Number(result.percentage) || 0;
  const correct = Number(result.correct_answers) || 0;
  const wrong = Number(result.wrong_answers) || 0;
  const skipped =
    result.skipped_questions !== null && result.skipped_questions !== undefined
      ? Number(result.skipped_questions)
      : Math.max(0, totalQuestions - correct - wrong);

  const questions: AttemptReviewQuestion[] = review.map((row, index) => {
    const options: ReviewOption[] = Array.isArray(row.options) ? row.options : [];
    const correctIds = options.filter((option) => option.iscorrect).map((option) => String(option.id));
    const correctOptionId = correctIds[0] ?? "";
    const selected = parseSelectedAnswer(row.selected_option);
    let textMatched: boolean | undefined;
    if (selected?.kind === "text") {
      const submitted = selected.text.trim().toLowerCase();
      const accepted = options
        .map((option) => option.option_statement)
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());
      textMatched = accepted.includes(submitted);
    }
    const built: AttemptReviewQuestion = {
      id: String(row.problem_id),
      // Review numbering is positional. Database question numbers can be
      // sparse, reused after soft deletion, or reflect the quiz's original
      // order rather than the student's attempt order. The UI must always
      // present a simple 1, 2, 3… sequence.
      number: index + 1,
      statement: row.problem_statement,
      difficulty: normalizeDifficulty(row.difficulty),
      options: options.map((option, optionIndex) => ({
        id: String(option.id),
        label: OPTION_LABELS[optionIndex] ?? String(optionIndex + 1),
        text: option.option_statement,
      })),
      correctOptionId,
      correctOptionIds: correctIds,
      selected,
      textMatched,
      explanation: row.explaination ?? undefined,
      marksObtained: 0,
      maxMarks: perQuestionMarks,
      // Per-question time is not tracked by the backend (time_spent_seconds
      // is never written), so there is no real value to show here.
      timeSpent: "—",
    };
    built.marksObtained = questionStatus(built) === "correct" ? perQuestionMarks : 0;
    return built;
  });

  const difficultyGroups = new Map<string, { total: number; correct: number }>();
  for (const question of questions) {
    const group = difficultyGroups.get(question.difficulty) ?? { total: 0, correct: 0 };
    group.total += 1;
    if (questionStatus(question) === "correct") {
      group.correct += 1;
    }
    difficultyGroups.set(question.difficulty, group);
  }

  const timeTakenSeconds =
    result.time_taken !== null && result.time_taken !== undefined ? Number(result.time_taken) : null;

  return {
    quizName: result.quiz_name || "Quiz Attempt",
    subject: result.quiz_code ? `Code ${result.quiz_code}` : "Quiz",
    attemptDate: formatDateTime(result.created_at),
    duration: formatDuration(timeTakenSeconds),
    score: `${Number(result.marks_obtained) || 0}/${totalMarks}`,
    percentage,
    rank: result.rank ?? undefined,
    submittedAt: formatDateTime(result.completed_at),
    submittedAtShort: formatDateTimeShort(result.completed_at),
    totalQuestions,
    correct,
    wrong,
    skipped,
    percentile: null,
    flagged: result.flagged === true,
    flagReason: result.flag_reason ?? null,
    avgTimePerQuestion:
      timeTakenSeconds !== null && totalQuestions > 0
        ? formatDuration(Math.round(timeTakenSeconds / totalQuestions))
        : "—",
    insights: {
      longestQuestions: [],
      fastestQuestions: [],
      topicAccuracy: [],
      difficultyPerformance: [...difficultyGroups.entries()].map(([difficulty, group]) => ({
        difficulty,
        accuracy: group.total > 0 ? Math.round((group.correct / group.total) * 100) : 0,
      })),
    },
    questions,
  };
}

/* ─── Score ring — qs-ui track, brand progress ─── */

function ScoreRing({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, Number(percentage) || 0));
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (clamped / 100) * c;

  return (
    <div className="relative h-[112px] w-[112px] shrink-0 sm:h-[128px] sm:w-[128px]" role="img" aria-label={`Score ${clamped}%`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: "var(--qs-line)" }} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          style={{
            stroke: "var(--qs-brand)",
            filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--qs-brand) 40%, transparent))",
            transition: "stroke-dasharray 0.8s ease",
          }}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="qs-display text-[20px] font-extrabold leading-none text-[var(--qs-ink)] sm:text-[22px]">
          {Number.isInteger(clamped) ? `${clamped}%` : `${clamped.toFixed(1)}%`}
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--qs-muted)]">
          Score
        </span>
      </div>
    </div>
  );
}

/* ─── Main component ─── */

export default function AttemptReviewExperience({
  attemptId,
}: {
  attemptId: string;
}) {
  const { playQuizSound } = useQuizSounds();
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [data, setData] = useState<AttemptReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingState, setRatingState] = useState<QuizRatingState | null>(null);
  const [selectedRatings, setSelectedRatings] = useState<RatingSelection>(EMPTY_RATINGS);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingLoading, setRatingLoading] = useState(true);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [resolvedRatingQuizId, setResolvedRatingQuizId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  // Slide direction for question transitions: +1 forward, -1 backward.
  const [navDir, setNavDir] = useState<1 | -1>(1);
  // Mobile: opacity-only transitions, no layout-property animation.
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [result, review] = await Promise.all([
          getQuizResult(attemptId),
          getQuizReview(attemptId),
        ]);
        if (!cancelled) {
          setData(buildAttemptReviewData(result, review));
          // The URL uses the public quiz code, while rating endpoints require
          // the numeric database id. The owned attempt result is the trusted
          // source that connects those two identifiers.
          setResolvedRatingQuizId(String(result.quiz_id));
          setSelectedQuestion(0);
          playQuizSound("success");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Could not load attempt review."));
          playQuizSound("error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId, playQuizSound]);

  useEffect(() => {
    if (!resolvedRatingQuizId) return;
    let cancelled = false;
    getQuizRating(resolvedRatingQuizId)
      .then((rating) => {
        if (!cancelled) setRatingState(rating);
      })
      .catch((err: unknown) => {
        if (!cancelled) setRatingError(getApiErrorMessage(err, "Could not load rating."));
      })
      .finally(() => {
        if (!cancelled) setRatingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedRatingQuizId]);

  const paletteStatus = useMemo(() => {
    if (!data) return [];
    return data.questions.map(questionStatus);
  }, [data]);

  const handleRatingSubmit = async () => {
    const allRated = Object.values(selectedRatings).every((rating) => rating >= 1 && rating <= 5);
    if (!resolvedRatingQuizId || !ratingState?.canRate || !allRated || ratingSubmitting) return;
    setRatingSubmitting(true);
    setRatingError(null);
    try {
      const nextState = await submitQuizRating(resolvedRatingQuizId, {
        quizRating: selectedRatings.quiz,
        questionRating: selectedRatings.questions,
        platformRating: selectedRatings.platform,
        teacherRating: selectedRatings.teacher,
        feedback: ratingFeedback.trim(),
      });
      setRatingState(nextState);
      setSelectedRatings(EMPTY_RATINGS);
      setRatingFeedback("");
      playQuizSound("success");
    } catch (err: unknown) {
      setRatingError(getApiErrorMessage(err, "Could not submit your rating."));
      playQuizSound("error");
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <QuizStateScreen
        loading
        title="Preparing your review"
        text="Checking your answers and building the full review…"
      />
    );
  }

  if (error || !data) {
    return (
      <QuizStateScreen
        title="Review unavailable"
        text={error ?? "Attempt review not found."}
        action={
          <Link href="/quiz" className="b b-pri gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to quiz home
          </Link>
        }
      />
    );
  }

  const currentQuestion = data.questions[selectedQuestion];

  if (!currentQuestion) {
    return (
      <QuizStateScreen
        title="Nothing to review yet"
        text="This attempt does not contain any reviewable questions."
        action={<Link href="/quiz" className="b b-pri gap-2"><ArrowLeft className="h-4 w-4" /> Back to quiz home</Link>}
      />
    );
  }

  const currentStatus = questionStatus(currentQuestion);

  return (
    <div className="qs-ui relative min-h-[calc(100dvh-3.5rem)] overflow-x-hidden bg-[var(--qs-bg)] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[var(--qs-ink)]">
      {/* Flat outlined motifs — no glow or gradient. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[320px] overflow-hidden">
        <div className="absolute -top-24 left-[-80px] h-[280px] w-[380px] rounded-full border-2 border-[var(--qs-line)]" />
        <div className="absolute -top-24 right-[-80px] h-[280px] w-[380px] rounded-full border-2 border-[var(--qs-line)]" />
      </div>

      <div className="relative mx-auto box-border w-full max-w-[1240px] px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/quiz" className="b b-ghost sm gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--qs-brand)]/30 bg-[var(--qs-brand)]/10 px-3 py-2 text-[13px] font-bold text-[var(--qs-brand)]">
            <Trophy className="h-4 w-4" />
            Attempt review
          </span>
        </div>

        <div className="grid gap-4 md:gap-5 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-4 md:space-y-5">
            {/* Summary Card */}
            <motion.section
              initial={isMobile ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={isMobile ? { duration: 0 } : undefined}
              className="box-border w-full max-w-full rounded-3xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-5"
            >
              <span className="inline-flex items-center rounded-lg bg-[var(--qs-brand)]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--qs-brand)]">
                Attempt scorecard
              </span>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-[32px] sm:leading-[1.15]">
                {data.quizName}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-[var(--qs-muted)] sm:text-sm">
                <span>Attempted on {data.attemptDate}</span>
                <span aria-hidden className="text-[var(--qs-line)]">•</span>
                <span>Submitted at {data.submittedAt}</span>
              </p>
              {data.flagged && (
                <p
                  title={data.flagReason ?? "Flagged by exam-cell proctoring"}
                  className="mt-2 inline-flex items-center rounded-lg border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-bad)]/10 px-2 py-1 text-xs font-semibold text-[var(--qs-bad)]"
                >
                  Flagged for review
                </p>
              )}

              <div className="mt-4 flex flex-col items-stretch gap-4 min-[540px]:flex-row sm:gap-5">
                <div className="flex items-center">
                  <ScoreRing percentage={data.percentage} />
                </div>
                <div aria-hidden className="h-px shrink-0 bg-[var(--qs-line)] min-[540px]:h-auto min-[540px]:w-px" />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:gap-2.5">
                  <MetricCard label="Score" value={data.score} icon={Target} iconColor="var(--qs-brand)" />
                  <MetricCard label="Duration" value={data.duration} icon={Clock3} iconColor="var(--qs-ok)" />
                  <MetricCard
                    label="Rank"
                    value="Coming Soon"
                    icon={Trophy}
                    iconColor="var(--qs-brand)"
                  />
                  <MetricCard
                    label="Submitted"
                    value={data.submittedAtShort}
                    titleValue={data.submittedAt}
                    icon={Upload}
                    iconColor="var(--qs-muted)"
                  />
                </div>
              </div>
            </motion.section>

            <div className="xl:hidden">
              <QuizRatingPanel
                state={ratingState}
                loading={ratingLoading}
                error={ratingError}
                selected={selectedRatings}
                feedback={ratingFeedback}
                submitting={ratingSubmitting}
                isMobile={isMobile}
                onSelect={(category, rating) => setSelectedRatings((current) => ({ ...current, [category]: rating }))}
                onFeedback={setRatingFeedback}
                onSubmit={handleRatingSubmit}
              />
            </div>

            {/* Question Palette — sizes to its content, no fixed height. */}
            <motion.section
              initial={isMobile ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={isMobile ? { duration: 0 } : { delay: 0.05 }}
              className="box-border w-full max-w-full rounded-3xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-[var(--qs-ink)]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]">
                    <LayoutGrid className="h-4 w-4" />
                  </span>
                  Question Palette
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--qs-muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[var(--qs-ok)]" /> Correct
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[var(--qs-bad)]" /> Wrong
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[var(--qs-muted)]" /> Skipped
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-[var(--qs-muted)]">
                Green = correct, red = wrong, amber = answered, gray = skipped, blue = current
              </p>
              <div className="mt-3 grid grid-cols-6 gap-1.5 min-[420px]:grid-cols-8 sm:gap-2" role="group" aria-label="Question palette">
                {data.questions.map((question, index) => {
                  const state = paletteStatus[index] ?? questionStatus(question);
                  const isActive = selectedQuestion === index;
                  return (
                    <button
                      key={question.id}
                      onClick={() => { playQuizSound("select"); setNavDir(index >= selectedQuestion ? 1 : -1); setSelectedQuestion(index); }}
                      aria-current={isActive ? "true" : undefined}
                      aria-label={`Question ${question.number}: ${state}${isActive ? ", current" : ""}`}
                      className={`flex h-9 items-center justify-center rounded-xl border-2 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)] sm:h-10 sm:text-sm ${
                        isActive
                          ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]/15 text-[var(--qs-brand)]"
                          : state === "correct"
                            ? "border-[var(--qs-ok)]/60 bg-[var(--qs-ok)]/10 text-[var(--qs-ok)] hover:border-[var(--qs-ok)]"
                            : state === "wrong"
                              ? "border-[var(--qs-bad)]/60 bg-[var(--qs-bad)]/10 text-[var(--qs-bad)] hover:border-[var(--qs-bad)]"
                              : state === "answered"
                                ? "border-[var(--qs-sun)] bg-[var(--qs-sun)]/30 text-[var(--qs-ink)] hover:border-[var(--qs-sun)]"
                                : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)]/40"
                      }`}
                    >
                      {question.number}
                    </button>
                  );
                })}
              </div>
            </motion.section>

            {/* Question Review Card — directional slide on question change. */}
            <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={currentQuestion.id}
              initial={isMobile ? false : { opacity: 0, x: 28 * navDir }}
              animate={{ opacity: 1, x: 0 }}
              exit={isMobile ? undefined : { opacity: 0, x: -24 * navDir }}
              transition={isMobile ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
              className="box-border w-full max-w-full rounded-3xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-5"
            >
              <div className="flex shrink-0 items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-lg bg-[var(--qs-brand)]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--qs-brand)]">
                    Question {currentQuestion.number}
                  </span>
                  <DifficultyBadge difficulty={currentQuestion.difficulty} />
                  <StatusBadge status={currentStatus} />
                </div>
                <button
                  onClick={() => setCollapsed((v) => !v)}
                  aria-expanded={!collapsed}
                  aria-label={collapsed ? "Expand question" : "Collapse question"}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
                </button>
              </div>

              {!collapsed && (
                // No inner scroll here — the page itself scrolls.
                <div>
                  <h3 className="mt-3 text-[18px] font-semibold leading-snug text-[var(--qs-ink)] sm:text-[22px]">
                    {currentQuestion.statement}
                  </h3>

                  <div className="mt-4 space-y-2.5">
                    {currentQuestion.selected?.kind === "text" && (
                      <div className="rounded-xl border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/15 p-3 sm:p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--qs-ink)]">
                          Your response
                        </p>
                        <p className="mt-1 break-words text-[14px] font-medium leading-relaxed text-[var(--qs-ink)] sm:text-[15px]">
                          {currentQuestion.selected.text}
                        </p>
                      </div>
                    )}
                    {currentQuestion.options.map((option) => {
                      const isCorrect = currentQuestion.correctOptionIds.includes(option.id);
                      const isSelected =
                        currentQuestion.selected?.kind === "single"
                          ? option.id === currentQuestion.selected.id
                          : currentQuestion.selected?.kind === "multi"
                            ? currentQuestion.selected.ids.includes(option.id)
                            : false;
                      const selectedWrong = isSelected && !isCorrect;
                      return (
                        <div
                          key={option.id}
                          className={`box-border flex w-full max-w-full items-start gap-3 rounded-xl border-2 p-3 sm:p-3.5 ${
                            isCorrect
                              ? "border-[var(--qs-ok)] bg-[var(--qs-ok)]/10"
                              : selectedWrong
                                ? "border-[var(--qs-bad)] bg-[var(--qs-bad)]/10"
                                : "border-[var(--qs-line)] bg-[var(--qs-bg)]"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              isCorrect
                                ? "bg-[var(--qs-ok)] text-[var(--qs-on-brand)]"
                                : selectedWrong
                                  ? "bg-[var(--qs-bad)] text-[var(--qs-on-brand)]"
                                  : "bg-[var(--qs-line)] text-[var(--qs-muted)]"
                            }`}
                          >
                            {option.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 break-words text-[14px] font-medium leading-relaxed text-[var(--qs-ink)] sm:text-[15px]">
                              <span className="min-w-0 break-words">{option.text}</span>
                              {isCorrect && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--qs-ok)]" aria-label="Correct option" />
                              )}
                              {selectedWrong && (
                                <XCircle className="h-4 w-4 shrink-0 text-[var(--qs-bad)]" aria-label="Your incorrect selection" />
                              )}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {isSelected && (
                                <span
                                  className={`rounded-lg border-2 px-2 py-0.5 text-[11px] font-semibold ${
                                    isCorrect
                                      ? "border-[var(--qs-ok)]/40 bg-transparent text-[var(--qs-ok)]"
                                      : "border-[var(--qs-bad)]/40 bg-transparent text-[var(--qs-bad)]"
                                  }`}
                                >
                                  Your Answer
                                </span>
                              )}
                              {isCorrect && (
                                <span className="rounded-lg border-2 border-[var(--qs-ok)]/40 bg-transparent px-2 py-0.5 text-[11px] font-semibold text-[var(--qs-ok)]">
                                  Correct Answer
                                </span>
                              )}
                              <span className="rounded-lg border-2 border-[var(--qs-line)] bg-transparent px-2 py-0.5 text-[11px] font-semibold text-[var(--qs-muted)]">
                                Marks {isCorrect ? currentQuestion.marksObtained : 0}/{currentQuestion.maxMarks}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Question statistics */}
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5">
                    <StatBlock
                      label="Your Answer"
                      value={(() => {
                        const selected = currentQuestion.selected;
                        if (!selected) return "Skipped";
                        if (selected.kind === "text") return selected.text;
                        if (selected.kind === "multi") {
                          const labels = selected.ids.map(
                            (id) => currentQuestion.options.find((o) => o.id === id)?.label ?? id
                          );
                          return labels.join(", ");
                        }
                        return (
                          currentQuestion.options.find((o) => o.id === selected.id)?.label ??
                          selected.id
                        );
                      })()}
                      icon={Check}
                      iconBg="bg-[var(--qs-ok)]/15 text-[var(--qs-ok)]"
                    />
                    <StatBlock
                      label="Correct Answer"
                      value={(() => {
                        const labels = currentQuestion.correctOptionIds.map(
                          (id) => currentQuestion.options.find((o) => o.id === id)?.label ?? id
                        );
                        return labels.length > 0
                          ? labels.join(", ")
                          : currentQuestion.correctOptionId.toUpperCase();
                      })()}
                      icon={CheckCircle2}
                      iconBg="bg-[var(--qs-brand)]/15 text-[var(--qs-brand)]"
                    />
                    <StatBlock
                      label="Marks Obtained"
                      value={`${currentQuestion.marksObtained}/${currentQuestion.maxMarks}`}
                      icon={Medal}
                      iconBg="bg-[var(--qs-sun)]/30 text-[var(--qs-ink)]"
                    />
                    <StatBlock
                      label="Time Spent"
                      value={currentQuestion.timeSpent}
                      icon={Timer}
                      iconBg="bg-[var(--qs-line)] text-[var(--qs-muted)]"
                    />
                  </div>

                  {currentQuestion.explanation && (
                    <div className="mt-3 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 sm:p-3.5">
                      <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-[var(--qs-ink)]">
                        <BookOpen className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                        Explanation
                      </div>
                      <p className="break-words text-[13px] leading-relaxed text-[var(--qs-muted)] sm:text-sm">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Prev / Next */}
              <div className="z-20 mt-3 flex shrink-0 items-center justify-between gap-2 border-t-2 border-[var(--qs-line)] pt-3">
                <button
                  onClick={() => { playQuizSound("navigate"); setNavDir(-1); setSelectedQuestion((current) => Math.max(0, current - 1)); }}
                  disabled={selectedQuestion === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]/45 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <span className="text-xs font-semibold text-[var(--qs-muted)]">
                  {selectedQuestion + 1} / {data.questions.length}
                </span>
                <button
                  onClick={() => {
                    playQuizSound("navigate");
                    setNavDir(1);
                    setSelectedQuestion((current) => Math.min(data.questions.length - 1, current + 1));
                  }}
                  disabled={selectedQuestion === data.questions.length - 1}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]/45 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.section>
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="min-w-0 space-y-4 md:space-y-5">
            <div className="hidden xl:block">
              <QuizRatingPanel
                state={ratingState}
                loading={ratingLoading}
                error={ratingError}
                selected={selectedRatings}
                feedback={ratingFeedback}
                submitting={ratingSubmitting}
                isMobile={isMobile}
                onSelect={(category, rating) => setSelectedRatings((current) => ({ ...current, [category]: rating }))}
                onFeedback={setRatingFeedback}
                onSubmit={handleRatingSubmit}
              />
            </div>
            <motion.section
              initial={isMobile ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={isMobile ? { duration: 0 } : undefined}
              className="box-border w-full max-w-full rounded-3xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-5"
            >
              <h2 className="text-[15px] font-extrabold text-[var(--qs-ink)]">Result Analytics</h2>
              <p className="mt-0.5 text-xs text-[var(--qs-muted)]">Score, ranking, and answer breakdown.</p>
              <div className="mt-3 space-y-1.5">
                <AnalyticsMetric label="Overall Score" value={data.score} icon={Target} />
                <AnalyticsMetric label="Accuracy" value={`${data.percentage}%`} icon={PieChart} />
                <AnalyticsMetric label="Attempt Time" value={data.attemptDate} icon={Clock3} />
                <AnalyticsMetric label="Avg Time / Q" value={data.avgTimePerQuestion} icon={Timer} />
                <AnalyticsMetric label="Correct" value={data.correct} icon={CheckCircle2} accent="var(--qs-ok)" />
                <AnalyticsMetric label="Wrong" value={data.wrong} icon={XCircle} accent="var(--qs-bad)" />
                <AnalyticsMetric label="Skipped" value={data.skipped} icon={CircleDashed} accent="var(--qs-muted)" />
                <AnalyticsMetric label="Rank" value="Coming Soon" icon={Trophy} />
                <AnalyticsMetric
                  label="Percentile"
                  value={data.percentile !== null ? `${data.percentile}%` : "—"}
                  icon={Zap}
                />
              </div>

              <div className="mt-3 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--qs-ink)]">
                  <span>Correct vs Wrong vs Skipped</span>
                  <PieChart className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                </div>
                <DonutBreakdown correct={data.correct} wrong={data.wrong} skipped={data.skipped} />
              </div>
            </motion.section>

            <motion.section
              initial={isMobile ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={isMobile ? { duration: 0 } : { delay: 0.05 }}
              className="box-border w-full max-w-full rounded-3xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-5"
            >
              <h2 className="text-[15px] font-extrabold text-[var(--qs-ink)]">Performance Insights</h2>
              {data.insights.difficultyPerformance.length > 0 ? (
                <div className="mt-3 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                  <div className="text-xs font-bold text-[var(--qs-ink)]">Difficulty-wise Performance</div>
                  <div className="mt-2 space-y-2">
                    {data.insights.difficultyPerformance.map((item) => (
                      <div key={item.difficulty}>
                        <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--qs-muted)]">
                          <span>{item.difficulty}</span>
                          <span>{item.accuracy}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--qs-line)]">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${item.accuracy}%`,
                              background: "var(--qs-brand)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--qs-muted)]">No performance breakdown available.</p>
              )}
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub components — styles only ─── */

function QuizRatingPanel({
  state,
  loading,
  error,
  selected,
  feedback,
  submitting,
  isMobile,
  onSelect,
  onFeedback,
  onSubmit,
}: {
  state: QuizRatingState | null;
  loading: boolean;
  error: string | null;
  selected: RatingSelection;
  feedback: string;
  submitting: boolean;
  isMobile: boolean;
  onSelect: (category: RatingCategory, rating: number) => void;
  onFeedback: (feedback: string) => void;
  onSubmit: () => void;
}) {
  const statusCopy = state?.reason === "no_completed_attempt"
    ? "Only students who completed this quiz can leave a rating."
    : null;
  const allRated = Object.values(selected).every((rating) => rating > 0);

  // Ratings are immutable. Once this account has rated the quiz, keep the
  // review focused on the attempt instead of leaving a dead confirmation card.
  if (!loading && state?.userRating) return null;

  return (
    <motion.section
      initial={isMobile ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={isMobile ? { duration: 0 } : { delay: 0.04 }}
      className="box-border w-full max-w-full overflow-hidden rounded-3xl border-2 border-[var(--qs-brand)]/25 bg-[var(--qs-surface)]"
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-[var(--qs-ink)]">Rate quiz</h2>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--qs-muted)]">Help us improve</span>
        </div>
        {loading ? <div className={`mt-3 h-20 rounded-xl bg-[var(--qs-line)] ${isMobile ? "" : "animate-pulse"}`} /> : state?.canRate ? (
          <div className="mt-3 space-y-3">
            <div className="grid gap-1.5">
              <CompactRatingRow label="Quiz" value={selected.quiz} onChange={(rating) => onSelect("quiz", rating)} disabled={submitting} />
              <CompactRatingRow label="Questions" value={selected.questions} onChange={(rating) => onSelect("questions", rating)} disabled={submitting} />
              <CompactRatingRow label="Teacher" value={selected.teacher} onChange={(rating) => onSelect("teacher", rating)} disabled={submitting} />
              <CompactRatingRow label="Platform" value={selected.platform} onChange={(rating) => onSelect("platform", rating)} disabled={submitting} />
            </div>
            <div className="flex flex-col gap-2">
              <input
                value={feedback}
                onChange={(event) => onFeedback(event.target.value.slice(0, 600))}
                placeholder="Optional feedback"
                aria-label="Optional feedback"
                className="h-9 w-full min-w-0 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 text-xs text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
              />
              <button
                type="button"
                onClick={onSubmit}
                disabled={!allRated || submitting}
                className="inline-flex h-9 w-full items-center justify-center rounded-xl border-2 border-[var(--qs-brand)] bg-[var(--qs-brand)] px-4 text-xs font-bold text-[var(--qs-on-brand)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Submit feedback"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {!loading && state && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-2.5 text-[11px] sm:px-5">
          <span className="text-[var(--qs-muted)]">
            {state.userRating
              ? `Rating saved · Your identity will not be shown.`
              : statusCopy ?? "Your identity will not be shown."}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--qs-brand)]">
            <Star className="h-3.5 w-3.5 fill-[var(--qs-sun)] text-[var(--qs-sun)]" />
            {state.averageRating === null
              ? "Be the first to rate"
              : `${state.averageRating.toFixed(1)} from ${state.ratingCount} ${state.ratingCount === 1 ? "rating" : "ratings"}`}
          </span>
        </div>
      )}

      {error && (
        <p className="border-t-2 border-[var(--qs-bad)]/20 bg-[var(--qs-bad)]/10 px-4 py-2.5 text-[11px] font-medium text-[var(--qs-bad)] sm:px-5">
          {error}
        </p>
      )}
    </motion.section>
  );
}

function CompactRatingRow({ label, value, onChange, disabled }: {
  label: string;
  value: number;
  onChange: (rating: number) => void;
  disabled: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const visible = hovered || value;
  return (
    <div className="flex items-center justify-between rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-2">
      <span className="text-[11px] font-semibold text-[var(--qs-muted)]">{label}</span>
      <div className="flex" role="radiogroup" aria-label={`Rate ${label.toLowerCase()}`} onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${rating} stars`}
            disabled={disabled}
            onMouseEnter={() => setHovered(rating)}
            onFocus={() => setHovered(rating)}
            onBlur={() => setHovered(0)}
            onClick={() => onChange(rating)}
            className="rounded p-0.5 text-[var(--qs-line)] enabled:hover:scale-110 enabled:focus-visible:outline-none enabled:focus-visible:ring-1 enabled:focus-visible:ring-[var(--qs-brand)]"
          >
            <Star className={`h-4 w-4 ${rating <= visible ? "fill-[var(--qs-sun)] text-[var(--qs-sun)]" : "fill-transparent"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
  truncate = false,
  titleValue,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  truncate?: boolean;
  titleValue?: string;
}) {
  return (
    <div className="box-border min-w-0 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5 sm:p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: iconColor }} />
        <span className="truncate">{label}</span>
      </div>
      <div
        title={titleValue ?? value}
        className={`mt-1 text-[16px] font-bold text-[var(--qs-ink)] sm:text-[18px] ${
          truncate ? "truncate" : "break-words"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: "Easy" | "Medium" | "Hard" }) {
  const styles: Record<string, string> = {
    Easy: "border-[var(--qs-ok)]/40 bg-[var(--qs-ok)]/10 text-[var(--qs-ok)]",
    Medium: "border-[var(--qs-sun)] bg-[var(--qs-sun)]/30 text-[var(--qs-ink)]",
    Hard: "border-[var(--qs-bad)]/40 bg-[var(--qs-bad)]/10 text-[var(--qs-bad)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-lg border-2 px-2 py-1 text-[11px] font-bold ${styles[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  if (status === "correct")
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border-2 border-[var(--qs-ok)]/40 bg-[var(--qs-ok)]/10 px-2 py-1 text-[11px] font-bold text-[var(--qs-ok)]">
        <Check className="h-3 w-3" /> Correct
      </span>
    );
  if (status === "wrong")
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-bad)]/10 px-2 py-1 text-[11px] font-bold text-[var(--qs-bad)]">
        <XCircle className="h-3 w-3" /> Wrong
      </span>
    );
  if (status === "answered")
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/30 px-2 py-1 text-[11px] font-bold text-[var(--qs-ink)]">
        <Check className="h-3 w-3" /> Answered
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-1 text-[11px] font-bold text-[var(--qs-muted)]">
      <CircleDashed className="h-3 w-3" /> Skipped
    </span>
  );
}

function StatBlock({
  label,
  value,
  icon: Icon,
  iconBg,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
}) {
  return (
    <div className="box-border flex min-w-0 items-center gap-2.5 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5 sm:p-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--qs-muted)] sm:text-[11px]">
          {label}
        </span>
        <span title={value} className="block truncate text-[15px] font-bold text-[var(--qs-ink)] sm:text-base">
          {value}
        </span>
      </span>
    </div>
  );
}

function AnalyticsMetric({
  label,
  value,
  icon: Icon,
  accent = "var(--qs-brand)",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--qs-muted)]">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
        <span className="truncate">{label}</span>
      </div>
      <div title={String(value)} className="max-w-[45%] truncate text-xs font-bold text-[var(--qs-ink)]">
        {value}
      </div>
    </div>
  );
}

function DonutBreakdown({ correct, wrong, skipped }: { correct: number; wrong: number; skipped: number }) {
  const total = Math.max(1, correct + wrong + skipped);
  const rows = [
    { label: "Correct", count: correct, pct: Math.round((correct / total) * 100), dot: "bg-[var(--qs-ok)]", text: "text-[var(--qs-ok)]" },
    { label: "Wrong", count: wrong, pct: Math.round((wrong / total) * 100), dot: "bg-[var(--qs-bad)]", text: "text-[var(--qs-bad)]" },
    { label: "Skipped", count: skipped, pct: Math.round((skipped / total) * 100), dot: "bg-[var(--qs-muted)]", text: "text-[var(--qs-muted)]" },
  ];
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-[72px] w-[72px] shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" style={{ stroke: "var(--qs-line)" }} strokeWidth="12" />
          {(() => {
            let cumulative = 0;
            const segs = [
              { pct: (correct / total) * 100, color: "var(--qs-ok)" },
              { pct: (wrong / total) * 100, color: "var(--qs-bad)" },
              { pct: (skipped / total) * 100, color: "var(--qs-muted)" },
            ].filter((s) => s.pct > 0);
            return segs.map((seg, i) => {
              const start = (cumulative / 100) * 360;
              const end = ((cumulative + seg.pct) / 100) * 360;
              cumulative += seg.pct;
              const large = end - start > 180 ? 1 : 0;
              const polar = (deg: number) => {
                const rad = ((deg - 90) * Math.PI) / 180;
                return { x: 50 + 40 * Math.cos(rad), y: 50 + 40 * Math.sin(rad) };
              };
              const s = polar(end);
              const e = polar(start);
              return (
                <path
                  key={i}
                  d={`M ${s.x} ${s.y} A 40 40 0 ${large} 0 ${e.x} ${e.y}`}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="12"
                />
              );
            });
          })()}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-extrabold leading-none text-[var(--qs-ink)]">{correct + wrong + skipped}</span>
          <span className="mt-0.5 text-[8px] uppercase tracking-wider text-[var(--qs-muted)]">Total</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-[11px]">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dot}`} />
            <span className="text-[var(--qs-muted)]">{row.label}</span>
            <span className={`ml-auto font-bold text-[var(--qs-ink)]`}>
              {row.count} ({row.pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
