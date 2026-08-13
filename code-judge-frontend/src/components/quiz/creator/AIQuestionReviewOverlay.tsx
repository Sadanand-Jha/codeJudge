"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Minus,
  Pencil,
  Save,
  X,
  Lightbulb,
  Tag,
  CheckCircle2,
  Trash2,
} from "lucide-react";

export interface PreviewQuestion {
  id: string;
  type: "mcq" | "coding" | "true_false" | "fill" | "short" | "integer" | "long";
  title: string;
  content: string;
  options?: { id: string; content: string; isCorrect: boolean }[];
  correctAnswer?: string | number;
  explanation?: string;
  hint?: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  tags: string[];
}

interface AIQuestionReviewOverlayProps {
  open: boolean;
  questions: PreviewQuestion[];
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  onAcceptOne?: (question: PreviewQuestion) => void;
  onEditOne?: (question: PreviewQuestion) => void;
}

const QUESTION_TYPE_IDS = [
  "mcq",
  "coding",
  "true_false",
  "fill",
  "short",
  "integer",
  "long",
] as const;

const DIFFICULTY_IDS = ["easy", "medium", "hard", "expert"] as const;

const TYPE_LABELS: Record<PreviewQuestion["type"], string> = {
  mcq: "MCQ",
  coding: "Coding",
  true_false: "True/False",
  fill: "Fill Blank",
  integer: "Integer",
  short: "Short Answer",
  long: "Long Answer",
};

const DIFFICULTY_STYLES: Record<PreviewQuestion["difficulty"], string> = {
  easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  hard: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  expert: "border-red-500/30 bg-red-500/10 text-red-500",
};

/**
 * Full-screen AI review overlay. Walks through each generated question with
 * Previous/Next navigation (disabled at the ends) and overall Accept/Reject.
 * Keyboard: ↑/← previous, ↓/→ next, Esc dismisses.
 */
