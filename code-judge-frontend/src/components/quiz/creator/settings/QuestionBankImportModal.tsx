"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Database, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { getMyQuestionBank, type UserBankQuestion } from "@/services/ai";
import { useData } from "@/lib/hooks/useData";
import type { CreatorQuestion } from "@/components/quiz/creator/types";
import { bankQuestionToCreatorQuestion } from "@/utils/questionBankImport";

export default function QuestionBankImportModal({
  existingBankIds,
  remainingSlots,
  onClose,
  onImport,
}: {
  existingBankIds: Set<number>;
  remainingSlots: number;
  onClose: () => void;
  onImport: (questions: CreatorQuestion[]) => void;
}) {
  const { status, data, retry } = useData<UserBankQuestion[]>(() => getMyQuestionBank());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const questions = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return questions;
    return questions.filter(
      (question) =>
        question.question_text.toLowerCase().includes(term) ||
        question.subject.toLowerCase().includes(term) ||
        (question.chapter ?? "").toLowerCase().includes(term) ||
        (question.topic ?? "").toLowerCase().includes(term)
    );
  }, [questions, query]);

  const selectedCount = selected.size;

  const toggle = (id: number) => {
    if (existingBankIds.has(id)) return;
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < remainingSlots) {
        next.add(id);
      }
      return next;
    });
  };

  const handleImport = () => {
    const chosen = questions.filter((question) => selected.has(question.id));
    if (chosen.length === 0) return;
    onImport(chosen.map(bankQuestionToCreatorQuestion));
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute inset-0 bg-[#1a1240]/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Import questions from your question bank"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pink-500/10 text-pink-500">
              <Database className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-text-primary">Import from question bank</h2>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Add reusable questions to this quiz. You can add up to {Math.max(remainingSlots, 0)} more.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close import dialog"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search questions, subjects or topics..."
              aria-label="Search your question bank"
              className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {status === "loading" && (
            <div className="flex items-center justify-center gap-2 py-14 text-xs font-medium text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your question bank...
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <p className="text-sm font-semibold text-text-primary">Could not load your question bank</p>
              <p className="mt-1 text-xs text-text-muted">Please try again in a moment.</p>
              <button type="button" onClick={retry} className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">
                Try again
              </button>
            </div>
          )}

          {status === "empty" && (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <Database className="h-7 w-7 text-text-muted" />
              <p className="mt-2 text-sm font-semibold text-text-primary">Your question bank is empty</p>
              <p className="mt-1 text-xs text-text-muted">Generate questions first, then import them here.</p>
            </div>
          )}

          {status === "ready" && filtered.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-semibold text-text-primary">No questions match your search</p>
              <p className="mt-1 text-xs text-text-muted">Try a different subject, chapter or keyword.</p>
            </div>
          )}

          {status === "ready" && filtered.length > 0 && (
            <div className="space-y-1.5">
              {filtered.map((question) => {
                const alreadyAdded = existingBankIds.has(question.id);
                const checked = selected.has(question.id);
                const atLimit = !checked && selected.size >= remainingSlots;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => toggle(question.id)}
                    disabled={alreadyAdded || atLimit}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      checked
                        ? "border-pink-500/40 bg-pink-500/[0.06]"
                        : "border-transparent hover:border-border hover:bg-card-hover/60",
                      (alreadyAdded || atLimit) && "cursor-not-allowed opacity-55"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border-2",
                        checked ? "border-pink-500 bg-pink-500 text-white" : "border-border-hover"
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium leading-relaxed text-text-primary">
                        {question.question_text}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-text-muted">
                        <span className="rounded-full bg-card-hover px-1.5 py-0.5">{question.subject}</span>
                        {question.chapter && <span>{question.chapter}</span>}
                        {question.topic && <span>· {question.topic}</span>}
                        <span className="capitalize">· {question.difficulty ?? "unrated"}</span>
                        <span>· {question.question_type.replace(/_/g, " ")}</span>
                        {alreadyAdded && <span className="font-semibold text-success">· Already in quiz</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <span className="text-[11px] font-medium text-text-muted">
            {selectedCount} of {Math.max(remainingSlots, 0)} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-card-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedCount === 0 || remainingSlots <= 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Database className="h-3.5 w-3.5" />
              Import {selectedCount > 0 ? selectedCount : ""}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
