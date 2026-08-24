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
}

function getCorrectIdx(q: CreatorQuestion): number {
  return q.options.findIndex((o) => o.isCorrect);
}

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const emojis = ["🎉", "🎊", "🌸", "⭐", "🌟", "✨", "💐", "🎀"];
  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      {Array.from({ length: 24 }).map((_, i) => {
        const emoji = emojis[i % emojis.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.3;
        const duration = 1.2 + Math.random() * 0.8;
        const xDrift = (Math.random() - 0.5) * 120;
        const rotate = Math.random() * 360;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, y: -20, x: 0, scale: 0.5, rotate: 0 }}
            animate={{
              opacity: [1, 1, 0],
              y: ["0vh", "60vh"],
              x: [0, xDrift],
              scale: [0.5, 1.2, 0.8],
              rotate: [0, rotate],
            }}
            transition={{ duration, delay, ease: "easeOut" }}
            className="absolute text-2xl"
            style={{ left: `${left}%`, top: 0 }}
          >
            {emoji}
          </motion.span>
        );
      })}
    </div>
  );
}

export function StudentPreviewModal({ open, onClose, questions, quizTitle }: StudentPreviewModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentIdx(0);
      setSelected({});
      setAnswered({});
      setShowConfetti(false);
    }
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
  const isCorrect = selectedIdx === correctIdx;

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <Confetti show={showConfetti} />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-background">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-text-primary truncate">{quizTitle || "Quiz Preview"}</h1>
              <p className="text-xs text-text-muted">Q {currentIdx + 1} of {total}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span className="text-xs font-mono font-semibold text-text-primary">10:00</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#EC4899]/10 px-2 py-1 text-[10px] font-bold text-[#EC4899]">
                <Eye className="h-3 w-3" /> PREVIEW
              </span>
              <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-card-hover hover:text-text-primary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-border">
            <motion.div className="h-full bg-[#EC4899]" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-border bg-card p-4 sm:p-6"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-muted">Q{currentIdx + 1}</span>
                  <span className="rounded-full bg-[#EC4899]/10 px-2 py-0.5 text-[10px] font-medium text-[#EC4899]">
                    {q.marks} pts
                  </span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    q.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    q.difficulty === "Medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                    q.difficulty === "Hard" ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" :
                    "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}>
                    {q.difficulty}
                  </span>
                </div>

                <h2
                  className="text-base sm:text-lg font-semibold text-text-primary leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: q.title || "Untitled question" }}
                />

                {/* Options for choice questions */}
                {(q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false") && (
                  <div className="space-y-2.5">
                    {q.options.map((opt, idx) => {
                      const isSelected = selectedIdx === idx;
                      const isThisCorrect = idx === correctIdx;

                      let borderColor = "border-border";
                      let bgColor = "bg-card";
                      let labelColor = "text-text-muted";
                      let labelBorder = "border-border";

                      if (isAnswered) {
                        if (isThisCorrect) {
                          borderColor = "border-emerald-400";
                          bgColor = "bg-emerald-50 dark:bg-emerald-500/10";
                          labelColor = "text-emerald-600 dark:text-emerald-400";
                          labelBorder = "border-emerald-500";
                        } else if (isSelected && !isThisCorrect) {
                          borderColor = "border-red-400";
                          bgColor = "bg-red-50 dark:bg-red-500/10";
                          labelColor = "text-red-600 dark:text-red-400";
                          labelBorder = "border-red-500";
                        }
                      } else if (isSelected) {
                        borderColor = "border-[#EC4899]";
                        bgColor = "bg-[#EC4899]/10";
                        labelColor = "text-[#EC4899]";
                        labelBorder = "border-[#EC4899]";
                      }

                      return (
                        <motion.button
                          key={opt.id}
                          onClick={() => handleSelect(idx)}
                          disabled={isAnswered}
                          whileTap={!isAnswered ? { scale: 0.98 } : undefined}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all min-h-[56px]",
                            borderColor,
                            bgColor,
                            !isAnswered && "hover:border-border hover:bg-card-hover cursor-pointer",
                            isAnswered && "cursor-default"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors",
                              labelBorder,
                              labelColor
                            )}>
                              {isAnswered && isThisCorrect ? <CheckCircle2 className="h-4 w-4" /> :
                               isAnswered && isSelected && !isThisCorrect ? <XCircle className="h-4 w-4" /> :
                               optionLabels[idx]}
                            </span>
                            <span className="text-sm sm:text-base text-text-primary">{opt.content}</span>
                            {isAnswered && isThisCorrect && (
                              <span className="ml-auto shrink-0 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                Correct! Well done! 🎉
                              </span>
                            )}
                            {isAnswered && isSelected && !isThisCorrect && (
                              <span className="ml-auto shrink-0 text-[11px] font-bold text-red-600 dark:text-red-400">
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
                      className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-[11px] text-amber-700 dark:text-amber-400"
                    >
                      <strong>Note:</strong> Students won&apos;t see the correct answer or this feedback during the actual quiz. This preview is for the creator only.
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Fill in the blanks */}
                {q.type === "fill_blanks" && (
                  <div className="rounded-xl border border-border bg-input-bg p-4">
                    <input
                      readOnly
                      placeholder="Student types answer here..."
                      className="w-full bg-transparent text-sm text-text-muted placeholder:text-text-muted focus:outline-none"
                    />
                  </div>
                )}

                {/* Integer / Text / Paragraph */}
                {(q.type === "integer" || q.type === "text" || q.type === "paragraph") && (
                  <div className="rounded-xl border border-border bg-input-bg p-4">
                    <textarea
                      readOnly
                      rows={q.type === "paragraph" ? 4 : 2}
                      placeholder={q.type === "integer" ? "Enter numeric answer..." : "Type your answer here..."}
                      className="w-full resize-none bg-transparent text-sm text-text-muted placeholder:text-text-muted focus:outline-none"
                    />
                  </div>
                )}

                {/* Code output */}
                {q.type === "code_output" && (
                  <div className="rounded-xl border border-border bg-input-bg p-4">
                    <p className="text-xs text-text-muted mb-2">Write your code output:</p>
                    <textarea
                      readOnly
                      rows={3}
                      placeholder="Enter expected output..."
                      className="w-full resize-none bg-transparent text-sm font-mono text-text-muted placeholder:text-text-muted focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation footer */}
        <div className="shrink-0 border-t border-border bg-background px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-text-secondary hover:bg-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>

            {/* Question dots */}
            <div className="flex items-center gap-1">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    i === currentIdx ? "bg-[#EC4899] scale-125" :
                    answered[i] ? (selected[i] === getCorrectIdx(questions[i]) ? "bg-emerald-500" : "bg-red-500") :
                    selected[i] !== undefined ? "bg-[#EC4899]/40" :
                    "bg-border"
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
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-text-secondary hover:bg-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
