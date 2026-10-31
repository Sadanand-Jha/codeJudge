"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import type { StoredAttemptAnswer } from "@/lib/quizAttemptStorage";
import { QuizRichText } from "@/components/quiz/QuizRichText";

type AnswerValue = StoredAttemptAnswer;

export interface MobileAttemptQuestionOption {
  id: string;
  text: string;
}

export interface MobileAttemptQuestion {
  id: number;
  statement: string;
  description?: string | null;
  multiple: boolean;
  options: MobileAttemptQuestionOption[];
}

const SHEET_BTN =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border-2 px-4 text-[15px] font-extrabold transition-transform active:translate-x-[2px] active:translate-y-[2px]";
const SQUARE_BTN =
  "grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[14px] border-2 transition-transform active:translate-x-[2px] active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40";

function formatTime(seconds: number | null) {
  if (seconds === null) return "No limit";
  const minutes = Math.floor(Math.max(seconds, 0) / 60);
  const rest = Math.max(seconds, 0) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function hasAnswer(answer: AnswerValue | undefined) {
  return Boolean(
    answer?.option !== undefined ||
      (answer?.options?.length ?? 0) > 0 ||
      answer?.textAnswer?.trim(),
  );
}

function TextAnswerField({
  initialValue,
  onChange,
  onCommit,
}: {
  initialValue: string;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <textarea
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        onChange(event.target.value);
      }}
      onBlur={() => onCommit(value)}
      rows={8}
      maxLength={20000}
      placeholder="Write your answer here…"
      className="mt-5 w-full resize-y rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 text-sm leading-6 text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
    />
  );
}

interface MobileAttemptViewProps {
  quizName: string;
  questions: MobileAttemptQuestion[];
  current: MobileAttemptQuestion;
  index: number;
  answers: Record<number, AnswerValue>;
  markedForReview: Set<number>;
  timeLeft: number | null;
  submitting: boolean;
  isPreview?: boolean;
  onAnswer: (problemId: number, answer: AnswerValue) => void;
  onDraftAnswer: (problemId: number, answer: AnswerValue) => void;
  onNavigate: (index: number) => void;
  onToggleMarked: (problemId: number) => void;
  onSubmit: () => void;
  onQuit: () => void;
}

