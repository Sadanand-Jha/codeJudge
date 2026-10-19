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
import { cn } from "@/lib/helpers";
import { QuestionHtml } from "@/components/creator/questions/QuestionHtml";

export interface PreviewQuestion {
  id: string;
  type: "mcq" | "coding" | "true_false" | "fill" | "short" | "integer" | "long";
  title: string;
  content: string;
  questionHtml?: string;
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
  easy: "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
  medium: "border-[var(--qs-warn)] bg-[var(--qs-bg)] text-[var(--qs-warn)]",
  hard: "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]",
  expert: "border-[var(--qs-ink)] bg-[var(--qs-poly-2)] text-[var(--qs-ink)]",
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
    // Plain-text edits replace the HTML stem; keep the table markup only when
    // the creator did not touch the question text.
    const next =
      current && editDraft.title !== current.title
        ? { ...editDraft, questionHtml: undefined }
        : editDraft;
    onEditOne?.(next);
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
      className="qs-ui fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4"
      style={{ background: "rgba(26, 18, 64, 0.6)" }}
      onClick={isEditing ? undefined : onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[min(760px,calc(100dvh-2rem))] max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] font-sans shadow-[8px_8px_0_var(--qs-sun)]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5 sm:gap-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-extrabold text-[var(--qs-ink)] sm:text-base">
                {isEditing ? "Edit Question" : "AI Question Review"}
              </h3>
              <p className="hidden truncate text-[10px] text-[var(--qs-muted)] min-[480px]:block">
                {isEditing ? (
                  `Editing question ${index + 1} of ${total} · Esc to cancel`
                ) : (
                  <>Review each question before adding it to your quiz · ↑/↓ to navigate</>
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden shrink-0 items-center gap-1 whitespace-nowrap rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--qs-brand)] sm:flex">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              {total} generated
            </span>
            {onEditOne && current && !isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="b b-ghost sm shrink-0 whitespace-nowrap"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="b b-icon b-close b-ghost shrink-0"
              aria-label="Close preview"
              title="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full shrink-0 bg-[var(--qs-bg)]">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full rounded-r-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500"
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current?.id ?? "empty"}
              custom={direction}
              initial={{ opacity: 0, x: direction * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -48 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="max-h-full overflow-y-auto pb-1 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
            >
              {isEditing && editDraft ? (
                <QuestionEditForm draft={editDraft} onChange={updateDraft} />
              ) : !current ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles className="mb-3 h-12 w-12 text-[var(--qs-muted)] opacity-50" />
                  <p className="text-sm text-[var(--qs-muted)]">No questions to review.</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  {/* Question number + meta */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-[8px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2 py-0.5 text-[11px] font-extrabold text-[#1a1240]">
                      Question {index + 1}
                      <span className="ml-1 font-semibold opacity-70">of {total}</span>
                    </span>
                    <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-0.5 text-[10px] font-extrabold text-[var(--qs-muted)]">
                      {TYPE_LABELS[current.type] ?? current.type}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border-2 px-2.5 py-0.5 text-[10px] font-extrabold capitalize",
                        DIFFICULTY_STYLES[current.difficulty] ?? DIFFICULTY_STYLES.medium
                      )}
                    >
                      {current.difficulty}
                    </span>
                  </div>

                  {/* Question — HTML keeps tables and formatting intact */}
                  <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
                    <div className="min-w-0 overflow-x-auto">
                      {current.questionHtml ? (
                        <QuestionHtml
                          html={current.questionHtml}
                          className="text-[15px] leading-relaxed sm:text-base [&_table]:text-[12px]"
                        />
                      ) : (
                        <h4 className="text-[15px] font-semibold leading-relaxed text-[var(--qs-ink)] sm:text-base">
                          {current.title || current.content}
                        </h4>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  {optionsPreview && (
                    <div className="space-y-2.5">
                      {optionsPreview.map((opt) => (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-3 rounded-[14px] border-2 px-4 py-3 transition-colors ${
                            opt.isCorrect
                              ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)]"
                              : "border-[var(--qs-line)] bg-[var(--qs-bg)]"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] text-[10px] font-extrabold ${
                              opt.isCorrect ? "bg-[var(--qs-ok)] text-white" : "bg-[var(--qs-surface)] text-[var(--qs-muted)]"
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span
                            className={`min-w-0 flex-1 text-[13px] leading-relaxed ${
                              opt.isCorrect ? "font-semibold text-[var(--qs-ok)]" : "text-[var(--qs-muted)]"
                            }`}
                          >
                            {opt.content}
                          </span>
                          {opt.isCorrect && (
                            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--qs-okbg)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--qs-ok)]">
                              <Check className="h-3 w-3" />
                              Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Non-choice answer */}
                  {!optionsPreview && current.correctAnswer !== undefined && (
                    <div className="flex flex-wrap items-center gap-2 rounded-[14px] border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] px-4 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--qs-muted)]">
                        Correct Answer
                      </span>
                      <span className="rounded-[8px] border-2 border-[var(--qs-ok)] bg-[var(--qs-surface)] px-2.5 py-1 text-xs font-extrabold text-[var(--qs-ok)]">
                        {current.correctAnswer}
                      </span>
                    </div>
                  )}

                  {/* Explanation */}
                  {current.explanation && (
                    <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
                      <div className="flex items-start gap-2.5">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--qs-muted)]">
                            Explanation
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--qs-muted)]">
                            {current.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hint */}
                  {current.hint && (
                    <div className="rounded-[14px] border-2 border-dashed border-[var(--qs-brand)] bg-[var(--qs-poly-1)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--qs-brand)]">
                        Hint
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--qs-muted)]">
                        {current.hint}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {current.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)]" />
                      {current.tags.map((tag) => (
                        <span
                          key={tag}
                          className="whitespace-nowrap rounded-full border border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--qs-muted)]"
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

        {/* Footer — wraps as a whole (nav / actions) so buttons are never clipped or overlapped. */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3 sm:px-6 sm:py-4">
          {/* Navigation */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={isEditing || index <= 0}
              className="b sm shrink-0 whitespace-nowrap"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="shrink-0 px-1 text-[11px] tabular-nums text-[var(--qs-muted)]">
              {index + 1} / {total}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={isEditing || index >= total - 1}
              className="b sm shrink-0 whitespace-nowrap"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Accept / Reject */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-none sm:justify-end">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="b sm shrink-0 whitespace-nowrap"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="b b-pri sm shrink-0 whitespace-nowrap"
                >
                  <Save className="h-4 w-4" />
                  Save changes
                </button>
              </>
            ) : (
              <>
                {onAcceptOne && current && (
                  <button
                    type="button"
                    onClick={handleAcceptOne}
                    className="b sm shrink-0 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Add to problem list
                  </button>
                )}
                <button
                  type="button"
                  onClick={onReject}
                  className="b b-danger sm shrink-0 whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  Reject all
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  className="b b-pri sm shrink-0 whitespace-nowrap"
                >
                  <Check className="h-4 w-4 shrink-0" />
                  Accept all ({total})
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
    "w-full rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-xs font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:outline-none transition-colors";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-[var(--qs-muted)]";

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
              className="b b-text sm gap-1"
            >
              <Plus className="h-3 w-3" />
              Add option
            </button>
          </div>
          {(draft.options?.length ?? 0) === 0 ? (
            <p className="text-[11px] text-[var(--qs-muted)]">
              No options yet — click “Add Option” to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {draft.options?.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markCorrect(opt.id)}
                    aria-label="Mark as correct answer"
                    title="Mark as correct answer"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      opt.isCorrect
                        ? "border-[var(--qs-ok)] bg-[var(--qs-ok)] text-white"
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)]"
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
                    className="rounded-lg p-1.5 text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-badbg)] hover:text-[var(--qs-bad)] disabled:cursor-not-allowed disabled:opacity-30"
                    title="Remove option"
                    aria-label="Remove option"
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