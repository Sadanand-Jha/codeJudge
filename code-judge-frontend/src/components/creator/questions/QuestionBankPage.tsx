"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClipboardCheck,
  Copy,
  Database,
  FilePlus2,
  Gauge,
  ListPlus,
  MoreHorizontal,
  PenLine,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  BillButton,
  EmptyState,
  ErrorState,
  MockDataTag,
  PageHeader,
  Panel,
  SegmentedControl,
  StatCard,
  StatCardSkeleton,
  StatusBadge,
  TableSkeleton,
} from "@/components/creator/billing/ui";
import { useToast } from "@/hooks/useToast";

type QuestionType = "single" | "multiple" | "integer" | "true-false";
type QuestionDifficulty = "easy" | "medium" | "hard";
type RowAction = "edit" | "test" | "quiz" | "duplicate" | "delete";

interface BankQuestion {
  id: string;
  text: string;
  subject: "Physics" | "Chemistry" | "Mathematics" | "Biology" | "Quant";
  type: QuestionType;
  difficulty: QuestionDifficulty;
  tags: string[];
  usedIn: number;
  updated: string;
}

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "single", label: "Single Choice" },
  { id: "multiple", label: "Multiple Choice" },
  { id: "integer", label: "Integer" },
  { id: "true-false", label: "True-False" },
] as const;

const DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
] as const;

const TYPE_LABEL: Record<QuestionType, string> = {
  single: "Single Choice",
  multiple: "Multiple Choice",
  integer: "Integer",
  "true-false": "True-False",
};

const DIFFICULTY_TONE: Record<QuestionDifficulty, "emerald" | "amber" | "rose"> = {
  easy: "emerald",
  medium: "amber",
  hard: "rose",
};

const QUESTION_BANK: BankQuestion[] = [
  {
    id: "q1",
    text: "A particle moves in a circle of radius 2 m with a uniform speed of 4 m/s. What is its centripetal acceleration?",
    subject: "Physics",
    type: "single",
    difficulty: "medium",
    tags: ["Kinematics", "Circular Motion"],
    usedIn: 4,
    updated: "18 Aug 2026",
  },
  {
    id: "q2",
    text: "The SI unit of electric charge is:",
    subject: "Physics",
    type: "single",
    difficulty: "easy",
    tags: ["Electrostatics", "Units"],
    usedIn: 9,
    updated: "16 Aug 2026",
  },
  {
    id: "q3",
    text: "Which gas is evolved when dilute hydrochloric acid reacts with zinc granules?",
    subject: "Chemistry",
    type: "multiple",
    difficulty: "easy",
    tags: ["Acids & Bases", "Reactions"],
    usedIn: 6,
    updated: "15 Aug 2026",
  },
  {
    id: "q4",
    text: "Calculate the molarity of a solution containing 5.85 g of NaCl dissolved in 500 mL of water.",
    subject: "Chemistry",
    type: "integer",
    difficulty: "hard",
    tags: ["Solutions", "Mole Concept"],
    usedIn: 3,
    updated: "14 Aug 2026",
  },
  {
    id: "q5",
    text: "If f(x) = x³ − 3x + 2, the value of f'(1) is:",
    subject: "Mathematics",
    type: "single",
    difficulty: "easy",
    tags: ["Calculus", "Differentiation"],
    usedIn: 11,
    updated: "13 Aug 2026",
  },
  {
    id: "q6",
    text: "The value of the definite integral ∫₀¹ x² dx is:",
    subject: "Mathematics",
    type: "integer",
    difficulty: "medium",
    tags: ["Calculus", "Integration"],
    usedIn: 5,
    updated: "12 Aug 2026",
  },
  {
    id: "q7",
    text: "In how many ways can 5 books be arranged on a shelf such that 2 particular books are always together?",
    subject: "Mathematics",
    type: "multiple",
    difficulty: "hard",
    tags: ["Permutations", "Combinatorics"],
    usedIn: 2,
    updated: "10 Aug 2026",
  },
  {
    id: "q8",
    text: "Photosynthesis takes place in which organelle of the plant cell?",
    subject: "Biology",
    type: "single",
    difficulty: "easy",
    tags: ["Cell Biology", "Plant Physiology"],
    usedIn: 14,
    updated: "09 Aug 2026",
  },
  {
    id: "q9",
    text: "DNA is a polymer made up of nucleotides.",
    subject: "Biology",
    type: "true-false",
    difficulty: "easy",
    tags: ["Genetics", "Molecular Biology"],
    usedIn: 7,
    updated: "08 Aug 2026",
  },
  {
    id: "q10",
    text: "The human body contains how many pairs of chromosomes?",
    subject: "Biology",
    type: "integer",
    difficulty: "medium",
    tags: ["Genetics", "Human Biology"],
    usedIn: 8,
    updated: "07 Aug 2026",
  },
  {
    id: "q11",
    text: "A 120 m long train crosses a pole in 12 seconds. What is the speed of the train in km/h?",
    subject: "Quant",
    type: "single",
    difficulty: "medium",
    tags: ["Speed & Time", "Arithmetic"],
    usedIn: 6,
    updated: "05 Aug 2026",
  },
  {
    id: "q12",
    text: "If 20% of x equals 40, then the value of x is:",
    subject: "Quant",
    type: "integer",
    difficulty: "easy",
    tags: ["Percentages", "Arithmetic"],
    usedIn: 10,
    updated: "04 Aug 2026",
  },
  {
    id: "q13",
    text: "Which of the following are noble gases?",
    subject: "Chemistry",
    type: "multiple",
    difficulty: "medium",
    tags: ["Periodic Table", "Gases"],
    usedIn: 4,
    updated: "02 Aug 2026",
  },
  {
    id: "q14",
    text: "Momentum is a vector quantity.",
    subject: "Physics",
    type: "true-false",
    difficulty: "easy",
    tags: ["Mechanics", "Vectors"],
    usedIn: 12,
    updated: "01 Aug 2026",
  },
];

