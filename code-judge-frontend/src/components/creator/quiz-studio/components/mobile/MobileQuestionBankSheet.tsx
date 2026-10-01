"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, Copy, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../../StudioProvider";
import { getQuestionStatus } from "@/components/quiz/creator/types";
import { AiStreamText } from "@/components/ui";

function decodeHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAiGenerate?: () => void;
}

export function MobileQuestionBankSheet({ open, onClose, onAiGenerate }: Props) {
  const { state, setActiveQuestion, duplicateQuestion, removeQuestion, addQuestion, questionsLoading } = useStudio();
  const [search, setSearch] = useState("");

  const visible = state.questions.filter((q) => {
    const term = search.toLowerCase();
    if (!term) return true;
    return decodeHtml(q.title).toLowerCase().includes(term);
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[20px] border-x border-t border-border bg-card shadow-2xl"
            style={{ maxWidth: "100vw" }}
          >
            {/* handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <span className="h-1.5 w-10 rounded-full bg-text-muted/40" />
            </div>
            {/* header */}
            <div className="px-4 pb-3 shrink-0 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-text-primary">Questions</h3>
                <button
                  onClick={onClose}
                  aria-label="Close questions"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-text-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">{state.questions.length} questions</p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions..."
                  className="h-10 w-full rounded-xl border-border bg-card pl-9 pr-3 text-sm"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    addQuestion();
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-pink-500/40 bg-pink-500/[0.08] py-3 text-sm font-semibold text-[#E91E63] dark:text-pink-400"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onAiGenerate?.();
                  }}
                  className="section-ai-cta flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/[0.08] py-3 text-sm font-semibold text-violet-600 dark:text-violet-300"
                >
                  <Sparkles className="h-4 w-4" /> <AiStreamText text="AI Generate" />
                </button>
              </div>
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {questionsLoading && state.questions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-3 py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-300 border-t-transparent" />
                  <p className="text-sm text-text-muted">Loading questions…</p>
                </div>
              ) : visible.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm text-text-muted">
                  No matching questions.
                </p>
              ) : (
                visible.map((q) => {
                  const realIdx = state.questions.findIndex((x) => x.id === q.id);
                  const active = state.activeQuestionId === q.id;
                  const status = getQuestionStatus(q);
                  const preview = decodeHtml(q.title) || "Untitled question";
                  const typeLabel =
                    q.type === "single_choice"
                      ? "MCQ"
                      : q.type === "multiple_choice"
                      ? "Multi"
                      : q.type === "true_false"
                      ? "T/F"
                      : q.type === "match_following"
                      ? "Match"
                      : q.type === "fill_blanks"
                      ? "Fill"
                      : q.type.replace("_", " ");
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setActiveQuestion(q.id);
                        onClose();
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                        active
                          ? "border-pink-500/30 bg-pink-500/[0.08]"
                          : "border-border bg-card"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                          active ? "bg-[#E91E63] text-white" : "bg-white/[0.06] text-text-secondary"
                        )}
                      >
                        {String(realIdx + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">
                          {preview.slice(0, 60)}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
                          <span className="rounded-full border border-border bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium">
                            {typeLabel}
                          </span>
                          <span>{q.marks} marks</span>
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              status === "complete"
                                ? "bg-emerald-500"
                                : status === "missing_answer"
                                ? "bg-amber-400"
                                : "bg-border"
                            )}
                          />
                          <span className="capitalize text-[11px]">
                            {status === "complete" ? "Complete" : status === "missing_answer" ? "Needs answer" : "Draft"}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateQuestion(q.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-muted"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            removeQuestion(q.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-muted"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
