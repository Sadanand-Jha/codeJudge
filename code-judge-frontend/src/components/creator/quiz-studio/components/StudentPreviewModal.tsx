"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Clock, Eye, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { CreatorQuestion } from "../types";

interface StudentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  questions: CreatorQuestion[];
  quizTitle: string;
  durationMinutes: number;
}

function getCorrectIdx(q: CreatorQuestion): number {
  return q.options.findIndex((o) => o.isCorrect);
}

const CONFETTI_EMOJIS = ["🎉", "🎊", "🌸", "⭐", "🌟", "✨", "💐", "🎀"];
const CONFETTI_PIECES = Array.from({ length: 24 }, (_, i) => ({
  emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
  left: (i * 37) % 100,
  delay: (i % 5) * 0.06,
  duration: 1.2 + (i % 4) * 0.2,
  xDrift: ((i * 13) % 121) - 60,
  rotate: (i * 47) % 360,
}));

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      {CONFETTI_PIECES.map((piece, i) => {
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, y: -20, x: 0, scale: 0.5, rotate: 0 }}
            animate={{
              opacity: [1, 1, 0],
              y: ["0vh", "60vh"],
              x: [0, piece.xDrift],
              scale: [0.5, 1.2, 0.8],
              rotate: [0, piece.rotate],
            }}
            transition={{ duration: piece.duration, delay: piece.delay, ease: "easeOut" }}
            className="absolute text-2xl"
            style={{ left: `${piece.left}%`, top: 0 }}
          >
            {piece.emoji}
          </motion.span>
        );
      })}
    </div>
  );
}

