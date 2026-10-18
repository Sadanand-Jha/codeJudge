"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Minus,
  PencilLine,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import {
  generateSubjectiveQuestions,
  getQuestionGeneratorCatalog,
  type QuestionGeneratorCatalog,
} from "@/services/aiGenerate";
import type { SubjectiveQuestion } from "@/components/creator/tests/sections/paperTypes";
import { QsSelect } from "@/components/creator/problems/QsSelect";

type GeneratorStatus = "idle" | "generating" | "done" | "error";

type QuestionItem = SubjectiveQuestion & { selected: boolean };

const MAX_QUESTIONS = 30;
const MAX_SYLLABUS = 4000;

const splitDifficulty = (total: number) => {
  const easy = Math.round(total * 0.4);
  const medium = Math.round(total * 0.3);
  return { easy, medium, hard: total - easy - medium };
};

const splitCategory = (total: number) => {
  const theory = Math.round(total * 0.6);
  return { theory, numerical: total - theory };
};

const TONE_TEXT: Record<string, string> = {
  easy: "text-[var(--qs-ok)]",
  medium: "text-[#a85d00]",
  hard: "text-[var(--qs-bad)]",
  theory: "text-[var(--qs-brand)]",
  numerical: "text-[#0b7a8f]",
};

const SKELETON_WIDTHS = ["w-[30%]", "w-[92%]", "w-[68%]"];

function Chip({
  label,
  active,
  disabled,
  onToggle,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-full border-2 px-2.5 py-1 text-[13px] transition-colors disabled:opacity-60",
        active
          ? "border-[var(--qs-brand)] bg-[var(--qs-bg)] font-bold text-[var(--qs-brand)]"
          : "border-[var(--qs-line)] bg-[var(--qs-surface)] font-medium text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
      )}
    >
      {active && <span aria-hidden="true">✓ </span>}
      {label}
    </button>
  );
}

