"use client";

import { showUpgradeModal } from "@/lib/upgradePrompt";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Minus,
  PencilLine,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { useFileUploadAccess } from "@/hooks/useFileUploadAccess";
import { useQuestionApproval } from "@/hooks/useQuestionApproval";
import { useLetterheadChoice } from "@/hooks/useLetterheadChoice";
import {
  generateSubjectiveQuestions,
  getQuestionGeneratorCatalog,
  type QuestionGeneratorCatalog,
} from "@/services/aiGenerate";
import type { SubjectiveQuestion } from "@/components/creator/tests/sections/paperTypes";
import { QsSelect } from "@/components/creator/problems/QsSelect";
import { ImportSyllabusNotice } from "@/components/creator/syllabus/ImportSyllabusNotice";
import { QuestionHtml, htmlToEditableText } from "@/components/creator/questions/QuestionHtml";
import { defaultPaperInstructionLines, downloadQuestionsPdf } from "@/utils/questionSetExport";
import { AiGenerateButton } from "@/components/creator/common/AiGenerateButton";
import { PaperExportDialog } from "@/components/creator/common/PaperExportDialog";
import { DEFAULT_PAPER_HEADER, type PaperHeaderMeta } from "@/utils/paperHeader";

type GeneratorStatus = "idle" | "generating" | "done" | "error";

type QuestionItem = SubjectiveQuestion & { selected: boolean };

const MAX_QUESTIONS = 10;
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

const QUESTION_PLAIN = (item: QuestionItem) =>
  item.questionHtml?.trim() ? htmlToEditableText(item.questionHtml) : item.question;

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
    "grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border-[1.5px] border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] hover:bg-[var(--qs-poly-1)] disabled:pointer-events-none disabled:opacity-30 sm:h-9 sm:w-9 sm:rounded-[10px] sm:border-2";
  return (
    <div className="min-w-0 flex-1 rounded-[11px] border-[1.5px] border-[var(--qs-line)] bg-[var(--qs-bg)] px-1.5 py-2 text-center sm:min-w-[110px] sm:rounded-[14px] sm:border-2 sm:p-3">
      <p className={cn("text-[9.5px] font-bold uppercase tracking-[0.08em] sm:text-[12px] sm:tracking-[0.1em]", labelClass)}>{label}</p>
      <div className="mt-1.5 flex items-center justify-center gap-1.5 sm:mt-2 sm:gap-2.5">
        <button
          type="button"
          onClick={onDecrease}
          disabled={disabled || decreaseDisabled}
          aria-label={`Decrease ${label}`}
          className={buttonClass}
        >
          <Minus className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        </button>
        <output className="min-w-6 text-[19px] font-bold tabular-nums text-[var(--qs-ink)] sm:min-w-7 sm:text-[26px]">
          {value}
        </output>
        <button
          type="button"
          onClick={onIncrease}
          disabled={disabled || increaseDisabled}
          aria-label={`Increase ${label}`}
          className={buttonClass}
        >
          <Plus className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        </button>
      </div>
    </div>
  );
}

