"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserTimeZone } from "@/lib/timezone";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  EyeOff,
  LayoutGrid,
  Star,
  XCircle,
} from "lucide-react";
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
import { QuizRichText } from "@/components/quiz/QuizRichText";
import { htmlToPlainText } from "@/utils/htmlText";

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
    timeZone: getUserTimeZone(),
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
    timeZone: getUserTimeZone(),
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
        .map((option) => htmlToPlainText(option.option_statement))
        .filter(Boolean)
        .map((value) => value.trim().toLowerCase());
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
      explanation: row.explaination || undefined,
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

/* ─── Score ring — yellow hero badge, purple progress ─── */

function ScoreRing({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, Number(percentage) || 0));
  const size = 150;
  const stroke = 12;
  const r = 64;
  const c = 2 * Math.PI * r;
  const filled = (clamped / 100) * c;

  return (
    <div
      className="relative grid h-[132px] w-[132px] shrink-0 place-items-center rounded-full border-[3px] border-[#1d1840] bg-[var(--qs-sun)] shadow-[5px_5px_0_#1d1840] sm:h-[150px] sm:w-[150px]"
      role="img"
      aria-label={`Score ${clamped}%`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(29,24,64,.15)" strokeWidth={stroke} />
        <circle
          cx="75"
          cy="75"
          r={r}
          fill="none"
          stroke="var(--qs-brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
        />
      </svg>
      <div className="relative text-center leading-none text-[#1d1840]">
        <b className="qs-display block text-[32px] font-extrabold tracking-[-0.03em] sm:text-[38px]">
          {Number.isInteger(clamped) ? `${clamped}%` : `${clamped.toFixed(1)}%`}
        </b>
        <span className="mt-1 block text-[12px] font-extrabold">Score</span>
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
  const [pending, setPending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsHidden, setDetailsHidden] = useState(false);
  const [ratingState, setRatingState] = useState<QuizRatingState | null>(null);
  const [selectedRatings, setSelectedRatings] = useState<RatingSelection>(EMPTY_RATINGS);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingLoading, setRatingLoading] = useState(true);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [resolvedRatingQuizId, setResolvedRatingQuizId] = useState<string | null>(null);
  // Slide direction for question transitions: +1 forward, -1 backward.
  const [navDir, setNavDir] = useState<1 | -1>(1);
  // Mobile: opacity-only transitions, no layout-property animation.
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setPending(false);
      setPendingMessage(null);
      setError(null);
      setDetailsHidden(false);
      try {
        const result = await getQuizResult(attemptId);
        if (cancelled) return;

        // The URL uses the public quiz code, while rating endpoints require
        // the numeric database id. The owned attempt result is the trusted
        // source that connects those two identifiers.
        setResolvedRatingQuizId(String(result.quiz_id));

        if (result.result_details_visible === false) {
          setData(buildAttemptReviewData(result, []));
          setDetailsHidden(true);
          playQuizSound("success");
          return;
        }

        let review: QuestionReview[] = [];
        try {
          review = await getQuizReview(attemptId);
        } catch (reviewError: unknown) {
          const reviewStatus = (reviewError as { response?: { status?: number } })?.response?.status;
          if (reviewStatus === 403) {
            if (!cancelled) {
              setData(buildAttemptReviewData(result, []));
              setDetailsHidden(true);
              playQuizSound("success");
            }
            return;
          }
          throw reviewError;
        }

        if (!cancelled) {
          setData(buildAttemptReviewData(result, review));
          setSelectedQuestion(0);
          playQuizSound("success");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 403) {
            setPending(true);
            setPendingMessage(getApiErrorMessage(err, "Results are being prepared."));
          } else {
            setError(getApiErrorMessage(err, "Could not load attempt review."));
            playQuizSound("error");
          }
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

  if (pending && !data) {
    return (
      <QuizStateScreen
        title="Results are being prepared"
        text={pendingMessage ?? "Your answers are saved. Results will be available 1 hour after the quiz ends."}
        action={
          <Link href="/quiz" className="b b-pri gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to quiz home
          </Link>
        }
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

  if (detailsHidden) {
    return (
      <div className="qs-ui relative min-h-[calc(100dvh-3.5rem)] overflow-x-hidden bg-[var(--qs-bg)] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[var(--qs-ink)]">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[320px] overflow-hidden">
          <div className="absolute -top-24 left-[-80px] h-[280px] w-[380px] rounded-full border-2 border-[var(--qs-line)]" />
          <div className="absolute -top-24 right-[-80px] h-[280px] w-[380px] rounded-full border-2 border-[var(--qs-line)]" />
        </div>

        <div className="relative mx-auto box-border w-full max-w-[1040px] px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-[22px] flex items-center justify-between gap-3">
            <Link
              href="/quiz"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[var(--qs-brand)] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <span className="inline-flex items-center rounded-full border-2 border-[#1d1840] bg-[var(--qs-sun)] px-4 py-2 text-[13px] font-extrabold text-[#1d1840] shadow-[0_3px_0_#1d1840]">
              Attempt review
            </span>
          </div>

          <AttemptHero data={data} />

          <div className="mt-[22px] grid items-start gap-[22px] lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-6">
              <div className="flex items-start gap-3 rounded-[14px] border-2 border-[var(--qs-brand)]/25 bg-[var(--qs-brand)]/10 p-4">
                <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-[var(--qs-brand)]" />
                <div>
                  <p className="text-[15px] font-extrabold text-[var(--qs-ink)]">Detailed result not shared</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--qs-muted)]">
                    Your marks are available above. The question-by-question response breakdown for this attempt has not been shared.
                  </p>
                </div>
              </div>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-20">
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
              <AnalyticsCard data={data} />
              <InsightsCard data={data} />
            </aside>
          </div>
        </div>
      </div>
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

      <div className="relative mx-auto box-border w-full max-w-[1040px] px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-[22px] flex items-center justify-between gap-3">
          <Link
            href="/quiz"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[var(--qs-brand)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <span className="inline-flex items-center rounded-full border-2 border-[#1d1840] bg-[var(--qs-sun)] px-4 py-2 text-[13px] font-extrabold text-[#1d1840] shadow-[0_3px_0_#1d1840]">
            Attempt review
          </span>
        </div>

        <AttemptHero data={data} />

        {data.flagged && (
          <p
            title={data.flagReason ?? "Flagged by exam-cell proctoring"}
            className="mt-3 inline-flex items-center rounded-lg border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-bad)]/10 px-2 py-1 text-xs font-semibold text-[var(--qs-bad)]"
          >
            Flagged for review
          </p>
        )}

        <div className="mt-[22px] grid items-start gap-[22px] lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-[22px]">
            {/* Question Palette — sizes to its content, no fixed height. */}
            <motion.section
              initial={isMobile ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={isMobile ? { duration: 0 } : { delay: 0.05 }}
              className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-6"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-[18px] font-extrabold tracking-[-0.015em] text-[var(--qs-ink)] sm:text-[20px]">
                    <LayoutGrid className="h-4 w-4 text-[var(--qs-brand)]" />
                    Question palette
                  </h2>
                  <p className="mt-1 text-[13.5px] font-medium text-[var(--qs-muted)]">Tap a number to review that question</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] font-bold text-[var(--qs-muted)]">
                  <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--qs-ok)]" />Correct</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--qs-bad)]" />Wrong</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--qs-muted)]" />Skipped</span>
                </div>
              </div>
              <div className="mt-[18px] grid grid-cols-5 gap-2.5 sm:grid-cols-10" role="group" aria-label="Question palette">
                {data.questions.map((question, index) => {
                  const state = paletteStatus[index] ?? questionStatus(question);
                  const isActive = selectedQuestion === index;
                  return (
                    <button
                      key={question.id}
                      onClick={() => { playQuizSound("select"); setNavDir(index >= selectedQuestion ? 1 : -1); setSelectedQuestion(index); }}
                      aria-current={isActive ? "true" : undefined}
                      aria-label={`Question ${question.number}: ${state}${isActive ? ", current" : ""}`}
                      className={`flex h-11 items-center justify-center rounded-xl border-2 text-sm font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)] ${
                        isActive
                          ? "-translate-y-0.5 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-white shadow-[0_3px_0_var(--qs-ink)]"
                          : state === "correct"
                            ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)] hover:-translate-y-0.5"
                            : state === "wrong"
                              ? "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)] hover:-translate-y-0.5"
                              : state === "answered"
                                ? "border-[var(--qs-sun)] bg-[var(--qs-sun)]/40 text-[var(--qs-ink)] hover:-translate-y-0.5"
                                : "border-[var(--qs-line)] bg-[var(--qs-muted)]/10 text-[var(--qs-muted)] hover:-translate-y-0.5"
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
              className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-brand)]/10 px-3 py-1 text-[12.5px] font-extrabold text-[var(--qs-brand)]">
                  Question {currentQuestion.number}
                </span>
                <DifficultyBadge difficulty={currentQuestion.difficulty} />
                <StatusBadge status={currentStatus} />
              </div>

              <QuizRichText
                html={currentQuestion.statement}
                className="mt-3.5 text-[20px] font-extrabold leading-[1.2] tracking-[-0.025em] text-[var(--qs-ink)] sm:text-[24px]"
              />

              <div className="mt-4 space-y-2.5">
                {currentQuestion.selected?.kind === "text" && (
                  <div className="rounded-[14px] border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/15 p-3 sm:p-3.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-ink)]">
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
                  const tags = [
                    isSelected ? "Your answer" : null,
                    isCorrect ? "Correct answer" : null,
                  ].filter(Boolean) as string[];
                  return (
                    <div
                      key={option.id}
                      className={`flex w-full items-start gap-3 rounded-[14px] border-2 p-3 sm:p-3.5 ${
                        isCorrect
                          ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)]"
                          : selectedWrong
                            ? "border-[var(--qs-bad)] bg-[var(--qs-badbg)]"
                            : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
                      }`}
                    >
                      <span
                        className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                          isCorrect
                            ? "bg-[var(--qs-ok)] text-white"
                            : selectedWrong
                              ? "bg-[var(--qs-bad)] text-white"
                              : "bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]"
                        }`}
                      >
                        {option.label}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <QuizRichText
                          html={option.text}
                          className="min-w-0 break-words text-[15px] font-semibold leading-relaxed text-[var(--qs-ink)]"
                        />
                        {tags.length > 0 && (
                          <span
                            className={`ml-auto shrink-0 rounded-full border-2 px-2.5 py-0.5 text-[11px] font-extrabold ${
                              isCorrect
                                ? "border-[var(--qs-ok)] text-[var(--qs-ok)]"
                                : "border-[var(--qs-bad)] text-[var(--qs-bad)]"
                            }`}
                          >
                            {tags.join(" · ")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                />
                <StatBlock
                  label="Marks Obtained"
                  value={`${currentQuestion.marksObtained}/${currentQuestion.maxMarks}`}
                />
                <StatBlock label="Time Spent" value={currentQuestion.timeSpent} />
              </div>

              {currentQuestion.explanation && (
                <div className="mt-3.5 rounded-[14px] bg-[var(--qs-brand)]/10 px-4 py-3.5">
                  <b className="mb-1 block text-[13px] font-extrabold text-[var(--qs-brand)]">Explanation</b>
                  <QuizRichText
                    html={currentQuestion.explanation}
                    className="break-words text-[13.5px] leading-relaxed text-[var(--qs-muted)]"
                  />
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-2 border-t-2 border-dashed border-[var(--qs-line)] pt-4">
                <button
                  onClick={() => { playQuizSound("navigate"); setNavDir(-1); setSelectedQuestion((current) => Math.max(0, current - 1)); }}
                  disabled={selectedQuestion === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-extrabold text-[var(--qs-ink)] shadow-[0_3px_0_var(--qs-ink)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <span className="text-sm font-extrabold text-[var(--qs-muted)]">
                  {selectedQuestion + 1} / {data.questions.length}
                </span>
                <button
                  onClick={() => {
                    playQuizSound("navigate");
                    setNavDir(1);
                    setSelectedQuestion((current) => Math.min(data.questions.length - 1, current + 1));
                  }}
                  disabled={selectedQuestion === data.questions.length - 1}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-extrabold text-[var(--qs-ink)] shadow-[0_3px_0_var(--qs-ink)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.section>
            </AnimatePresence>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
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
            <AnalyticsCard data={data} />
            <InsightsCard data={data} />
          </aside>
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

function AttemptHero({ data }: { data: AttemptReviewData }) {
  return (
    <section
      aria-label="Attempt scorecard"
      className="relative overflow-hidden rounded-[28px] border-2 border-[#1d1840] bg-[var(--qs-brand)] p-[22px] text-white shadow-[8px_8px_0_var(--qs-sun)] sm:p-[34px]"
    >
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
      <h1 className="qs-display relative text-[32px] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-[46px]">
        {data.quizName}
      </h1>
      <p className="relative mt-2 text-[13px] font-semibold text-white/85 sm:text-[15px]">
        Attempted on {data.attemptDate} · Submitted at {data.submittedAt}
      </p>
      <div className="relative mt-[26px] flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:gap-7">
        <ScoreRing percentage={data.percentage} />
        <div className="grid w-full flex-1 grid-cols-2 gap-3.5 lg:grid-cols-4">
          <MetricCard label="Score" value={data.score} highlight />
          <MetricCard label="Duration" value={data.duration} />
          <MetricCard label="Rank" value="Coming soon" />
          <MetricCard label="Submitted" value={data.submittedAtShort} titleValue={data.submittedAt} />
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  highlight = false,
  titleValue,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  titleValue?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-[18px] border-2 border-[#1d1840] p-3.5 text-[#1d1840] shadow-[4px_4px_0_#1d1840] sm:px-4 ${
        highlight ? "bg-[var(--qs-sun)]" : "bg-white"
      }`}
    >
      <small className="block text-[12.5px] font-extrabold text-[#5b5680]">{label}</small>
      <b title={titleValue ?? value} className="mt-1 block truncate text-[18px] font-extrabold leading-tight sm:text-[22px]">
        {value}
      </b>
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

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-3">
      <small className="block text-[12.5px] font-bold text-[var(--qs-muted)]">{label}</small>
      <b title={value} className="mt-0.5 block break-words text-[17px] font-extrabold leading-snug text-[var(--qs-ink)] sm:text-[18px]">
        {value}
      </b>
    </div>
  );
}

function AnalyticsCard({ data }: { data: AttemptReviewData }) {
  const total = Math.max(1, data.correct + data.wrong + data.skipped);
  const rows: Array<{ label: string; value: string; color?: string }> = [
    { label: "Overall score", value: data.score },
    { label: "Accuracy", value: `${Math.round(data.percentage)}%` },
    { label: "Avg time per question", value: data.avgTimePerQuestion },
    { label: "Correct", value: String(data.correct), color: "var(--qs-ok)" },
    { label: "Wrong", value: String(data.wrong), color: "var(--qs-bad)" },
    { label: "Skipped", value: String(data.skipped) },
    { label: "Rank", value: data.rank != null ? `#${data.rank}` : "Coming soon" },
    { label: "Percentile", value: data.percentile !== null ? `${data.percentile}%` : "–" },
  ];

  return (
    <section className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
      <h2 className="text-[18px] font-extrabold tracking-[-0.015em] text-[var(--qs-ink)]">Result analytics</h2>
      <p className="mt-0.5 text-[13.5px] font-medium text-[var(--qs-muted)]">Score, ranking, and answer breakdown</p>
      <ul className="mt-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] py-2.5 text-sm last:border-0">
            <span className="font-semibold text-[var(--qs-muted)]">{row.label}</span>
            <b className="text-right font-extrabold text-[var(--qs-ink)]" style={row.color ? { color: row.color } : undefined}>
              {row.value}
            </b>
          </li>
        ))}
      </ul>
      <div
        className="mt-4 flex h-4 overflow-hidden rounded-full border-2 border-[#1d1840]"
        role="img"
        aria-label={`${data.correct} correct, ${data.wrong} wrong, ${data.skipped} skipped`}
      >
        <i className="block h-full bg-[var(--qs-ok)]" style={{ width: `${(data.correct / total) * 100}%` }} />
        <i className="block h-full bg-[var(--qs-bad)]" style={{ width: `${(data.wrong / total) * 100}%` }} />
        <i className="block h-full bg-[var(--qs-muted)]" style={{ width: `${(data.skipped / total) * 100}%` }} />
      </div>
    </section>
  );
}

function InsightsCard({ data }: { data: AttemptReviewData }) {
  return (
    <section className="rounded-[22px] border-2 border-[#1d1840] bg-[#1d1840] p-5 text-[#f7f6fe] shadow-[5px_5px_0_var(--qs-sun)]">
      <h2 className="text-[16px] font-extrabold text-[var(--qs-sun)]">Performance insights</h2>
      {data.insights.difficultyPerformance.length > 0 ? (
        <div className="mt-3.5 space-y-3.5">
          {data.insights.difficultyPerformance.map((item) => (
            <div key={item.difficulty}>
              <div className="flex justify-between text-[13.5px] font-bold">
                <span>{item.difficulty}</span>
                <span>{item.accuracy}%</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-[var(--qs-sun)]" style={{ width: `${item.accuracy}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-white/70">No performance breakdown available.</p>
      )}
    </section>
  );
}
