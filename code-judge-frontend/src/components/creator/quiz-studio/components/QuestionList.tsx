"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Trash2, Search, GripVertical, X, Download, Plus } from "lucide-react";
import { cn } from "@/lib/helpers";
import { getQuestionStatus } from "@/components/quiz/creator/types";
import { useStudio } from "../StudioProvider";
import { AiGenerateButton } from "@/components/creator/common/AiGenerateButton";
import { toast } from "@/lib/toast";

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
  hasChanges = true,
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
  const { state, reorderQuestions, duplicateQuestion, removeQuestion, setActiveQuestion, addQuestion, questionsLoading } = useStudio();
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

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

  // Button-based reorder (mirrors the registration form arrows). Moves the
  // question relative to its visible neighbor, so it also behaves sensibly
  // while a search filter is active.
  const moveQuestion = (id: string, dir: -1 | 1) => {
    const visIdx = visible.findIndex((x) => x.id === id);
    const neighbor = visible[visIdx + dir];
    if (visIdx === -1 || !neighbor) return;
    const current = state.questions.map((q) => q.id);
    const from = current.indexOf(id);
    const to = current.indexOf(neighbor.id);
    if (from === -1 || to === -1) return;
    const reordered = Array.from(current);
    reordered.splice(from, 1);
    reordered.splice(to, 0, id);
    reorderQuestions(reordered);
  };

  return (
    <div className="flex h-[calc(100dvh-13rem)] max-h-full min-h-0 w-70 shrink-0 flex-col overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
      <div className="px-3 pt-4 pb-3 border-b-2 border-[var(--qs-line)] shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Questions Bank</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full border-2 border-[var(--qs-brand)]/30 bg-[var(--qs-poly-1)] px-2 py-0.5 text-[11px] font-extrabold text-[var(--qs-brand)]">
              {state.questions.length}
            </span>
            {onToggleSidebar && (
              <button type="button" onClick={onToggleSidebar} aria-label="Close question bank" title="Close question bank" className="b b-icon b-close b-ghost lg:hidden">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--qs-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="h-9 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-8 pr-3 text-xs font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
          />
        </div>
        <button
          type="button"
          onClick={() => addQuestion()}
          className="b b-ghost b-full sm mt-3"
        >
          <Plus className="h-3.5 w-3.5" /> Add question
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1" onDragOver={handleDragOver}>
        {questionsLoading && state.questions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-3 py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--qs-line)] border-t-[var(--qs-brand)]" />
            <p className="text-xs font-medium text-[var(--qs-muted)]">Loading questions…</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-3 py-6 text-center text-xs font-medium text-[var(--qs-muted)]">No matching questions.</p>
        ) : (
          <ul className="space-y-1">
            {visible.map((q, visIdx) => {
              const realIdx = state.questions.findIndex((x) => x.id === q.id);
              const active = state.activeQuestionId === q.id;
              const status = getQuestionStatus(q);
              return (
                <li
                  key={q.id}
                  onDrop={(e) => handleDrop(e, q.id)}
                  onClick={() => setActiveQuestion(q.id)}
                  className={cn(
                    "group relative flex h-[64px] cursor-pointer flex-col justify-center rounded-[14px] border-2 px-3 py-2 transition-colors",
                    active
                      ? "border-[var(--qs-ink)] bg-[var(--qs-poly-1)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      draggable
                      aria-label={`Reorder question ${realIdx + 1}`}
                      title="Drag to reorder"
                      onClick={(e) => e.stopPropagation()}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", q.id);
                        handleDragStart(q.id);
                      }}
                      onDragEnd={(e) => {
                        e.stopPropagation();
                        handleDragEnd();
                      }}
                      className="-ml-1 mt-0.5 flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded-[6px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-poly-2)] hover:text-[var(--qs-ink)] active:cursor-grabbing"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                    <span className={cn("text-[11px] font-extrabold tabular-nums mt-0.5", active ? "text-[var(--qs-brand)]" : "text-[var(--qs-muted)]")}>
                      {String(realIdx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("line-clamp-1 text-[13px] leading-tight font-bold", active ? "text-[var(--qs-ink)]" : "text-[var(--qs-ink)]")}>
                        {(decodeHtml(q.title) || "Untitled question").slice(0, 48)}
                      </p>
                      <p className="truncate text-[11px] font-medium text-[var(--qs-muted)]">
                        {(q.type === "single_choice" ? "MCQ" : q.type === "multiple_choice" ? "Multi" : q.type === "true_false" ? "T/F" : q.type === "match_following" ? "Match" : q.type.replace("_", " "))} · {q.difficulty} · {q.marks} marks
                      </p>
                    </div>
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", status === "complete" ? "bg-[var(--qs-ok)]" : status === "missing_answer" ? "bg-[#a85d00]" : "bg-[var(--qs-line)]")} />
                  </div>
                  <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-0.5 shadow-[2px_2px_0_var(--qs-sun)]">
                    <button
                      type="button"
                      title="Move up"
                      aria-label="Move up"
                      disabled={visIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveQuestion(q.id, -1);
                      }}
                      className="rounded-[6px] p-1 text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-poly-1)] hover:text-[var(--qs-ink)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      aria-label="Move down"
                      disabled={visIdx === visible.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveQuestion(q.id, 1);
                      }}
                      className="rounded-[6px] p-1 text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-poly-1)] hover:text-[var(--qs-ink)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Duplicate question"
                      aria-label="Duplicate question"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateQuestion(q.id);
                      }}
                      className="rounded-[6px] p-1 text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-poly-1)] hover:text-[var(--qs-ink)]"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Delete question"
                      aria-label="Delete question"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQuestion(q.id);
                      }}
                      className="rounded-[6px] p-1 text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-badbg)] hover:text-[var(--qs-bad)]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t-2 border-[var(--qs-line)] p-3 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <AiGenerateButton
            size="sm"
            label="AI Generate"
            onClick={onAiGenerate}
            className="w-full py-2"
          />
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={state.questions.length === 0}
            className="b b-full sm"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!hasChanges) {
              toast.info({ title: "Nothing to save", description: "You're already up to date." });
              return;
            }
            onSave?.();
          }}
          disabled={saving}
          aria-disabled={!hasChanges || undefined}
          aria-busy={saving || undefined}
          title={!hasChanges && !saving ? "Nothing to save" : undefined}
          className="b b-pri b-full sm mt-2"
        >
          {saving
            ? (saveProgress ? `Saving ${saveProgress.saved}/${saveProgress.total}…` : "Saving…")
            : hasChanges
              ? "Save changes"
              : "Nothing to save"}
        </button>
      </div>
    </div>
  );
}
