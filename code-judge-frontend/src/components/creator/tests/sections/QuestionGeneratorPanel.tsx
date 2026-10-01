"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  ListChecks,
  Lock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { generateSubjectiveQuestions } from "@/services/aiGenerate";
import type { SubjectiveQuestion } from "./paperTypes";
import { QuestionBankFilters } from "./QuestionBankFilters";

type GeneratorStatus = "idle" | "generating" | "done" | "error";

const splitFor = (total: number) => {
  const easy = Math.round(total * 0.4);
  const medium = Math.round(total * 0.3);
  return { easy, medium, hard: total - easy - medium };
};

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function QuestionGeneratorPanel() {
  const toast = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const [total, setTotal] = useState(5);
  const [easy, setEasy] = useState(2);
  const [medium, setMedium] = useState(2);
  const [hard, setHard] = useState(1);
  const [theory, setTheory] = useState(3);
  const [numerical, setNumerical] = useState(2);
  const [reasoningEffort] = useState<"plus" | "pro" | "max">("plus");
  const [effortPreview, setEffortPreview] = useState(0);
  const [effortOpen, setEffortOpen] = useState(false);
  const effortWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!effortOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (effortWrapRef.current && !effortWrapRef.current.contains(event.target as Node)) {
        setEffortOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEffortOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [effortOpen]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterIds, setChapterIds] = useState<number[]>([]);
  const [topicIds, setTopicIds] = useState<number[]>([]);
  const [syllabus, setSyllabus] = useState("");
  const [status, setStatus] = useState<GeneratorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SubjectiveQuestion[]>([]);
  const [copied, setCopied] = useState(false);

  const sum = easy + medium + hard;
  const sumMismatch = sum !== total;
  const categorySum = theory + numerical;
  const categorySumMismatch = categorySum !== total;

  const applyAutoSplit = useCallback(() => {
    const s = splitFor(total);
    setEasy(s.easy);
    setMedium(s.medium);
    setHard(s.hard);
  }, [total]);

  const applyAutoCategorySplit = useCallback(() => {
    const nextTheory = Math.round(total * 0.6);
    setTheory(nextTheory);
    setNumerical(total - nextTheory);
  }, [total]);

  const handleTotalChange = useCallback((next: number) => {
    const clamped = Math.min(50, Math.max(1, Math.floor(next) || 1));
    setTotal(clamped);
    const s = splitFor(clamped);
    setEasy(s.easy);
    setMedium(s.medium);
    setHard(s.hard);
    const nextTheory = Math.round(clamped * 0.6);
    setTheory(nextTheory);
    setNumerical(clamped - nextTheory);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (sumMismatch || categorySumMismatch || !subjectId) return;
    setError(null);
    setQuestions([]);
    setCopied(false);
    setEffortOpen(false);
    abortRef.current = new AbortController();
    setStatus("generating");

    try {
      const response = await generateSubjectiveQuestions(
        {
          numberOfQuestions: total,
          easyCount: easy,
          mediumCount: medium,
          hardCount: hard,
          theoryCount: theory,
          numericalCount: numerical,
          reasoningEffort,
          subjectId,
          chapterIds,
          topicIds,
          syllabus: syllabus.trim() || undefined,
        },
        abortRef.current.signal
      );
      setQuestions(response.questions);
      setStatus("done");
      toast.success({
        title: "Questions ready",
        description: `${response.questions.length} handpicked questions on your topic.`,
      });
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(err?.message || "Failed to generate questions. Please try again.");
      setStatus("error");
    }
  }, [total, easy, medium, hard, theory, numerical, reasoningEffort, subjectId, chapterIds, topicIds, syllabus, sumMismatch, categorySumMismatch, toast]);

  const handleCopyAll = useCallback(async () => {
    if (questions.length === 0) return;
    const text = questions
      .map((q, i) => `Q${i + 1}. [${q.difficulty} | ${q.kind}] ${q.question}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success({ title: "Copied", description: "All questions copied to clipboard." });
    } catch {
      toast.error({ title: "Copy failed", description: "Clipboard is not available." });
    }
  }, [questions, toast]);

  const numInput =
    "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold text-text-primary tabular-nums outline-none transition-all focus:border-pink-500/50 disabled:opacity-50";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="rounded-t-2xl border-b border-border bg-gradient-to-r from-pink-500/[0.07] via-violet-500/[0.05] to-transparent p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white">
            <ListChecks className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Question Generator</h3>
            <p className="text-[11px] text-text-muted">
              Pick any number of subjective questions — hardness you decide, topic you give, perfect picks by AI.
            </p>
          </div>
        </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-2xl border border-border bg-card-hover/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-text-primary">Difficulty distribution</p>
                <p className="mt-0.5 text-[10px] text-text-muted">Set the exact hardness mix for the generated set.</p>
              </div>
            </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-text-primary">Total</label>
              <input
                type="number"
                min={1}
                max={50}
                value={total}
                onChange={(e) => handleTotalChange(Number(e.target.value))}
                disabled={status === "generating"}
                className={numInput}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-emerald-600 dark:text-emerald-400">Easy</label>
              <input
                type="number"
                min={0}
                max={50}
                value={easy}
                onChange={(e) => setEasy(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                disabled={status === "generating"}
                className={numInput}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-amber-600 dark:text-amber-400">Medium</label>
              <input
                type="number"
                min={0}
                max={50}
                value={medium}
                onChange={(e) => setMedium(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                disabled={status === "generating"}
                className={numInput}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-rose-600 dark:text-rose-400">Hard</label>
              <input
                type="number"
                min={0}
                max={50}
                value={hard}
                onChange={(e) => setHard(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                disabled={status === "generating"}
                className={numInput}
              />
            </div>
          </div>

          {sumMismatch ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Easy + Medium + Hard ({sum}) must equal Total ({total}).
              </p>
              <button
                type="button"
                onClick={applyAutoSplit}
                className="text-[11px] font-bold text-pink-500 hover:text-pink-600"
              >
                Auto-fix split
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-text-muted">
              Split: {easy} easy · {medium} medium · {hard} hard.{" "}
              <button
                type="button"
                onClick={applyAutoSplit}
                className="font-bold text-pink-500 hover:text-pink-600"
              >
                Reset to 40/30/30
              </button>
            </p>
          )}
          </div>

          <div className="rounded-2xl border border-border bg-card-hover/30 p-4">
            <div className="mb-3">
              <p className="text-xs font-extrabold text-text-primary">Category distribution</p>
              <p className="mt-0.5 text-[10px] text-text-muted">AI will return exactly this many questions from each category.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-violet-600 dark:text-violet-400">Theory</label>
                <input type="number" min={0} max={50} value={theory} onChange={(event) => setTheory(Math.max(0, Math.floor(Number(event.target.value) || 0)))} disabled={status === "generating"} className={numInput} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-cyan-600 dark:text-cyan-400">Numerical</label>
                <input type="number" min={0} max={50} value={numerical} onChange={(event) => setNumerical(Math.max(0, Math.floor(Number(event.target.value) || 0)))} disabled={status === "generating"} className={numInput} />
              </div>
            </div>
            <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${categorySumMismatch ? "border-amber-500/20 bg-amber-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
              <p className={`text-[11px] font-semibold ${categorySumMismatch ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                Theory + Numerical = {categorySum} / {total}
              </p>
              <button type="button" onClick={applyAutoCategorySplit} className="text-[11px] font-bold text-pink-500 hover:text-pink-600">Auto 60/40</button>
            </div>
          </div>

          <QuestionBankFilters
            subjectId={subjectId}
            onSubjectChange={setSubjectId}
            multiple
            chapterIds={chapterIds}
            topicIds={topicIds}
            onChapterIdsChange={setChapterIds}
            onTopicIdsChange={setTopicIds}
            disabled={status === "generating"}
          />

          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-primary">
              Syllabus / instructions <span className="font-medium text-text-muted">(optional)</span>
            </label>
            <textarea
              value={syllabus}
              onChange={(event) => setSyllabus(event.target.value)}
              disabled={status === "generating"}
              maxLength={4000}
              rows={3}
              placeholder="e.g. Focus on conceptual questions, avoid repeated patterns, include process synchronization…"
              className="w-full resize-y rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-pink-500/50 disabled:opacity-50"
            />
            <p className="mt-1 text-right text-[10px] text-text-muted">{syllabus.length}/4000</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative w-fit" ref={effortWrapRef}>
              <button
                type="button"
                onClick={() => setEffortOpen((open) => !open)}
                disabled={status === "generating"}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[11px] font-semibold text-text-secondary shadow-sm transition-all hover:border-violet-400/40 hover:bg-card-hover disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3 text-violet-500" />
                <span className="text-text-muted">Effort</span>
                <span className="font-extrabold text-blue-500">Plus</span>
                <ChevronDown className={cn("h-3 w-3 text-text-muted transition-transform", effortOpen && "rotate-180")} />
              </button>

              {effortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-full left-0 z-50 mb-2 w-[300px] rounded-[20px] border border-slate-200/90 bg-white/95 px-3.5 pb-3 pt-2.5 shadow-[0_16px_42px_rgba(30,41,59,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[#242424]/98 dark:shadow-[0_16px_44px_rgba(0,0,0,0.38)]"
                >
                  <div className="flex items-start justify-between">
                    <Sparkles className="mt-1 h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
                    <div className="text-center leading-tight">
                      <p className={cn("text-[11px] font-extrabold", effortPreview === 0 ? "text-blue-500" : effortPreview === 1 ? "text-violet-600 dark:text-violet-300" : "text-amber-700 dark:text-amber-300")}>
                        {effortPreview === 0 ? "Plus" : effortPreview === 1 ? "Pro" : "Max"}
                      </p>
                      <p className={cn("mt-0.5 flex items-center justify-center gap-1 text-[8px] font-semibold", effortPreview === 0 ? "text-slate-500 dark:text-zinc-400" : "text-amber-600 dark:text-amber-300")}>
                        {effortPreview === 0 ? <><Check className="h-2.5 w-2.5" /> Current selection</> : <><Lock className="h-2.5 w-2.5" /> Coming soon · Plus will be used</>}
                      </p>
                    </div>
                    <button type="button" onClick={() => setEffortPreview(0)} className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-blue-500 dark:text-zinc-500 dark:hover:bg-white/5" title="Reset to Plus">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="relative mt-2 h-[46px]">
                    <div className="absolute inset-x-0 top-0 h-7 rounded-full border border-slate-200 bg-slate-200/90 shadow-inner dark:border-white/[0.06] dark:bg-zinc-600/80">
                      <motion.div className={cn("h-full rounded-full", effortPreview === 2 ? "bg-gradient-to-r from-blue-500 via-violet-500 to-amber-500" : "bg-gradient-to-r from-blue-500 to-violet-500")} animate={{ width: effortPreview === 0 ? "14%" : effortPreview === 1 ? "50%" : "91%" }} />
                    </div>
                    <motion.span className="pointer-events-none absolute top-[-2px] z-30 h-8 w-8 -translate-x-1/2 rounded-full border-[3px] border-white bg-white shadow-[0_3px_10px_rgba(30,41,59,0.28)]" animate={{ left: effortPreview === 0 ? "14%" : effortPreview === 1 ? "50%" : "91%" }} transition={{ type: "spring", stiffness: 420, damping: 25 }} />
                    <input type="range" min={0} max={2} step={1} value={effortPreview} onChange={(event) => setEffortPreview(Number(event.target.value))} aria-label="Preview reasoning effort" className="absolute inset-x-0 top-0 z-40 h-8 w-full cursor-grab opacity-0 active:cursor-grabbing" />
                    <span className="absolute left-[14%] top-[34px] -translate-x-1/2 text-[8px] font-extrabold text-blue-500">Plus</span>
                    <span className="absolute left-1/2 top-[34px] -translate-x-1/2 whitespace-nowrap text-[8px] font-bold text-violet-600 dark:text-violet-300"><Lock className="mr-0.5 inline h-2 w-2" />Pro</span>
                    <span className="absolute right-[9%] top-[34px] translate-x-1/2 whitespace-nowrap text-[8px] font-black text-amber-700 dark:text-amber-300"><Lock className="mr-0.5 inline h-2 w-2" />Max</span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={status === "generating" || sumMismatch || categorySumMismatch || !subjectId}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:shadow-none"
              >
                {status === "generating" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {status === "generating" ? "Generating questions…" : "Generate Questions"}
              </button>
              {status === "generating" && (
                <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3" /> Don&apos;t close this window · Expected time: 30 sec–1 min
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          )}
        </div>
      </div>

      {questions.length > 0 && status === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
            <p className="text-sm font-extrabold text-text-primary">
              {questions.length} questions picked
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-text-primary transition-all hover:border-border-hover"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Regenerate
              </button>
              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy all"}
              </button>
            </div>
          </div>
          <div className="space-y-3 px-5 py-4">
            {questions.map((q, i) => (
              <div key={`${q.num}-${i}`} className="flex gap-2.5 text-[13px]">
                <span className="shrink-0 font-bold text-text-primary tabular-nums">Q{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary">{q.question}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", DIFFICULTY_STYLE[q.difficulty] ?? "bg-card-hover text-text-secondary")}>
                      {q.difficulty}
                    </span>
                    <span className="rounded-full bg-card-hover px-2 py-0.5 text-[10px] font-bold text-text-secondary">
                      {q.kind}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
