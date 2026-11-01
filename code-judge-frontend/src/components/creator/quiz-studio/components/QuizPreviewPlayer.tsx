"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Eye, ShieldCheck, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { QuizRichText } from "@/components/quiz/QuizRichText";
import {
  MobileAttemptView,
  type MobileAttemptQuestion,
} from "@/components/quiz/attempt/MobileAttemptView";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { CreatorQuestion } from "../types";

interface QuizPreviewPlayerProps {
  open: boolean;
  onClose: () => void;
  questions: CreatorQuestion[];
  quizTitle: string;
}

type PreviewAnswer = {
  option?: string;
  options?: string[];
  textAnswer?: string;
};

export function QuizPreviewPlayer({ open, onClose, questions, quizTitle }: QuizPreviewPlayerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, PreviewAnswer>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(() => new Set());
  const { lockTheme, unlockTheme } = useTheme();
  const isMobile = useIsMobile();

  const mobileQuestions = useMemo<MobileAttemptQuestion[]>(
    () =>
      questions.map((question, questionIndex) => ({
        id: questionIndex + 1,
        statement: question.title || "Untitled question",
        multiple: question.type === "multiple_choice",
        options: question.options.map((option) => ({
          id: String(option.id),
          text: option.contentHtml || option.content,
        })),
      })),
    [questions]
  );

  const mobileAnswers = useMemo<Record<number, PreviewAnswer>>(() => {
    const mapped: Record<number, PreviewAnswer> = {};
    questions.forEach((question, questionIndex) => {
      const answer = answers[question.id];
      if (!answer) return;
      if (answer.textAnswer?.trim()) mapped[questionIndex + 1] = { textAnswer: answer.textAnswer };
      else if (answer.options?.length) mapped[questionIndex + 1] = { options: answer.options };
      else if (answer.option !== undefined) mapped[questionIndex + 1] = { option: answer.option };
    });
    return mapped;
  }, [answers, questions]);

  const mobileMarkedForReview = useMemo(
    () =>
      new Set(
        questions.flatMap((question, questionIndex) =>
          markedForReview.has(question.id) ? [questionIndex + 1] : []
        )
      ),
    [questions, markedForReview]
  );

  useEffect(() => {
    if (!open) return;
    lockTheme("light");
    return () => unlockTheme();
  }, [open, lockTheme, unlockTheme]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const current = questions[index];
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.values(answers).filter(
    (answer) => answer.option !== undefined || (answer.options?.length ?? 0) > 0 || Boolean(answer.textAnswer?.trim()),
  ).length;
  const remainingCount = Math.max(questions.length - answeredCount, 0);
  const currentMarked = current ? markedForReview.has(current.id) : false;

  const setAnswer = (questionId: string, answer: PreviewAnswer) => {
    setAnswers((previous) => ({ ...previous, [questionId]: answer }));
  };

  const goToQuestion = (nextIndex: number) => {
    if (nextIndex === index) return;
    setIndex(nextIndex);
  };

  const toggleMarkedForReview = (questionId: string) => {
    setMarkedForReview((previous) => {
      const next = new Set(previous);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleMobileAnswer = (problemId: number, answer: PreviewAnswer) => {
    const question = questions[problemId - 1];
    if (!question) return;
    setAnswer(question.id, answer);
  };

  const handleMobileToggleMarked = (problemId: number) => {
    const question = questions[problemId - 1];
    if (!question) return;
    toggleMarkedForReview(question.id);
  };

  return (
    <div className="qs-ui student-quiz-theme fixed inset-0 z-[120] flex flex-col overflow-hidden bg-[var(--qs-bg)] text-[var(--qs-ink)]">
      {isMobile ? (
        mobileQuestions[index] ? (
          <MobileAttemptView
            quizName={quizTitle.trim() || "Untitled Quiz"}
            questions={mobileQuestions}
            current={mobileQuestions[index]}
            index={index}
            answers={mobileAnswers}
            markedForReview={mobileMarkedForReview}
            timeLeft={null}
            submitting={false}
            isPreview
            onAnswer={handleMobileAnswer}
            onDraftAnswer={handleMobileAnswer}
            onNavigate={goToQuestion}
            onToggleMarked={handleMobileToggleMarked}
            onSubmit={onClose}
            onQuit={onClose}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Eye className="h-8 w-8 text-[var(--qs-muted)]" />
            <p className="text-sm font-bold text-[var(--qs-ink)]">No questions to preview yet.</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-2.5 text-sm font-bold text-[var(--qs-ink)]"
            >
              Exit preview
            </button>
          </div>
        )
      ) : (
      <>
      <header className="relative flex h-40 shrink-0 items-center justify-between gap-2 overflow-hidden border-b-2 border-[var(--qs-ink)] bg-[#241F4A] px-3 text-white sm:h-[11.25rem] sm:px-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[#2A2358]" />
          <div className="absolute left-0 top-0 h-full w-[38%] bg-[#4A3F5E]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
          <div className="absolute left-[14%] top-[18%] h-full w-[34%] bg-[#342C78]" style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />
          <div className="absolute right-0 top-0 h-full w-[42%] bg-[#3B2F8F]" style={{ clipPath: "polygon(100% 0, 100% 100%, 20% 100%, 55% 0)" }} />
          <div className="absolute right-0 top-0 h-[70%] w-[20%] bg-[#5B49C4]" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }} />
          <pre className="absolute left-[46%] top-2 hidden font-mono text-[11px] leading-[1.9] tracking-[0.06em] text-white/10 lg:block">9f3a·c21e·7b04·d8e1·55ac
4be7·0a95·f3c2·61bd·e07f
a1d3·8c40·2fe9·b76a·19d5</pre>
        </div>
        <div className="relative flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1C1840]">
            <Eye className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-[var(--qs-sun)]">Preview mode · not graded</span>
            <span className="mt-0.5 block truncate text-xs font-bold text-white sm:text-sm">{quizTitle.trim() || "Untitled Quiz"}</span>
          </span>
          <span className="ml-1 inline-flex shrink-0 items-center rounded-full border-2 border-white/40 bg-white/10 px-2 py-1 text-[10px] font-bold text-white sm:px-2.5 sm:text-xs">
            Q {questions.length ? index + 1 : 0} / {questions.length}
          </span>
        </div>
        <div className="relative flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border-2 border-white/60 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white md:inline-flex">
            <Eye className="h-3.5 w-3.5" /> Preview
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit preview"
            className="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 text-xs font-bold text-[#1C1840] shadow-[3px_3px_0_var(--qs-ink)] transition-[transform,box-shadow] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--qs-ink)] sm:px-4"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Exit preview</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 -mt-11 min-h-0 flex-1 overflow-hidden bg-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:-mt-[3.75rem] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-16 -top-20 hidden h-64 w-64 rounded-full border-2 border-[var(--qs-line)] sm:block" />
          <div className="absolute right-[6%] top-[10%] hidden h-10 w-10 rotate-12 rounded-xl border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/40 lg:block" />
          <pre className="absolute bottom-6 right-6 hidden select-none text-right font-mono text-[13px] leading-[1.9] tracking-[0.06em] text-[var(--qs-brand)]/10 lg:block">3f9a·c21e·7b04·d8e1
4be7·0a95·f3c2·61bd
e90c·5d17·a2f6·83b0</pre>
        </div>

        <div className="relative mx-auto h-full min-h-0 max-w-6xl overflow-hidden">
          <div className="quiz-question-scroll h-full min-h-0 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable] sm:pr-1">
            {!current ? (
              <div className="grid h-full place-items-center rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6 text-center shadow-[6px_6px_0_var(--qs-sun)]">
                <div>
                  <Eye className="mx-auto h-8 w-8 text-[var(--qs-muted)]" />
                  <p className="mt-3 text-sm font-bold text-[var(--qs-ink)]">No questions to preview yet.</p>
                  <p className="mt-1 text-xs text-[var(--qs-muted)]">Add a question first, then open the preview again.</p>
                </div>
              </div>
            ) : (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.section
                      key={current.id}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="relative overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[6px_6px_0_var(--qs-sun)] sm:p-8"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#5B34D8]">
                          Question {index + 1} of {questions.length}
                        </span>
                        <span className="rounded-full border-[1.5px] border-[var(--qs-line)] px-3 py-1.5 text-[12px] font-bold leading-none text-[var(--qs-muted)]">
                          {current.type === "multiple_choice" ? "Select all that apply" : current.options.length ? "Choose one answer" : "Written response"}
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
                          transition={{ duration: 0.45, ease: "easeOut" }}
                        />
                      </div>
                      <QuizRichText
                        html={current.title || "Untitled question"}
                        className="qs-display relative mt-7 whitespace-pre-wrap text-[22px] font-extrabold leading-[1.25] tracking-[-0.01em] text-[var(--qs-ink)] sm:text-[26px]"
                      />

                      {current.options.length > 0 ? (
                        <div className="relative mt-6 flex flex-col gap-3" role="radiogroup" aria-label="Answer options">
                          {current.options.map((option, optionIndex) => {
                            const optionId = String(option.id);
                            const multiple = current.type === "multiple_choice";
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
                                  if (multiple) {
                                    const currentOptions = answers[current.id]?.options ?? [];
                                    setAnswer(current.id, {
                                      options: selected
                                        ? currentOptions.filter((id) => id !== optionId)
                                        : [...currentOptions, optionId],
                                    });
                                  } else {
                                    setAnswer(current.id, { option: optionId });
                                  }
                                }}
                                className={`group relative flex w-full items-center gap-3.5 rounded-2xl border-2 px-[18px] py-4 text-left text-[15px] leading-[1.4] text-[var(--qs-ink)] transition-[border-color,background-color,box-shadow] duration-150 sm:text-base ${selected ? "border-[var(--qs-brand)] bg-[#F3EFFF] shadow-[4px_4px_0_var(--qs-brand)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"}`}
                              >
                                <span className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] text-sm font-bold transition-colors ${selected ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "bg-[#EDE8FF] text-[var(--qs-ink)]"}`}>
                                  {optionLabel}
                                </span>
                                <QuizRichText
                                  as="span"
                                  html={option.contentHtml || option.content}
                                  className="flex-1"
                                />
                                <span className={`ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-[var(--qs-brand)]" : "border-[var(--qs-line)]"}`}>
                                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-[var(--qs-brand)]" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <textarea
                          value={answers[current.id]?.textAnswer ?? ""}
                          onChange={(event) => setAnswer(current.id, { textAnswer: event.target.value })}
                          rows={8}
                          maxLength={20000}
                          placeholder="Write your answer here…"
                          className="relative mt-6 w-full resize-y rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 text-sm leading-6 text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                        />
                      )}

                      <div className="mt-8 flex flex-wrap items-center gap-3.5 border-t-2 border-[#EDE8FF] pt-6">
                        <button
                          type="button"
                          onClick={() => goToQuestion(index - 1)}
                          disabled={index === 0}
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-5 text-[15px] font-bold text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-line)] transition-[transform,box-shadow] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--qs-line)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" /> Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMarkedForReview(current.id)}
                          aria-pressed={currentMarked}
                          className={`inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border-2 px-5 text-[15px] font-bold shadow-[4px_4px_0_var(--qs-line)] transition-[transform,box-shadow,border-color,background-color,color] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--qs-line)] ${currentMarked ? "border-[var(--qs-brand)] bg-[#F3EFFF] text-[var(--qs-brand)]" : "border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-ink)]"}`}
                        >
                          {currentMarked ? "Marked for review" : "Mark for review"}
                        </button>
                        {index < questions.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => goToQuestion(index + 1)}
                            className="ml-auto inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 text-[15px] font-bold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-[transform,box-shadow] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--qs-sun)]"
                          >
                            Next question <ChevronRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={onClose}
                            className="ml-auto inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-5 text-[15px] font-bold text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-ink)] transition-[transform,box-shadow] duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--qs-ink)]"
                          >
                            <X className="h-4 w-4" /> Exit preview
                          </button>
                        )}
                      </div>
                      <p className="mt-5 flex items-center gap-2 text-[13px] leading-5 text-[var(--qs-muted)]">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--qs-ok)]" />
                        Preview only — answers stay on this device and are not graded.
                      </p>
                    </motion.section>
                  </AnimatePresence>
                  <div className="h-1" aria-hidden="true" />
                </div>

                <aside className="flex flex-col gap-6 self-start lg:sticky lg:top-0">
                  <section className="rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="qs-display text-[20px] font-extrabold text-[var(--qs-ink)]">Questions</h3>
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-brand)]/30 bg-[#EDE8FF] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-brand)]">
                        <Eye className="h-3 w-3" /> Preview
                      </span>
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
                            className={`relative grid h-11 place-items-center rounded-[12px] border-2 text-[15px] font-bold transition-colors ${isCurrent ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-ink)]" : isAnswered ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"}`}
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
                        <Eye className="h-5 w-5" />
                      </span>
                      <span className="rounded-full border-2 border-[var(--qs-sun)] px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.06em] text-[var(--qs-sun)]">
                        Not graded
                      </span>
                    </div>
                    <h3 className="qs-display relative mt-4 text-[20px] font-extrabold">Preview session</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#DCD6F7]">
                      Explore every question freely. Nothing you select here is saved or sent.
                    </p>
                  </section>
                </aside>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
