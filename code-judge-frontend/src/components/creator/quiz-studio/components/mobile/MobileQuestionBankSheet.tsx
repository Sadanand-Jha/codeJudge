"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, GripVertical, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../../StudioProvider";
import { getQuestionStatus } from "@/components/quiz/creator/types";

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
}

export function MobileQuestionBankSheet({ open, onClose }: Props) {
  const { state, setActiveQuestion, duplicateQuestion, removeQuestion, addQuestion } = useStudio();
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
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[20px] border-x border-t border-border bg-white shadow-2xl"
            style={{ maxWidth: "100vw" }}
          >
            {/* handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <span className="h-1.5 w-10 rounded-full bg-zinc-200" />
            </div>
            {/* header */}
            <div className="px-4 pb-3 shrink-0 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-zinc-900">Questions</h3>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">{state.questions.length} questions</p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions..."
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:border-pink-300 focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  addQuestion();
                }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-pink-200 bg-pink-50 py-3 text-sm font-semibold text-[#E91E63]"
              >
                <Plus className="h-4 w-4" /> Add Question
              </button>
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {visible.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-sm text-zinc-500">
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
                          ? "border-pink-200 bg-pink-50"
                          : "border-zinc-200 bg-white"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                          active ? "bg-[#E91E63] text-white" : "bg-zinc-100 text-zinc-700"
                        )}
                      >
                        {String(realIdx + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900">
                          {preview.slice(0, 60)}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                          <span className="rounded-full bg-white border border-zinc-200 px-2 py-0.5 text-[11px] font-medium">
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
                                : "bg-zinc-300"
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
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            removeQuestion(q.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500"
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
