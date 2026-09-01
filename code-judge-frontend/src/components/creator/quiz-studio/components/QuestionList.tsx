"use client";

import { useState, useEffect } from "react";
import { Copy, Trash2, Search, CheckCircle2, XCircle, GripVertical, X, Sparkles, Download } from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { getQuestionStatus } from "@/components/quiz/creator/types";
import { useStudio } from "../StudioProvider";

/**
 * Strips HTML tags and decodes common HTML entities (&nbsp;, &amp;, etc.)
 * from the rich-text title so it displays cleanly as plain text in the list.
 * Without this, entities like &nbsp; would show as literal text.
 */
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

export function QuestionList({
  onAiGenerate,
  onDownloadPdf,
  onSave,
  saving,
  hasChanges,
  saveProgress,
  onToggleSidebar,
}: {
  onAiGenerate?: () => void;
  onDownloadPdf?: () => void;
  onSave?: () => void;
  saving?: boolean;
  hasChanges?: boolean;
  saveProgress?: { saved: number; total: number } | null;
  onToggleSidebar?: () => void;
}) {
  const { state, reorderQuestions, duplicateQuestion, removeQuestion, setActiveQuestion, addQuestion } = useStudio();
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [tipIdx, setTipIdx] = useState(0);

  const TIPS = [
    "Drag questions to reorder them in the list.",
    "Press Ctrl+Z to undo your last change.",
    "Press Ctrl+Y to redo an undone change.",
    "Click the circle next to an option to mark it as correct.",
    "Use AI Generate to create questions instantly from your content.",
    "Download a PDF of your quiz anytime from the button above.",
    "Click Student Preview to see how students will view your quiz.",
    "Press + Add Question to create a new blank question.",
    "Duplicate a question using the copy icon on hover.",
    "Set marks, difficulty, and time for each question in the toolbar.",
    "The green dot means a question is complete, yellow means missing an answer.",
    "You can add images to options using the image icon.",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIdx((prev) => (prev + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [TIPS.length]);

  const visible = state.questions.filter((q) => {
    const term = search.toLowerCase();
    if (!term) return true;
    return decodeHtml(q.title).toLowerCase().includes(term) || q.tags.some((t) => t.toLowerCase().includes(term));
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
    <div className="flex h-full w-70 shrink-0 flex-col overflow-hidden bg-card rounded">
      <div className="px-3 pt-4 pb-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-text-primary">Questions Bank</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-pink-300 px-2 py-0.5 text-[11px] font-medium text-white">
              {state.questions.length}
            </span>
            {onToggleSidebar && (
              <button onClick={onToggleSidebar} className="rounded p-1 text-text-muted hover:text-text-primary lg:hidden">
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
            className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-xs placeholder:text-text-muted focus:outline-none focus:border-border"
          />
        </div>
        <button
          onClick={() => addQuestion()}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-pink-200 dark:border-pink-400/30 bg-pink-50 dark:bg-pink-500/10 py-2 text-xs font-medium text-[#E91E63] hover:bg-pink-100 dark:hover:bg-pink-500/20"
        >
          + Add Question
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1" onDragOver={handleDragOver}>
        {visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">No matching questions.</p>
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
                      ? "border-pink-200 dark:border-pink-500/20 bg-pink-50/60 dark:bg-pink-500/10 border-l-[3px] border-l-[#E91E63] shadow-sm"
                      : "border-border bg-card hover:border-border hover:bg-card-hover"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("text-[11px] font-bold tabular-nums mt-0.5", active ? "text-[#E91E63]" : "text-text-muted")}>
                      {String(realIdx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("line-clamp-1 text-[13px] leading-tight", active ? "font-semibold text-text-primary" : "font-medium text-text-primary")}>
                        {(decodeHtml(q.title) || "Untitled question").slice(0, 48)}
                      </p>
                      <p className="truncate text-[11px] text-text-muted">
                        {(q.type === "single_choice" ? "MCQ" : q.type === "multiple_choice" ? "Multi" : q.type === "true_false" ? "T/F" : q.type === "match_following" ? "Match" : q.type.replace("_", " "))} · {q.difficulty} · {q.marks} marks
                      </p>
                    </div>
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", status === "complete" ? "bg-emerald-500" : status === "missing_answer" ? "bg-amber-400" : "bg-border")} />
                  </div>
                  <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateQuestion(q.id);
                      }}
                      className="rounded p-1 text-text-muted hover:bg-card-hover"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQuestion(q.id);
                      }}
                      className="rounded p-1 text-text-muted hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <span className="p-1 text-text-muted cursor-grab">
                      <GripVertical className="h-3 w-3" />
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-3 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAiGenerate}
            className="flex items-center justify-center gap-1 rounded-lg border border-pink-200 dark:border-pink-400/30 bg-card py-2 text-xs font-medium text-[#E91E63] hover:bg-pink-50 dark:hover:bg-pink-500/10"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Generate
          </button>
          <button
            onClick={onDownloadPdf}
            disabled={state.questions.length === 0}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-xs font-medium text-text-primary hover:bg-card-hover disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>
        </div>
        <button
          onClick={onSave}
          disabled={!hasChanges || saving}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-colors",
            hasChanges && !saving
              ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
              : "border-border bg-card text-text-muted cursor-not-allowed opacity-50"
          )}
        >
          {saving
            ? (saveProgress ? `Saving ${saveProgress.saved}/${saveProgress.total}…` : "Saving…")
            : "Save Changes"}
        </button>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-background p-2.5 text-xs text-text-secondary">
          <span className="mt-0.5">💡</span>
          <span>
            <span className="font-semibold">Tip:</span> {TIPS[tipIdx]}
          </span>
        </div>
      </div>
    </div>
  );
}
