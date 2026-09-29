"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { generateSubjectiveQuestions } from "@/services/aiGenerate";
import type { SubjectiveQuestion } from "./paperTypes";

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
  const [kind, setKind] = useState<"any" | "theory" | "numerical">("any");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<GeneratorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SubjectiveQuestion[]>([]);
  const [copied, setCopied] = useState(false);

  const sum = easy + medium + hard;
  const sumMismatch = sum !== total;

  const applyAutoSplit = useCallback(() => {
    const s = splitFor(total);
    setEasy(s.easy);
    setMedium(s.medium);
    setHard(s.hard);
  }, [total]);

  const handleTotalChange = useCallback((next: number) => {
    const clamped = Math.min(50, Math.max(1, Math.floor(next) || 1));
    setTotal(clamped);
    const s = splitFor(clamped);
    setEasy(s.easy);
    setMedium(s.medium);
    setHard(s.hard);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (sumMismatch) return;
    setError(null);
    setQuestions([]);
    setCopied(false);
    abortRef.current = new AbortController();
    setStatus("generating");

    try {
      const response = await generateSubjectiveQuestions(
        {
          numberOfQuestions: total,
          easyCount: easy,
          mediumCount: medium,
          hardCount: hard,
          syllabus: topic.trim() || undefined,
          kind,
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
  }, [total, easy, medium, hard, topic, kind, sumMismatch, toast]);

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
      <div className="rounded-2xl border border-border bg-card p-5">
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

        <div className="mt-4 space-y-4">
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

          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-primary">Question kind</label>
            <div className="grid grid-cols-3 gap-2">
              {(["any", "theory", "numerical"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  disabled={status === "generating"}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-bold capitalize transition-all disabled:opacity-50",
                    kind === k
                      ? "border-pink-500/50 bg-pink-500/8 text-pink-500"
                      : "border-border bg-card-hover/40 text-text-secondary hover:border-border-hover"
                  )}
                >
                  {k === "any" ? "Any" : k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-primary">
              Topic / syllabus <span className="font-medium text-text-muted">(optional)</span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={status === "generating"}
              rows={3}
              placeholder="e.g. Deadlocks — prevention, avoidance, Banker's algorithm…"
              className="w-full resize-y rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-pink-500/50 disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={status === "generating" || sumMismatch}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:shadow-none"
          >
            {status === "generating" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {status === "generating" ? "Picking questions…" : "Generate Questions"}
          </button>

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
