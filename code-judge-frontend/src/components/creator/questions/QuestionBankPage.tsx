"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Database,
  FilePlus2,
  Gauge,
  HelpCircle,
  Lightbulb,
  ListPlus,
  MoreHorizontal,
  PenLine,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { useData } from "@/lib/hooks/useData";
import { getMyQuestionBank, type UserBankQuestion } from "@/services/ai";
import { QuestionHtml, htmlToEditableText } from "@/components/creator/questions/QuestionHtml";

type QuestionType = "single" | "multiple" | "integer" | "true-false" | "subjective";
type QuestionDifficulty = "easy" | "medium" | "hard" | "unrated";
type RowAction = "edit" | "test" | "quiz" | "duplicate" | "delete";

interface BankOption {
  text: string;
  isCorrect: boolean;
}

interface BankQuestion {
  id: string;
  text: string;
  html: string | null;
  subject: string;
  chapter: string | null;
  topic: string | null;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  tags: string[];
  usedIn: number;
  updated: string;
  options: BankOption[];
  answers: string[];
  explanation: string | null;
  hint: string | null;
  source: string;
}

const TYPE_LABEL: Record<QuestionType, string> = {
  single: "Single choice",
  multiple: "Multiple choice",
  integer: "Integer",
  "true-false": "True / false",
  subjective: "Subjective",
};

const TYPE_FILTERS: Array<{ id: "all" | QuestionType; label: string }> = [
  { id: "all", label: "All" },
  { id: "single", label: "Single Choice" },
  { id: "multiple", label: "Multiple Choice" },
  { id: "integer", label: "Integer" },
  { id: "true-false", label: "True-False" },
  { id: "subjective", label: "Subjective" },
];

const DIFFICULTIES: Array<{ id: QuestionDifficulty; label: string }> = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

const ROW_ACTIONS: Array<{ id: RowAction; label: string; icon: LucideIcon; danger?: boolean }> = [
  { id: "edit", label: "Edit question", icon: PenLine },
  { id: "test", label: "Add to Test", icon: FilePlus2 },
  { id: "quiz", label: "Add to Quiz", icon: ListPlus },
  { id: "duplicate", label: "Duplicate", icon: Copy },
  { id: "delete", label: "Delete", icon: Trash2, danger: true },
];

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-0.5";

const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-sm font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";

function mapQuestionType(raw: string | null): QuestionType {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("multi")) return "multiple";
  if (value.includes("true") || value.includes("false") || value.includes("boolean")) return "true-false";
  if (value.includes("integer") || value.includes("numeric") || value.includes("number")) return "integer";
  if (value.includes("subjective") || value.includes("descriptive") || value.includes("text")) return "subjective";
  return "single";
}

function mapDifficulty(raw: string | null): QuestionDifficulty {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("easy")) return "easy";
  if (value.includes("medium") || value.includes("moderate")) return "medium";
  if (value.includes("hard") || value.includes("difficult")) return "hard";
  return "unrated";
}

function formatUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function mapBankQuestion(question: UserBankQuestion): BankQuestion {
  const tags = Array.from(new Set([question.topic, question.chapter].filter(Boolean) as string[]));
  return {
    id: `ai-bank-${question.id}`,
    text: question.question_text,
    html: question.question_html,
    subject: question.subject,
    chapter: question.chapter,
    topic: question.topic,
    type: mapQuestionType(question.question_type),
    difficulty: mapDifficulty(question.difficulty),
    tags,
    usedIn: question.quiz_id ? 1 : 0,
    updated: formatUpdated(question.created_at),
    options: (question.options ?? []).map((option) => ({
      text: option.text,
      isCorrect: Boolean(option.isCorrect),
    })),
    answers: question.answers ?? [],
    explanation: question.explanation,
    hint: question.hint,
    source: question.source,
  };
}

