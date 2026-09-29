"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
  Download,
  FileText,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { generateQuestionPaper, downloadQuestionPaper } from "@/services/aiGenerate";
import { sectionsToPaperPayload } from "./paperTypes";
import type { Section } from "./types";
import type { QuestionPaper } from "./paperTypes";

interface QuestionsStepProps {
  sections: Section[];
  paperTitle: string;
  onPaperTitleChange: (title: string) => void;
}

type QuestionsStatus = "idle" | "generating" | "done" | "error";

export function QuestionsStep({ sections, paperTitle, onPaperTitleChange }: QuestionsStepProps) {
  const toast = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const [syllabus, setSyllabus] = useState("");
  const [status, setStatus] = useState<QuestionsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [downloading, setDownloading] = useState(false);

  const totalNeeded = useMemo(
    () =>
      sections.reduce(
        (sum, s) =>
          sum +
          s.questionGroups.reduce(
            (gs, g) => gs + (g.type === "NESTED" && g.children ? g.children.length : g.questionCount),
            0
          ),
        0
      ),
    [sections]
  );

  const handleGenerate = useCallback(async () => {
    if (totalNeeded === 0) return;
    setError(null);
    setPaper(null);
    abortRef.current = new AbortController();
    setStatus("generating");

    try {
      const response = await generateQuestionPaper(
        {
          sections: sectionsToPaperPayload(sections),
          title: paperTitle.trim() || undefined,
          syllabus: syllabus.trim() || undefined,
        },
        abortRef.current.signal
      );
      setPaper(response.paper);
      setStatus("done");
      toast.success({
        title: "Question paper ready",
        description: `${response.paper.totalQuestions} questions, ${response.paper.totalMarks} marks across ${response.paper.sections.length} sections.`,
      });
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(err?.message || "Failed to generate the question paper. Please try again.");
      setStatus("error");
    }
  }, [sections, paperTitle, syllabus, totalNeeded, toast]);

  const handleDownload = useCallback(async () => {
    if (!paper) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadQuestionPaper(paper);
      toast.success({
        title: "Downloaded",
        description: "Open the file and print to PDF to share it.",
      });
    } catch (err: any) {
      setError(err?.message || "Failed to download the paper. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [paper, toast]);

  const handleRegenerate = useCallback(() => {
    setPaper(null);
    setError(null);
    setStatus("idle");
    void handleGenerate();
  }, [handleGenerate]);

  let qNo = 0;

  return (
    <div className="space-y-6 pb-36 lg:pb-0">
      {/* Title + syllabus card */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Question Paper</h3>
            <p className="text-[11px] text-text-muted">
              {sections.length} sections · {totalNeeded} questions · AI picks from the question bank
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-primary">Paper title</label>
            <input
              type="text"
              value={paperTitle}
              onChange={(e) => onPaperTitleChange(e.target.value)}
              disabled={status === "generating"}
              placeholder="e.g. Operating Systems — Mid Semester Exam"
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-pink-500/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-primary">
              Syllabus / topics <span className="font-medium text-text-muted">(optional)</span>
            </label>
            <textarea
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              disabled={status === "generating"}
              rows={4}
              placeholder="e.g. Unit 1: Processes & threads, CPU scheduling (FCFS, SJF, Round Robin). Unit 2: Deadlocks, memory management, paging…"
              className="w-full resize-y rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-pink-500/50 disabled:opacity-50"
            />
            <p className="mt-1 text-[11px] text-text-muted">
              The AI prefers bank questions matching these topics while respecting your sections.
            </p>
          </div>

          {status !== "done" && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={status === "generating" || totalNeeded === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:shadow-none"
            >
              {status === "generating" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {status === "generating" ? "Selecting questions…" : "Generate Question Paper"}
            </button>
          )}

          {status === "generating" && (
            <div className="flex items-center gap-2.5 rounded-xl border border-pink-500/20 bg-pink-500/5 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
              <p className="text-xs font-semibold text-text-primary">
                Selecting questions from the bank for each section…
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Paper preview */}
      {paper && status === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-text-primary">{paper.title}</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  {paper.totalQuestions} questions · {paper.totalMarks} marks
                  {paper.durationMinutes ? ` · ${paper.durationMinutes} min` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-text-primary transition-all hover:border-border-hover"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:shadow-none"
                >
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {downloading ? "Preparing…" : "Download Paper"}
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                All questions selected from the bank — section structure respected.
              </p>
            </div>
          </div>

          <div className="space-y-5 px-5 py-4">
            {paper.sections.map((s) => (
              <div key={`${s.order}-${s.label}`}>
                <div className="flex items-center justify-between rounded-lg bg-card-hover/60 px-3 py-2">
                  <p className="text-[13px] font-extrabold text-text-primary">
                    Section {s.label} — {s.name}
                  </p>
                  <span className="text-xs font-bold text-text-secondary tabular-nums">
                    {s.sectionMarks} marks
                  </span>
                </div>
                {s.title && (
                  <p className="mt-1.5 px-1 text-xs font-bold text-text-primary">{s.title}</p>
                )}
                {s.instructions && (
                  <p className="mt-0.5 px-1 text-[11px] italic text-text-secondary">
                    {s.instructions}
                  </p>
                )}
                {s.questionGroups.map((g, gi) => (
                  <div key={`${s.label}-${gi}`} className="mt-3 px-1">
                    <p className="text-xs font-bold text-text-primary">
                      {g.name} ({g.questions.length} × {g.marksPerQuestion} marks)
                    </p>
                    <p className="text-[11px] italic text-text-muted">
                      {g.attemptRule.type === "ANY_N" && g.attemptRule.count
                        ? `Attempt any ${g.attemptRule.count} out of ${g.questions.length} questions.`
                        : "Answer all questions."}
                    </p>
                    <div className="mt-1.5 space-y-2">
                      {g.questions.map((q) => {
                        qNo++;
                        return (
                          <div key={`${s.label}-${gi}-${q.num}`} className="flex gap-2 text-[13px]">
                            <span className="shrink-0 font-bold text-text-primary tabular-nums">
                              Q{qNo}.
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-text-primary">{q.question}</p>
                              <p className="mt-0.5 text-[10px] capitalize text-text-muted">
                                {q.difficulty} · {q.kind}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-bold text-text-secondary tabular-nums">
                              [{q.marks} marks]
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs font-bold text-text-secondary">
              Total: {paper.totalQuestions} questions
            </span>
            <span className="text-xs font-bold text-text-secondary">
              Total Marks: {paper.totalMarks}
            </span>
          </div>
        </motion.div>
      )}

      {totalNeeded === 0 && (
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
          )}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs font-semibold text-text-secondary">
            Go back to Sections and add at least one question group before generating the paper.
          </p>
        </div>
      )}
    </div>
  );
}
