"use client";

import { useState } from "react";
import {
  Copy,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { getQuestionStatus } from "@/components/quiz/creator/types";
import { useStudio } from "../StudioProvider";

const DIFF_COLORS: Record<string, string> = {
  Easy: "text-emerald-500",
  Medium: "text-amber-500",
  Hard: "text-orange-500",
  Expert: "text-rose-500",
};

import { X } from "lucide-react";

export function QuestionList({
  onAiGenerate,
  onToggleSidebar,
}: {
  onAiGenerate?: () => void;
  onToggleSidebar?: () => void;
}) {
  const {
    state,
    reorderQuestions,
    duplicateQuestion,
    removeQuestion,
    setActiveQuestion,
    addQuestion,
  } = useStudio();
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const visible = state.questions.filter((q) => {
    const term = search.toLowerCase();
    if (!term) return true;
    return (
      q.title.toLowerCase().includes(term) ||
      q.tags.some((t) => t.toLowerCase().includes(term))
    );
  });

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragEnd = () => setDraggedId(null);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const current = state.questions.map((q) => q.id);
    const from = current.indexOf(draggedId);
    const to = current.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const reordered = Array.from(current);
    reordered.splice(from, 1);
    reordered.splice(to, 0, draggedId);
    reorderQuestions(reordered);
  };

  return (
    <div data-sidebar="true" className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card/50">
            {/* Header */}
      <div className="border-b border-border px-3.5 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Questions
          </h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-card-hover px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
              {state.questions.length}
            </span>
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="rounded p-0.5 text-text-secondary hover:text-text-primary lg:hidden"
                aria-label="Close question list"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="h-9 w-full rounded-lg border border-input-border bg-input-bg pl-8 pr-3 text-xs text-text-primary placeholder-text-muted outline-none transition-colors duration-150 focus:border-indigo-500/60"
          />
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-text-secondary transition-all duration-200 hover:border-indigo-500/60 hover:bg-indigo-500/5 hover:text-indigo-600 hover:shadow-[0_0_12px_rgba(99,102,241,0.15)] dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
        >
          <PlusIcon /> Add Question
        </button>
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto px-2.5 py-2.5"
        onDragOver={handleDragOver}
      >
        {visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">
            No matching questions.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {visible.map((q, i) => {
              const active = state.activeQuestionId === q.id;
              const status = getQuestionStatus(q);
              const statusIcon =
                status === "complete" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                );
              return (
                <li
                  key={q.id}
                  id={`q-item-${q.id}`}
                  draggable={true}
                  onDragStart={() => handleDragStart(q.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, q.id)}
                  onClick={() => setActiveQuestion(q.id)}
                  className={cn(
                    "group relative cursor-pointer rounded-lg border px-3 py-3 transition-colors duration-150",
                    active
                      ? "border-indigo-500/50 bg-indigo-500/[0.06] dark:border-pink-400/60 dark:bg-pink-500/[0.08]"
                      : "border-transparent hover:border-border hover:bg-card-hover/60"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                        active
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                      )}
                    >
                      {i + 1}
                    </span>
                    <p className="line-clamp-2 min-w-0 flex-1 text-xs font-medium leading-relaxed text-text-primary">
                      {q.title || <span className="italic opacity-50">Untitled question</span>}
                    </p>
                    {statusIcon}
                  </div>

                  {/* Meta pills */}
                  <div className="mt-2 flex flex-wrap items-center gap-1 pl-7">
                    <span className="rounded border border-border bg-card-hover/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-text-secondary">
                      {q.type === "single_choice"
                        ? "MCQ"
                        : q.type === "multiple_choice"
                        ? "Multi"
                        : q.type.replace("_", " ")}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold",
                        DIFF_COLORS[q.difficulty] ?? "text-amber-500"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          {
                            Easy: "bg-emerald-500",
                            Medium: "bg-amber-500",
                            Hard: "bg-orange-500",
                            Expert: "bg-rose-500",
                          }[q.difficulty] ?? "bg-amber-500"
                        )}
                      />
                      {q.difficulty}
                    </span>
                    <span className="rounded border border-border px-1.5 py-0.5 text-[9px] font-medium text-text-secondary">
                      {q.marks} mk
                    </span>

                    {/* Row actions */}
                    <span
                      className={cn(
                        "ml-auto flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                        active && "opacity-100"
                      )}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateQuestion(q.id);
                        }}
                        title="Duplicate"
                        aria-label="Duplicate question"
                        className="rounded p-1 text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQuestion(q.id);
                        }}
                        title="Delete"
                        aria-label="Delete question"
                        className="rounded p-1 text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-rose-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-2.5">
        <div className="flex items-center justify-between text-[10px]">
          <button
            type="button"
            onClick={() => toast.info({ title: "Question Bank", description: "Open your reusable question bank." })}
            className="font-semibold text-text-secondary transition-colors duration-150 hover:text-text-primary"
          >
            Question Bank
          </button>
          <button
            type="button"
            onClick={onAiGenerate}
            className="font-semibold text-indigo-600 transition-colors duration-150 hover:text-indigo-500 dark:text-indigo-400"
          >
            AI Generate
          </button>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
