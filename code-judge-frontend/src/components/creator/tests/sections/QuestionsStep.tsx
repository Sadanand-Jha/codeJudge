"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
  Download,
  FileText,
  RotateCcw,
  Clock3,
  WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { generateQuestionPaper, downloadQuestionPaper } from "@/services/aiGenerate";
import { sectionsToPaperPayload } from "./paperTypes";
import type { Section } from "./types";
import type { QuestionPaper } from "./paperTypes";
import { PaperScopeFilters } from "./PaperScopeFilters";
import { AiStreamText } from "@/components/ui";

interface QuestionsStepProps {
  sections: Section[];
  paperTitle: string;
  onPaperTitleChange: (title: string) => void;
}

type QuestionsStatus = "idle" | "generating" | "done" | "error";

const PAPER_LOADING_MESSAGES = [
  "Bringing your question paper to life…",
  "Your paper is beginning to take shape…",
  "Making everything feel clear and well balanced…",
  "Polishing the flow from start to finish…",
  "Giving every section a careful look…",
  "Running a thoughtful quality pass…",
  "Adding the finishing touches…",
  "Fine-tuning the last few details…",
  "Just one last tweak…",
  "Almost there — it’s about to be ready.",
  "Your question paper is nearly done…",
  "Just a little more — good things are worth the wait.",
] as const;

const OVERALL_OPTIONS = [
  {
    id: "easy",
    label: "Easy",
    hint: "Creates an accessible paper with mostly foundational and moderate questions.",
  },
  {
    id: "balanced",
    label: "Balanced",
    hint: "Balanced creates a natural mix of foundational, moderate and challenging questions.",
  },
  {
    id: "challenging",
    label: "Challenging",
    hint: "Creates a more demanding paper with greater emphasis on application and deeper reasoning.",
  },
] as const;