export function StudentPreviewModal({ open, onClose, questions, quizTitle, durationMinutes }: StudentPreviewModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [remainingSec, setRemainingSec] = useState(() => Math.max(0, Math.round(durationMinutes * 60)));

  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => {
      setRemainingSec((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [open]);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
  }, []);

  if (!open || questions.length === 0) return null;

  const q = questions[currentIdx];
  const total = questions.length;
  const progress = ((currentIdx + 1) / total) * 100;
  const correctIdx = getCorrectIdx(q);
  const isAnswered = answered[currentIdx];
  const selectedIdx = selected[currentIdx];
  const timerLabel = `${String(Math.floor(remainingSec / 60)).padStart(2, "0")}:${String(remainingSec % 60).padStart(2, "0")}`;

  const optionLabels = ["A", "B", "C", "D", "E", "F"];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelected({ ...selected, [currentIdx]: idx });
    setAnswered({ ...answered, [currentIdx]: true });
    if (idx === correctIdx) {
      triggerConfetti();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1a1240]/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <Confetti show={showConfetti} />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[94dvh] max-h-[94dvh] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-t-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] sm:h-auto sm:max-h-[90vh] sm:rounded-[22px] sm:shadow-[8px_8px_0_var(--qs-sun)]"
      >
        {/* Header */}
        <div className="shrink-0 border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
          <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[13px] font-extrabold text-[var(--qs-ink)] sm:text-sm">{quizTitle || "Quiz Preview"}</h1>
              <p className="mt-0.5 text-[11px] font-medium text-[var(--qs-muted)] sm:text-xs">Q {currentIdx + 1} of {total}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <div className="flex items-center gap-1 rounded-full border-2 border-[#a85d00]/40 bg-[#fff3d6] px-2 py-1">
                <Clock className="h-3.5 w-3.5 text-[#a85d00]" />
                <span className="font-mono text-xs font-extrabold tabular-nums text-[#a85d00]">{timerLabel}</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-brand)]/30 bg-[var(--qs-poly-1)] px-2 py-1 text-[10px] font-extrabold text-[var(--qs-brand)]">
                <Eye className="h-3 w-3" /> PREVIEW
              </span>
              <button onClick={onClose} aria-label="Close preview" className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-poly-1)] hover:text-[var(--qs-ink)]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-[var(--qs-line)]">
            <motion.div className="h-full bg-[var(--qs-brand)]" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>

        {/* Question area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[var(--qs-bg)] p-3 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex min-h-0 flex-col rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-3 sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-[var(--qs-ink)]">
                    Q{currentIdx + 1}
                  </span>
                  <span className="rounded-full border-2 border-[var(--qs-brand)]/30 bg-[var(--qs-poly-1)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--qs-brand)]">
                    {q.marks} pts
                  </span>
                  <span className={cn(
                    "rounded-full border-2 px-2 py-0.5 text-[10px] font-extrabold",
                    q.difficulty === "Easy" ? "border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] text-[var(--qs-ok)]" :
                    q.difficulty === "Medium" ? "border-[#a85d00]/40 bg-[#fff3d6] text-[#a85d00]" :
                    q.difficulty === "Hard" ? "border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] text-[var(--qs-bad)]" :
                    "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                  )}>
                    {q.difficulty}
                  </span>
                </div>

                <h2
                  className="text-[15px] font-extrabold leading-snug text-[var(--qs-ink)] sm:text-lg sm:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: q.title || "Untitled question" }}
                />

                {/* Options for choice questions */}
                {(q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false") && (
                  <div className="space-y-2 sm:space-y-2.5">
                    {q.options.map((opt, idx) => {
                      const isSelected = selectedIdx === idx;
                      const isThisCorrect = idx === correctIdx;
                      const showCorrect = isAnswered && isSelected && isThisCorrect;
                      const showWrong = isAnswered && isSelected && !isThisCorrect;

                      return (
                        <motion.button
                          key={opt.id}
                          onClick={() => handleSelect(idx)}
                          disabled={isAnswered}
                          whileTap={!isAnswered ? { scale: 0.98 } : undefined}
                          className={cn(
                            "w-full rounded-[14px] border-2 p-3 text-left transition-colors sm:min-h-[56px] sm:p-4",
                            showCorrect ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)]" :
                            showWrong ? "border-[var(--qs-bad)] bg-[var(--qs-badbg)]" :
                            "border-[var(--qs-line)] bg-[var(--qs-surface)]",
                            !isAnswered && "cursor-pointer hover:border-[var(--qs-brand)] hover:bg-[var(--qs-poly-2)]",
                            isAnswered && "cursor-default"
                          )}
                        >
                          <div className="flex items-start gap-2.5 sm:gap-3">
                            <span className={cn(
                              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-extrabold transition-colors sm:h-7 sm:w-7",
                              showCorrect ? "border-[var(--qs-ok)] bg-[var(--qs-ok)] text-white" :
                              showWrong ? "border-[var(--qs-bad)] bg-[var(--qs-bad)] text-white" :
                              "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                            )}>
                              {showCorrect ? <CheckCircle2 className="h-4 w-4" /> :
                               showWrong ? <XCircle className="h-4 w-4" /> :
                               optionLabels[idx]}
                            </span>
                            <span className="min-w-0 flex-1 break-words text-sm font-medium leading-snug text-[var(--qs-ink)] sm:text-base" dangerouslySetInnerHTML={{ __html: opt.content }} />
                            {showCorrect && (
                              <span className="mt-1 shrink-0 text-[11px] font-extrabold text-[var(--qs-ok)]">
                                Correct! 🎉
                              </span>
                            )}
                            {showWrong && (
                              <span className="mt-1 shrink-0 text-[11px] font-extrabold text-[var(--qs-bad)]">
                                Incorrect
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Answer feedback */}
                <AnimatePresence>
                  {isAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      className="rounded-[14px] border-2 border-[#a85d00]/40 bg-[#fff3d6] px-4 py-3 text-[11px] font-medium text-[#a85d00]"
                    >
                      <strong>Note:</strong> Students won&apos;t see the correct answer or this feedback during the actual quiz. This preview is for the creator only.
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Fill in the blanks */}
                {q.type === "fill_blanks" && (
                  <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4 transition-colors focus-within:border-[var(--qs-brand)]">
                    <input
                      placeholder="Student types answer here..."
                      className="w-full bg-transparent text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:outline-none"
                    />
                  </div>
                )}

                {/* Integer / Text / Paragraph */}
                {(q.type === "integer" || q.type === "text" || q.type === "paragraph") && (
                  <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4 transition-colors focus-within:border-[var(--qs-brand)]">
                    <textarea
                      rows={q.type === "paragraph" ? 4 : 2}
                      placeholder={q.type === "integer" ? "Enter numeric answer..." : "Type your answer here..."}
                      className="w-full resize-none bg-transparent text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:outline-none"
                    />
                  </div>
                )}

                {/* Code output */}
                {q.type === "code_output" && (
                  <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4 transition-colors focus-within:border-[var(--qs-brand)]">
                    <p className="mb-2 text-xs font-bold text-[var(--qs-muted)]">Write your code output:</p>
                    <textarea
                      rows={3}
                      placeholder="Enter expected output..."
                      className="w-full resize-none bg-transparent font-mono text-sm text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:outline-none"
                    />
                  </div>
                )}

                {/* Matching preview — show the prompt and Column A only; keep Column B hidden. */}
                {q.type === "match_following" && (
                  <div>
                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Column A · Items</p>
                    <div className="space-y-2">
                      {(q.matchItems ?? []).map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[11px] font-extrabold tabular-nums text-[var(--qs-ink)]">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="text-sm font-medium text-[var(--qs-ink)]">{item.content || <span className="italic text-[var(--qs-muted)]">Empty</span>}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] font-medium text-[var(--qs-muted)]">Matching targets are hidden in preview.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation footer */}
        <div className="shrink-0 border-t-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="flex h-10 shrink-0 items-center gap-1 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-40 sm:py-2"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden min-[360px]:inline">Previous</span><span className="min-[360px]:hidden">Prev</span>
            </button>

            {/* Question dots */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5 px-1">
              {questions.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to question ${i + 1}`}
                  onClick={() => setCurrentIdx(i)}
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full transition-all",
                    i === currentIdx ? "w-5 bg-[var(--qs-brand)]" :
                    answered[i] ? (selected[i] === getCorrectIdx(questions[i]) ? "bg-[var(--qs-ok)]" : "bg-[var(--qs-bad)]") :
                    selected[i] !== undefined ? "bg-[var(--qs-brand)]/40" :
                    "bg-[var(--qs-line)]"
                  )}
                />
              ))}
            </div>

            <button
              onClick={() => {
                if (currentIdx < total - 1) {
                  setCurrentIdx(currentIdx + 1);
                }
              }}
              disabled={currentIdx === total - 1}
              className="flex h-10 shrink-0 items-center gap-1 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:border-[var(--qs-line)] disabled:bg-[var(--qs-bg)] disabled:text-[var(--qs-muted)] disabled:shadow-none sm:py-2"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