export function MobileAttemptView({
  quizName,
  questions,
  current,
  index,
  answers,
  markedForReview,
  timeLeft,
  submitting,
  isPreview = false,
  onAnswer,
  onDraftAnswer,
  onNavigate,
  onToggleMarked,
  onSubmit,
  onQuit,
}: MobileAttemptViewProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  const total = questions.length;
  const isLast = index === total - 1;
  const multiple = current.multiple;
  const currentMarked = markedForReview.has(current.id);
  const currentAnswer = answers[current.id];
  const textAnswer = current.options.length === 0;

  const counts = useMemo(() => {
    let answered = 0;
    let marked = 0;
    for (const question of questions) {
      if (hasAnswer(answers[question.id])) answered += 1;
      if (markedForReview.has(question.id)) marked += 1;
    }
    return { answered, marked, unanswered: total - answered };
  }, [answers, markedForReview, questions, total]);

  const progress = total ? ((index + 1) / total) * 100 : 0;
  const timeCritical = timeLeft !== null && timeLeft <= 300;

  const closeOverlays = () => {
    setPaletteOpen(false);
    setInfoOpen(false);
    setQuitOpen(false);
    setSubmitOpen(false);
  };

  const goTo = (nextIndex: number) => {
    if (nextIndex === index) {
      closeOverlays();
      return;
    }
    onNavigate(nextIndex);
    closeOverlays();
  };

  const confirmSubmit = () => {
    setSubmitOpen(false);
    onSubmit();
  };

  const confirmQuit = () => {
    setQuitOpen(false);
    onQuit();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--qs-bg)]">
      <header className="relative flex-none overflow-hidden bg-[#2d2260] px-3 text-white">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-full w-[55%] bg-[#4a3f5e]"
          style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-full w-[45%] bg-[#5b4bb8]"
          style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
        />

        <div className="relative z-10 flex h-[58px] items-center gap-2">
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            aria-label="Secure attempt info"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-[#1b1340] bg-[var(--qs-sun)] text-[#1b1340]"
          >
            <ShieldCheck className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open question palette"
            className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-[#1b1340] bg-white px-3 text-[13.5px] font-extrabold text-[#1b1340]"
          >
            Q {index + 1}/{total}
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
          <span className="flex-1" />
          <div
            role="timer"
            aria-label="Time left"
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full border-2 border-[#1b1340] px-3 text-[16px] font-extrabold tabular-nums",
              timeCritical
                ? "animate-pulse bg-[var(--qs-bad)] text-white"
                : "bg-[var(--qs-sun)] text-[#1b1340]",
            )}
          >
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
          <button
            type="button"
            onClick={() => setQuitOpen(true)}
            aria-label="Leave attempt"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-white/45 bg-white/10 text-white"
          >
            <X className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </div>
        <div className="relative z-10 flex h-7 min-w-0 items-center gap-2 text-[12px]">
          <b className="shrink-0 text-[10.5px] font-extrabold tracking-[0.08em] text-[var(--qs-sun)]">
            {isPreview ? "PREVIEW MODE" : "SECURE ATTEMPT"}
          </b>
          <span className="truncate text-[#d9d2ff]">· {quizName}</span>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3.5 pb-[calc(86px+env(safe-area-inset-bottom,0px))] pt-3.5">
        <section
          aria-live="polite"
          className="min-w-0 overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[6px_6px_0_var(--qs-sun)]"
        >
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">
              Question {index + 1} of {total}
            </span>
            <span className="whitespace-nowrap rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1 text-[12px] font-bold text-[var(--qs-ink)]">
              {multiple ? "Select all that apply" : textAnswer ? "Written response" : "Choose one answer"}
            </span>
          </div>

          <div
            className="mt-3 h-[9px] overflow-hidden rounded-full bg-[#EDE8FF]"
            role="progressbar"
            aria-label="Question progress"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--qs-brand)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <QuizRichText
            html={current.statement}
            className="qs-display mt-4 break-words text-[21px] font-extrabold leading-[1.28] tracking-[-0.025em] text-[var(--qs-ink)] [overflow-wrap:anywhere]"
          />
          {current.description && (
            <QuizRichText
              html={current.description}
              className="mt-2 break-words text-sm leading-6 text-[var(--qs-muted)] [overflow-wrap:anywhere]"
            />
          )}

          {textAnswer ? (
            <TextAnswerField
              key={current.id}
              initialValue={currentAnswer?.textAnswer ?? ""}
              onChange={(value) =>
                onDraftAnswer(current.id, value.trim() ? { textAnswer: value } : {})
              }
              onCommit={(value) =>
                onAnswer(current.id, value.trim() ? { textAnswer: value } : {})
              }
            />
          ) : (
            <div
              className="mt-5 grid gap-[11px]"
              role={multiple ? "group" : "radiogroup"}
              aria-label="Answer options"
            >
              {current.options.map((option, optionIndex) => {
                const optionId = option.id;
                const selected = multiple
                  ? (currentAnswer?.options ?? []).includes(optionId)
                  : currentAnswer?.option === optionId;
                const optionLabel = String.fromCharCode(65 + optionIndex);
                return (
                  <button
                    key={option.id}
                    type="button"
                    role={multiple ? "checkbox" : "radio"}
                    aria-checked={selected}
                    onClick={() => {
                      if (multiple) {
                        const selectedOptions = currentAnswer?.options ?? [];
                        onAnswer(current.id, {
                          options: selected
                            ? selectedOptions.filter((id) => id !== optionId)
                            : [...selectedOptions, optionId],
                        });
                      } else {
                        onAnswer(current.id, { option: optionId });
                      }
                    }}
                    className={cn(
                      "flex min-h-[62px] w-full min-w-0 items-center gap-3 overflow-hidden rounded-[18px] border-2 px-3.5 py-3 text-left transition-colors",
                      selected
                        ? "border-[var(--qs-brand)] bg-[#F3EFFF] shadow-[0_0_0_3px_rgba(106,61,240,0.15)]"
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-sm font-extrabold",
                        selected
                          ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                          : "bg-[#EDE8FF] text-[var(--qs-ink)]",
                      )}
                    >
                      {optionLabel}
                    </span>
                    <QuizRichText
                      as="span"
                      html={option.text}
                      className="min-w-0 flex-1 break-words text-[15.5px] font-medium leading-[1.35] [overflow-wrap:anywhere]"
                    />
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center border-2",
                        multiple ? "rounded-[7px]" : "rounded-full",
                        selected
                          ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]"
                          : "border-[var(--qs-line)]",
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {currentMarked && (
            <div className="mt-3.5 flex items-center gap-1.5 rounded-xl border-2 border-[var(--qs-sun)] bg-[#fff4cc] px-3 py-2 text-[13px] font-bold text-[#8a5a00]">
              <Flag className="h-4 w-4" />
              Marked for review
            </div>
          )}
        </section>
      </main>

      <nav
        aria-label="Quiz actions"
        className="fixed inset-x-0 bottom-0 z-[105] flex items-center gap-2 border-t-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 pb-[calc(10px+env(safe-area-inset-bottom,0px))] pt-2.5"
      >
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous question"
          className={cn(SQUARE_BTN, "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)]")}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.8} />
        </button>
        <button
          type="button"
          onClick={() => onToggleMarked(current.id)}
          aria-label="Mark for review"
          aria-pressed={currentMarked}
          className={cn(
            SQUARE_BTN,
            currentMarked
              ? "border-[var(--qs-sun)] bg-[#fff4cc] text-[#8a5a00]"
              : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)]",
          )}
        >
          <Flag className="h-5 w-5" />
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={() => setSubmitOpen(true)}
            disabled={submitting}
            className={cn(
              SHEET_BTN,
              "flex-1 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1b1340] shadow-[3px_3px_0_var(--qs-brand)]",
            )}
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1b1340] border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" strokeWidth={3} />
            )}
            {submitting ? "Submitting…" : "Submit"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className={cn(
              SHEET_BTN,
              "flex-1 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)]",
            )}
          >
            Next
            <ChevronRight className="h-4 w-4" strokeWidth={2.8} />
          </button>
        )}
      </nav>

      {(paletteOpen || infoOpen || quitOpen || submitOpen) && (
        <button
          type="button"
          aria-label="Close dialog"
          onClick={closeOverlays}
          className="fixed inset-0 z-[110] bg-[#120c30]/55"
        />
      )}

      {paletteOpen && (
        <section
          aria-label="Question palette"
          className="fixed inset-x-0 bottom-0 z-[111] max-h-[86%] overflow-y-auto rounded-t-[26px] border-2 border-b-0 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-[18px] pb-[calc(18px+env(safe-area-inset-bottom,0px))] pt-2.5"
        >
          <div className="mx-auto mb-3.5 h-[5px] w-11 rounded-full bg-[var(--qs-line)]" />
          <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-[var(--qs-ink)]">
            Jump to a question
          </h2>
          <div className="my-4 grid grid-cols-5 gap-2.5">
            {questions.map((question, questionIndex) => {
              const answered = hasAnswer(answers[question.id]);
              const marked = markedForReview.has(question.id);
              const isCurrent = questionIndex === index;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => goTo(questionIndex)}
                  aria-label={`Question ${questionIndex + 1}${answered ? ", answered" : ", not answered"}${marked ? ", marked" : ""}`}
                  className={cn(
                    "relative aspect-square rounded-[14px] border-2 text-[16px] font-extrabold",
                    isCurrent && "border-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-sun)]",
                    answered
                      ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)]",
                  )}
                >
                  {questionIndex + 1}
                  {marked && (
                    <span className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--qs-surface)] bg-[var(--qs-sun)]" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mb-4 flex flex-wrap gap-3 text-[12px] font-semibold text-[var(--qs-muted)]">
            <span className="flex items-center gap-1.5">
              <i className="block h-3.5 w-3.5 rounded-[5px] border-2 border-[var(--qs-brand)] bg-[var(--qs-brand)]" />
              Answered
            </span>
            <span className="flex items-center gap-1.5">
              <i className="block h-3.5 w-3.5 rounded-[5px] border-2 border-[var(--qs-line)]" />
              Not answered
            </span>
            <span className="flex items-center gap-1.5">
              <i className="block h-3.5 w-3.5 rounded-full border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]" />
              Marked
            </span>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { value: counts.answered, label: "Answered" },
              { value: counts.unanswered, label: "Unanswered" },
              { value: counts.marked, label: "Marked" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[14px] border-2 border-[var(--qs-line)] px-2.5 py-2.5 text-center"
              >
                <b className="block text-[22px] tracking-[-0.03em] text-[var(--qs-ink)]">{stat.value}</b>
                <small className="text-[11.5px] font-semibold text-[var(--qs-muted)]">{stat.label}</small>
              </div>
            ))}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={closeOverlays}
              className={cn(SHEET_BTN, "flex-1 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)]")}
            >
              Back to quiz
            </button>
            {isLast && (
              <button
                type="button"
                onClick={() => {
                  setPaletteOpen(false);
                  setSubmitOpen(true);
                }}
                className={cn(SHEET_BTN, "flex-1 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1b1340]")}
              >
                Submit attempt
              </button>
            )}
          </div>
        </section>
      )}

      {infoOpen && (
        <section
          aria-label="Secure attempt"
          className="fixed inset-x-0 bottom-0 z-[111] rounded-t-[26px] border-2 border-b-0 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-[18px] pb-[calc(18px+env(safe-area-inset-bottom,0px))] pt-2.5"
        >
          <div className="mx-auto mb-3.5 h-[5px] w-11 rounded-full bg-[var(--qs-line)]" />
          <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-[var(--qs-ink)]">
            {isPreview ? "Preview mode" : "Secure attempt is on"}
          </h2>
          <p className="mt-1 text-[13.5px] leading-6 text-[var(--qs-muted)]">
            {isPreview
              ? "This is how the quiz looks to students on mobile. Answers are not saved."
              : "Tab switching and leaving this window are monitored during the quiz. Your answers are saved as you go."}
          </p>
          <div className="my-4 grid grid-cols-3 gap-2">
            {[
              { value: counts.answered, label: "Answered" },
              { value: counts.unanswered, label: "Unanswered" },
              { value: formatTime(timeLeft), label: "Time left" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[14px] border-2 border-[var(--qs-line)] px-2.5 py-2.5 text-center"
              >
                <b className="block text-[20px] tracking-[-0.03em] text-[var(--qs-ink)]">{stat.value}</b>
                <small className="text-[11.5px] font-semibold text-[var(--qs-muted)]">{stat.label}</small>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={closeOverlays}
            className={cn(SHEET_BTN, "w-full border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]")}
          >
            Got it
          </button>
        </section>
      )}

      {quitOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Leave attempt confirmation"
          className="fixed inset-x-[18px] top-1/2 z-[111] -translate-y-1/2 rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[8px_8px_0_var(--qs-sun)]"
        >
          <h2 className="text-[21px] font-extrabold tracking-[-0.03em] text-[var(--qs-ink)]">
            {isPreview ? "Leave this preview?" : "Quit the quiz?"}
          </h2>
          <p className="mt-2 text-[14.5px] leading-6 text-[var(--qs-muted)]">
            {isPreview
              ? "You will return to the quizzes list."
              : "Your attempt will be submitted with your current answers and your result will be generated. You won't be able to continue this attempt."}
          </p>
          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={() => setQuitOpen(false)}
              disabled={submitting}
              className={cn(SHEET_BTN, "flex-1 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)]")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmQuit}
              disabled={submitting}
              className={cn(SHEET_BTN, "flex-1 border-[var(--qs-ink)] bg-[var(--qs-bad)] text-white")}
            >
              {isPreview ? "Yes, leave" : "Yes, quit"}
            </button>
          </div>
        </div>
      )}

      {submitOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Submit attempt confirmation"
          className="fixed inset-x-[18px] top-1/2 z-[111] -translate-y-1/2 rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[8px_8px_0_var(--qs-sun)]"
        >
          <h2 className="text-[21px] font-extrabold tracking-[-0.03em] text-[var(--qs-ink)]">
            {isPreview ? "End this preview?" : "Submit your attempt?"}
          </h2>
          <p className="mt-2 text-[14.5px] leading-6 text-[var(--qs-muted)]">
            {isPreview
              ? "You will return to the quizzes list."
              : "You can't change your answers after submitting."}
          </p>
          {(counts.unanswered > 0 || counts.marked > 0) && (
            <div className="mt-3 rounded-xl border-2 border-[var(--qs-sun)] bg-[#fff4cc] px-3 py-2.5 text-[13.5px] font-semibold text-[#6b4a00]">
              Heads up:{" "}
              {[
                counts.unanswered > 0 ? `${counts.unanswered} unanswered` : null,
                counts.marked > 0 ? `${counts.marked} marked for review` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              .
            </div>
          )}
          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={() => setSubmitOpen(false)}
              disabled={submitting}
              className={cn(SHEET_BTN, "flex-1 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)]")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmSubmit}
              disabled={submitting}
              className={cn(SHEET_BTN, "flex-1 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]")}
            >
              {submitting ? <Send className="h-4 w-4 animate-pulse" /> : <Check className="h-4 w-4" />}
              {submitting ? "Submitting…" : isPreview ? "Yes, end preview" : "Yes, submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
