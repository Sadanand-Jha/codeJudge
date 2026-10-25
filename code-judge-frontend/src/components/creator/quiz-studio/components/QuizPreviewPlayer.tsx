"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, ShieldCheck, Target, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { QuizRichText } from "@/components/quiz/QuizRichText";
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
  const { lockTheme, unlockTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    lockTheme("dark");
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
  const answered = Object.keys(answers).length;

  const setAnswer = (questionId: string, answer: PreviewAnswer) => {
    setAnswers((previous) => ({ ...previous, [questionId]: answer }));
  };

  return (
    <div className="qs-ui student-quiz-theme fixed inset-0 z-[120] flex flex-col overflow-hidden bg-[var(--qs-bg)] text-[var(--qs-ink)]">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
            <Eye className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[var(--qs-brand)]">Preview mode · not graded</span>
            <span className="mt-0.5 block truncate text-xs font-bold text-[var(--qs-ink)] sm:text-sm">{quizTitle.trim() || "Untitled Quiz"}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Exit preview"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 text-xs font-bold text-[var(--qs-muted)] transition hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)] sm:px-3"
        >
          <X className="h-3.5 w-3.5" /> Exit preview
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[var(--qs-bg)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-16 -top-20 hidden h-64 w-64 rounded-full border-2 border-[var(--qs-line)] sm:block" />
          <div className="absolute right-[6%] top-[10%] hidden h-10 w-10 rotate-12 rounded-xl border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/40 lg:block" />
        </div>

        <div className="relative mx-auto h-full min-h-0 max-w-4xl overflow-hidden">
          <main className="relative flex h-full min-h-0 flex-col gap-3 sm:gap-4">
            <div className="shrink-0 overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
              <div className="flex items-center justify-between gap-3 px-3.5 py-3.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[var(--qs-ok)]">Student view · safe to explore</span>
                    <span className="mt-0.5 block truncate text-xs font-bold text-[var(--qs-ink)]">
                      Question {questions.length ? index + 1 : 0} of {questions.length}
                    </span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden items-center gap-1.5 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--qs-brand)] min-[420px]:inline-flex">
                    <Target className="h-3.5 w-3.5" /> {answered} answered
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-xl border-2 border-[var(--qs-brand)]/30 bg-[var(--qs-poly-1)] px-2.5 py-1.5 text-[10px] font-extrabold text-[var(--qs-brand)]">
                    <Eye className="h-3 w-3" /> PREVIEW
                  </span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden bg-[var(--qs-line)]">
                <motion.div
                  className="h-full rounded-r-full bg-[var(--qs-brand)]"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="quiz-question-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable] sm:pr-1">
              {!current ? (
                <div className="grid h-full place-items-center rounded-[24px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-6 text-center">
                  <div>
                    <Eye className="mx-auto h-8 w-8 text-[var(--qs-muted)]" />
                    <p className="mt-3 text-sm font-bold text-[var(--qs-ink)]">No questions to preview yet.</p>
                    <p className="mt-1 text-xs text-[var(--qs-muted)]">Add a question first, then open the preview again.</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.section
                    key={current.id}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="relative overflow-hidden rounded-[24px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-6"
                  >
                    <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-2xl border-2 border-[var(--qs-line)]" />
                    <div className="relative flex items-center justify-between gap-3">
                      <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--qs-brand)]/10 text-[10px]">{index + 1}</span>
                        Question
                      </p>
                      <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[9px] font-semibold text-[var(--qs-muted)]">
                        {current.type === "multiple_choice" ? "Select all that apply" : current.options.length ? "Choose one answer" : "Written response"}
                      </span>
                    </div>
                    <QuizRichText
                      html={current.title || "Untitled question"}
                      className="relative mt-4 whitespace-pre-wrap text-base font-semibold leading-7 tracking-[-0.01em] text-[var(--qs-ink)] sm:text-lg"
                    />

                    {current.options.length > 0 ? (
                      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
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
                              className={`group relative flex min-h-16 items-center gap-3 rounded-2xl border-2 p-3 text-left text-sm leading-5 transition-all duration-200 ${
                                selected
                                  ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]/10 text-[var(--qs-ink)]"
                                  : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)] hover:-translate-y-0.5 hover:border-[var(--qs-brand)]/50 hover:text-[var(--qs-ink)]"
                              }`}
                            >
                              <span
                                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border-2 text-[11px] font-bold transition-colors ${
                                  selected
                                    ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                                    : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] group-hover:border-[var(--qs-brand)]/50 group-hover:text-[var(--qs-brand)]"
                                }`}
                              >
                                {optionLabel}
                              </span>
                              <QuizRichText
                                as="span"
                                html={option.contentHtml || option.content}
                                className="flex-1"
                              />
                              <CheckCircle2 className={`h-4 w-4 shrink-0 transition-opacity ${selected ? "text-[var(--qs-brand)] opacity-100" : "opacity-0"}`} />
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
                        className="relative mt-5 w-full resize-y rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4 text-sm leading-6 text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                      />
                    )}
                  </motion.section>
                </AnimatePresence>
              )}
              <div className="h-1" aria-hidden="true" />
            </div>

            <footer className="relative grid shrink-0 grid-cols-2 gap-2 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2.5 sm:grid-cols-[auto_1fr_auto] sm:gap-3">
              <button
                type="button"
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
                disabled={index === 0}
                className="b b-ghost min-h-12 gap-1 px-3 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              {index < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
                  className="b b-pri col-start-2 min-h-12 gap-1 px-3 sm:col-start-3 sm:px-5"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="b b-pri col-start-2 min-h-12 gap-2 px-3 sm:col-start-3 sm:px-4"
                >
                  <X className="h-4 w-4" /> Exit preview
                </button>
              )}
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