export default function AIQuestionReviewOverlay({
  open,
  questions,
  onClose,
  onAccept,
  onReject,
  onAcceptOne,
  onEditOne,
}: AIQuestionReviewOverlayProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<PreviewQuestion | null>(null);

  const total = questions.length;
  const current = questions[Math.min(Math.max(index, 0), Math.max(total - 1, 0))];

  const goPrev = useCallback(() => {
    setIndex((i) => {
      if (i <= 0) return i;
      setDirection(-1);
      return i - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) return i;
      setDirection(1);
      return i + 1;
    });
  }, [total]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (isEditing) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsEditing(false);
          setEditDraft(null);
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    },
    [open, goPrev, goNext, onClose, isEditing]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;

  const optionsPreview = useMemo(() => {
    if (!current || !current.options) return null;
    return current.options.map((opt, i) => {
      const label = String.fromCharCode(65 + i);
      return { ...opt, label };
    });
  }, [current]);

  const handleAcceptOne = () => {
    if (!current || !onAcceptOne) return;
    onAcceptOne(current);
    if (total <= 1) {
      onClose();
    }
  };

  const startEditing = () => {
    if (!current || !onEditOne) return;
    setEditDraft({
      ...current,
      options: current.options?.map((o) => ({ ...o })),
      tags: [...current.tags],
    });
    setIsEditing(true);
  };

  const updateDraft = (patch: Partial<PreviewQuestion>) => {
    setEditDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditDraft(null);
  };

  const saveEdit = () => {
    if (!editDraft) return;
    onEditOne?.(editDraft);
    setIsEditing(false);
    setEditDraft(null);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={isEditing ? undefined : onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[80vh] max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#8B5CF6] shadow-[0_4px_16px_rgba(236,72,153,0.4)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                {isEditing ? "Edit Question" : "AI Question Review"}
              </h3>
              <p className="text-[10px] text-text-muted">
                {isEditing
                  ? `Editing question ${index + 1} of ${total} · Enter to navigate away, Esc to cancel`
                  : "Review each question before adding it to your quiz · ↑/↓ to navigate"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent sm:flex">
              <CheckCircle2 className="h-3 w-3" />
              {total} generated
            </span>
            {onEditOne && current && !isEditing && (
              <button
                onClick={startEditing}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 text-[11px] font-bold text-accent transition-colors hover:bg-accent/20"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full shrink-0 bg-card-hover">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6]"
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden px-6 py-5">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current?.id ?? "empty"}
              custom={direction}
              initial={{ opacity: 0, x: direction * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -48 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="max-h-full overflow-y-auto pb-1"
            >
              {isEditing && editDraft ? (
                <QuestionEditForm draft={editDraft} onChange={updateDraft} />
              ) : !current ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles className="mb-3 h-12 w-12 text-text-muted opacity-50" />
                  <p className="text-sm text-text-muted">No questions to review.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Question number + meta */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-text-primary">
                      Question {index + 1}{" "}
                      <span className="font-medium text-text-muted">of {total}</span>
                    </span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                      {TYPE_LABELS[current.type] ?? current.type}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${
                        DIFFICULTY_STYLES[current.difficulty] ?? DIFFICULTY_STYLES.medium
                      }`}
                    >
                      {current.difficulty}
                    </span>
                  </div>

                  {/* Question */}
                  <h4 className="text-base font-semibold leading-relaxed text-text-primary">
                    {current.title || current.content}
                  </h4>

                  {/* Options */}
                  {optionsPreview && (
                    <div className="space-y-2.5">
                      {optionsPreview.map((opt) => (
                        <div
                          key={opt.id}
                          className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                            opt.isCorrect
                              ? "border-success/40 bg-success/10"
                              : "border-border bg-card-hover/40"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              opt.isCorrect ? "bg-success text-white" : "bg-card text-text-muted"
                            }`}
                          >
                            {opt.isCorrect ? <Check className="h-3 w-3" /> : opt.label}
                          </span>
                          <span
                            className={`text-xs leading-relaxed ${
                              opt.isCorrect ? "font-semibold text-success" : "text-text-secondary"
                            }`}
                          >
                            {opt.content}
                          </span>
                          {opt.isCorrect && (
                            <span className="ml-auto shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success">
                              Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Non-choice answer */}
                  {!optionsPreview && current.correctAnswer !== undefined && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-success/25 bg-success/[0.06] px-4 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        Correct Answer
                      </span>
                      <span className="rounded-lg bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
                        {current.correctAnswer}
                      </span>
                    </div>
                  )}

                  {/* Explanation */}
                  {current.explanation && (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start gap-2.5">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                            Explanation
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                            {current.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hint */}
                  {current.hint && (
                    <div className="rounded-xl border border-dashed border-accent/30 bg-accent/5 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                        Hint
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                        {current.hint}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {current.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-text-muted" />
                      {current.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-card-hover px-2.5 py-0.5 text-[10px] font-medium text-text-secondary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-card/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={isEditing || index <= 0}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text-primary transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="px-1 text-[11px] text-text-muted">
              {index + 1} / {total}
            </span>
            <button
              onClick={goNext}
              disabled={isEditing || index >= total - 1}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text-primary transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Accept / Reject */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-bold text-text-primary transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.4)] transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </>
            ) : (
              <>
                {onAcceptOne && current && (
                  <button
                    onClick={handleAcceptOne}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-4 text-xs font-bold text-accent transition-colors hover:bg-accent/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add to Problem List
                  </button>
                )}
                <button
                  onClick={onReject}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-4 text-xs font-bold text-danger transition-colors hover:bg-danger/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Reject All
                </button>
                <button
                  onClick={onAccept}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.4)] transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  <Check className="h-4 w-4" />
                  Accept All ({total})
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Inline edit form for a single question
   ───────────────────────────────────────── */
function QuestionEditForm({
  draft,
  onChange,
}: {
  draft: PreviewQuestion;
  onChange: (patch: Partial<PreviewQuestion>) => void;
}) {
  const [tagsText, setTagsText] = useState(draft.tags.join(", "));

  const syncTags = (value: string) => {
    setTagsText(value);
    onChange({
      tags: value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  const hasOptions = (draft.options?.length ?? 0) > 0;
  const showOptionsEditor = hasOptions || draft.type === "mcq" || draft.type === "true_false";

  const updateOption = (id: string, patch: Partial<{ content: string; isCorrect: boolean }>) => {
    onChange({
      options: draft.options?.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  };

  const markCorrect = (id: string) => {
    onChange({
      options: draft.options?.map((o) => ({ ...o, isCorrect: o.id === id })),
    });
  };

  const addOption = () => {
    const options = draft.options ?? [];
    onChange({
      options: [
        ...options,
        {
          id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          content: "",
          isCorrect: options.length === 0,
        },
      ],
    });
  };

  const removeOption = (id: string) => {
    onChange({
      options: (draft.options ?? []).filter((o) => o.id !== id),
    });
  };

  const inputCls =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-text-muted";

  return (
    <div className="space-y-5">
      {/* Meta */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelCls}>Question Type</label>
          <select
            value={draft.type}
            onChange={(e) => onChange({ type: e.target.value as PreviewQuestion["type"] })}
            className={inputCls}
          >
            {QUESTION_TYPE_IDS.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Difficulty</label>
          <select
            value={draft.difficulty}
            onChange={(e) => onChange({ difficulty: e.target.value as PreviewQuestion["difficulty"] })}
            className={inputCls}
          >
            {DIFFICULTY_IDS.map((d) => (
              <option key={d} value={d} className="capitalize">
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className={labelCls}>Title</label>
        <input
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Question title"
          className={inputCls}
        />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <label className={labelCls}>Question</label>
        <textarea
          value={draft.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Question statement"
          rows={4}
          className={`${inputCls} resize-y`}
        />
      </div>

      {/* Options */}
      {showOptionsEditor && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={labelCls}>Options</label>
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent transition-colors hover:bg-accent/20"
            >
              <Plus className="h-3 w-3" />
              Add Option
            </button>
          </div>
          {(draft.options?.length ?? 0) === 0 ? (
            <p className="text-[11px] text-text-muted">
              No options yet — click “Add Option” to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {draft.options?.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markCorrect(opt.id)}
                    title="Mark as correct answer"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      opt.isCorrect
                        ? "border-success bg-success text-white"
                        : "border-border bg-card text-text-muted hover:border-accent"
                    }`}
                  >
                    {opt.isCorrect ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + i)}
                  </button>
                  <input
                    value={opt.content}
                    onChange={(e) => updateOption(opt.id, { content: e.target.value })}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(opt.id)}
                    disabled={(draft.options?.length ?? 0) <= 1}
                    className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                    title="Remove option"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Non-choice correct answer */}
      {!showOptionsEditor && (
        <div className="space-y-1.5">
          <label className={labelCls}>Correct Answer</label>
          <input
            value={String(draft.correctAnswer ?? "")}
            onChange={(e) => onChange({ correctAnswer: e.target.value })}
            placeholder="Correct answer"
            className={inputCls}
          />
        </div>
      )}

      {/* Explanation */}
      <div className="space-y-1.5">
        <label className={labelCls}>Explanation</label>
        <textarea
          value={draft.explanation ?? ""}
          onChange={(e) => onChange({ explanation: e.target.value })}
          placeholder="Explain why this answer is correct"
          rows={3}
          className={`${inputCls} resize-y`}
        />
      </div>

      {/* Hint */}
      <div className="space-y-1.5">
        <label className={labelCls}>Hint</label>
        <input
          value={draft.hint ?? ""}
          onChange={(e) => onChange({ hint: e.target.value })}
          placeholder="Optional hint"
          className={inputCls}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className={labelCls}>Tags</label>
        <input
          value={tagsText}
          onChange={(e) => syncTags(e.target.value)}
          placeholder="comma, separated, tags"
          className={inputCls}
        />
      </div>
    </div>
  );
}