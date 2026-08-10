"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  ListChecks,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useQuizProblemsStore } from "@/store/quizProblemsStore";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_ORDER,
  getQuestionStatus,
  type CreatorOption,
  type CreatorQuestion,
  type CreatorQuestionType,
} from "@/components/quiz/creator/types";
import { useQuizSettings } from "@/components/quiz/creator/settings/QuizSettingsContext";
import { syncQuizQuestions } from "@/utils/quizQuestionSync";
import ProblemDeleteModal from "@/components/quiz/creator/settings/ProblemDeleteModal";
import {
  computeQuestionsSignature,
  getSyncedSignature,
  setSyncedSignature,
} from "@/utils/quizStorage";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/helpers";

const DIFFICULTY_BADGE: Record<CreatorQuestion["difficulty"], string> = {
  Easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  Hard: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  Expert: "border-red-500/30 bg-red-500/10 text-red-500",
};

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"] as const;

const inputCls =
  "w-full rounded-xl border border-border bg-card-hover/40 px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10 transition-colors";
const fieldLabelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-muted";

function isChoiceType(q: CreatorQuestion): boolean {
  return q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false";
}

function clone(q: CreatorQuestion): CreatorQuestion {
  return JSON.parse(JSON.stringify(q)) as CreatorQuestion;
}

function formatAnswer(q: CreatorQuestion): string {
  if (isChoiceType(q)) {
    const labels = q.options
      .filter((o) => o.isCorrect)
      .map((o) => o.label)
      .filter(Boolean);
    if (labels.length > 0) return labels.join(", ");
    if (q.correctAnswer != null && q.correctAnswer !== -1) return String(q.correctAnswer);
    return "—";
  }
  if (Array.isArray(q.correctAnswer)) {
    const vals = q.correctAnswer.map((v) => String(v)).filter(Boolean);
    return vals.length ? vals.join(", ") : "—";
  }
  const v = String(q.correctAnswer ?? "").trim();
  return v || "—";
}

