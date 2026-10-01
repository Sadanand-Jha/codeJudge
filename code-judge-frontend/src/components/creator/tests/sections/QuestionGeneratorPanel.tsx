"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
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
  Target,
  Gauge,
  Layers3,
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

/** Accent colours for the thin sliders (track fill, thumb, value badge). */
const SLIDER_ACCENTS: Record<string, { track: string; thumb: string; text: string }> = {
  total: { track: "linear-gradient(90deg, #EC4899, #7C3AED)", thumb: "#EC4899", text: "text-pink-600 dark:text-pink-400" },
  easy: { track: "#10B981", thumb: "#10B981", text: "text-emerald-600 dark:text-emerald-400" },
  medium: { track: "#F59E0B", thumb: "#F59E0B", text: "text-amber-600 dark:text-amber-400" },
  hard: { track: "#F43F5E", thumb: "#F43F5E", text: "text-rose-600 dark:text-rose-400" },
  theory: { track: "#8B5CF6", thumb: "#8B5CF6", text: "text-violet-600 dark:text-violet-400" },
  numerical: { track: "#06B6D4", thumb: "#06B6D4", text: "text-cyan-600 dark:text-cyan-400" },
};

/**
 * Thin custom slider — a 2px track with a gradient/solid fill, a round thumb and
 * a value badge. An invisible native <input type="range"> on top handles drag.
 */
const thinSlider = (
  label: string,
  value: number,
  min: number,
  max: number,
  onChange: (v: number) => void,
  disabled: boolean,
  accent: string
) => {
  const a = SLIDER_ACCENTS[accent];
  const pct = max > min ? Math.round(((value - min) / (max - min)) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-text-primary">{label}</label>
        <span className={`inline-flex h-6 min-w-8 items-center justify-center rounded-lg border border-border bg-card px-2 text-[12px] font-extrabold tabular-nums ${a.text}`}>{value}</span>
      </div>
      <div className="relative h-6 w-full">
        <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-slate-200 dark:bg-zinc-600/70">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: a.track }} />
        </div>
        <span className="pointer-events-none absolute top-1/2 z-20 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.25)]" style={{ left: `${pct}%`, background: a.thumb }} />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-grab opacity-0 active:cursor-grabbing"
        />
      </div>
    </div>
  );
};

/**
 * Compact section heading used across the workspace rows — a small accent chip
 * plus a title and optional hint, so each row reads as a titled section without
 * needing its own heavy card.
 */