const ROW_ACTIONS: Array<{ id: RowAction; label: string; icon: LucideIcon; danger?: boolean }> = [
  { id: "edit", label: "Edit", icon: PenLine },
  { id: "test", label: "Add to Test", icon: FilePlus2 },
  { id: "quiz", label: "Add to Quiz", icon: ListPlus },
  { id: "duplicate", label: "Duplicate", icon: Copy },
  { id: "delete", label: "Delete", icon: Trash2, danger: true },
];

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
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Question actions"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-colors hover:border-border hover:bg-white/[0.04] hover:text-text-primary"
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
            className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-border bg-card p-1.5 shadow-2xl"
          >
            {ROW_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  onAction(a.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                  a.danger
                    ? "text-rose-500 hover:bg-rose-500/10"
                    : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
                )}
              >
                <a.icon className="h-4 w-4" />
                {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function QuestionBankPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const { state, data, retry } = useBillingData(
    () => ({ questions: QUESTION_BANK }),
    { delayMs: 650, demoState }
  );

  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<BankQuestion[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | QuestionType>("all");
  const [difficulty, setDifficulty] = useState<"all" | QuestionDifficulty>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const questions = useMemo(() => {
    const base = data?.questions ?? QUESTION_BANK;
    return [...base.filter((q) => !removed.has(q.id)), ...added];
  }, [data, removed, added]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (difficulty !== "all" && item.difficulty !== difficulty) return false;
      if (
        q &&
        !item.text.toLowerCase().includes(q) &&
        !item.subject.toLowerCase().includes(q) &&
        !item.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [questions, query, typeFilter, difficulty]);

  const easyCount = questions.filter((q) => q.difficulty === "easy").length;
  const mediumCount = questions.filter((q) => q.difficulty === "medium").length;
  const hardCount = questions.filter((q) => q.difficulty === "hard").length;
  const usedInTests = questions.filter((q) => q.usedIn > 0).length;

  const allSelected = filtered.length > 0 && filtered.every((q) => selected.has(q.id));

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(filtered.map((q) => q.id)));
  };

  const handleRowAction = (id: string, action: RowAction) => {
    const question = questions.find((q) => q.id === id);
    if (!question) return;
    if (action === "delete") {
      setRemoved((prev) => new Set(prev).add(id));
      setSelected((prev) => {
        const next = new Set(prev);
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
      setAdded((prev) => [
        { ...question, id: `q_${Date.now()}`, usedIn: 0, updated: "Just now" },
        ...prev,
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

  const bulkAction = (action: "test" | "quiz" | "delete") => {
    const count = selected.size;
    if (action === "delete") {
      setRemoved((prev) => new Set([...prev, ...selected]));
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
      <PageHeader
        title="Question Bank"
        subtitle="Your reusable question library — organized by subject, topic and difficulty."
        badge={<MockDataTag />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BillButton href="/creator/questions/new" icon={<Plus className="h-4 w-4" />}>
              Add Question
            </BillButton>
            <BillButton variant="ghost" icon={<Upload className="h-4 w-4" />}>
              Import
            </BillButton>
          </div>
        }
      />

      {state === "loading" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton rows={8} cols={7} />
        </>
      )}
      {state === "error" && (
        <ErrorState onRetry={retry} message="We couldn't load your question bank. Please try again in a moment." />
      )}
      {state === "empty" && (
        <EmptyState
          title="No questions yet"
          description="Build your reusable question library — questions you add here can be reused across tests, quizzes and assignments."
          action={<BillButton href="/creator/questions/new">Add your first question</BillButton>}
        />
      )}

      {state === "ready" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Questions"
              value={questions.length}
              display={String(questions.length)}
              hint="across 5 subjects"
              accent="primary"
              icon={<Database className="h-4 w-4" />}
            />
            <StatCard
              label="Used in Tests"
              value={usedInTests}
              display={String(usedInTests)}
              hint="of library currently used"
              accent="info"
              icon={<ClipboardCheck className="h-4 w-4" />}
            />
            <StatCard
              label="Difficulty Split"
              value={questions.length}
              display={`${easyCount} E · ${mediumCount} M · ${hardCount} H`}
              hint="Easy · Medium · Hard"
              accent="warning"
              icon={<Gauge className="h-4 w-4" />}
            />
            <StatCard
              label="Avg. Correct Rate"
              value={0}
              display="72.4%"
              delta={4.2}
              hint="across all attempts"
              accent="success"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          <Panel noPadding>
            <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search questions, subjects or tags..."
                    className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-pink-500/40 dark:focus:border-ai-accent/40 lg:w-72"
                  />
                </div>
                <div className="overflow-x-auto">
                  <SegmentedControl value={typeFilter} onChange={setTypeFilter} options={TYPE_FILTERS} size="sm" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {DIFFICULTIES.map((d) => {
                  const active = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(active ? "all" : d.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-[11px] font-semibold capitalize transition-colors",
                        active
                          ? "border-pink-500/40 bg-pink-500/[0.08] text-pink-600 dark:border-ai-accent/40 dark:text-ai-accent"
                          : "border-border bg-card text-text-secondary hover:border-border-hover hover:text-text-primary"
                      )}
                    >
                      {d.label}
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
                  className="overflow-hidden border-b border-pink-500/20 bg-pink-500/[0.05] dark:border-ai-accent/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <p className="text-xs font-semibold text-text-primary">
                      {selected.size} selected
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => bulkAction("test")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
                      >
                        <FilePlus2 className="h-3.5 w-3.5" />
                        Add to Test
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkAction("quiz")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
                      >
                        <ListPlus className="h-3.5 w-3.5" />
                        Add to Quiz
                      </button>
                      <button
                        type="button"
                        onClick={() => bulkAction("delete")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
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
                <p className="text-sm font-semibold text-text-primary">No questions match your filters</p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Try a different search term or clear the filters to see everything.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-text-primary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[960px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        <th className="w-12 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            aria-label="Select all questions"
                            className="h-4 w-4 cursor-pointer rounded border-border bg-card accent-pink-500"
                          />
                        </th>
                        <th className="px-3 py-3">Question</th>
                        <th className="px-3 py-3">Subject</th>
                        <th className="px-3 py-3">Type</th>
                        <th className="px-3 py-3">Difficulty</th>
                        <th className="px-3 py-3">Tags</th>
                        <th className="px-3 py-3 text-right">Used In</th>
                        <th className="px-3 py-3">Updated</th>
                        <th className="w-12 px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((q, i) => (
                        <motion.tr
                          key={q.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className={cn(
                            "border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]",
                            selected.has(q.id) && "bg-pink-500/[0.04] dark:bg-ai-accent-soft"
                          )}
                        >
                          <td className="px-3 py-3.5">
                            <input
                              type="checkbox"
                              checked={selected.has(q.id)}
                              onChange={() => toggleRow(q.id)}
                              aria-label={`Select ${q.text}`}
                              className="h-4 w-4 cursor-pointer rounded border-border bg-card accent-pink-500"
                            />
                          </td>
                          <td className="max-w-[280px] px-3 py-3.5">
                            <p className="truncate font-semibold text-text-primary">{q.text}</p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5">
                            <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-text-secondary">
                              {q.subject}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-xs text-text-secondary">
                            {TYPE_LABEL[q.type]}
                          </td>
                          <td className="px-3 py-3.5">
                            <StatusBadge label={q.difficulty} tone={DIFFICULTY_TONE[q.difficulty]} dot />
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="flex max-w-[200px] flex-wrap gap-1">
                              {q.tags.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full border border-border bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-text-secondary"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-primary">
                              <ClipboardCheck className="h-3.5 w-3.5 text-text-muted" />
                              {q.usedIn}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-xs text-text-muted">{q.updated}</td>
                          <td className="px-3 py-3.5">
                            <div className="flex items-center justify-end">
                              <RowActionMenu onAction={(a) => handleRowAction(q.id, a)} />
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2.5 p-4 md:hidden">
                  {filtered.map((q) => (
                    <div
                      key={q.id}
                      className={cn(
                        "rounded-xl border border-border bg-card p-4",
                        selected.has(q.id) && "border-pink-500/30 bg-pink-500/[0.04]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected.has(q.id)}
                            onChange={() => toggleRow(q.id)}
                            aria-label={`Select ${q.text}`}
                            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border bg-card accent-pink-500"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-snug text-text-primary">{q.text}</p>
                            <p className="mt-1 text-[11px] text-text-muted">
                              {q.subject} · {TYPE_LABEL[q.type]} · Updated {q.updated}
                            </p>
                          </div>
                        </div>
                        <RowActionMenu onAction={(a) => handleRowAction(q.id, a)} />
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <div className="flex flex-wrap gap-1">
                          {q.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-border bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-text-secondary"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge label={q.difficulty} tone={DIFFICULTY_TONE[q.difficulty]} dot />
                          <span className="text-[11px] font-semibold text-text-secondary">Used in {q.usedIn}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}