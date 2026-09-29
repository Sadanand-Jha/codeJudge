"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
  PartyPopper,
  Rocket,
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
  getQuizReview,
  type QuestionReview,
  type QuizResult,
  type ReviewOption,
} from "@/services/quiz";
import { getApiErrorMessage } from "@/lib/apiError";
import QuizSpaceAtmosphere from "./QuizSpaceAtmosphere";
import { QuizStateScreen } from "./StudentQuizShell";
import { useTheme } from "@/context/ThemeContext";

type QuestionStatus = "correct" | "wrong" | "skipped";

interface AttemptReviewQuestion {
  id: string;
  number: number;
  statement: string;
  difficulty: "Easy" | "Medium" | "Hard";
  options: Array<{ id: string; label: string; text: string }>;
  correctOptionId: string;
  selectedOptionId?: string;
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
  if (!question.selectedOptionId) return "skipped";
  return question.selectedOptionId === question.correctOptionId ? "correct" : "wrong";
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
 * The saved answer is stored as JSONB. Autosave/submit persist
 * `{ type: "MCQ", selectedOptionId }` (or a legacy raw option id), so resolve
 * it back to the option id string used by the review UI.
 */
function parseSelectedOptionId(selected: unknown): string | undefined {
  if (selected === null || selected === undefined) return undefined;
  try {
    const value = typeof selected === "string" ? JSON.parse(selected) : selected;
    if (value && typeof value === "object") {
      if ("selectedOptionId" in value && (value as { selectedOptionId: unknown }).selectedOptionId != null) {
        return String((value as { selectedOptionId: unknown }).selectedOptionId);
      }
      return undefined;
    }
    if (typeof value === "number" || typeof value === "string") return String(value);
    return undefined;
  } catch {
    return typeof selected === "string" && selected.length > 0 ? selected : undefined;
  }
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
    const correctOption = options.find((option) => option.iscorrect);
    const correctOptionId = correctOption ? String(correctOption.id) : "";
    const selectedOptionId = parseSelectedOptionId(row.selected_option);
    const isCorrect = !!selectedOptionId && !!correctOptionId && selectedOptionId === correctOptionId;
    return {
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
      selectedOptionId,
      explanation: row.explaination ?? undefined,
      marksObtained: isCorrect ? perQuestionMarks : 0,
      maxMarks: perQuestionMarks,
      // Per-question time is not tracked by the backend (time_spent_seconds
      // is never written), so there is no real value to show here.
      timeSpent: "—",
    };
  });

  const difficultyGroups = new Map<string, { total: number; correct: number }>();
  for (const question of questions) {
    const group = difficultyGroups.get(question.difficulty) ?? { total: 0, correct: 0 };
    group.total += 1;
    if (question.selectedOptionId && question.selectedOptionId === question.correctOptionId) {
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

/* ─── Score ring — dark track, green progress, subtle glow ─── */

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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: "var(--border)" }} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#20D889"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          style={{
            filter: "drop-shadow(0 0 6px rgba(32,216,137,0.45))",
            transition: "stroke-dasharray 0.8s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[20px] font-bold leading-none text-[#F5F7FB] sm:text-[22px]">
          {Number.isInteger(clamped) ? `${clamped}%` : `${clamped.toFixed(1)}%`}
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6F819D]">
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
  quizId: string;
  attemptId: string;
}) {
  const { theme } = useTheme();
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [data, setData] = useState<AttemptReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

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
          setSelectedQuestion(0);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Could not load attempt review."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const paletteStatus = useMemo(() => {
    if (!data) return [];
    return data.questions.map(questionStatus);
  }, [data]);

  if (loading) {
    return (
      <QuizStateScreen
        loading
        title={theme === "light" ? "Preparing your victory recap" : "Preparing mission debrief"}
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
          <Link href="/quiz" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 text-sm font-semibold text-white dark:from-violet-500 dark:to-indigo-500">
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
        action={<Link href="/quiz" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 text-sm font-semibold text-white dark:from-violet-500 dark:to-indigo-500"><ArrowLeft className="h-4 w-4" /> Back to quiz home</Link>}
      />
    );
  }

  const currentStatus = questionStatus(currentQuestion);

  return (
    <div className="student-quiz-theme attempt-review-theme relative min-h-[calc(100dvh-3.5rem)] overflow-x-hidden bg-[#050A14] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[#F5F7FB]">
      <QuizSpaceAtmosphere className="fixed" />
      {/* Subtle top glows — background stays mostly solid */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[320px] overflow-hidden">
        <div
          className="absolute -top-24 left-[-80px] h-[280px] w-[380px] rounded-full opacity-100"
          style={{ background: "radial-gradient(closest-side, rgba(92,124,255,0.10), transparent)" }}
        />
        <div
          className="absolute -top-24 right-[-80px] h-[280px] w-[380px] rounded-full opacity-100"
          style={{ background: "radial-gradient(closest-side, rgba(139,124,255,0.10), transparent)" }}
        />
      </div>

      <div className="relative mx-auto box-border w-full max-w-[1240px] px-4 py-4 sm:px-6 sm:py-6">
        {/* Back + Attempt Review */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#1D3150] bg-[#0F192B] px-3 py-2 text-[13px] font-medium text-[#9AAAC3] transition-colors hover:border-[#2A4160] hover:text-[#F5F7FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C7CFF]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#8B7CFF]/40 bg-[#8B7CFF]/10 px-3 py-2 text-[13px] font-semibold text-[#B9AEFF]">
            {theme === "light" ? <PartyPopper className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
            {theme === "light" ? "Victory recap" : "Mission debrief"}
          </span>
        </div>

        <div className="grid gap-4 md:gap-5 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-4 md:space-y-5">
            {/* Summary Card */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="box-border w-full max-w-full rounded-[18px] border border-[#1D3150] bg-[#0B1220] p-4 sm:p-5"
            >
              <span className="inline-flex items-center rounded-[8px] bg-[#8B7CFF]/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B7CFF]">
                {theme === "light" ? "Party scorecard" : "Mission scorecard"}
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#F5F7FB] sm:text-[32px] sm:leading-[1.15]">
                {data.quizName}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-[#9AAAC3] sm:text-sm">
                <span>Attempted on {data.attemptDate}</span>
                <span aria-hidden className="text-[#34435B]">•</span>
                <span>Submitted at {data.submittedAt}</span>
              </p>
              {data.flagged && (
                <p
                  title={data.flagReason ?? "Flagged by exam-cell proctoring"}
                  className="mt-2 inline-flex items-center rounded-[8px] border border-[#FF4D5D]/30 bg-[#FF4D5D]/10 px-2 py-1 text-xs font-medium text-[#FF6572]"
                >
                  Flagged for review
                </p>
              )}

              <div className="mt-4 flex flex-col items-stretch gap-4 min-[540px]:flex-row sm:gap-5">
                <div className="flex items-center">
                  <ScoreRing percentage={data.percentage} />
                </div>
                <div aria-hidden className="h-px shrink-0 bg-[#1D3150] min-[540px]:h-auto min-[540px]:w-px" />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:gap-2.5">
                  <MetricCard label="Score" value={data.score} icon={Target} iconColor="#8B7CFF" />
                  <MetricCard label="Duration" value={data.duration} icon={Clock3} iconColor="#4EA1FF" />
                  <MetricCard
                    label="Rank"
                    value={data.rank ? `#${data.rank}` : "-"}
                    icon={Trophy}
                    iconColor="#C084FC"
                  />
                  <MetricCard
                    label="Submitted"
                    value={data.submittedAtShort}
                    titleValue={data.submittedAt}
                    icon={Upload}
                    iconColor="#38BDF8"
                  />
                </div>
              </div>
            </motion.section>

            {/* Question Palette */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="box-border flex h-[min(720px,calc(100dvh-6rem))] min-h-[480px] w-full max-w-full flex-col rounded-[18px] border border-[#1D3150] bg-[#0B1220] p-4 sm:h-[680px] sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#F5F7FB]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#8B7CFF]/12 text-[#8B7CFF]">
                    <LayoutGrid className="h-4 w-4" />
                  </span>
                  Question Palette
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9AAAC3]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#20D889]" /> Correct
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#FF4D5D]" /> Wrong
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#6F819D]" /> Skipped
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-[#6F819D]">
                Green = correct, red = wrong, gray = skipped, blue = current
              </p>
              <div className="mt-3 grid grid-cols-5 gap-2 min-[420px]:grid-cols-6 sm:gap-2.5" role="group" aria-label="Question palette">
                {data.questions.map((question, index) => {
                  const state = paletteStatus[index] ?? questionStatus(question);
                  const isActive = selectedQuestion === index;
                  return (
                    <button
                      key={question.id}
                      onClick={() => setSelectedQuestion(index)}
                      aria-current={isActive ? "true" : undefined}
                      aria-label={`Question ${question.number}: ${state}${isActive ? ", current" : ""}`}
                      className={`flex h-[42px] items-center justify-center rounded-[10px] border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C7CFF] sm:h-[50px] sm:text-[15px] ${
                        isActive
                          ? "border-[#5C7CFF] bg-[#5C7CFF]/15 text-[#8FA7FF]"
                          : state === "correct"
                            ? "border-[#20D889]/60 bg-[#20D889]/10 text-[#20D889] hover:border-[#20D889]"
                            : state === "wrong"
                              ? "border-[#FF4D5D]/60 bg-[#FF4D5D]/10 text-[#FF6572] hover:border-[#FF4D5D]"
                              : "border-[#34435B] bg-[#182235] text-[#91A0B7] hover:border-[#4A5D7E]"
                      }`}
                    >
                      {question.number}
                    </button>
                  );
                })}
              </div>
            </motion.section>

            {/* Question Review Card */}
            <motion.section
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="box-border w-full max-w-full rounded-[18px] border border-[#1D3150] bg-[#0B1220] p-4 sm:p-5"
            >
              <div className="flex shrink-0 items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-[8px] bg-[#5C7CFF]/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8FA7FF]">
                    Question {currentQuestion.number}
                  </span>
                  <DifficultyBadge difficulty={currentQuestion.difficulty} />
                  <StatusBadge status={currentStatus} />
                </div>
                <button
                  onClick={() => setCollapsed((v) => !v)}
                  aria-expanded={!collapsed}
                  aria-label={collapsed ? "Expand question" : "Collapse question"}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[#1D3150] bg-[#0F192B] text-[#9AAAC3] transition-colors hover:text-[#F5F7FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C7CFF]"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
                </button>
              </div>

              {!collapsed && (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1.5 [scrollbar-gutter:stable]">
                  <h3 className="mt-3 text-[18px] font-semibold leading-snug text-[#F5F7FB] sm:text-[22px]">
                    {currentQuestion.statement}
                  </h3>

                  <div className="mt-4 space-y-2.5">
                    {currentQuestion.options.map((option) => {
                      const isCorrect = option.id === currentQuestion.correctOptionId;
                      const isSelected = option.id === currentQuestion.selectedOptionId;
                      const selectedWrong = isSelected && !isCorrect;
                      return (
                        <div
                          key={option.id}
                          className={`box-border flex w-full max-w-full items-start gap-3 rounded-[12px] border p-3 sm:p-3.5 ${
                            isCorrect
                              ? "border-[#20D889] bg-[#20D889]/10"
                              : selectedWrong
                                ? "border-[#FF4D5D] bg-[#FF4D5D]/10"
                                : "border-[#1D3150] bg-[#0F192B]"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              isCorrect
                                ? "bg-[#20D889] text-[#050A14]"
                                : selectedWrong
                                  ? "bg-[#FF4D5D] text-white"
                                  : "bg-[#1A2740] text-[#9AAAC3]"
                            }`}
                          >
                            {option.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 break-words text-[14px] font-medium leading-relaxed text-[#F5F7FB] sm:text-[15px]">
                              <span className="min-w-0 break-words">{option.text}</span>
                              {isCorrect && (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#20D889]" aria-label="Correct option" />
                              )}
                              {selectedWrong && (
                                <XCircle className="h-4 w-4 shrink-0 text-[#FF4D5D]" aria-label="Your incorrect selection" />
                              )}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {isSelected && (
                                <span
                                  className={`rounded-[8px] border px-2 py-0.5 text-[11px] font-medium ${
                                    isCorrect
                                      ? "border-[#20D889]/40 bg-transparent text-[#20D889]"
                                      : "border-[#FF4D5D]/40 bg-transparent text-[#FF6572]"
                                  }`}
                                >
                                  Your Answer
                                </span>
                              )}
                              {isCorrect && (
                                <span className="rounded-[8px] border border-[#20D889]/40 bg-transparent px-2 py-0.5 text-[11px] font-medium text-[#20D889]">
                                  Correct Answer
                                </span>
                              )}
                              <span className="rounded-[8px] border border-[#34435B] bg-transparent px-2 py-0.5 text-[11px] font-medium text-[#9AAAC3]">
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
                      value={
                        currentQuestion.selectedOptionId
                          ? (currentQuestion.options.find((o) => o.id === currentQuestion.selectedOptionId)?.label ??
                            currentQuestion.selectedOptionId)
                          : "Skipped"
                      }
                      icon={Check}
                      iconBg="bg-[#20D889]/15 text-[#20D889]"
                    />
                    <StatBlock
                      label="Correct Answer"
                      value={
                        currentQuestion.options.find((o) => o.id === currentQuestion.correctOptionId)?.label ??
                        currentQuestion.correctOptionId.toUpperCase()
                      }
                      icon={CheckCircle2}
                      iconBg="bg-[#4EA1FF]/15 text-[#4EA1FF]"
                    />
                    <StatBlock
                      label="Marks Obtained"
                      value={`${currentQuestion.marksObtained}/${currentQuestion.maxMarks}`}
                      icon={Medal}
                      iconBg="bg-[#8B7CFF]/15 text-[#8B7CFF]"
                    />
                    <StatBlock
                      label="Time Spent"
                      value={currentQuestion.timeSpent}
                      icon={Timer}
                      iconBg="bg-[#8B7CFF]/15 text-[#B9AEFF]"
                    />
                  </div>

                  {currentQuestion.explanation && (
                    <div className="mt-3 rounded-[12px] border border-[#1D3150] bg-[#0F192B] p-3 sm:p-3.5">
                      <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-[#F5F7FB]">
                        <BookOpen className="h-3.5 w-3.5 text-[#8B7CFF]" />
                        Explanation
                      </div>
                      <p className="break-words text-[13px] leading-relaxed text-[#9AAAC3] sm:text-sm">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Prev / Next */}
              <div className="review-question-nav z-20 mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-[#1D3150] bg-[#0B1220] pt-3">
                <button
                  onClick={() => setSelectedQuestion((current) => Math.max(0, current - 1))}
                  disabled={selectedQuestion === 0}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#1D3150] bg-[#0F192B] px-3 py-2 text-xs font-medium text-[#F5F7FB] transition-colors hover:border-[#2A4160] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C7CFF]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <span className="text-xs text-[#6F819D]">
                  {selectedQuestion + 1} / {data.questions.length}
                </span>
                <button
                  onClick={() =>
                    setSelectedQuestion((current) => Math.min(data.questions.length - 1, current + 1))
                  }
                  disabled={selectedQuestion === data.questions.length - 1}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#1D3150] bg-[#0F192B] px-3 py-2 text-xs font-medium text-[#F5F7FB] transition-colors hover:border-[#2A4160] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C7CFF]"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.section>
          </div>

          {/* Sidebar */}
          <div className="min-w-0 space-y-4 md:space-y-5">
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="box-border w-full max-w-full rounded-[18px] border border-[#1D3150] bg-[#0B1220] p-4 sm:p-5"
            >
              <h2 className="text-[15px] font-semibold text-[#F5F7FB]">Result Analytics</h2>
              <p className="mt-0.5 text-xs text-[#6F819D]">Score, ranking, and answer breakdown.</p>
              <div className="mt-3 space-y-1.5">
                <AnalyticsMetric label="Overall Score" value={data.score} icon={Target} />
                <AnalyticsMetric label="Accuracy" value={`${data.percentage}%`} icon={PieChart} />
                <AnalyticsMetric label="Attempt Time" value={data.attemptDate} icon={Clock3} />
                <AnalyticsMetric label="Avg Time / Q" value={data.avgTimePerQuestion} icon={Timer} />
                <AnalyticsMetric label="Correct" value={data.correct} icon={CheckCircle2} accent="#20D889" />
                <AnalyticsMetric label="Wrong" value={data.wrong} icon={XCircle} accent="#FF4D5D" />
                <AnalyticsMetric label="Skipped" value={data.skipped} icon={CircleDashed} accent="#91A0B7" />
                <AnalyticsMetric label="Rank" value={data.rank ? `#${data.rank}` : "—"} icon={Trophy} />
                <AnalyticsMetric
                  label="Percentile"
                  value={data.percentile !== null ? `${data.percentile}%` : "—"}
                  icon={Zap}
                />
              </div>

              <div className="mt-3 rounded-[12px] border border-[#1D3150] bg-[#0F192B] p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-[#F5F7FB]">
                  <span>Correct vs Wrong vs Skipped</span>
                  <PieChart className="h-3.5 w-3.5 text-[#8B7CFF]" />
                </div>
                <DonutBreakdown correct={data.correct} wrong={data.wrong} skipped={data.skipped} />
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="box-border w-full max-w-full rounded-[18px] border border-[#1D3150] bg-[#0B1220] p-4 sm:p-5"
            >
              <h2 className="text-[15px] font-semibold text-[#F5F7FB]">Performance Insights</h2>
              {data.insights.difficultyPerformance.length > 0 ? (
                <div className="mt-3 rounded-[12px] border border-[#1D3150] bg-[#0F192B] p-3">
                  <div className="text-xs font-semibold text-[#F5F7FB]">Difficulty-wise Performance</div>
                  <div className="mt-2 space-y-2">
                    {data.insights.difficultyPerformance.map((item) => (
                      <div key={item.difficulty}>
                        <div className="mb-1 flex items-center justify-between text-[11px] text-[#9AAAC3]">
                          <span>{item.difficulty}</span>
                          <span>{item.accuracy}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#1D3150]">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${item.accuracy}%`,
                              background: "linear-gradient(90deg, #8B7CFF, #4EA1FF)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#9AAAC3]">No performance breakdown available.</p>
              )}
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub components — styles only ─── */

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
    <div className="box-border min-w-0 rounded-[12px] border border-[#1D3150] bg-[#0F192B] p-2.5 sm:p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F819D]">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: iconColor }} />
        <span className="truncate">{label}</span>
      </div>
      <div
        title={titleValue ?? value}
        className={`mt-1 text-[16px] font-semibold text-[#F5F7FB] sm:text-[18px] ${
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
    Easy: "border-[#20D889]/30 bg-[#20D889]/10 text-[#20D889]",
    Medium: "border-[#FFB84D]/30 bg-[#FFB84D]/10 text-[#FFB84D]",
    Hard: "border-[#FF4D5D]/30 bg-[#FF4D5D]/10 text-[#FF6572]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-[8px] border px-2 py-1 text-[11px] font-semibold ${styles[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  if (status === "correct")
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] border border-[#20D889]/30 bg-[#20D889]/10 px-2 py-1 text-[11px] font-semibold text-[#20D889]">
        <Check className="h-3 w-3" /> Correct
      </span>
    );
  if (status === "wrong")
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] border border-[#FF4D5D]/30 bg-[#FF4D5D]/10 px-2 py-1 text-[11px] font-semibold text-[#FF6572]">
        <XCircle className="h-3 w-3" /> Wrong
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-[8px] border border-[#34435B] bg-[#182235] px-2 py-1 text-[11px] font-semibold text-[#91A0B7]">
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
    <div className="box-border flex min-w-0 items-center gap-2.5 rounded-[12px] border border-[#1D3150] bg-[#111D31] p-2.5 sm:p-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6F819D] sm:text-[11px]">
          {label}
        </span>
        <span title={value} className="block truncate text-[15px] font-semibold text-[#F5F7FB] sm:text-base">
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
  accent = "#8B7CFF",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-[10px] border border-[#1D3150] bg-[#0F192B] px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-[#9AAAC3]">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
        <span className="truncate">{label}</span>
      </div>
      <div title={String(value)} className="max-w-[45%] truncate text-xs font-semibold text-[#F5F7FB]">
        {value}
      </div>
    </div>
  );
}

function DonutBreakdown({ correct, wrong, skipped }: { correct: number; wrong: number; skipped: number }) {
  const total = Math.max(1, correct + wrong + skipped);
  const rows = [
    { label: "Correct", count: correct, pct: Math.round((correct / total) * 100), dot: "bg-[#20D889]", text: "text-[#20D889]" },
    { label: "Wrong", count: wrong, pct: Math.round((wrong / total) * 100), dot: "bg-[#FF4D5D]", text: "text-[#FF6572]" },
    { label: "Skipped", count: skipped, pct: Math.round((skipped / total) * 100), dot: "bg-[#6F819D]", text: "text-[#91A0B7]" },
  ];
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-[72px] w-[72px] shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" style={{ stroke: "var(--border)" }} strokeWidth="12" />
          {(() => {
            let cumulative = 0;
            const segs = [
              { pct: (correct / total) * 100, color: "#20D889" },
              { pct: (wrong / total) * 100, color: "#FF4D5D" },
              { pct: (skipped / total) * 100, color: "#6F819D" },
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
          <span className="text-sm font-bold leading-none text-[#F5F7FB]">{correct + wrong + skipped}</span>
          <span className="mt-0.5 text-[8px] uppercase tracking-wider text-[#6F819D]">Total</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-[11px]">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dot}`} />
            <span className="text-[#9AAAC3]">{row.label}</span>
            <span className={`ml-auto font-semibold text-[#F5F7FB]`}>
              {row.count} ({row.pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