const SectionHeading = ({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) => (
  <div className="mb-2.5 flex items-center gap-2">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-card-hover/50 text-accent">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="truncate text-[11px] font-extrabold uppercase tracking-wider text-text-primary">{title}</p>
      {hint && <p className="truncate text-[10px] text-text-muted">{hint}</p>}
    </div>
  </div>
);

/**
 * Compact inline numeric input with a tiny coloured label above it. Used for
 * the Difficulty and Category counts so several fit on one horizontal line.
 */
const compactCounter = ({
  label,
  value,
  onChange,
  max,
  disabled,
  labelClass,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  disabled: boolean;
  labelClass: string;
}) => (
  <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
    <span className={`truncate text-[10px] font-bold uppercase tracking-wide ${labelClass}`}>{label}</span>
    <input
      type="number"
      min={0}
      max={max}
      value={value}
      onChange={(event) => onChange(Math.max(0, Math.min(max, Math.floor(Number(event.target.value) || 0))))}
      disabled={disabled}
      aria-label={label}
      className="h-9 w-full rounded-lg border border-border bg-card px-2 text-center text-sm font-bold text-text-primary tabular-nums outline-none transition-all focus:border-pink-500/50 disabled:opacity-50"
    />
  </div>
);

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

  // Reset the effort preview to "Plus" every time the popover closes, so it
  // opens fresh on the default instead of remembering the last selection.
  useEffect(() => {
    if (!effortOpen) setEffortPreview(0);
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
    const clamped = Math.min(25, Math.max(1, Math.floor(next) || 1));
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
      const composed = response.questions.filter((q) => q.aiGenerated).length;
      toast.success({
        title: "Questions ready",
        description:
          composed > 0
            ? `${response.questions.length - composed} from bank + ${composed} AI-written on your topic.`
            : `${response.questions.length} handpicked questions on your topic.`,
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 text-white">
              <ListChecks className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-extrabold text-text-primary">AI Question Generator</h2>
              <p className="truncate text-[11px] text-text-muted">
                Pick any number of subjective questions — hardness you decide, topic you give, perfect picks by AI.
              </p>
            </div>
          </div>
          <div className="relative shrink-0" ref={effortWrapRef}>
            <button
              type="button"
              onClick={() => setEffortOpen((open) => !open)}
              disabled={status === "generating"}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[11px] font-semibold text-text-secondary transition-all hover:border-violet-400/40 hover:bg-card-hover disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3 text-violet-500" />
              <span className="text-text-muted">Effort</span>
              <span className="font-extrabold text-blue-500">Plus</span>
              <ChevronDown className={cn("h-3 w-3 text-text-muted transition-transform", effortOpen && "rotate-180")} />
            </button>

            {effortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 top-full z-50 mt-2 w-[300px] max-w-[calc(100vw-1.5rem)] rounded-[20px] border border-slate-200/90 bg-white/95 px-3.5 pb-3 pt-2.5 shadow-[0_16px_42px_rgba(30,41,59,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[#242424]/98 dark:shadow-[0_16px_44px_rgba(0,0,0,0.38)]"
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
        </div>

        <div className="border-b border-border/60 px-4 py-3">
          <SectionHeading icon={<Target className="h-3.5 w-3.5" />} title="Question Scope" hint="Filter the bank AI picks from" />
          <QuestionBankFilters
            subjectId={subjectId}
            onSubjectChange={setSubjectId}
            multiple
            chapterIds={chapterIds}
            topicIds={topicIds}
            onChapterIdsChange={setChapterIds}
            onTopicIdsChange={setTopicIds}
            disabled={status === "generating"}
            columns="md:grid-cols-[25fr_35fr_40fr]"
          />
        </div>

          <div className="border-b border-border/60 px-4 py-3">
            <SectionHeading icon={<Gauge className="h-3.5 w-3.5" />} title="Generation Settings" hint="Counts must add up to the total" />
            <div className="grid gap-4 md:grid-cols-[20fr_45fr_35fr]">
              <div className="md:pr-4">
                {thinSlider("Number of questions", total, 1, 25, (v) => handleTotalChange(v), status === "generating", "total")}
              </div>
              <div className="md:border-x md:border-border md:px-4">
                <p className="mb-1.5 text-[11px] font-bold text-text-primary">Difficulty</p>
                <div className="flex gap-2">
                  {compactCounter({ label: "Easy", value: easy, onChange: (v) => setEasy(v), max: 25, disabled: status === "generating", labelClass: "text-emerald-600 dark:text-emerald-400" })}
                  {compactCounter({ label: "Medium", value: medium, onChange: (v) => setMedium(v), max: 25, disabled: status === "generating", labelClass: "text-amber-600 dark:text-amber-400" })}
                  {compactCounter({ label: "Hard", value: hard, onChange: (v) => setHard(v), max: 25, disabled: status === "generating", labelClass: "text-rose-600 dark:text-rose-400" })}
                </div>
                {sumMismatch ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3 shrink-0" /> Easy + Medium + Hard = {sum}, must equal Total ({total}).
                  </p>
                ) : (
                  <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-text-muted">
                    <span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{easy}</span> easy ·{" "}
                      <span className="font-bold text-amber-600 dark:text-amber-400">{medium}</span> medium ·{" "}
                      <span className="font-bold text-rose-600 dark:text-rose-400">{hard}</span> hard
                    </span>
                    <button type="button" onClick={applyAutoSplit} className="font-bold text-pink-500 hover:text-pink-600">Reset 40/30/30</button>
                  </p>
                )}
              </div>
              <div className="md:pl-4">
                <p className="mb-1.5 text-[11px] font-bold text-text-primary">Category</p>
                <div className="flex gap-2">
                  {compactCounter({ label: "Theory", value: theory, onChange: (v) => setTheory(v), max: 25, disabled: status === "generating", labelClass: "text-violet-600 dark:text-violet-400" })}
                  {compactCounter({ label: "Numerical", value: numerical, onChange: (v) => setNumerical(v), max: 25, disabled: status === "generating", labelClass: "text-cyan-600 dark:text-cyan-400" })}
                </div>
                {categorySumMismatch ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3 shrink-0" /> Theory + Numerical = {categorySum}, must equal Total ({total}).
                  </p>
                ) : (
                  <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-text-muted">
                    <span>
                      <span className="font-bold text-violet-600 dark:text-violet-400">{theory}</span> theory ·{" "}
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">{numerical}</span> numerical
                    </span>
                    <button type="button" onClick={applyAutoCategorySplit} className="font-bold text-pink-500 hover:text-pink-600">Auto 60/40</button>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div>
                <label className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold text-text-primary">
                  <span className="flex items-center gap-1.5">
                    <Layers3 className="h-3.5 w-3.5 text-text-muted" />
                    Syllabus / instructions <span className="font-medium text-text-muted">(optional)</span>
                  </span>
                  <span className="text-[10px] font-medium text-text-muted tabular-nums">{syllabus.length}/4000</span>
                </label>
                <textarea
                  value={syllabus}
                  onChange={(event) => setSyllabus(event.target.value)}
                  disabled={status === "generating"}
                  maxLength={4000}
                  rows={2}
                  placeholder="e.g. Focus on conceptual questions, avoid repeated patterns, include process synchronization…"
                  className="w-full resize-y rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-text-primary outline-none transition-all placeholder:text-[11px] placeholder:text-text-muted placeholder:opacity-60 focus:border-pink-500/50 disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col justify-end gap-1.5">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={status === "generating" || sumMismatch || categorySumMismatch || !subjectId}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:shadow-none"
                >
                  {status === "generating" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {status === "generating" ? "Generating questions…" : "Generate Questions"}
                </button>
                {status === "generating" && (
                  <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" /> Don&apos;t close this window · 30 sec–1 min
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="px-4 pb-3">
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            </div>
          )}
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
                    {q.aiGenerated && (
                      <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                        AI-written
                      </span>
                    )}
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
