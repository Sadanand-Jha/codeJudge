"use client";

import { useState } from "react";
import { Copy, Trash2, Search, CheckCircle2, XCircle, GripVertical, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { getQuestionStatus } from "@/components/quiz/creator/types";
import { useStudio } from "../StudioProvider";

export function QuestionList({
  onAiGenerate,
  onToggleSidebar,
}: {
  onAiGenerate?: () => void;
  onToggleSidebar?: () => void;
}) {
  const { state, reorderQuestions, duplicateQuestion, removeQuestion, setActiveQuestion, addQuestion } = useStudio();
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const visible = state.questions.filter((q) => {
    const term = search.toLowerCase();
    if (!term) return true;
    return q.title.toLowerCase().includes(term) || q.tags.some((t) => t.toLowerCase().includes(term));
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
    <div className="flex h-full w-[280px] shrink-0 flex-col overflow-hidden bg-white">
      <div className="px-3 pt-4 pb-3 border-b border-zinc-100 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-900">Questions</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
              {state.questions.length}
            </span>
            {onToggleSidebar && (
              <button onClick={onToggleSidebar} className="rounded p-1 text-zinc-500 hover:text-zinc-900 lg:hidden">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="h-8 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-xs placeholder:text-zinc-400 focus:outline-none focus:border-zinc-300"
          />
        </div>
        <button
          onClick={() => addQuestion()}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-pink-200 bg-pink-50 py-2 text-xs font-medium text-[#E91E63] hover:bg-pink-100"
        >
          + Add Question
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1" onDragOver={handleDragOver}>
        {visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-500">No matching questions.</p>
        ) : (
          <ul className="space-y-1">
            {visible.map((q, i) => {
              const realIdx = state.questions.findIndex((x) => x.id === q.id);
              const active = state.activeQuestionId === q.id;
              const status = getQuestionStatus(q);
              return (
                <li
                  key={q.id}
                  draggable
                  onDragStart={() => handleDragStart(q.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, q.id)}
                  onClick={() => setActiveQuestion(q.id)}
                  className={cn(
                    "group relative flex h-[64px] cursor-pointer flex-col justify-center rounded-xl border px-3 py-2 transition-colors",
                    active
                      ? "border-pink-200 bg-pink-50/60 border-l-[3px] border-l-[#E91E63] shadow-sm"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("text-[11px] font-bold tabular-nums mt-0.5", active ? "text-[#E91E63]" : "text-zinc-400")}>
                      {String(realIdx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("line-clamp-1 text-[13px] leading-tight", active ? "font-semibold text-zinc-900" : "font-medium text-zinc-700")}>
                        {(q.title.replace(/<[^>]*>/g, "").trim() || "Untitled question").slice(0, 48)}
                      </p>
                      <p className="truncate text-[11px] text-zinc-500">
                        {(q.type === "single_choice" ? "MCQ" : q.type === "multiple_choice" ? "Multi" : q.type === "true_false" ? "T/F" : q.type.replace("_", " "))} · {q.difficulty} · {q.marks} marks
                      </p>
                    </div>
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", status === "complete" ? "bg-emerald-500" : status === "missing_answer" ? "bg-amber-400" : "bg-zinc-300")} />
                  </div>
                  <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateQuestion(q.id);
                      }}
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQuestion(q.id);
                      }}
                      className="rounded p-1 text-zinc-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <span className="p-1 text-zinc-400 cursor-grab">
                      <GripVertical className="h-3 w-3" />
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-100 p-3 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => addQuestion()}
            className="flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + Add question
          </button>
          <button
            onClick={onAiGenerate}
            className="flex items-center justify-center gap-1 rounded-lg border border-pink-200 bg-white py-2 text-xs font-medium text-[#E91E63] hover:bg-pink-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Generate
          </button>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#F8FAFC] p-2.5 text-xs text-zinc-600">
          <span className="mt-0.5">💡</span>
          <span>
            <span className="font-semibold">Tip:</span> Drag to reorder questions
          </span>
        </div>
      </div>
    </div>
  );
}
