"use client";

import { useState, useCallback } from "react";
import {
  GripVertical,
  Copy,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import type { CreatorQuestion } from "../types";
import { getQuestionStatus } from "@/components/quiz/creator/types";
import { useStudio } from "../StudioProvider";

const DIFF_COLORS: Record<string, string> = {
  Easy: "text-emerald-500",
  Medium: "text-amber-500",
  Hard: "text-orange-500",
  Expert: "text-rose-500",
};

export function QuestionList() {
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
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/50">
      <div className="border-b border-border p-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="h-8 w-full rounded-lg border border-input-border bg-input-bg pl-8 text-xs text-text-primary placeholder-text-muted outline-none focus:border-pink-500/50"
          />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-text-muted">{state.questions.length} questions</span>
          <button
            type="button"
            onClick={addQuestion}
            className="flex items-center gap-1 rounded-lg border border-pink-500/30 bg-pink-500/10 px-2 py-1 text-[10px] font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-500/20"
          >
            + Add Question
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto py-1"
        onDragOver={handleDragOver}
      >
        {visible.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-text-muted">
            No matching questions.
          </p>
        ) : (
          visible.map((q, i) => {
            const active = state.activeQuestionId === q.id;
            const status = getQuestionStatus(q);
            const statusIcon =
              status === "complete" ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              ) : (
                <XCircle className="h-3 w-3 text-amber-500" />
              );
            return (
              <div
                key={q.id}
                id={`q-item-${q.id}`}
                draggable={true}
                onDragStart={() => handleDragStart(q.id)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, q.id)}
                className={cn(
                  "group relative flex cursor-pointer items-center gap-1.5 border-l-2 border-transparent px-3 py-2.5 text-left transition-all hover:bg-white/[0.03]",
                  active && "border-pink-500 bg-white/[0.04]"
                )}
                onClick={() => setActiveQuestion(q.id)}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 cursor-grab items-center justify-center rounded text-[9px] font-bold opacity-40 transition-opacity group-hover:opacity-100",
                    active && "opacity-100"
                  )}
                  title="Drag to reorder"
                >
                  <GripVertical className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-text-muted w-5 text-center">{i + 1}</span>
                    <p className="truncate text-xs font-medium text-text-primary">
                      {q.title || <span className="italic opacity-50">Untitled question</span>}
                    </p>
                    {active && statusIcon}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-text-muted">
                    <span className="truncate">
                      {q.type === "single_choice"
                        ? "MCQ"
                        : q.type === "multiple_choice"
                        ? "Multi"
                        : q.type.replace("_", " ")}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className={cn(DIFF_COLORS[q.difficulty] ?? "text-amber-500", "font-medium")}>
                      {q.difficulty}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{q.marks} marks</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
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
                    className="rounded p-0.5 text-text-secondary hover:text-text-primary"
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
                    className="rounded p-0.5 text-text-secondary hover:text-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-2 text-center">
        <div className="flex items-center justify-center gap-4 text-[10px]">
          <button
            type="button"
            onClick={() => toast.info({ title: "Question Bank", description: "Open your reusable question bank." })}
            className="font-semibold text-text-secondary hover:text-text-primary"
          >
            Question Bank
          </button>
          <span className="w-1 h-1 rounded-full bg-border" />
          <button
            type="button"
            onClick={() => toast.info({ title: "AI Generate", description: "Generate questions with AI." })}
            className="font-semibold text-pink-600 dark:text-pink-400 hover:text-pink-500"
          >
            AI Generate
          </button>
        </div>
      </div>
    </div>
  );
}
