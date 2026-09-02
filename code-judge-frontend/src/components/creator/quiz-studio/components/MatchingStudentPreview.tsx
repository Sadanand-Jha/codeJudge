"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Shuffle, Trash2, Eye, GripVertical, ArrowRight, MousePointer2, Hand } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { CreatorQuestion } from "@/components/quiz/creator/types";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MatchingStudentPreview({
  open,
  onClose,
  question,
}: {
  open: boolean;
  onClose: () => void;
  question: CreatorQuestion;
}) {
  const left = question.matchItems ?? [];
  const rightOrig = question.matchMatches ?? [];

  // Stable shuffled right for this preview session
  const [right, setRight] = useState(() => (question.shuffleColumnB ? shuffleArray(rightOrig) : rightOrig));
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Record<string, string>>({}); // leftId -> rightId
  const [dragLeft, setDragLeft] = useState<string | null>(null);
  const [justPaired, setJustPaired] = useState<string | null>(null);

  useEffect(() => {
    // keep preview in sync when question changes or dialog re-opens
    if (open) {
      setRight(question.shuffleColumnB ? shuffleArray(rightOrig) : rightOrig);
      setPairs({});
      setSelectedLeft(null);
      setDragLeft(null);
    }
  }, [open, question.shuffleColumnB, rightOrig]);

  // reset when open toggles or question changes
  const reset = useCallback(() => {
    setPairs({});
    setSelectedLeft(null);
    setDragLeft(null);
    setRight(question.shuffleColumnB ? shuffleArray(rightOrig) : rightOrig);
  }, [question.shuffleColumnB, rightOrig]);

  // Keep preview fresh when reopened
  // Note: use effect would be ideal but we do inline check via keyed render
  const pairCount = Object.keys(pairs).length;
  const total = left.length;
  // Correct mapping for line-wise fallback
  const getCorrectRightId = (leftId: string) => {
    if (question.matchMapping && question.matchMapping[leftId]) return question.matchMapping[leftId];
    const idx = left.findIndex((l) => l.id === leftId);
    return rightOrig[idx]?.id ?? null;
  };
  const correctPairsCount = left.filter((l) => pairs[l.id] && pairs[l.id] === getCorrectRightId(l.id)).length;
  const allCorrect = pairCount === total && correctPairsCount === total && total > 0;
  const totalMarks = question.marks ?? 1;
  const earnedMarks = question.partialMarking ? Math.round((correctPairsCount / Math.max(1,total)) * totalMarks) : (allCorrect ? totalMarks : 0);

  const handleSelectLeft = (id: string) => {
    if (pairs[id]) {
      // already paired — unpair on click?
      const np = { ...pairs };
      delete np[id];
      setPairs(np);
      setSelectedLeft(id);
      return;
    }
    setSelectedLeft((prev) => (prev === id ? null : id));
  };

  const handleSelectRight = (rightId: string) => {
    // if already paired to some left, remove previous
    const existingLeft = Object.keys(pairs).find((k) => pairs[k] === rightId);
    if (existingLeft) {
      const np = { ...pairs };
      delete np[existingLeft];
      setPairs(np);
      if (selectedLeft === existingLeft) setSelectedLeft(null);
      return;
    }
    if (!selectedLeft) return;
    // prevent duplicate right
    setPairs((p) => ({ ...p, [selectedLeft]: rightId }));
    setJustPaired(selectedLeft);
    setTimeout(() => setJustPaired(null), 900);
    setSelectedLeft(null);
  };

  const handleDrop = (rightId: string) => {
    const leftId = dragLeft ?? selectedLeft;
    if (!leftId) return;
    // if right already taken, swap
    const existing = Object.keys(pairs).find((k) => pairs[k] === rightId);
    if (existing && existing !== leftId) {
      // remove existing pairing
      const np = { ...pairs };
      delete np[existing];
      np[leftId] = rightId;
      setPairs(np);
    } else {
      setPairs((p) => ({ ...p, [leftId]: rightId }));
    }
    setJustPaired(leftId);
    setTimeout(() => setJustPaired(null), 900);
    setDragLeft(null);
    setSelectedLeft(null);
  };

  const clearAll = () => {
    setPairs({});
    setSelectedLeft(null);
  };

  if (!open) return null;

  const ALPHA = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-background px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#E91E63]/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#E91E63]">
                <Eye className="h-3 w-3" /> STUDENT PREVIEW
              </p>
              <h2 className="mt-1 text-sm font-semibold text-text-primary">Match the following</h2>
              <p
                className="text-xs text-text-muted leading-relaxed"
                dangerouslySetInnerHTML={{ __html: question.title || "Match each data structure with its primary use case." }}
              />
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-muted hover:bg-card-hover">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-text-primary">
              <span className={cn("h-2 w-2 rounded-full", allCorrect ? "bg-blue-500" : "bg-amber-500")} />
              {allCorrect ? `${total} / ${total} correct` : `${pairCount} / ${total} matched`} <span className="opacity-60">·</span> <span className={cn(allCorrect ? "text-blue-600" : "text-amber-600")}>{earnedMarks} / {totalMarks} marks</span>
            </span>
            <button onClick={clearAll} disabled={pairCount === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-card-hover disabled:opacity-40">
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-y-auto bg-card p-4 sm:p-6">
          {/* ── Teach: click one-by-one stepper ── */}
          <div className="mb-4 rounded-2xl border border-border bg-background px-3 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold border transition-colors", !selectedLeft ? "bg-[#E91E63] text-white border-[#E91E63] shadow-[0_0_0_4px_rgba(233,30,99,0.14)]" : "bg-card border-border text-text-muted")}>1</span>
                <span className={cn("text-xs font-medium", !selectedLeft ? "text-[#E91E63]" : "text-text-muted")}>Click an item on the left</span>
                <ArrowRight className="h-3 w-3 text-text-muted hidden sm:block" />
                <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold border transition-colors", selectedLeft ? "bg-[#E91E63] text-white border-[#E91E63] shadow-[0_0_0_4px_rgba(233,30,99,0.14)] animate-pulse" : "bg-card border-border text-text-muted")}>2</span>
                <span className={cn("text-xs font-medium", selectedLeft ? "text-[#E91E63]" : "text-text-muted")}>Click its match on the right</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                <><MousePointer2 className="h-3 w-3" /> tap to pair</>
              </span>
            </div>
            <AnimatePresence mode="wait">
              {!selectedLeft ? (
                <motion.p key="step1" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-2 text-center text-xs font-medium text-[#E91E63]">
                  👆 Start — click any pink-highlighted item in Column A
                </motion.p>
              ) : (
                <motion.p key="step2" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-2 text-center text-xs font-medium text-[#E91E63]">
                  Now tap its match in Column B on the same line
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {/* Left */}
            <div>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Column A · Items
                {!selectedLeft && <span className="rounded-full bg-[#E91E63]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#E91E63] animate-pulse">tap one</span>}
              </p>
              <div className="space-y-2">
                {left.map((item, idx) => {
                  const pairedRightId = pairs[item.id];
                  const paired = pairedRightId ? rightOrig.find((r) => r.id === pairedRightId) : null;
                  const isSelected = selectedLeft === item.id;
                  const isPaired = !!pairedRightId;
                  const showGreen = isPaired;
                  const isJustPaired = justPaired === item.id;
                  const showJustGreen = isJustPaired;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectLeft(item.id)}
                      className={cn(
                        "group relative flex items-center gap-2 rounded-xl border px-3 py-3 cursor-pointer transition-all duration-150",
                        showJustGreen && "border-blue-400 bg-blue-500/10 scale-[1.02]",
                        !showJustGreen && isSelected ? "border-[#E91E63] bg-[#E91E63]/10 shadow-[0_0_0_3px_rgba(233,30,99,0.12)] scale-[1.01]" : showGreen ? "border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10" : !selectedLeft ? "border-[#E91E63]/30 bg-background hover:border-[#E91E63]/50 shadow-[0_0_0_2px_rgba(233,30,99,0.06)]" : "border-border bg-background hover:border-[#E91E63]/30 hover:bg-[#E91E63]/[0.03]"
                      )}
                    >
                      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold", isSelected ? "bg-[#E91E63] text-white border-[#E91E63]" : "bg-card-hover border-border text-text-primary")}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-sm font-medium text-text-primary" dangerouslySetInnerHTML={{ __html: item.content }} />
                      {isPaired && paired && (
                        <span className={cn("hidden sm:inline-flex max-w-[110px] truncate rounded-full px-2 py-0.5 text-[11px] font-medium", showGreen ? "bg-blue-500 text-white" : "bg-card border border-border text-text-muted")}>
                          → {paired.content}
                        </span>
                      )}
                      {isPaired && !isJustPaired && <span className={cn("h-2 w-2 shrink-0 rounded-full", showGreen ? "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" : "bg-border")} />}
                      {isJustPaired && showJustGreen && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white"><Check className="h-3 w-3" /></span>}
                      {isJustPaired && !showJustGreen && <span className="h-2 w-2 shrink-0 rounded-full bg-border" />}
                      {!isPaired && isSelected && <span className="h-2 w-2 shrink-0 rounded-full bg-[#E91E63] animate-pulse" />}
                      {!isPaired && !selectedLeft && !isSelected && <span className="h-2 w-2 shrink-0 rounded-full bg-[#E91E63]/40 animate-pulse" />}
                      <GripVertical className="hidden sm:block h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right */}
            <div>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Column B · Matches
                {selectedLeft && <span className="rounded-full bg-[#E91E63] px-1.5 py-0.5 text-[10px] font-bold text-white animate-pulse">choose one</span>}
              </p>
              <div className="space-y-2">
                {right.map((item, idx) => {
                  const pairedLeftId = Object.keys(pairs).find((k) => pairs[k] === item.id);
                  const isPaired = !!pairedLeftId;
                  const showGreen = isPaired;
                  const isSelectable = !!selectedLeft && !isPaired;
                  const isJustTarget = justPaired && pairs[justPaired] === item.id;
                  const showJustGreen = isJustTarget;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectRight(item.id)}
                      className={cn(
                        "group flex items-center gap-2 rounded-xl border px-3 py-3 cursor-pointer transition-all duration-150",
                        showJustGreen ? "border-blue-400 bg-blue-500/10 scale-[1.02]" :
                        showGreen ? "border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10" :
                        isSelectable ? "border-[#E91E63] bg-[#E91E63]/[0.05] shadow-[0_0_0_3px_rgba(233,30,99,0.10)] animate-pulse" : "border-border bg-background hover:border-[#E91E63]/30"
                      )}
                    >
                      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold", isSelectable ? "bg-[#E91E63] text-white border-[#E91E63]" : "bg-card-hover border-border text-text-primary")}>
                        {ALPHA[rightOrig.findIndex((r) => r.id === item.id)] ?? String(idx + 1)}
                      </span>
                      <span className="flex-1 text-sm text-text-primary" dangerouslySetInnerHTML={{ __html: item.content }} />
                      {isPaired && !isJustTarget && showGreen && <Check className="h-3.5 w-3.5 text-blue-600" />}
                      {isPaired && !isJustTarget && !showGreen && <span className="h-2 w-2 rounded-full bg-border" />}
                      {showJustGreen && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white"><Check className="h-3 w-3" /></span>}
                      {isJustTarget && !showJustGreen && <span className="h-2 w-2 rounded-full bg-border" />}
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", showGreen ? "bg-blue-500" : isSelectable ? "bg-[#E91E63]" : "bg-border")} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Status banner — green only when all correct */}
          <div className={cn("mt-6 rounded-xl border px-4 py-3 text-center", allCorrect ? "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10" : "border-dashed border-[#E91E63]/20 bg-[#E91E63]/[0.03]")}>
            <p className="text-xs text-text-muted">
              {allCorrect ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
                  <Check className="h-3.5 w-3.5" /> All {total} correctly matched — review then submit. Click any pair to change it.
                </span>
              ) : pairCount === 0 ? (
                <>Click one-by-one: <b className="text-text-primary">left → right</b>. Each left item pairs with exactly one right item.</>
              ) : pairCount === total && !allCorrect ? (
                <span className="text-amber-600 dark:text-amber-400">All paired but not all correct — check line-wise pairs.</span>
              ) : (
                <>{pairCount} / {total} paired — keep going: click next left item, then its right match.</>
              )}
            </p>
          </div>

          <p className="mt-4 text-center text-[11px] text-text-muted">Correctness not revealed until submission • Tap to pair • Tap paired card to unpair</p>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 flex items-center justify-between gap-3">
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-text-secondary hover:bg-card-hover">
            <Shuffle className="h-3.5 w-3.5" /> Shuffle preview
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-text-muted">{pairCount < total ? "Keep matching…" : "Ready to submit"}</span>
            <button
              onClick={onClose}
              className={cn("rounded-xl px-5 py-2 text-xs font-semibold", pairCount === total ? "bg-[#E91E63] text-white hover:bg-[#D81B60]" : "bg-card-hover text-text-muted")}
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