function QuestionCard({
  q,
  index,
  autoEdit = false,
}: {
  q: CreatorQuestion;
  index: number;
  autoEdit?: boolean;
}) {
  const updateProblem = useQuizProblemsStore((s) => s.updateProblem);
  const [editing, setEditing] = useState<boolean>(autoEdit);
  const [draft, setDraft] = useState<CreatorQuestion | null>(autoEdit ? clone(q) : null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = editing && draft ? draft : q;
  const status = getQuestionStatus(q);
  const isChoice = isChoiceType(active);
  const isMulti = active.type === "multiple_choice";

  const startEdit = () => {
    setDraft(clone(q));
    setEditing(true);
  };
  const cancelEdit = () => {
    setDraft(null);
    setEditing(false);
  };
  const saveEdit = () => {
    if (draft) updateProblem(draft.id, { ...draft });
    setDraft(null);
    setEditing(false);
  };

  const updateDraft = (patch: Partial<CreatorQuestion>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const updateOptContent = (i: number, content: string) => {
    setDraft((d) =>
      d ? { ...d, options: d.options.map((o, idx) => (idx === i ? { ...o, content } : o)) } : d
    );
  };

  const toggleOptCorrect = (i: number) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            options: d.options.map((o, idx) => ({
              ...o,
              isCorrect: isMulti ? (idx === i ? !o.isCorrect : o.isCorrect) : idx === i,
            })),
          }
        : d
    );
  };

  const addOption = () => {
    setDraft((d) => {
      if (!d || d.options.length >= 8) return d;
      const next: CreatorOption = {
        id: `opt_${Date.now()}`,
        label: String.fromCharCode(65 + d.options.length),
        content: "",
        isCorrect: false,
      };
      return { ...d, options: [...d.options, next] };
    });
  };

  const removeOption = (i: number) => {
    setDraft((d) =>
      d && d.options.length > 2 ? { ...d, options: d.options.filter((_, idx) => idx !== i) } : d
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      updateDraft({ images: [...draft.images, { id: `img_${Date.now()}`, url }] });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeImage = (imgId: string) => {
    if (draft) updateDraft({ images: draft.images.filter((img) => img.id !== imgId) });
  };

  // ===== Inline edit mode =====
  if (editing && draft) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden rounded-2xl border-2 border-pink-500/40 bg-card shadow-[0_8px_30px_rgba(236,72,153,0.08)] ring-2 ring-pink-500/15"
      >
        {/* Edit header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-card-hover/40 px-5 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#7C3AED] text-[11px] font-bold text-white">
            {index + 1}
          </span>
          <span className="text-sm font-bold text-text-primary">Editing Question {index + 1}</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={saveEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_2px_12px_rgba(236,72,153,0.3)] transition-all hover:brightness-105 active:scale-[0.97]"
            >
              <Check className="h-3.5 w-3.5" /> Save
            </button>
            <button
              onClick={cancelEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>

        {/* Edit body */}
        <div className="space-y-5 px-5 py-4">
          {/* Title */}
          <div>
            <label className={fieldLabelCls}>Question</label>
            <textarea
              rows={2}
              value={draft.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
              className={inputCls}
              placeholder="Write your question here..."
            />
          </div>

          {/* Type + marks + time */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={fieldLabelCls}>Type</label>
              <select
                value={draft.type}
                onChange={(e) => updateDraft({ type: e.target.value as CreatorQuestionType })}
                className={inputCls}
              >
                {QUESTION_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabelCls}>Marks</label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  type="number"
                  min={0}
                  value={draft.marks}
                  onChange={(e) => updateDraft({ marks: Number(e.target.value) || 0 })}
                  className={cn(inputCls, "pl-9")}
                />
              </div>
            </div>
            <div>
              <label className={fieldLabelCls}>Time (min)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  type="number"
                  min={0}
                  value={draft.expectedTime}
                  onChange={(e) => updateDraft({ expectedTime: Number(e.target.value) || 0 })}
                  className={cn(inputCls, "pl-9")}
                />
              </div>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className={fieldLabelCls}>Difficulty</label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((level) => {
                const isActive = draft.difficulty === level;
                return (
                  <button
                    key={level}
                    onClick={() => updateDraft({ difficulty: level })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] font-semibold transition-all",
                      isActive
                        ? DIFFICULTY_BADGE[level]
                        : "border-border bg-card-hover/40 text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options / correct answer */}
          {isChoice ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className={fieldLabelCls}>Options</label>
                <span className="text-[10px] text-text-muted">
                  {isMulti ? "Select all correct" : "Tap the circle to mark the correct option"}
                </span>
              </div>
              <div className="space-y-2">
                {draft.options.map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <button
                      onClick={() => toggleOptCorrect(i)}
                      title="Mark correct"
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold transition-colors",
                        opt.isCorrect
                          ? "bg-emerald-500 text-white"
                          : "border border-border bg-card text-text-muted hover:border-emerald-500/50"
                      )}
                    >
                      {opt.isCorrect ? <Check className="h-3.5 w-3.5" /> : OPTION_LABELS[i] ?? i + 1}
                    </button>
                    <input
                      value={opt.content}
                      onChange={(e) => updateOptContent(i, e.target.value)}
                      className={inputCls}
                      placeholder={`Option ${OPTION_LABELS[i] ?? i + 1}`}
                    />
                    <button
                      onClick={() => removeOption(i)}
                      disabled={draft.options.length <= 2}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                      title="Remove option"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addOption}
                  disabled={draft.options.length >= 8}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-[11px] font-semibold text-text-secondary transition-colors hover:border-pink-500/40 hover:text-pink-500 disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" /> Add option
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className={fieldLabelCls}>Correct Answer</label>
              {draft.type === "integer" ? (
                <input
                  type="number"
                  value={String(draft.correctAnswer ?? "")}
                  onChange={(e) =>
                    updateDraft({
                      correctAnswer: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                  placeholder="Enter the integer answer"
                />
              ) : (
                <textarea
                  rows={2}
                  value={String(draft.correctAnswer ?? "")}
                  onChange={(e) => updateDraft({ correctAnswer: e.target.value })}
                  className={inputCls}
                  placeholder="Enter the correct answer"
                />
              )}
            </div>
          )}

          {/* Images */}
          {draft.images.length > 0 && (
            <div>
              <label className={fieldLabelCls}>Images</label>
              <div className="flex flex-wrap gap-3">
                {draft.images.map((img) => (
                  <div key={img.id} className="relative">
                    <img
                      src={img.url}
                      alt={img.caption || ""}
                      className="h-24 rounded-xl border border-border object-contain"
                    />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white shadow-lg transition-transform hover:scale-110"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-[11px] font-semibold text-text-secondary transition-colors hover:border-pink-500/40 hover:text-pink-500"
            >
              <ImageIcon className="h-3 w-3" /> Add image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Explanation + hint */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabelCls}>Explanation</label>
              <textarea
                rows={3}
                value={draft.explanation}
                onChange={(e) => updateDraft({ explanation: e.target.value })}
                className={inputCls}
                placeholder="Explain the reasoning (shown to students after submission)"
              />
            </div>
            <div>
              <label className={fieldLabelCls}>Hint</label>
              <textarea
                rows={3}
                value={draft.hint}
                onChange={(e) => updateDraft({ hint: e.target.value })}
                className={inputCls}
                placeholder="Optional hint for students"
              />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ===== Read-only preview mode =====
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200"
      >
      {/* Card header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-card-hover/40 px-5 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#7C3AED] text-[11px] font-bold text-white">
          {index + 1}
        </span>
        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-semibold text-text-secondary">
          {QUESTION_TYPE_LABELS[q.type] || q.type.replace("_", " ")}
        </span>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize",
            DIFFICULTY_BADGE[q.difficulty]
          )}
        >
          {q.difficulty}
        </span>
        {q.marks > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold text-violet-500">
            <Target className="h-3 w-3" /> {q.marks} mark{q.marks !== 1 ? "s" : ""}
          </span>
        )}
        {status !== "complete" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            {status === "missing_answer" ? "Needs answer" : "Draft"}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={startEdit}
            title="Edit question"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-pink-500/10 hover:text-pink-500"
          >
            <PencilLine className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete question"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Question body */}
      <div className="px-5 py-4">
        <p className="text-sm font-semibold leading-relaxed text-text-primary">
          {q.title.trim() || `Question ${index + 1}`}
        </p>

        {q.images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {q.images.map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt={img.caption || ""}
                className="max-h-40 rounded-xl border border-border object-contain"
              />
            ))}
          </div>
        )}

        {/* Options — correct ones highlighted */}
        {isChoiceType(q) ? (
          <div className="mt-4 space-y-2">
            {q.options.length === 0 && (
              <p className="text-xs text-text-muted">No options configured.</p>
            )}
            {q.options.map((opt, i) => (
              <div
                key={opt.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3",
                  opt.isCorrect
                    ? "border-emerald-500/40 bg-emerald-500/[0.08]"
                    : "border-border bg-card-hover/40"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    opt.isCorrect ? "bg-emerald-500 text-white" : "bg-card text-text-muted"
                  )}
                >
                  {opt.isCorrect ? <Check className="h-3 w-3" /> : OPTION_LABELS[i] ?? String(i + 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-xs leading-relaxed",
                      opt.isCorrect ? "font-semibold text-emerald-500" : "text-text-secondary"
                    )}
                  >
                    {opt.content.trim() || opt.label || `Option ${i + 1}`}
                  </span>
                </span>
                {opt.isCorrect && (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                    Correct
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Correct Answer
            </span>
            <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-500">
              {formatAnswer(q)}
            </span>
          </div>
        )}

        {/* Explanation */}
        {q.explanation.trim() && (
          <div className="mt-4 rounded-xl border border-border bg-card-hover/40 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Explanation
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{q.explanation}</p>
          </div>
        )}
      </div>
    </motion.div>

      <ProblemDeleteModal
        question={confirmDelete ? q : null}
        index={index}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

export default function QuizProblemsPreview({ focusId }: { focusId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { quizId, code, isLive, isEnded } = useQuizSettings();
  const problems = useQuizProblemsStore((s) => s.problems);
  const activeProblemId = useQuizProblemsStore((s) => s.activeProblemId);
  const hydrate = useQuizProblemsStore((s) => s.hydrate);
  const addProblem = useQuizProblemsStore((s) => s.addProblem);
  const deleteAllProblems = useQuizProblemsStore((s) => s.deleteAllProblems);
  const [syncing, setSyncing] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const problemsBase = pathname.replace(/\/problems(\/.*)?$/, "/problems");

  const shownIndex = problems.findIndex((p) => p.id === (focusId || activeProblemId));
  const safeIndex = shownIndex >= 0 ? shownIndex : 0;
  const current = problems[safeIndex];
  const total = problems.length;
  const complete = problems.filter((q) => getQuestionStatus(q) === "complete").length;
  const totalMarks = problems.reduce((sum, q) => sum + (q.marks || 0), 0);

  const currentSig = computeQuestionsSignature(problems);
  const savedSig = code ? getSyncedSignature(code) : null;
  const isSynced = total > 0 && currentSig === savedSig;
  const lockSync = Boolean(isLive || isEnded);

  const handleAdd = () => {
    const id = addProblem();
    router.push(`${problemsBase}/${id}`);
  };

  const handleSyncQuestions = async () => {    if (!quizId) {
      toast.error({
        title: "Quiz not saved yet",
        description: "Save the quiz draft first, then save your questions.",
      });
      return;
    }
    if (syncing) return;
    setSyncing(true);
    try {
      await syncQuizQuestions(String(quizId), problems);
      setSyncedSignature(code, currentSig);
      toast.success({
        title: "Questions saved",
        description: `All ${problems.length} questions are saved to the server.`,
      });
    } catch (err) {
      console.error("Failed to sync questions:", err);
      toast.error({
        title: "Could not save questions",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteAll = () => {
    if (total === 0) return;
    deleteAllProblems();
    setConfirmDeleteAll(false);
    setSyncedSignature(code, "");
    toast.success("All questions deleted");
  };

  if (total === 0) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500">
            <ListChecks className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-text-primary">No questions yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-secondary">
            Questions you add will appear here with their correct answers highlighted for review.
          </p>
          <button
            onClick={handleAdd}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.25)] transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" /> Add Question
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8 lg:px-8">
      {/* Questions header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Test Questions</h2>
            <p className="text-xs text-text-secondary">
              {total} question{total !== 1 ? "s" : ""} · {totalMarks} total mark
              {totalMarks !== 1 ? "s" : ""} · correct answers highlighted
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isSynced ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-500">
              <CheckCircle2 className="h-3 w-3" /> Saved to server
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-500">
              <AlertTriangle className="h-3 w-3" /> Not saved to server
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold",
              complete === total
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-amber-500/30 bg-amber-500/10 text-amber-500"
            )}
          >
            <Sparkles className="h-3 w-3" />
            {complete}/{total} ready
          </span>
          <button
            onClick={() => setConfirmDeleteAll(true)}
            disabled={total === 0 || lockSync}
            title={lockSync ? "Editing is locked while the quiz is live or ended." : "Delete all questions"}
            className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-1.5 text-[11px] font-bold text-danger transition-all hover:bg-danger/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete All
          </button>
          <button
            onClick={handleSyncQuestions}
            disabled={syncing || isSynced || lockSync}
            title={lockSync ? "Editing is locked while the quiz is live or ended." : isSynced ? "All questions are saved to the server." : "Save all questions to the server"}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-[0_2px_12px_rgba(236,72,153,0.25)] transition-all hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isSynced ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {syncing ? "Saving..." : isSynced ? "Saved" : "Save to Server"}
          </button>
        </div>
      </div>

      {/* Delete All confirmation */}
      <AnimatePresence>
        {confirmDeleteAll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setConfirmDeleteAll(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Delete all questions?</h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    This will remove all {total} question{total !== 1 ? "s" : ""} from the quiz. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmDeleteAll(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-danger to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-[0_4px_16px_rgba(239,68,68,0.35)] transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-xs font-semibold text-text-secondary">
        Question {safeIndex + 1} <span className="text-text-muted">of {total}</span>
      </p>

      {current && (
        <QuestionCard
          key={current.id}
          q={current}
          index={safeIndex}
          autoEdit={Boolean(focusId) && getQuestionStatus(current) === "draft"}
        />
      )}
    </div>
  );
}