function CardHeading({
  step,
  title,
  aside,
}: {
  step?: number;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 border-b border-[var(--qs-line)] pb-2.5 text-[12px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:mb-4 sm:gap-2.5 sm:border-b-2 sm:pb-3 sm:text-[14px]">
      {step !== undefined && (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[10.5px] font-extrabold text-[#1a1240] sm:h-7 sm:w-7 sm:rounded-[9px] sm:border-2 sm:text-[12px]">
          {step}
        </span>
      )}
      <span className="min-w-0">{title}</span>
      {aside ? <span className="ml-auto shrink-0">{aside}</span> : null}
    </h2>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-t border-[var(--qs-line)] py-2 text-[11.5px] sm:gap-3 sm:py-2.5 sm:text-sm">
      <span className="text-[var(--qs-muted)]">{label}</span>
      <b className="text-right font-semibold text-[var(--qs-ink)]">{value}</b>
    </div>
  );
}

export function CreateProblemGenerator() {
  const toast = useToast();
  const { canUseAi, aiLoading, aiUpgradeMessage } = useFileUploadAccess();
  const { approve, pendingId, isApproved } = useQuestionApproval();
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
  const [regenerateIndex, setRegenerateIndex] = useState<number | null>(null);
  const [regenerateInstruction, setRegenerateInstruction] = useState("");
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [paperHeader, setPaperHeader] = useState<PaperHeaderMeta>({ ...DEFAULT_PAPER_HEADER });
  const { chooseHeader, dialog: headerChoiceDialog } = useLetterheadChoice();

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

  const chapterOptions = useMemo(
    () => chapterCards.map(({ chapter }) => ({ value: chapter.id, label: chapter.name })),
    [chapterCards]
  );

  const topicOptions = useMemo(
    () => subjectTopics.map((topic) => ({ value: topic.id, label: topic.name })),
    [subjectTopics]
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
  const difficultyBalanced = difficultySum === totalQuestions;
  const categoryBalanced = categorySum === totalQuestions;
  const canGenerate =
    subjectId !== null &&
    difficultyBalanced &&
    categoryBalanced &&
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
    if (!subjectId || !subjectName) return "Select a subject to see how much of your syllabus is covered.";
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

  const handleChapterValuesChange = useCallback(
    (nextChapterIds: number[]) => {
      const nextSet = new Set(nextChapterIds);
      const currentSet = new Set(chapterIds);
      const idsToAdd: number[] = [];
      const idsToRemove: number[] = [];

      chapterCards.forEach(({ chapter, topics }) => {
        const topicIdList = topics.map((topic) => topic.id);
        if (nextSet.has(chapter.id) && !currentSet.has(chapter.id)) {
          idsToAdd.push(...topicIdList);
        }
        if (!nextSet.has(chapter.id) && currentSet.has(chapter.id)) {
          idsToRemove.push(...topicIdList);
        }
      });

      const removeSet = new Set(idsToRemove);
      const next = new Set(topicIds.filter((id) => !removeSet.has(id)));
      idsToAdd.forEach((id) => next.add(id));
      setTopicIds(subjectTopics.filter((topic) => next.has(topic.id)).map((topic) => topic.id));
    },
    [chapterCards, chapterIds, subjectTopics, topicIds]
  );

  const selectAllTopics = () => setTopicIds(subjectTopics.map((topic) => topic.id));
  const clearTopics = () => setTopicIds([]);

  const resetCounts = useCallback(() => {
    setTotalQuestions(5);
    applyAutoCounts(5);
    setError(null);
  }, [applyAutoCounts]);

  const handleGenerate = useCallback(async () => {
    if (totalQuestions > MAX_QUESTIONS) {
      setError(`You can generate at most ${MAX_QUESTIONS} questions at a time.`);
      return;
    }
    if (!canUseAi) {
      setError(aiUpgradeMessage);
      if (!aiLoading) {
        showUpgradeModal({ message: aiUpgradeMessage });
      }
      return;
    }
    if (!subjectId || difficultySum !== totalQuestions || categorySum !== totalQuestions) return;
    setError(null);
    setItems([]);
    setEditingIndex(null);
    setRegenerateIndex(null);
    setRegenerateInstruction("");
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
          saveToBank: true,
        },
        abortRef.current.signal
      );
      setItems(response.questions.map((q) => ({ ...q, selected: true })));
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
    canUseAi,
    aiLoading,
    aiUpgradeMessage,
  ]);

  const regenerateOne = useCallback(
    async (index: number, instruction?: string) => {
      const item = items[index];
      if (!item || !subjectId || busyIndex !== null) return;
      if (!canUseAi) {
        if (!aiLoading) {
          showUpgradeModal({ message: aiUpgradeMessage });
        }
        return;
      }
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
          context: instruction?.trim() ? `The teacher specifically wants: ${instruction.trim()}` : undefined,
          avoidQuestions: items
            .filter((_, itemIndex) => itemIndex !== index)
            .map((other) => other.question)
            .filter(Boolean),
          saveToBank: true,
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
                  questionHtml: replacement.questionHtml ?? null,
                  difficulty: replacement.difficulty,
                  kind: replacement.kind,
                  bankQuestionId: replacement.bankQuestionId ?? null,
                }
              : it
          )
        );
        setRegenerateIndex(null);
        setRegenerateInstruction("");
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
    [items, subjectId, busyIndex, chapterIds, topicIds, syllabus, toast, canUseAi, aiLoading, aiUpgradeMessage]
  );

  const handleRegenerateClick = (index: number) => {
    if (busyIndex !== null) return;
    if (regenerateIndex === index) {
      setRegenerateIndex(null);
      setRegenerateInstruction("");
      return;
    }
    setRegenerateIndex(index);
    setRegenerateInstruction("");
  };

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
    const el = editRef.current;
    const text = ((el?.innerText ?? el?.textContent) ?? "").trim();
    if (text) {
      setItems((prev) =>
        prev.map((it, i) => {
          if (i !== index) return it;
          // Keep the bank HTML untouched when the teacher saved without changes.
          return text === QUESTION_PLAIN(it).trim() ? it : { ...it, question: text, questionHtml: null };
        })
      );
    }
    setEditingIndex(null);
  }, []);

  const copySelected = useCallback(async () => {
    const selected = items.filter((it) => it.selected);
    if (selected.length === 0) return;
    const text = selected
      .map((q, i) => `Q${i + 1}. (${q.difficulty} · ${q.kind})\n${QUESTION_PLAIN(q)}`)
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

  const openExportDialog = useCallback(() => {
    if (selectedCount === 0) {
      toast.error({
        title: "Select questions first",
        description: "Choose at least one question to download.",
      });
      return;
    }
    setPaperHeader((prev) => ({
      ...prev,
      heading: prev.heading.trim() || DEFAULT_PAPER_HEADER.heading,
      subject: prev.subject.trim() || subjectName || "",
      instructions: prev.instructions.trim()
        ? prev.instructions
        : defaultPaperInstructionLines(selectedCount, selectedCount, false).join("\n"),
    }));
    setExportOpen(true);
  }, [selectedCount, subjectName, toast]);

  const downloadSelected = useCallback(async () => {
    const selected = items.filter((it) => it.selected);
    if (selected.length === 0 || downloading) return;
    setDownloading(true);
    try {
      const choice = await chooseHeader();
      if (choice.status === "cancelled") return;
      const exportPayload = {
        questions: selected.map((item) => ({
          question: item.question,
          questionHtml: item.questionHtml,
          difficulty: item.difficulty,
          kind: item.kind,
          bankQuestionId: item.bankQuestionId,
        })),
        title: paperHeader.heading.trim() || "Question Paper",
        subject: paperHeader.subject.trim() || subjectName,
        header: paperHeader,
        letterhead: choice.placement,
      };
      await downloadQuestionsPdf(exportPayload);
      setExportOpen(false);
      toast.success({
        title: "PDF ready",
        description: `${selected.length} question${selected.length > 1 ? "s" : ""} downloaded.`,
      });
    } catch (err) {
      toast.error({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Could not prepare the file. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  }, [items, downloading, subjectName, paperHeader, toast, chooseHeader]);

  return (
    <div className="qs-ui mx-auto w-full max-w-[1160px] pb-6 sm:pb-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-5 sm:gap-3">
        <Link
          href="/creator/problems"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-[9px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-[11.5px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] sm:min-h-10 sm:gap-2 sm:rounded-[12px] sm:border-2 sm:px-3.5 sm:text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Back to Assignment Builder
        </Link>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1 text-[8.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)] sm:gap-1.5 sm:border-2 sm:px-3 sm:py-1.5 sm:text-[11px] sm:tracking-[0.08em]">
          <Sparkles className="h-3 w-3 text-[var(--qs-brand)] sm:h-3.5 sm:w-3.5" />
          AI-assisted builder
        </span>
      </div>

      <header className="relative mb-3 overflow-hidden rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-4 text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] sm:mb-6 sm:rounded-[22px] sm:border-2 sm:px-8 sm:py-7 sm:shadow-[6px_6px_0_var(--qs-sun)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[24px] border-[var(--qs-sun)]/15" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-[26%] h-36 w-36 rounded-full bg-[var(--qs-sun)]/10" />
        <div className="relative flex flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-5">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240] sm:h-12 sm:w-12 sm:rounded-[14px] sm:border-2">
              <Sparkles className="h-4 w-4 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full border border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[0.08em] text-[#1a1240] sm:border-2 sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.1em]">
                Assignment Builder
              </span>
              <h1 className="mt-1.5 text-[21px] font-extrabold leading-tight tracking-tight sm:mt-2 sm:text-[34px]">
                AI Question Generator
              </h1>
              <p className="mt-1 max-w-[660px] text-[11.5px] leading-5 text-[var(--qs-on-brand)]/85 sm:mt-1.5 sm:text-[15px] sm:leading-6">
                Set the scope and question mix, then review and save the questions you want to keep.
              </p>
            </div>
          </div>
          <div className="flex w-fit items-center gap-1.5 rounded-[9px] border border-[var(--qs-ink)] bg-[var(--qs-surface)] px-2.5 py-1.5 text-[10.5px] font-extrabold text-[var(--qs-ink)] sm:gap-2 sm:rounded-xl sm:border-2 sm:px-3.5 sm:py-2.5 sm:text-sm">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--qs-sun)] text-[10px] text-[#1a1240] sm:h-6 sm:w-6 sm:text-xs">
              3
            </span>
            Simple 3-step workflow
          </div>
        </div>
      </header>

      <div className="grid items-start gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3 sm:gap-5">
          <section className="rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] p-3.5 shadow-[2px_3px_0_var(--qs-sun)] sm:rounded-[20px] sm:border-2 sm:p-5 sm:shadow-[3px_3px_0_var(--qs-sun)]">
            <CardHeading step={1} title="Question Scope" />

            {catalog && catalog.subjects.length === 0 && (
              <ImportSyllabusNotice className="mb-4" compact />
            )}

            <div className="flex flex-wrap gap-4">
              <div className="min-w-0 flex-[1_1_200px]">
                <label
                  htmlFor="ai-subject"
                  className="mb-1 block text-[11.5px] font-semibold text-[var(--qs-ink)] sm:mb-1.5 sm:text-[13px]"
                >
                  Subject
                </label>
                <QsSelect<number>
                  id="ai-subject"
                  value={subjectId}
                  options={(catalog?.subjects ?? []).map((s) => ({ value: s.id, label: s.name }))}
                  onChange={handleSubjectChange}
                  placeholder={catalogLoading ? "Loading curriculum…" : "Select subject"}
                  disabled={status === "generating" || catalogLoading}
                  ariaLabel="Subject"
                  searchable
                  triggerClassName="min-h-[42px] w-full rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] px-2.5 py-2 text-[13.5px] font-semibold text-[var(--qs-ink)] sm:min-h-[46px] sm:rounded-[12px] sm:border-2 sm:px-3 sm:text-[15px] hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] disabled:opacity-50"
                  menuClassName="w-full"
                />
                {catalogError && (
                  <div className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-[var(--qs-bad)]">
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

              <div className="min-w-0 flex-[1_1_200px]">
                <label
                  htmlFor="ai-chapters"
                  className="mb-1 block text-[11.5px] font-semibold text-[var(--qs-ink)] sm:mb-1.5 sm:text-[13px]"
                >
                  Chapter
                </label>
                <QsSelect<number>
                  id="ai-chapters"
                  multiple
                  values={chapterIds}
                  onValuesChange={handleChapterValuesChange}
                  options={chapterOptions}
                  placeholder={catalogLoading ? "Loading…" : "All chapters"}
                  disabled={!subjectId || status === "generating" || catalogLoading}
                  ariaLabel="Chapters"
                  searchable
                  wrapLabels
                  triggerClassName="min-h-[42px] w-full rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] px-2.5 py-2 text-[13.5px] font-semibold text-[var(--qs-ink)] sm:min-h-[46px] sm:rounded-[12px] sm:border-2 sm:px-3 sm:text-[15px] hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] disabled:opacity-50"
                  menuClassName="w-full"
                />
              </div>

              <div className="min-w-0 flex-[1_1_200px]">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="ai-topics" className="text-[11.5px] font-semibold text-[var(--qs-ink)] sm:text-[13px]">
                    Topics
                  </label>
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--qs-brand)]">
                    <button
                      type="button"
                      onClick={selectAllTopics}
                      disabled={!subjectId || subjectTopics.length === 0 || status === "generating"}
                      className="transition-colors hover:text-[var(--qs-ink)] disabled:pointer-events-none disabled:opacity-40"
                    >
                      All
                    </button>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={clearTopics}
                      disabled={!subjectId || selectedTopicCount === 0 || status === "generating"}
                      className="transition-colors hover:text-[var(--qs-ink)] disabled:pointer-events-none disabled:opacity-40"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <QsSelect<number>
                  id="ai-topics"
                  multiple
                  values={topicIds}
                  onValuesChange={setTopicIds}
                  options={topicOptions}
                  placeholder={catalogLoading ? "Loading…" : "All topics"}
                  disabled={!subjectId || status === "generating" || catalogLoading}
                  ariaLabel="Topics"
                  searchable
                  wrapLabels
                  triggerClassName="min-h-[42px] w-full rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] px-2.5 py-2 text-[13.5px] font-semibold text-[var(--qs-ink)] sm:min-h-[46px] sm:rounded-[12px] sm:border-2 sm:px-3 sm:text-[15px] hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] disabled:opacity-50"
                  menuClassName="w-full"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2.5 text-[11px] text-[var(--qs-muted)] sm:mt-4 sm:gap-3 sm:text-sm">
              <span className="flex-1 leading-4 sm:leading-5">{coverageText}</span>
              <b className="shrink-0 text-[var(--qs-brand)]">{coveragePercent}%</b>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--qs-line)] sm:mt-2 sm:h-2">
              <span
                className="block h-full rounded-full bg-[var(--qs-brand)] transition-[width] duration-300"
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
          </section>

          <section className="rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] p-3.5 shadow-[2px_3px_0_var(--qs-sun)] sm:rounded-[20px] sm:border-2 sm:p-5 sm:shadow-[3px_3px_0_var(--qs-sun)]">
            <CardHeading
              step={2}
              title="Syllabus / Instructions"
              aside={
                <span className="rounded-full border border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.04em] text-[#1a1240] sm:border-2 sm:px-3 sm:py-[3px] sm:text-[11px] sm:tracking-[0.05em]">
                  Recommended
                </span>
              }
            />
            <textarea
              id="ai-syllabus"
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              maxLength={MAX_SYLLABUS}
              disabled={status === "generating"}
              placeholder="Paste the topics you taught, units to cover, exclusions, and the kind of questions you want."
              className="min-h-[104px] w-full resize-y rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] p-2.5 text-[13px] leading-5 text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:opacity-60 sm:min-h-[120px] sm:rounded-[12px] sm:border-2 sm:p-3 sm:text-[15px] sm:leading-6"
            />
            <div className="mt-2 flex items-start justify-between gap-2 text-[10.5px] sm:mt-2.5 sm:gap-3 sm:text-[13px]">
              <span className="flex-1 rounded-[7px] bg-[var(--qs-poly-5)] px-2 py-1 leading-4 text-[var(--qs-ink)] sm:rounded-[8px] sm:px-2.5 sm:py-1.5 sm:leading-5">
                {syllabus.trim()
                  ? "Questions will stay close to the material you covered."
                  : "Add topics for precise questions. Without them AI uses the full subject scope."}
              </span>
              <span className="shrink-0 whitespace-nowrap pt-0.5 tabular-nums text-[var(--qs-muted)] sm:pt-1">
                {syllabus.length} / {MAX_SYLLABUS}
              </span>
            </div>
          </section>

          <section className="rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] p-3.5 shadow-[2px_3px_0_var(--qs-sun)] sm:rounded-[20px] sm:border-2 sm:p-5 sm:shadow-[3px_3px_0_var(--qs-sun)]">
            <CardHeading step={3} title="How Many, How Hard" />

            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <span className="whitespace-nowrap text-[12px] font-semibold text-[var(--qs-ink)] sm:text-sm">
                Questions
              </span>
              <input
                id="ai-question-count"
                type="range"
                min={1}
                max={MAX_QUESTIONS}
                value={totalQuestions}
                onChange={(e) => handleTotalChange(Number(e.target.value))}
                disabled={status === "generating"}
                aria-label="Number of questions"
                className="h-9 flex-1 cursor-pointer accent-[var(--qs-brand)] disabled:opacity-60 sm:h-11"
              />
              <span className="min-w-7 text-right text-[20px] font-bold tabular-nums text-[var(--qs-ink)] sm:min-w-8 sm:text-[26px]">
                {totalQuestions}
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-4 text-[var(--qs-muted)] sm:mb-4 sm:text-[13px] sm:leading-5">
              Choose between 1 and {MAX_QUESTIONS} subjective questions.
            </p>

            <div className="flex flex-wrap gap-3 sm:gap-5">
              <div className="min-w-0 flex-[3_1_340px]">
                <div className="mb-1 flex justify-between gap-2 text-[11.5px] font-semibold text-[var(--qs-ink)] sm:mb-1.5 sm:gap-3 sm:text-[13px]">
                  <span>Difficulty split</span>
                  <span className="text-[var(--qs-brand)]">
                    {difficultySum} / {totalQuestions}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
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
                <div
                  className={cn(
                    "mt-2 rounded-[9px] border-[1.5px] px-2 py-1.5 text-center text-[11px] font-bold tabular-nums sm:mt-3 sm:rounded-[12px] sm:border-2 sm:px-2.5 sm:py-2.5 sm:text-sm",
                    difficultyBalanced
                      ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]"
                      : "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]"
                  )}
                >
                  {easy} + {medium} + {hard} = {difficultySum}{" "}
                  {difficultyBalanced ? "· Balanced" : `≠ ${totalQuestions} — adjust`}
                </div>
              </div>

              <div className="min-w-0 flex-[2_1_240px]">
                <div className="mb-1 flex justify-between gap-2 text-[11.5px] font-semibold text-[var(--qs-ink)] sm:mb-1.5 sm:gap-3 sm:text-[13px]">
                  <span>Theory vs numerical</span>
                  <span className="text-[var(--qs-brand)]">
                    {theory}T · {numerical}N
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
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
                    labelClass="text-[#0b6577]"
                    value={numerical}
                    disabled={status === "generating"}
                    decreaseDisabled={numerical <= 0}
                    increaseDisabled={categorySum >= totalQuestions}
                    onDecrease={() => setNumerical(Math.max(0, numerical - 1))}
                    onIncrease={() => setNumerical(numerical + 1)}
                  />
                </div>
                <div
                  className={cn(
                    "mt-2 rounded-[9px] border-[1.5px] px-2 py-1.5 text-center text-[11px] font-bold tabular-nums sm:mt-3 sm:rounded-[12px] sm:border-2 sm:px-2.5 sm:py-2.5 sm:text-sm",
                    categoryBalanced
                      ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]"
                      : "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]"
                  )}
                >
                  {theory} + {numerical} = {categorySum}{" "}
                  {categoryBalanced ? "· Balanced" : `≠ ${totalQuestions} — adjust`}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[2px_3px_0_var(--qs-sun)] sm:rounded-[20px] sm:border-2 sm:shadow-[4px_4px_0_var(--qs-sun)]">
            <div className="border-b border-[var(--qs-ink)] bg-[var(--qs-poly-1)] px-3.5 py-2.5 sm:border-b-2 sm:px-5 sm:py-4">
              <h2 className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)] sm:text-[12px] sm:tracking-[0.12em]">
                Generation summary
              </h2>
              <p className="mt-0.5 text-[20px] font-extrabold leading-tight text-[var(--qs-ink)] sm:mt-1 sm:text-[26px]">
                {totalQuestions} question{totalQuestions === 1 ? "" : "s"}
              </p>
            </div>
            <div className="p-3.5 sm:p-5">
              <SummaryRow label="Type" value={`${theory} theory · ${numerical} numerical`} />
              <SummaryRow label="Difficulty" value={`${easy} easy · ${medium} medium · ${hard} hard`} />
              <SummaryRow label="After generating" value="Review before saving" />

              <div className="flex items-center justify-between gap-2 border-t border-[var(--qs-line)] py-2 text-[11.5px] sm:gap-3 sm:border-t-2 sm:py-2.5 sm:text-sm">
                <label htmlFor="ai-effort" className="text-[var(--qs-muted)]">
                  Effort
                </label>
                <QsSelect<string>
                  id="ai-effort"
                  value="plus"
                  options={[
                    { value: "plus", label: "Plus" },
                    { value: "pro", label: "Pro (coming soon)", disabled: true },
                    { value: "max", label: "Max (coming soon)", disabled: true },
                  ]}
                  onChange={() => {}}
                  disabled={status === "generating"}
                  ariaLabel="Reasoning effort"
                  triggerClassName="h-8 rounded-[8px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] px-2.5 text-[11.5px] font-semibold text-[var(--qs-ink)] sm:h-10 sm:rounded-[12px] sm:border-2 sm:px-3 sm:text-sm"
                  menuClassName="w-56"
                  align="right"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className="mt-2.5 min-h-11 w-full rounded-[11px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3.5 text-[13px] font-bold text-[#1a1240] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:min-h-[52px] sm:rounded-[14px] sm:border-2 sm:px-4 sm:text-base"
              >
                {status === "generating"
                  ? "Generating…"
                  : error
                    ? "Try again"
                    : status === "done"
                      ? "Generate again"
                      : `Generate ${totalQuestions} question${totalQuestions === 1 ? "" : "s"}`}
              </button>
              <button
                type="button"
                onClick={resetCounts}
                disabled={status === "generating"}
                className="mt-2 min-h-9 w-full rounded-[11px] border-[1.5px] border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-[11.5px] font-semibold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50 sm:mt-2.5 sm:min-h-11 sm:rounded-[14px] sm:border-2 sm:px-4 sm:text-sm"
              >
                Reset counts
              </button>

              <p className="mt-2.5 text-[10.5px] leading-4 text-[var(--qs-muted)] sm:mt-3.5 sm:text-[13px] sm:leading-5">
                AI can make mistakes. Review every question before saving it to the bank.
              </p>
            </div>
          </div>

          <div
            aria-live="polite"
            className="rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-bg)] p-4 text-center shadow-[2px_3px_0_var(--qs-sun)] sm:rounded-[20px] sm:border-2 sm:p-6 sm:shadow-[3px_3px_0_var(--qs-sun)]"
          >
            {status === "generating" ? (
              <div className="flex flex-col items-center gap-2 sm:gap-2.5">
                <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-[var(--qs-line)] border-t-[var(--qs-brand)] motion-reduce:animate-none sm:h-6 sm:w-6" />
                <p className="text-[13px] font-semibold text-[var(--qs-ink)] sm:text-[15px]">AI is thinking…</p>
                <p className="text-[11.5px] leading-4 text-[var(--qs-muted)] sm:text-sm sm:leading-5">
                  {thinkingMessages[thinkingIndex]}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <AlertCircle className="h-5 w-5 text-[var(--qs-bad)] sm:h-6 sm:w-6" />
                <p className="text-[13px] font-semibold text-[var(--qs-ink)] sm:text-[15px]">Generation failed</p>
                <p className="max-w-[260px] text-[11.5px] leading-4 text-[var(--qs-muted)] sm:text-sm sm:leading-5">{error}</p>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={!canGenerate}
                  className="mt-1.5 min-h-9 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 text-xs font-bold text-[#1a1240] disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            ) : status === "done" ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-7 w-7 text-[var(--qs-ok)]" />
                <p className="text-[15px] font-semibold text-[var(--qs-ink)]">
                  {items.length} question{items.length === 1 ? "" : "s"} ready
                </p>
                <p className="text-sm leading-5 text-[var(--qs-muted)]">
                  Review, edit and approve the ones you like below.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("generated-questions")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  className="mt-1.5 min-h-9 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 text-xs font-bold text-[#1a1240]"
                >
                  Review questions
                </button>
              </div>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-[var(--qs-ink)]">Ready to generate</p>
                <p className="mt-1.5 text-sm leading-5 text-[var(--qs-muted)]">
                  Your {totalQuestions} question{totalQuestions === 1 ? "" : "s"} will appear here for
                  review once you hit Generate.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>

      {status === "done" && (
        <section id="generated-questions" aria-live="polite" className="mt-6 scroll-mt-20 sm:mt-10 sm:scroll-mt-24">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-[18px] font-extrabold text-[var(--qs-ink)] sm:gap-3 sm:text-2xl">
                Generated questions
                <span className="rounded-[8px] bg-[var(--qs-brand)] px-2 text-[13px] font-extrabold text-[var(--qs-on-brand)] sm:rounded-[10px] sm:px-3 sm:text-lg">
                  {items.length}
                </span>
              </h2>
              <p className="mt-0.5 text-[11.5px] text-[var(--qs-muted)] sm:mt-1 sm:text-sm">Review, edit and keep the ones you like.</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {summary.map(([difficulty, count]) => (
                <span
                  key={difficulty}
                  className={cn(
                    "rounded-full border border-current px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.04em] sm:border-2 sm:px-3 sm:text-[11px] sm:tracking-[0.05em]",
                    TONE_TEXT[difficulty] ?? "text-[var(--qs-muted)]"
                  )}
                >
                  {difficulty} {count}
                </span>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="mt-3 rounded-[14px] border-[1.5px] border-dashed border-[var(--qs-line)] p-5 text-center text-[12px] text-[var(--qs-muted)] sm:mt-4 sm:rounded-[22px] sm:border-2 sm:p-6 sm:text-sm">
              All questions removed. Generate a new set above.
            </div>
          ) : (
            <>
              <div className="mt-3 grid gap-2.5 sm:mt-5 sm:gap-4">
                {items.map((item, index) => (
                  <article
                    key={`${item.num}-${index}`}
                    className={cn(
                      "rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 py-3 transition-all sm:rounded-[22px] sm:border-2 sm:px-5 sm:py-4",
                      item.selected && "-translate-x-0.5 -translate-y-0.5 shadow-[6px_6px_0_var(--qs-sun)]",
                      busyIndex === index && "opacity-45"
                    )}
                  >
                    <div className="mb-2.5 flex flex-wrap items-center gap-1.5 sm:mb-3 sm:gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItem(index)}
                        aria-label={`Select question ${index + 1}`}
                        className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--qs-brand)] sm:h-5 sm:w-5"
                      />
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-[10.5px] font-extrabold text-[var(--qs-bg)] sm:h-8 sm:w-8 sm:text-[13px]">
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border border-current px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.04em] sm:border-2 sm:px-2.5 sm:text-[11px] sm:tracking-[0.05em]",
                          TONE_TEXT[item.difficulty.toLowerCase()] ?? "text-[var(--qs-muted)]"
                        )}
                      >
                        {item.difficulty}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border border-current px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.04em] sm:border-2 sm:px-2.5 sm:text-[11px] sm:tracking-[0.05em]",
                          TONE_TEXT[item.kind.toLowerCase()] ?? "text-[var(--qs-muted)]"
                        )}
                      >
                        {item.kind}
                      </span>
                    </div>

                    {editingIndex === index ? (
                      <div
                        ref={editRef}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={() => saveEdit(index)}
                        className="whitespace-pre-wrap rounded-md text-[13.5px] font-medium leading-relaxed sm:text-[17px] text-[var(--qs-ink)] outline outline-[3px] outline-offset-[6px] outline-[var(--qs-brand)]"
                      >
                        {QUESTION_PLAIN(item)}
                      </div>
                    ) : item.questionHtml?.trim() ? (
                      <QuestionHtml html={item.questionHtml} />
                    ) : (
                      <div className="text-[13.5px] font-medium leading-relaxed text-[var(--qs-ink)] sm:text-[17px]">
                        {item.question}
                      </div>
                    )}

                    <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => (editingIndex === index ? saveEdit(index) : setEditingIndex(index))}
                        className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--qs-line)] px-2.5 py-1.5 text-[11.5px] font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)] sm:gap-1.5 sm:rounded-[10px] sm:border-2 sm:px-3 sm:text-[13px]"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        {editingIndex === index ? "Done" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateClick(index)}
                        disabled={busyIndex !== null}
                        aria-expanded={regenerateIndex === index}
                        className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--qs-line)] px-2.5 py-1.5 text-[11.5px] font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)] sm:gap-1.5 sm:rounded-[10px] sm:border-2 sm:px-3 sm:text-[13px] disabled:opacity-50"
                      >
                        <RotateCcw className={cn("h-3.5 w-3.5", busyIndex === index && "animate-spin")} />
                        {busyIndex === index ? "Regenerating…" : "Regenerate"}
                      </button>
                      {item.bankQuestionId ? (
                        <button
                          type="button"
                          onClick={() => void approve(item.bankQuestionId)}
                          disabled={pendingId !== null || isApproved(item.bankQuestionId)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-[8px] border px-2.5 py-1.5 text-[11.5px] font-bold transition disabled:cursor-not-allowed sm:gap-1.5 sm:rounded-[10px] sm:border-2 sm:px-3 sm:text-[13px]",
                            isApproved(item.bankQuestionId)
                              ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]"
                              : "border-[var(--qs-line)] text-[var(--qs-ink)] hover:border-[var(--qs-ok)] hover:text-[var(--qs-ok)] disabled:opacity-50"
                          )}
                        >
                          {pendingId === item.bankQuestionId ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          {isApproved(item.bankQuestionId) ? "Approved" : "Approve"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => deleteItem(index)}
                        className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--qs-line)] px-2.5 py-1.5 text-[11.5px] font-bold text-[var(--qs-bad)] transition hover:border-[var(--qs-bad)] sm:gap-1.5 sm:rounded-[10px] sm:border-2 sm:px-3 sm:text-[13px]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>

                    {regenerateIndex === index && (
                      <div className="mt-2.5 rounded-[10px] border-[1.5px] border-[var(--qs-brand)] bg-[var(--qs-bg)] p-2.5 sm:mt-3 sm:rounded-[12px] sm:border-2 sm:p-3">
                        <input
                          autoFocus
                          value={regenerateInstruction}
                          onChange={(event) => setRegenerateInstruction(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void regenerateOne(index, regenerateInstruction);
                            }
                            if (event.key === "Escape") {
                              setRegenerateIndex(null);
                              setRegenerateInstruction("");
                            }
                          }}
                          placeholder="Optional: describe the kind of question you want…"
                          aria-label={`Instruction for regenerating question ${index + 1}`}
                          className="h-8 w-full rounded-[8px] border-[1.5px] border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-[11.5px] font-medium sm:h-9 sm:border-2 sm:px-3 sm:text-[13px] text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void regenerateOne(index, regenerateInstruction)}
                            disabled={busyIndex !== null}
                            className="inline-flex items-center gap-1.5 rounded-[9px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 py-1.5 text-[12px] font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RotateCcw className={cn("h-3.5 w-3.5", busyIndex === index && "animate-spin")} />
                            {busyIndex === index ? "Regenerating…" : "Regenerate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRegenerateIndex(null);
                              setRegenerateInstruction("");
                            }}
                            className="inline-flex items-center rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[12px] font-bold text-[var(--qs-muted)] hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)]"
                          >
                            Cancel
                          </button>
                          <span className="text-[11px] font-medium text-[var(--qs-muted)]">Empty is fine</span>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>

              <div className="sticky bottom-2 z-10 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[12px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] px-2.5 py-2 shadow-[2px_3px_0_var(--qs-sun)] sm:bottom-3 sm:mt-6 sm:gap-3 sm:rounded-[18px] sm:border-2 sm:px-4 sm:py-3 sm:shadow-[4px_4px_0_var(--qs-sun)]">
                <div className="min-w-0">
                  <span className="text-[11.5px] font-extrabold text-[var(--qs-ink)] sm:text-sm">
                    {selectedCount} of {items.length} selected
                  </span>
                  {selectedCount === 0 && (
                    <p className="text-[9.5px] font-semibold text-[var(--qs-muted)] sm:text-[11px]">Select questions to download or copy.</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button type="button" onClick={selectAll} className="b sm">
                    Select all
                  </button>
                  <AiGenerateButton
                    size="sm"
                    label="Regenerate all"
                    onClick={() => void handleGenerate()}
                    disabled={!canGenerate}
                  />
                  <button
                    type="button"
                    onClick={openExportDialog}
                    disabled={selectedCount === 0 || downloading}
                    className="b b-pri sm gap-1.5 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4" />
                    {downloading ? "Preparing…" : "Download PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copySelected()}
                    disabled={selectedCount === 0}
                    className="b sm gap-1.5 disabled:cursor-not-allowed"
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

      <PaperExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        meta={paperHeader}
        onChange={setPaperHeader}
        onDownload={() => void downloadSelected()}
        downloading={downloading}
        questionCount={selectedCount}
      />

      {headerChoiceDialog}
    </div>
  );
}