export function QuestionsStep({ sections, paperTitle, onPaperTitleChange }: QuestionsStepProps) {
  const toast = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const [syllabus, setSyllabus] = useState("");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterIds, setChapterIds] = useState<number[]>([]);
  const [topicIds, setTopicIds] = useState<number[]>([]);
  const [overall, setOverall] = useState<"easy" | "balanced" | "challenging">("balanced");
  const [status, setStatus] = useState<QuestionsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (status !== "generating") return;
    const interval = window.setInterval(() => {
      setLoadingMessageIndex((current) => Math.min(current + 1, PAPER_LOADING_MESSAGES.length - 1));
    }, 10000);
    return () => window.clearInterval(interval);
  }, [status]);

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
    if (totalNeeded === 0 || !subjectId) return;
    setError(null);
    setPaper(null);
    setLoadingMessageIndex(0);
    abortRef.current = new AbortController();
    setStatus("generating");

    try {
      const response = await generateQuestionPaper(
        {
          sections: sectionsToPaperPayload(sections),
          title: paperTitle.trim() || undefined,
          syllabus: syllabus.trim() || undefined,
          subjectId,
          chapterIds,
          topicIds,
          overallDifficulty: overall,
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
  }, [sections, paperTitle, syllabus, subjectId, chapterIds, topicIds, overall, totalNeeded, toast]);

  const handleDownload = useCallback(async () => {
    if (!paper) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadQuestionPaper(paper);
      toast.success({
        title: "Downloaded",
        description: "Word file saved — open it to review, edit or share.",
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

  const scopeSummary = `${sections.length} section${sections.length === 1 ? "" : "s"} · ${totalNeeded} question${totalNeeded === 1 ? "" : "s"}`;

  return (
    <div className="space-y-4 pb-36 lg:pb-0">
      {/* Paper-level config */}
      <div className="ai-color-card overflow-hidden rounded-xl border border-border bg-card">
        <div className="ai-color-header flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-extrabold text-text-primary">Question Paper</h3>
              <p className="min-h-4 truncate text-[11px] text-text-muted">
                <AiStreamText text="AI will follow your section structure, marks and syllabus." />
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-border bg-card-hover px-2.5 py-1 text-[11px] font-bold text-text-secondary tabular-nums">
            {scopeSummary}
          </span>
        </div>

        <div className="space-y-4 px-4 py-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-primary">Paper title</label>
            <input
              type="text"
              value={paperTitle}
              onChange={(e) => onPaperTitleChange(e.target.value)}
              disabled={status === "generating"}
              placeholder="e.g. Mid Semester Examination"
              className="h-11 w-full rounded-xl border border-border bg-card px-3.5 text-[13px] text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-pink-500/50 disabled:opacity-50"
            />
          </div>

          <PaperScopeFilters
            subjectId={subjectId}
            chapterIds={chapterIds}
            topicIds={topicIds}
            onSubjectChange={setSubjectId}
            onChapterIdsChange={setChapterIds}
            onTopicIdsChange={setTopicIds}
            disabled={status === "generating"}
          />

          <div>
            <p className="mb-1.5 text-xs font-bold text-text-primary">Overall Difficulty</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Overall difficulty">
              {OVERALL_OPTIONS.map((o) => {
                const active = overall === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setOverall(o.id)}
                    disabled={status === "generating"}
                    className={cn(
                      "inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-[13px] font-bold transition-all disabled:opacity-50",
                      active
                        ? "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)]"
                        : "border-border bg-card text-text-secondary hover:border-border-hover hover:text-text-primary"
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-text-muted">
              {OVERALL_OPTIONS.find((o) => o.id === overall)?.hint}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold text-text-primary">
                <span className="flex flex-wrap items-center gap-1.5">
                  Your syllabus / instructions
                  <span className="rounded-full bg-gradient-to-r from-pink-500/10 to-violet-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                    Recommended
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-medium text-text-muted tabular-nums">{syllabus.length}/4000</span>
              </label>
              <textarea
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                disabled={status === "generating"}
                maxLength={4000}
                rows={2}
                placeholder="Paste the syllabus you actually taught — units, topics, exclusions and any special instructions…"
                className={cn(
                  "min-h-[76px] w-full resize-y rounded-xl border bg-card px-3.5 py-2.5 text-[13px] text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-pink-500/50 disabled:opacity-50",
                  syllabus.trim() ? "border-emerald-500/30" : "border-amber-400/45"
                )}
              />
              <div className={cn(
                "mt-1.5 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[10px] leading-4",
                syllabus.trim()
                  ? "bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/[0.08] text-amber-700 dark:text-amber-300"
              )}>
                {syllabus.trim() ? <Check className="mt-0.5 h-3 w-3 shrink-0" /> : <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />}
                <span>
                  {syllabus.trim()
                    ? "Great — this helps keep every question closely aligned with what you taught."
                    : "For the most relevant paper, add your exact syllabus. Without it, AI has broader freedom and may include topics you did not teach."}
                </span>
              </div>
            </div>

            {status !== "done" && (
              <div className="flex flex-col justify-end gap-1.5">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={status === "generating" || totalNeeded === 0 || !subjectId}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:shadow-none"
                >
                  {status === "generating" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {status === "generating" ? "Generating paper…" : "Generate Question Paper"}
                </button>
                <p className="flex items-start gap-1 text-[9px] leading-3.5 text-text-muted">
                  <AlertCircle className="mt-px h-2.5 w-2.5 shrink-0" />
                  AI can make mistakes. Review the paper before publishing.
                </p>
              </div>
            )}
          </div>

          {status === "generating" && (
            <div className="relative overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-pink-500/[0.08] via-violet-500/[0.06] to-cyan-400/[0.08] px-4 py-4 shadow-[0_12px_34px_rgba(139,92,246,0.10)]">
              <motion.div
                aria-hidden="true"
                className="creator-desktop-flourish absolute -right-10 -top-12 h-32 w-32 rounded-full bg-pink-400/20 blur-3xl"
                animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.35, 0.7, 0.35] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                aria-hidden="true"
                className="creator-desktop-flourish absolute -bottom-14 left-1/3 h-28 w-28 rounded-full bg-cyan-400/20 blur-3xl"
                animate={{ x: [-12, 18, -12], opacity: [0.25, 0.6, 0.25] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_8px_22px_rgba(139,92,246,0.28)]">
                  <motion.div
                    animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <WandSparkles className="h-5 w-5" />
                  </motion.div>
                  <motion.span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-300"
                    animate={{ scale: [0.5, 1.25, 0.5], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-extrabold text-text-primary">Generating your question paper</p>
                      <div aria-live="polite" className="mt-0.5 min-h-4 overflow-hidden text-[11px] text-text-secondary">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.p
                            key={loadingMessageIndex}
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -3 }}
                            transition={{ duration: 0.16 }}
                          >
                            {PAPER_LOADING_MESSAGES[loadingMessageIndex]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-[10px] font-semibold text-text-secondary backdrop-blur-sm">
                      <Clock3 className="h-3 w-3 text-violet-500" /> Usually 1–2 min
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-card/80 shadow-inner">
                    <motion.div
                      className="h-full w-2/5 rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-400 shadow-[0_0_14px_rgba(139,92,246,0.45)]"
                      animate={{ x: ["-110%", "260%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                    <span className="font-semibold text-violet-600 dark:text-violet-300">
                      <span className="mr-1 inline-flex gap-0.5" aria-hidden="true">
                        {[0, 1, 2].map((dot) => (
                          <motion.span
                            key={dot}
                            className="h-1 w-1 rounded-full bg-current"
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.14 }}
                          />
                        ))}
                      </span>
                      Creating {totalNeeded} questions across {sections.length} sections
                    </span>
                    <span className="text-text-muted">Please keep this window open</span>
                  </div>
                </div>
              </div>
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
                Your question paper is ready — review every question before publishing or downloading.
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
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] capitalize text-text-muted">
                                <span>{q.difficulty} · {q.kind}</span>
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