function CountStepper({
  label,
  labelClass,
  value,
  decreaseDisabled,
  increaseDisabled,
  disabled,
  onDecrease,
  onIncrease,
}: {
  label: string;
  labelClass: string;
  value: number;
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
  disabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const buttonClass =
    "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-brand)] hover:text-[var(--qs-on-brand)] disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <span className={cn("truncate text-[11px] font-extrabold uppercase tracking-[0.08em]", labelClass)}>
        {label}
      </span>
      <div className="flex w-full items-center justify-between rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-1">
        <button
          type="button"
          onClick={onDecrease}
          disabled={disabled || decreaseDisabled}
          aria-label={`Decrease ${label}`}
          className={buttonClass}
        >
          <Minus className="h-4 w-4" />
        </button>
        <output className="text-[16px] font-extrabold tabular-nums text-[var(--qs-ink)]">{value}</output>
        <button
          type="button"
          onClick={onIncrease}
          disabled={disabled || increaseDisabled}
          aria-label={`Increase ${label}`}
          className={buttonClass}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RemainingStatus({ remaining, total }: { remaining: number; total: number }) {
  return (
    <span
      className={cn(
        "text-[13px] font-bold",
        remaining === 0
          ? "text-[var(--qs-ok)]"
          : remaining > 0
            ? "text-[#a85d00]"
            : "text-[var(--qs-bad)]"
      )}
    >
      {remaining === 0
        ? `Total ${total} of ${total} ✓`
        : remaining > 0
          ? `${remaining} left to assign`
          : `Over by ${-remaining}`}
    </span>
  );
}

function StepSection({
  step,
  title,
  hint,
  divided = true,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  divided?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("px-5 py-5 sm:px-6", divided && "border-t-2 border-[var(--qs-line)]")}>
      <div className="mb-4 flex items-start gap-3">
        <b className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-sm font-extrabold text-[var(--qs-bg)]">
          {step}
        </b>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-[var(--qs-ink)]">{title}</h2>
          <p className="text-[13px] text-[var(--qs-muted)]">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function CreateProblemGenerator() {
  const toast = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);

  const [catalog, setCatalog] = useState<QuestionGeneratorCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [topicIds, setTopicIds] = useState<number[]>([]);

  const [totalQuestions, setTotalQuestions] = useState(5);
  const [easy, setEasy] = useState(2);
  const [medium, setMedium] = useState(2);
  const [hard, setHard] = useState(1);
  const [theory, setTheory] = useState(3);
  const [numerical, setNumerical] = useState(2);

  const [syllabus, setSyllabus] = useState("");

  const [status, setStatus] = useState<GeneratorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getQuestionGeneratorCatalog()
      .then((data) => {
        if (!active) return;
        setCatalog(data);
        setCatalogError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setCatalogError(err instanceof Error ? err.message : "Unable to load the question curriculum.");
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, [catalogReloadKey]);

  const reloadCatalog = useCallback(() => {
    setCatalogLoading(true);
    setCatalogError(null);
    setCatalogReloadKey((key) => key + 1);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const subjectName = useMemo(
    () => catalog?.subjects.find((s) => s.id === subjectId)?.name ?? null,
    [catalog, subjectId]
  );

  const subjectChapters = useMemo(
    () => catalog?.chapters.filter((c) => c.subjectId === subjectId) ?? [],
    [catalog, subjectId]
  );

  const subjectTopics = useMemo(() => {
    const chapterIdSet = new Set(subjectChapters.map((c) => c.id));
    return catalog?.topics.filter((t) => chapterIdSet.has(t.chapterId)) ?? [];
  }, [catalog, subjectChapters]);

  const chapterCards = useMemo(
    () =>
      subjectChapters.map((chapter) => ({
        chapter,
        topics: subjectTopics.filter((topic) => topic.chapterId === chapter.id),
      })),
    [subjectChapters, subjectTopics]
  );

  const chapterIds = useMemo(
    () =>
      chapterCards
        .filter(({ topics }) => topics.some((topic) => topicIds.includes(topic.id)))
        .map(({ chapter }) => chapter.id),
    [chapterCards, topicIds]
  );

  const selectedTopicCount = useMemo(
    () => subjectTopics.filter((topic) => topicIds.includes(topic.id)).length,
    [subjectTopics, topicIds]
  );

  const thinkingMessages = useMemo(
    () => [
      "Reading your scope…",
      subjectName ? `Drafting ${subjectName} questions…` : "Drafting questions…",
      "Balancing difficulty and category…",
      "Finalising your question set…",
    ],
    [subjectName]
  );

  useEffect(() => {
    if (status !== "generating") return;
    const timer = window.setInterval(
      () => setThinkingIndex((i) => (i + 1) % thinkingMessages.length),
      1800
    );
    return () => window.clearInterval(timer);
  }, [status, thinkingMessages.length]);

  const difficultySum = easy + medium + hard;
  const categorySum = theory + numerical;
  const canGenerate =
    subjectId !== null &&
    difficultySum === totalQuestions &&
    categorySum === totalQuestions &&
    status !== "generating";

  const selectedCount = items.filter((it) => it.selected).length;

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((it) => {
      const key = it.difficulty.toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts);
  }, [items]);

  const coverageText = useMemo(() => {
    if (!subjectId || !subjectName) return "Select a subject to see your coverage here.";
    if (selectedTopicCount === 0)
      return `${subjectName} · nothing selected, so AI will use the whole subject`;
    const topicPart = `${selectedTopicCount} topic${selectedTopicCount > 1 ? "s" : ""}`;
    return `${subjectName} · ${chapterIds.length} of ${subjectChapters.length} chapters · ${topicPart}`;
  }, [subjectId, subjectName, selectedTopicCount, chapterIds.length, subjectChapters.length]);

  const coveragePercent = useMemo(
    () => (subjectTopics.length ? Math.round((selectedTopicCount / subjectTopics.length) * 100) : 0),
    [subjectTopics.length, selectedTopicCount]
  );

  const applyAutoCounts = useCallback((nextTotal: number) => {
    const d = splitDifficulty(nextTotal);
    setEasy(d.easy);
    setMedium(d.medium);
    setHard(d.hard);
    const c = splitCategory(nextTotal);
    setTheory(c.theory);
    setNumerical(c.numerical);
  }, []);

  const handleTotalChange = useCallback(
    (value: number) => {
      const next = Math.min(MAX_QUESTIONS, Math.max(1, Math.floor(value) || 1));
      setTotalQuestions(next);
      applyAutoCounts(next);
    },
    [applyAutoCounts]
  );

  const handleSubjectChange = (value: number) => {
    setSubjectId(value);
    const chapterIdSet = new Set(
      (catalog?.chapters ?? []).filter((c) => c.subjectId === value).map((c) => c.id)
    );
    setTopicIds(
      (catalog?.topics ?? []).filter((t) => chapterIdSet.has(t.chapterId)).map((t) => t.id)
    );
  };

  const toggleChapter = (chapterTopicIds: number[], selectAll: boolean) => {
    setTopicIds((prev) => {
      const next = new Set(prev);
      chapterTopicIds.forEach((id) => (selectAll ? next.add(id) : next.delete(id)));
      return subjectTopics.filter((topic) => next.has(topic.id)).map((topic) => topic.id);
    });
  };

  const toggleTopic = (id: number) => {
    setTopicIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const selectAllTopics = () => setTopicIds(subjectTopics.map((topic) => topic.id));
  const clearTopics = () => setTopicIds([]);

  const handleGenerate = useCallback(async () => {
    if (!subjectId || difficultySum !== totalQuestions || categorySum !== totalQuestions) return;
    setError(null);
    setItems([]);
    setEditingIndex(null);
    setCopied(false);
    setThinkingIndex(0);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStatus("generating");

    try {
      const response = await generateSubjectiveQuestions(
        {
          numberOfQuestions: totalQuestions,
          easyCount: easy,
          mediumCount: medium,
          hardCount: hard,
          theoryCount: theory,
          numericalCount: numerical,
          reasoningEffort: "plus",
          subjectId,
          chapterIds,
          topicIds,
          syllabus: syllabus.trim() || undefined,
        },
        abortRef.current.signal
      );
      setItems(response.questions.map((q) => ({ ...q, selected: false })));
      setStatus("done");
      toast.success({
        title: "Questions ready",
        description: `${response.questions.length} questions generated for your selected scope.`,
      });
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === "CanceledError" || err.name === "AbortError")) {
        setStatus("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to generate questions. Please try again.");
      setStatus("error");
    }
  }, [
    subjectId,
    difficultySum,
    categorySum,
    totalQuestions,
    easy,
    medium,
    hard,
    theory,
    numerical,
    chapterIds,
    topicIds,
    syllabus,
    toast,
  ]);

  const regenerateOne = useCallback(
    async (index: number) => {
      const item = items[index];
      if (!item || !subjectId || busyIndex !== null) return;
      const diff = item.difficulty.toLowerCase();
      const kind = item.kind.toLowerCase();
      const difficultyCounts = ["easy", "medium", "hard"].includes(diff)
        ? {
            easyCount: diff === "easy" ? 1 : 0,
            mediumCount: diff === "medium" ? 1 : 0,
            hardCount: diff === "hard" ? 1 : 0,
          }
        : {};
      const kindCounts = ["theory", "numerical"].includes(kind)
        ? {
            theoryCount: kind === "theory" ? 1 : 0,
            numericalCount: kind === "numerical" ? 1 : 0,
          }
        : {};
      setBusyIndex(index);
      try {
        const response = await generateSubjectiveQuestions({
          numberOfQuestions: 1,
          ...difficultyCounts,
          ...kindCounts,
          reasoningEffort: "plus",
          subjectId,
          chapterIds,
          topicIds,
          syllabus: syllabus.trim() || undefined,
        });
        const replacement = response.questions[0];
        if (!replacement) throw new Error("No replacement question was returned.");
        setItems((prev) =>
          prev.map((it, i) =>
            i === index
              ? {
                  ...it,
                  num: replacement.num,
                  question: replacement.question,
                  difficulty: replacement.difficulty,
                  kind: replacement.kind,
                }
              : it
          )
        );
      } catch (err: unknown) {
        if (!(err instanceof Error && (err.name === "CanceledError" || err.name === "AbortError"))) {
          toast.error({
            title: "Regeneration failed",
            description: err instanceof Error ? err.message : "Could not regenerate this question.",
          });
        }
      } finally {
        setBusyIndex(null);
      }
    },
    [items, subjectId, busyIndex, chapterIds, topicIds, syllabus, toast]
  );

  const toggleItem = (index: number) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, selected: !it.selected } : it)));
  };

  const selectAll = () => {
    setItems((prev) => prev.map((it) => ({ ...it, selected: true })));
  };

  const deleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
  };

  const saveEdit = useCallback((index: number) => {
    const text = editRef.current?.textContent?.trim();
    if (text) {
      setItems((prev) => prev.map((it, i) => (i === index ? { ...it, question: text } : it)));
    }
    setEditingIndex(null);
  }, []);

  const copySelected = useCallback(async () => {
    const selected = items.filter((it) => it.selected);
    if (selected.length === 0) return;
    const text = selected
      .map((q, i) => `Q${i + 1}. (${q.difficulty} · ${q.kind})\n${q.question}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success({
        title: "Copied",
        description: `${selected.length} question${selected.length > 1 ? "s" : ""} copied to clipboard.`,
      });
    } catch {
      toast.error({ title: "Copy failed", description: "Clipboard is not available." });
    }
  }, [items, toast]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-4xl">
            Create Problem
          </h1>
          <p className="mt-1.5 text-sm text-[var(--qs-muted)]">
            Generate and prepare standalone subjective questions for your question bank.
          </p>
        </div>
        <Link
          href="/creator/problems"
          className="qs-btn qs-btn-ghost w-full px-4 py-2.5 text-sm sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Problems
        </Link>
      </div>

      <div className="qs-shadow mt-6 mb-6 mr-4">
        <div className="overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--qs-brand)] px-5 py-4 text-[var(--qs-on-brand)] sm:px-6">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[var(--qs-sun)] text-[#1a1240]">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold">AI Question Generator</h2>
                <p className="text-[13px] opacity-90">
                  Pick any number of subjective questions. You decide the hardness, you give the topic, AI picks the best.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold">
              Effort
              <QsSelect<string>
                value="plus"
                options={[
                  { value: "plus", label: "Plus" },
                  { value: "pro", label: "Pro (coming soon)", disabled: true },
                  { value: "max", label: "Max (coming soon)", disabled: true },
                ]}
                onChange={() => {}}
                disabled={status === "generating"}
                ariaLabel="Reasoning effort"
                triggerClassName="min-w-[92px] rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 py-1.5 text-sm font-bold text-[var(--qs-ink)]"
                menuClassName="w-56"
                align="right"
              />
            </div>
          </div>

          <StepSection step={1} title="Question scope" hint="Choose the syllabus coverage for your questions" divided={false}>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-[340px]">
                <span className="mb-2 block text-sm font-bold text-[var(--qs-ink)]">Subject</span>
                <QsSelect<number>
                  value={subjectId}
                  options={(catalog?.subjects ?? []).map((s) => ({ value: s.id, label: s.name }))}
                  onChange={handleSubjectChange}
                  placeholder={catalogLoading ? "Loading curriculum…" : "Select subject"}
                  disabled={status === "generating" || catalogLoading}
                  ariaLabel="Subject"
                  triggerClassName="rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-3 text-sm font-medium text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                  menuClassName="w-full"
                />
                {catalogError && (
                  <div className="mt-2 flex items-start gap-1.5 text-[12px] font-semibold text-[var(--qs-bad)]">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {catalogError}{" "}
                      <button type="button" onClick={reloadCatalog} className="underline">
                        Retry
                      </button>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-[var(--qs-muted)]">
                  {subjectId ? `${selectedTopicCount} of ${subjectTopics.length} topics` : ""}
                </span>
                <button
                  type="button"
                  onClick={selectAllTopics}
                  disabled={!subjectId || subjectTopics.length === 0 || status === "generating"}
                  className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[13px] font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)] disabled:pointer-events-none disabled:opacity-50"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearTopics}
                  disabled={!subjectId || selectedTopicCount === 0 || status === "generating"}
                  className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[13px] font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)] disabled:pointer-events-none disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-4.5 grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(270px,100%),1fr))]">
              {!subjectId || chapterCards.length === 0 ? (
                <div className="col-span-full rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-7 py-7 text-center text-sm text-[var(--qs-muted)]">
                  {subjectId
                    ? "No chapters available for this subject."
                    : "Select a subject to choose chapters and topics."}
                </div>
              ) : (
                chapterCards.map(({ chapter, topics }) => {
                  const chapterTopicIds = topics.map((topic) => topic.id);
                  const selectedInChapter = chapterTopicIds.filter((id) => topicIds.includes(id)).length;
                  const hasSelection = selectedInChapter > 0;
                  const allSelected =
                    chapterTopicIds.length > 0 && selectedInChapter === chapterTopicIds.length;
                  return (
                    <div
                      key={chapter.id}
                      className={cn(
                        "rounded-[18px] border-2 bg-[var(--qs-surface)] p-3.5 transition-colors",
                        hasSelection ? "border-[var(--qs-brand)]" : "border-[var(--qs-line)]"
                      )}
                    >
                      <label className="mb-2.5 flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = hasSelection && !allSelected;
                          }}
                          onChange={(e) => toggleChapter(chapterTopicIds, e.target.checked)}
                          disabled={chapterTopicIds.length === 0 || status === "generating"}
                          aria-label={chapter.name}
                          className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--qs-brand)]"
                        />
                        <span className="flex-1 text-sm font-bold leading-tight text-[var(--qs-ink)]">
                          {chapter.name}
                        </span>
                        <span className="rounded-full bg-[var(--qs-bg)] px-2.5 py-0.5 text-[12px] font-extrabold tabular-nums text-[var(--qs-brand)]">
                          {selectedInChapter}/{chapterTopicIds.length}
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {topics.map((topic) => (
                          <Chip
                            key={topic.id}
                            label={topic.name}
                            active={topicIds.includes(topic.id)}
                            disabled={status === "generating"}
                            onToggle={() => toggleTopic(topic.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 rounded-[14px] border-2 border-[var(--qs-line)] px-4 py-3.5">
              <strong className="block text-sm font-bold text-[var(--qs-ink)]">Selected coverage</strong>
              <span className="text-[13px] text-[var(--qs-muted)]">{coverageText}</span>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--qs-line)]">
                <span
                  className="block h-full rounded-full bg-[var(--qs-brand)] transition-[width] duration-300"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
            </div>
          </StepSection>

          <StepSection step={2} title="Generation settings" hint="Counts must add up to the total">
            <div className="grid gap-6 lg:grid-cols-[0.7fr_1.25fr_1.05fr] lg:gap-0">
              <div className="lg:pr-6">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="cp-total" className="text-sm font-bold text-[var(--qs-ink)]">
                    Number of questions
                  </label>
                  <span className="rounded-[10px] bg-[var(--qs-brand)] px-3 py-0.5 text-sm font-extrabold text-[var(--qs-on-brand)]">
                    {totalQuestions}
                  </span>
                </div>
                <input
                  id="cp-total"
                  type="range"
                  min={1}
                  max={MAX_QUESTIONS}
                  value={totalQuestions}
                  onChange={(e) => handleTotalChange(Number(e.target.value))}
                  disabled={status === "generating"}
                  className="mt-4 h-2 w-full cursor-pointer accent-[var(--qs-brand)] disabled:opacity-60"
                />
                <p className="mt-1.5 text-[13px] text-[var(--qs-muted)]">
                  Between 1 and {MAX_QUESTIONS}
                </p>
              </div>

              <div className="lg:border-l-2 lg:border-[var(--qs-line)] lg:px-6">
                <p className="mb-2 text-sm font-bold text-[var(--qs-ink)]">Difficulty</p>
                <div className="grid grid-cols-3 gap-3">
                  <CountStepper
                    label="Easy"
                    labelClass="text-[var(--qs-ok)]"
                    value={easy}
                    disabled={status === "generating"}
                    decreaseDisabled={easy <= 0}
                    increaseDisabled={difficultySum >= totalQuestions}
                    onDecrease={() => setEasy(Math.max(0, easy - 1))}
                    onIncrease={() => setEasy(easy + 1)}
                  />
                  <CountStepper
                    label="Medium"
                    labelClass="text-[#a85d00]"
                    value={medium}
                    disabled={status === "generating"}
                    decreaseDisabled={medium <= 0}
                    increaseDisabled={difficultySum >= totalQuestions}
                    onDecrease={() => setMedium(Math.max(0, medium - 1))}
                    onIncrease={() => setMedium(medium + 1)}
                  />
                  <CountStepper
                    label="Hard"
                    labelClass="text-[var(--qs-bad)]"
                    value={hard}
                    disabled={status === "generating"}
                    decreaseDisabled={hard <= 0}
                    increaseDisabled={difficultySum >= totalQuestions}
                    onDecrease={() => setHard(Math.max(0, hard - 1))}
                    onIncrease={() => setHard(hard + 1)}
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <RemainingStatus remaining={totalQuestions - difficultySum} total={totalQuestions} />
                  <button
                    type="button"
                    onClick={() => {
                      const d = splitDifficulty(totalQuestions);
                      setEasy(d.easy);
                      setMedium(d.medium);
                      setHard(d.hard);
                    }}
                    disabled={status === "generating"}
                    className="rounded-[10px] border-2 border-[var(--qs-line)] px-2.5 py-1 text-[12px] font-bold text-[var(--qs-muted)] transition hover:border-[var(--qs-brand)] hover:text-[var(--qs-brand)] disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="lg:border-l-2 lg:border-[var(--qs-line)] lg:pl-6">
                <p className="mb-2 text-sm font-bold text-[var(--qs-ink)]">Category</p>
                <div className="grid grid-cols-2 gap-3">
                  <CountStepper
                    label="Theory"
                    labelClass="text-[var(--qs-brand)]"
                    value={theory}
                    disabled={status === "generating"}
                    decreaseDisabled={theory <= 0}
                    increaseDisabled={categorySum >= totalQuestions}
                    onDecrease={() => setTheory(Math.max(0, theory - 1))}
                    onIncrease={() => setTheory(theory + 1)}
                  />
                  <CountStepper
                    label="Numerical"
                    labelClass="text-[#0b7a8f]"
                    value={numerical}
                    disabled={status === "generating"}
                    decreaseDisabled={numerical <= 0}
                    increaseDisabled={categorySum >= totalQuestions}
                    onDecrease={() => setNumerical(Math.max(0, numerical - 1))}
                    onIncrease={() => setNumerical(numerical + 1)}
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <RemainingStatus remaining={totalQuestions - categorySum} total={totalQuestions} />
                  <button
                    type="button"
                    onClick={() => {
                      const c = splitCategory(totalQuestions);
                      setTheory(c.theory);
                      setNumerical(c.numerical);
                    }}
                    disabled={status === "generating"}
                    className="rounded-[10px] border-2 border-[var(--qs-line)] px-2.5 py-1 text-[12px] font-bold text-[var(--qs-muted)] transition hover:border-[var(--qs-brand)] hover:text-[var(--qs-brand)] disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </StepSection>

          <StepSection step={3} title="Syllabus & generation" hint="Tell the AI exactly what you taught">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="cp-syllabus"
                  className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-[var(--qs-ink)]"
                >
                  <span className="flex items-center gap-2">
                    Syllabus / instructions
                    <span className="rounded-full bg-[var(--qs-sun)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
                      Recommended
                    </span>
                  </span>
                  <span className="text-[12px] font-medium tabular-nums text-[var(--qs-muted)]">
                    {syllabus.length}/{MAX_SYLLABUS}
                  </span>
                </label>
                <textarea
                  id="cp-syllabus"
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                  maxLength={MAX_SYLLABUS}
                  rows={3}
                  disabled={status === "generating"}
                  placeholder="Paste what you actually taught: topics, units, exclusions and the kind of questions you want."
                  className="w-full resize-y rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3.5 py-3 text-sm text-[var(--qs-ink)] outline-none transition placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:opacity-60"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-6 py-4 text-base font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none lg:w-auto lg:self-center"
              >
                {status === "generating" ? (
                  "Generating…"
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Questions
                  </>
                )}
              </button>
            </div>
            <p
              className={cn(
                "mt-3 text-[13px] font-medium",
                syllabus.trim() ? "text-[var(--qs-ok)]" : "text-[#a85d00]"
              )}
            >
              {syllabus.trim()
                ? "Good choice — your questions will stay closer to the material you covered."
                : "Add your syllabus for precise results. Without it, AI may generate from a much broader subject scope."}
            </p>
          </StepSection>

          {error && (
            <div className="px-5 pb-5 sm:px-6">
              <div className="flex items-start gap-2.5 rounded-xl border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
                <p className="text-[13px] font-semibold text-[var(--qs-bad)]">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {status === "generating" && (
        <section aria-live="polite" className="mt-10">
          <div className="flex items-center gap-3 font-bold text-[var(--qs-ink)]">
            <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-[var(--qs-line)] border-t-[var(--qs-brand)] motion-reduce:animate-none" />
            {thinkingMessages[thinkingIndex]}
          </div>
          <div className="mt-4 grid gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="grid gap-3.5 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-6"
              >
                {SKELETON_WIDTHS.map((width, j) => (
                  <span
                    key={j}
                    className={cn("block h-3.5 animate-pulse rounded-full bg-[var(--qs-line)]", width)}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {status === "done" && (
        <section aria-live="polite" className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-3 text-2xl font-extrabold text-[var(--qs-ink)]">
                Generated questions
                <span className="rounded-[10px] bg-[var(--qs-brand)] px-3 text-lg font-extrabold text-[var(--qs-on-brand)]">
                  {items.length}
                </span>
              </h2>
              <p className="mt-1 text-sm text-[var(--qs-muted)]">Review, edit and keep the ones you like.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.map(([difficulty, count]) => (
                <span
                  key={difficulty}
                  className={cn(
                    "rounded-full border-2 border-current px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.05em]",
                    TONE_TEXT[difficulty] ?? "text-[var(--qs-muted)]"
                  )}
                >
                  {difficulty} {count}
                </span>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="mt-4 rounded-[22px] border-2 border-dashed border-[var(--qs-line)] p-6 text-center text-sm text-[var(--qs-muted)]">
              All questions removed. Generate a new set above.
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4">
                {items.map((item, index) => (
                  <article
                    key={`${item.num}-${index}`}
                    className={cn(
                      "rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-5 py-4 transition-all",
                      item.selected && "-translate-x-0.5 -translate-y-0.5 shadow-[6px_6px_0_var(--qs-sun)]",
                      busyIndex === index && "opacity-45"
                    )}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItem(index)}
                        aria-label={`Select question ${index + 1}`}
                        className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--qs-brand)]"
                      />
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-[13px] font-extrabold text-[var(--qs-bg)]">
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border-2 border-current px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.05em]",
                          TONE_TEXT[item.difficulty.toLowerCase()] ?? "text-[var(--qs-muted)]"
                        )}
                      >
                        {item.difficulty}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border-2 border-current px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.05em]",
                          TONE_TEXT[item.kind.toLowerCase()] ?? "text-[var(--qs-muted)]"
                        )}
                      >
                        {item.kind}
                      </span>
                    </div>

                    <div
                      ref={editingIndex === index ? editRef : undefined}
                      contentEditable={editingIndex === index}
                      suppressContentEditableWarning
                      onBlur={() => {
                        if (editingIndex === index) saveEdit(index);
                      }}
                      className={cn(
                        "text-[17px] font-medium leading-relaxed text-[var(--qs-ink)]",
                        editingIndex === index &&
                          "rounded-md outline outline-[3px] outline-offset-[6px] outline-[var(--qs-brand)]"
                      )}
                    >
                      {item.question}
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => (editingIndex === index ? saveEdit(index) : setEditingIndex(index))}
                        className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] px-3 py-1.5 text-[13px] font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)]"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        {editingIndex === index ? "Done" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void regenerateOne(index)}
                        disabled={busyIndex !== null}
                        className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] px-3 py-1.5 text-[13px] font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)] disabled:opacity-50"
                      >
                        <RotateCcw className={cn("h-3.5 w-3.5", busyIndex === index && "animate-spin")} />
                        {busyIndex === index ? "Regenerating…" : "Regenerate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(index)}
                        className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] px-3 py-1.5 text-[13px] font-bold text-[var(--qs-bad)] transition hover:border-[var(--qs-bad)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="sticky bottom-3 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[var(--qs-ink)] px-4 py-3 pl-5 text-[var(--qs-bg)]">
                <span className="text-sm font-bold">
                  {selectedCount} of {items.length} selected
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded-[10px] border-2 border-[var(--qs-muted)] px-3 py-1.5 text-[13px] font-bold transition hover:border-[var(--qs-bg)]"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    className="rounded-[10px] border-2 border-[var(--qs-muted)] px-3 py-1.5 text-[13px] font-bold transition hover:border-[var(--qs-bg)]"
                  >
                    Regenerate all
                  </button>
                  <button
                    type="button"
                    onClick={() => void copySelected()}
                    disabled={selectedCount === 0}
                    className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-sun)] bg-[var(--qs-brand)] px-4 py-2 text-[14px] font-extrabold text-[var(--qs-on-brand)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy selected"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