function DifficultyPill({ difficulty }: { difficulty: QuestionDifficulty }) {
  const meta: Record<QuestionDifficulty, { label: string; className: string }> = {
    easy: { label: "Easy", className: "text-[var(--qs-ok)]" },
    medium: { label: "Medium", className: "text-[var(--qs-warn)]" },
    hard: { label: "Hard", className: "text-[var(--qs-brand)]" },
    unrated: { label: "Unrated", className: "text-[var(--qs-muted)]" },
  };
  const value = meta[difficulty];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-poly-0)] px-2.5 py-0.5 text-[11px] font-extrabold",
        value.className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value.label}
    </span>
  );
}

function RowActionMenu({ onAction }: { onAction: (action: RowAction) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Question actions"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-[9px] border-2 border-transparent text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-line)] hover:bg-[var(--qs-poly-1)] hover:text-[var(--qs-ink)]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-30 mt-1 w-44 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1 shadow-[3px_3px_0_var(--qs-sun)]"
          >
            {ROW_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  onAction(action.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] font-bold transition-colors",
                  action.danger
                    ? "text-[var(--qs-bad)] hover:bg-[var(--qs-badbg)]"
                    : "text-[var(--qs-ink)] hover:bg-[var(--qs-poly-1)]"
                )}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuestionPreviewDrawer({
  question,
  onClose,
  onCopy,
  onDuplicate,
  onDelete,
  onAddToQuiz,
}: {
  question: BankQuestion;
  onClose: () => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddToQuiz: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const answerFallback = question.answers.length ? question.answers.join(", ") : "No answer stored";

  return (
    <motion.div
      className="fixed inset-0 z-[90]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className="absolute inset-0 bg-[#1a1240]/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Question preview"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[-8px_0_0_rgba(26,18,64,0.12)]"
      >
        <div className="flex items-start justify-between gap-3 border-b-2 border-[var(--qs-line)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-muted)]">
              Question preview
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-block rounded-[6px] bg-[var(--qs-poly-1)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-ink)]">
                {question.subject}
              </span>
              <DifficultyPill difficulty={question.difficulty} />
              <span className="rounded-[6px] border-2 border-[var(--qs-line)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-muted)]">
                {TYPE_LABEL[question.type]}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close question preview"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="hide-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-0)] p-4">
            {question.html ? (
              <QuestionHtml html={question.html} className="text-[15px]" />
            ) : (
              <p className="text-[15px] font-medium leading-relaxed text-[var(--qs-ink)]">{question.text}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
              {question.options.length ? "Options" : "Answer"}
            </p>
            {question.options.length ? (
              question.options.map((option, index) => (
                <div
                  key={`${option.text}-${index}`}
                  className={cn(
                    "flex items-start gap-3 rounded-[12px] border-2 p-3",
                    option.isCorrect
                      ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-[6px] border-2 text-[11px] font-black",
                      option.isCorrect
                        ? "border-[var(--qs-ok)] bg-[var(--qs-ok)] text-white"
                        : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <p
                    className={cn(
                      "min-w-0 flex-1 text-sm font-medium leading-relaxed",
                      option.isCorrect ? "font-bold text-[var(--qs-ok)]" : "text-[var(--qs-ink)]"
                    )}
                  >
                    {option.text || "—"}
                  </p>
                  {option.isCorrect && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-ok)]" />}
                </div>
              ))
            ) : (
              <div className="rounded-[12px] border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] p-3 text-sm font-bold text-[var(--qs-ok)]">
                {answerFallback}
              </div>
            )}
          </div>

          {question.explanation && (
            <div className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-brand)]">
                <Lightbulb className="h-3.5 w-3.5" />
                Explanation
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--qs-ink)]">
                {question.explanation}
              </p>
            </div>
          )}

          {question.hint && (
            <div className="rounded-[12px] border-2 border-dashed border-[var(--qs-line)] p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                <HelpCircle className="h-3.5 w-3.5" />
                Hint
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--qs-ink)]">{question.hint}</p>
            </div>
          )}

          {(question.chapter || question.topic || question.tags.length > 0) && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                <Tag className="h-3.5 w-3.5" />
                Tags & topic
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[question.chapter, question.topic, ...question.tags]
                  .filter(Boolean)
                  .filter((tag, index, list) => list.indexOf(tag) === index)
                  .map((tag) => (
                    <span
                      key={tag as string}
                      className="rounded-[6px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-ink)]"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t-2 border-[var(--qs-line)] pt-3 text-[11px] font-medium text-[var(--qs-muted)]">
            <span>Added {question.updated}</span>
            <span>Source: {question.source || "AI generated"}</span>
            <span className="inline-flex items-center gap-1">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Used in {question.usedIn} {question.usedIn === 1 ? "test" : "tests"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t-2 border-[var(--qs-line)] px-5 py-4">
          <button
            type="button"
            onClick={onAddToQuiz}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]"
          >
            <ListPlus className="h-3.5 w-3.5" />
            Add to quiz
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-2.5 text-xs font-extrabold text-[var(--qs-bad)] transition-colors hover:bg-[var(--qs-bad)] hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

export function QuestionBankPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const { status: state, data, retry } = useData<BankQuestion[]>(async () => {
    if (demoState === "error") throw new Error("Question bank preview failed");
    if (demoState === "empty") return [];
    const rows = await getMyQuestionBank();
    return rows.map(mapBankQuestion);
  }, { delayMs: 250 });

  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<BankQuestion[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | QuestionType>("all");
  const [difficulty, setDifficulty] = useState<"all" | QuestionDifficulty>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<BankQuestion | null>(null);

  const questions = useMemo(() => {
    return [...(data ?? []).filter((question) => !removed.has(question.id)), ...added];
  }, [data, removed, added]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return questions.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (difficulty !== "all" && item.difficulty !== difficulty) return false;
      if (
        term &&
        !item.text.toLowerCase().includes(term) &&
        !item.subject.toLowerCase().includes(term) &&
        !item.tags.some((tag) => tag.toLowerCase().includes(term))
      ) {
        return false;
      }
      return true;
    });
  }, [questions, query, typeFilter, difficulty]);

  const easyCount = questions.filter((question) => question.difficulty === "easy").length;
  const mediumCount = questions.filter((question) => question.difficulty === "medium").length;
  const hardCount = questions.filter((question) => question.difficulty === "hard").length;
  const usedInTests = questions.filter((question) => question.usedIn > 0).length;
  const allSelected = filtered.length > 0 && filtered.every((question) => selected.has(question.id));

  const toggleRow = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(filtered.map((question) => question.id)));
  };

  const handleRowAction = (id: string, action: RowAction) => {
    const question = questions.find((item) => item.id === id);
    if (!question) return;
    if (action === "delete") {
      setRemoved((previous) => new Set(previous).add(id));
      setSelected((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
      toast.success({
        title: "Question deleted",
        description: `"${question.text.length > 60 ? `${question.text.slice(0, 60)}…` : question.text}" was removed from your library.`,
      });
      return;
    }
    if (action === "duplicate") {
      setAdded((previous) => [
        { ...question, id: `q_${Date.now()}`, usedIn: 0, updated: "Just now" },
        ...previous,
      ]);
      toast.success({ title: "Question duplicated", description: "A copy was added to your library." });
      return;
    }
    const label = action === "edit" ? "Edit question" : action === "test" ? "Add to Test" : "Add to Quiz";
    toast.info({
      title: label,
      description: "This will be wired to the backend once available.",
    });
  };

  const copyQuestion = async (question: BankQuestion) => {
    const lines: string[] = [question.html ? htmlToEditableText(question.html) : question.text];
    if (question.options.length > 0) {
      question.options.forEach((option, index) => {
        lines.push(`${String.fromCharCode(65 + index)}. ${option.text}${option.isCorrect ? " (correct)" : ""}`);
      });
    } else if (question.answers.length > 0) {
      lines.push(`Answer: ${question.answers.join(", ")}`);
    }
    if (question.explanation) lines.push(`Explanation: ${question.explanation}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n\n"));
      toast.success({ title: "Question copied", description: "Text copied to your clipboard." });
    } catch {
      toast.error({ title: "Could not copy question", description: "Please try again." });
    }
  };

  const bulkAction = (action: "test" | "quiz" | "delete") => {
    const count = selected.size;
    if (action === "delete") {
      setRemoved((previous) => new Set([...previous, ...selected]));
      setSelected(new Set());
      toast.success({
        title: "Questions deleted",
        description: `${count} question${count === 1 ? "" : "s"} removed from your library.`,
      });
      return;
    }
    toast.info({
      title: action === "test" ? "Add to Test" : "Add to Quiz",
      description: `${count} question${count === 1 ? "" : "s"} selected. This will be wired to the backend.`,
    });
  };

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setDifficulty("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-[var(--qs-ink)]">Question Bank</h1>
          <p className="mt-1 text-sm font-medium text-[var(--qs-muted)]">
            Your reusable question library — organized by subject, topic and difficulty.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/creator/questions/new" className={primaryButton}>
            <Plus className="h-4 w-4" />
            Add Question
          </Link>
          <button
            type="button"
            onClick={() =>
              toast.info({
                title: "Import questions",
                description: "Bulk import is coming soon. For now, add questions one at a time.",
              })
            }
            className={secondaryButton}
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
        </div>
      </div>

      {state === "loading" && (
        <div className="space-y-6">
          <div className="grid max-w-[860px] grid-cols-1 gap-5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[118px] animate-pulse rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
              />
            ))}
          </div>
          <div className="space-y-3 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-[10px] bg-[var(--qs-poly-0)]" />
            ))}
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-10 text-center shadow-[4px_4px_0_var(--qs-sun)]">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]">
            <Database className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-black text-[var(--qs-ink)]">We couldn&apos;t load your question bank</p>
          <p className="mt-1 text-sm font-medium text-[var(--qs-muted)]">Please try again in a moment.</p>
          <button type="button" onClick={retry} className={cn(secondaryButton, "mt-4")}>
            Try again
          </button>
        </div>
      )}

      {state === "empty" || (state === "ready" && questions.length === 0) ? (
        <div className="rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-10 text-center shadow-[4px_4px_0_var(--qs-sun)]">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
            <Database className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-black text-[var(--qs-ink)]">No questions yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm font-medium text-[var(--qs-muted)]">
            Build your reusable question library — questions you add here can be reused across tests, quizzes and
            assignments.
          </p>
          <Link href="/creator/questions/new" className={cn(primaryButton, "mt-4")}>
            <Plus className="h-4 w-4" />
            Add your first question
          </Link>
        </div>
      ) : null}

      {state === "ready" && questions.length > 0 && (
        <>
          <div className="grid max-w-[860px] grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="relative rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[4px_4px_0_var(--qs-sun)]">
              <span className="absolute right-4 top-3.5 grid h-[30px] w-[30px] place-items-center rounded-[9px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                <Database className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                Total questions
              </p>
              <p className="mt-2.5 text-[27px] font-black leading-none text-[var(--qs-ink)]">{questions.length}</p>
              <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
                across {new Set(questions.map((question) => question.subject)).size} subjects
              </p>
            </div>
            <div className="relative rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[4px_4px_0_var(--qs-sun)]">
              <span className="absolute right-4 top-3.5 grid h-[30px] w-[30px] place-items-center rounded-[9px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                <ClipboardCheck className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                Used in tests
              </p>
              <p className="mt-2.5 text-[27px] font-black leading-none text-[var(--qs-ink)]">{usedInTests}</p>
              <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">of library currently used</p>
            </div>
            <div className="relative rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[4px_4px_0_var(--qs-sun)]">
              <span className="absolute right-4 top-3.5 grid h-[30px] w-[30px] place-items-center rounded-[9px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                <Gauge className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                Difficulty split
              </p>
              <p className="mt-2.5 text-[27px] font-black leading-none text-[var(--qs-ink)]">
                {easyCount} E · {mediumCount} M · {hardCount} H
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">Easy · Medium · Hard</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <label className="flex h-10 w-full max-w-[290px] items-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3">
                <Search className="h-4 w-4 shrink-0 text-[var(--qs-muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search questions, subjects or tags…"
                  aria-label="Search questions"
                  className="w-full bg-transparent text-[13px] font-medium text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)]"
                />
              </label>

              <div
                className="hide-scrollbar flex max-w-full gap-0.5 overflow-x-auto rounded-full border-2 border-[var(--qs-line)] p-1"
                role="group"
                aria-label="Question type"
              >
                {TYPE_FILTERS.map((filter) => {
                  const active = typeFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTypeFilter(filter.id)}
                      className={cn(
                        "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors",
                        active
                          ? "bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                          : "text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
                      )}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 sm:ml-auto" role="group" aria-label="Difficulty">
                {DIFFICULTIES.map((item) => {
                  const active = difficulty === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDifficulty(active ? "all" : item.id)}
                      className={cn(
                        "rounded-[8px] border-2 px-3 py-1.5 text-xs font-extrabold transition-colors",
                        active
                          ? "border-[var(--qs-brand)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]"
                          : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence>
              {selected.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-y-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <p className="text-xs font-extrabold text-[var(--qs-ink)]">{selected.size} selected</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => bulkAction("test")}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-[11px] font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                      >
                        <FilePlus2 className="h-3.5 w-3.5" />
                        Add to Test
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkAction("quiz")}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-[11px] font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                      >
                        <ListPlus className="h-3.5 w-3.5" />
                        Add to Quiz
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkAction("delete")}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-2.5 text-[11px] font-extrabold text-[var(--qs-bad)] transition-colors hover:bg-[var(--qs-bad)] hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        className="inline-flex h-8 items-center rounded-[8px] px-2.5 text-[11px] font-extrabold text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-ink)]"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <p className="text-sm font-black text-[var(--qs-ink)]">No questions match your filters</p>
                <p className="mt-1 text-[13px] font-medium text-[var(--qs-muted)]">
                  Try a different search term or clear the filters to see everything.
                </p>
                <button type="button" onClick={clearFilters} className={cn(secondaryButton, "mt-4 h-9 text-xs")}>
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
                    <thead>
                      <tr>
                        <th className="w-[46px] border-b-2 border-[var(--qs-line)] px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            aria-label="Select all questions"
                            className="h-4 w-4 cursor-pointer accent-[var(--qs-brand)]"
                          />
                        </th>
                        {["Question", "Subject", "Type", "Difficulty", "Tags", "Used in", "Updated", ""].map(
                          (heading) => (
                            <th
                              key={heading || "actions"}
                              className={cn(
                                "whitespace-nowrap border-b-2 border-[var(--qs-line)] px-2.5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]",
                                heading === "Used in" && "text-right",
                                heading === "" && "w-[52px]"
                              )}
                            >
                              {heading}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((question, index) => (
                        <motion.tr
                          key={question.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.015, 0.25) }}
                          tabIndex={0}
                          onClick={() => setPreview(question)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setPreview(question);
                            }
                          }}
                          className={cn(
                            "cursor-pointer border-b-2 border-[var(--qs-line)]/70 transition-colors last:border-b-0 hover:bg-[var(--qs-poly-0)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--qs-brand)]",
                            selected.has(question.id) && "bg-[var(--qs-poly-0)]"
                          )}
                        >
                          <td className="px-4 py-3.5" onClick={(event) => event.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(question.id)}
                              onChange={() => toggleRow(question.id)}
                              aria-label={`Select ${question.text}`}
                              className="h-4 w-4 cursor-pointer accent-[var(--qs-brand)]"
                            />
                          </td>
                          <td className="max-w-[330px] px-2.5 py-3.5">
                            <p className="truncate font-bold text-[var(--qs-ink)]">{question.text}</p>
                          </td>
                          <td className="max-w-[190px] whitespace-nowrap px-2.5 py-3.5">
                            <span className="inline-block max-w-[190px] truncate rounded-[6px] bg-[var(--qs-poly-1)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-ink)]">
                              {question.subject}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2.5 py-3.5 text-xs font-medium text-[var(--qs-muted)]">
                            {TYPE_LABEL[question.type]}
                          </td>
                          <td className="whitespace-nowrap px-2.5 py-3.5">
                            <DifficultyPill difficulty={question.difficulty} />
                          </td>
                          <td className="px-2.5 py-3.5">
                            <div className="flex max-w-[150px] flex-wrap gap-1">
                              {question.tags.length > 0 ? (
                                question.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="whitespace-nowrap rounded-[6px] border-2 border-[var(--qs-line)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--qs-muted)]"
                                  >
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-[var(--qs-muted)]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-2.5 py-3.5 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[var(--qs-ink)]">
                              <ClipboardCheck className="h-3.5 w-3.5 text-[var(--qs-muted)]" />
                              {question.usedIn}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2.5 py-3.5 text-xs font-medium text-[var(--qs-muted)]">
                            {question.updated}
                          </td>
                          <td className="w-[52px] px-2.5 py-3.5">
                            <div className="flex items-center justify-end">
                              <RowActionMenu onAction={(action) => handleRowAction(question.id, action)} />
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2.5 p-4 md:hidden">
                  {filtered.map((question) => (
                    <div
                      key={question.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreview(question)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setPreview(question);
                        }
                      }}
                      className={cn(
                        "cursor-pointer rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 transition-colors active:bg-[var(--qs-poly-0)]",
                        selected.has(question.id) && "border-[var(--qs-brand)] bg-[var(--qs-poly-0)]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(question.id)}
                            onChange={() => toggleRow(question.id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Select ${question.text}`}
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--qs-brand)]"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold leading-snug text-[var(--qs-ink)]">{question.text}</p>
                            <p className="mt-1 text-[11px] font-medium text-[var(--qs-muted)]">
                              {question.subject} · {TYPE_LABEL[question.type]} · Updated {question.updated}
                            </p>
                          </div>
                        </div>
                        <RowActionMenu onAction={(action) => handleRowAction(question.id, action)} />
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t-2 border-[var(--qs-line)] pt-3">
                        <div className="flex flex-wrap gap-1">
                          {question.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-[6px] border-2 border-[var(--qs-line)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--qs-muted)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <DifficultyPill difficulty={question.difficulty} />
                          <span className="text-[11px] font-bold text-[var(--qs-muted)]">
                            Used in {question.usedIn}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[var(--qs-line)] px-4 py-3 text-xs font-medium text-[var(--qs-muted)]">
              <span>
                Showing {filtered.length} of {questions.length} question{questions.length === 1 ? "" : "s"}
              </span>
              {selected.size > 0 && <span>{selected.size} selected</span>}
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {preview && (
          <QuestionPreviewDrawer
            key={preview.id}
            question={preview}
            onClose={() => setPreview(null)}
            onCopy={() => void copyQuestion(preview)}
            onDuplicate={() => handleRowAction(preview.id, "duplicate")}
            onDelete={() => {
              handleRowAction(preview.id, "delete");
              setPreview(null);
            }}
            onAddToQuiz={() => {
              handleRowAction(preview.id, "quiz");
              setPreview(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
