"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  AlertCircle,
  Check,
  Download,
  FileText,
  RotateCcw,
  Clock3,
  WandSparkles,
} from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { generateQuestionPaper, downloadQuestionPaper } from "@/services/aiGenerate";
import { sectionsToPaperPayload } from "./paperTypes";
import type { Section } from "./types";
import type { QuestionPaper } from "./paperTypes";
import { PaperScopeFilters } from "./PaperScopeFilters";
import { QuestionHtml } from "@/components/creator/questions/QuestionHtml";
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
      <div className="qs-shadow mt-6 mb-6 mr-4">
        <div className="overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--qs-brand)] px-5 py-4 text-[var(--qs-on-brand)] sm:px-6">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[var(--qs-sun)] text-[#1a1240]">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold">Question Paper</h2>
                <p className="text-[13px] opacity-90">
                  <AiStreamText text="AI will follow your section structure, marks and syllabus." />
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--qs-bg)] px-2.5 py-0.5 text-[12px] font-extrabold tabular-nums text-[var(--qs-brand)]">
              {scopeSummary}
            </span>
          </div>

          <StepSection step={1} title="Paper details" hint="Give the paper a title students will see" divided={false}>
            <input
              type="text"
              value={paperTitle}
              onChange={(e) => onPaperTitleChange(e.target.value)}
              disabled={status === "generating"}
              placeholder="e.g. Mid Semester Examination"
              className="h-12 w-full max-w-xl rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:opacity-60"
            />
          </StepSection>

          <StepSection step={2} title="Question scope" hint="Choose the chapters and topics AI should draw from">
            <PaperScopeFilters
              subjectId={subjectId}
              chapterIds={chapterIds}
              topicIds={topicIds}
              onSubjectChange={setSubjectId}
              onChapterIdsChange={setChapterIds}
              onTopicIdsChange={setTopicIds}
              disabled={status === "generating"}
            />
          </StepSection>

          <StepSection step={3} title="Overall difficulty" hint="Sets the tone of every question in the paper">
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Overall difficulty">
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
                      "inline-flex h-11 items-center gap-1.5 rounded-[13px] border-2 px-4 text-sm font-bold transition-all disabled:opacity-50",
                      active
                        ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)]"
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[13px] text-[var(--qs-muted)]">
              {OVERALL_OPTIONS.find((o) => o.id === overall)?.hint}
            </p>
          </StepSection>

          <StepSection step={4} title="Syllabus & generation" hint="Tell the AI exactly what you taught">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="qp-syllabus"
                  className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-[var(--qs-ink)]"
                >
                  <span className="flex items-center gap-2">
                    Your syllabus / instructions
                    <span className="rounded-full bg-[var(--qs-sun)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
                      Recommended
                    </span>
                  </span>
                  <span className="text-[12px] font-medium tabular-nums text-[var(--qs-muted)]">
                    {syllabus.length}/4000
                  </span>
                </label>
                <textarea
                  id="qp-syllabus"
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                  disabled={status === "generating"}
                  maxLength={4000}
                  rows={3}
                  placeholder="Paste the syllabus you actually taught — units, topics, exclusions and any special instructions…"
                  className="w-full resize-y rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3.5 py-3 text-sm text-[var(--qs-ink)] outline-none transition placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:opacity-60"
                />
              </div>

              {status !== "done" && (
                <div className="flex flex-col gap-2 lg:w-auto lg:self-center">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={status === "generating" || totalNeeded === 0 || !subjectId}
                    className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-6 py-4 text-base font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none lg:w-auto"
                  >
                    {status === "generating" ? (
                      <SecureLogo variant="mark" size={16} className="animate-pulse motion-reduce:animate-none" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {status === "generating" ? "Generating paper…" : "Generate Question Paper"}
                  </button>
                  <p className="flex items-start justify-center gap-1 text-[11px] leading-4 text-[var(--qs-muted)]">
                    <AlertCircle className="mt-px h-3 w-3 shrink-0" />
                    AI can make mistakes. Review the paper before publishing.
                  </p>
                </div>
              )}
            </div>
            <p
              className={cn(
                "mt-3 text-[13px] font-medium",
                syllabus.trim() ? "text-[var(--qs-ok)]" : "text-[#a85d00]"
              )}
            >
              {syllabus.trim()
                ? "Great — this helps keep every question closely aligned with what you taught."
                : "For the most relevant paper, add your exact syllabus. Without it, AI has broader freedom and may include topics you did not teach."}
            </p>
          </StepSection>

          {status === "generating" && (
            <div className="border-t-2 border-[var(--qs-line)] px-5 py-5 sm:px-6">
              <div className="relative overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-4">
                <motion.div
                  aria-hidden="true"
                  className="creator-desktop-flourish absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[var(--qs-sun)]/25 blur-3xl"
                  animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.35, 0.7, 0.35] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  aria-hidden="true"
                  className="creator-desktop-flourish absolute -bottom-14 left-1/3 h-28 w-28 rounded-full bg-[var(--qs-brand)]/15 blur-3xl"
                  animate={{ x: [-12, 18, -12], opacity: [0.25, 0.6, 0.25] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="relative flex items-center gap-3">
                  <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
                    <motion.div
                      animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <WandSparkles className="h-5 w-5" />
                    </motion.div>
                    <motion.span
                      aria-hidden="true"
                      className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--qs-brand)]"
                      animate={{ scale: [0.5, 1.25, 0.5], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-[var(--qs-ink)]">Generating your question paper</p>
                        <div aria-live="polite" className="mt-0.5 min-h-4 overflow-hidden text-[12px] text-[var(--qs-muted)]">
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
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--qs-ink)]">
                        <Clock3 className="h-3 w-3 text-[var(--qs-brand)]" /> Usually 1–2 min
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--qs-surface)]">
                      <motion.div
                        className="h-full w-2/5 rounded-full bg-[var(--qs-brand)]"
                        animate={{ x: ["-110%", "260%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-[var(--qs-brand)]">
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
                      <span className="text-[var(--qs-muted)]">Please keep this window open</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="border-t-2 border-[var(--qs-line)] px-5 py-5 sm:px-6">
              <div className="flex items-start gap-2.5 rounded-[14px] border-2 border-[var(--qs-bad)]/25 bg-[var(--qs-badbg)] px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
                <p className="text-[13px] font-semibold text-[var(--qs-bad)]">{error}</p>
              </div>
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
                    <SecureLogo variant="mark" size={14} className="animate-pulse motion-reduce:animate-none" />
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
                              {q.questionHtml?.trim() ? (
                                <QuestionHtml
                                  html={q.questionHtml}
                                  className="text-[13px] font-normal leading-relaxed text-text-primary"
                                />
                              ) : (
                                <p className="text-text-primary">{q.question}</p>
                              )}
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
