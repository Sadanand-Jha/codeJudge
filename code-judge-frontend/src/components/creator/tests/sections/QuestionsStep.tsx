"use client";

import { showUpgradeModal } from "@/lib/upgradePrompt";

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
  Loader2,
  WandSparkles,
} from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { useFileUploadAccess } from "@/hooks/useFileUploadAccess";
import { useQuestionApproval } from "@/hooks/useQuestionApproval";
import { generateQuestionPaper, generateSubjectiveQuestions } from "@/services/aiGenerate";
import { buildPaperNumbering, sectionsToPaperPayload } from "./paperTypes";
import { buildRegenerateQuestionPayload, replacePaperQuestion } from "./questionRegeneration";
import type { Section } from "./types";
import type { QuestionPaper } from "./paperTypes";
import { PaperScopeFilters } from "./PaperScopeFilters";
import { QuestionHtml } from "@/components/creator/questions/QuestionHtml";
import { AiStreamText } from "@/components/ui";
import { PaperHeaderFields } from "@/components/creator/common/PaperHeaderFields";
import { defaultPaperInstructionLines, downloadPaperPdf } from "@/utils/questionSetExport";
import type { PaperHeaderMeta } from "@/utils/paperHeader";

interface QuestionsStepProps {
  sections: Section[];
  paperTitle: string;
  onPaperTitleChange: (title: string) => void;
  paperHeader: PaperHeaderMeta;
  onPaperHeaderChange: (header: PaperHeaderMeta) => void;
  durationMinutes?: number;
  onPaperReady?: (paper: QuestionPaper) => void;
}

type QuestionsStatus = "idle" | "generating" | "done" | "error";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const isCanceledRequest = (error: unknown) => {
  const name = (error as { name?: string } | null)?.name;
  return name === "CanceledError" || name === "AbortError";
};

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
    hint: "Direct, basic paper with straightforward single-concept questions.",
  },
  {
    id: "balanced",
    label: "Balanced",
    hint: "Balanced mix of foundational and moderate questions — approachable, not overly tough.",
  },
  {
    id: "challenging",
    label: "Challenging",
    hint: "Demanding paper with multi-concept application and deeper reasoning.",
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

export function QuestionsStep({
  sections,
  paperTitle,
  onPaperTitleChange,
  paperHeader,
  onPaperHeaderChange,
  durationMinutes,
  onPaperReady,
}: QuestionsStepProps) {
  const toast = useToast();
  const { canUseAi, aiLoading, aiUpgradeMessage } = useFileUploadAccess();
  const { approve, pendingId, isApproved } = useQuestionApproval();
  const abortRef = useRef<AbortController | null>(null);

  const [syllabus, setSyllabus] = useState("");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterIds, setChapterIds] = useState<number[]>([]);
  const [topicIds, setTopicIds] = useState<number[]>([]);
  const [overall, setOverall] = useState<"easy" | "balanced" | "challenging">("balanced");
  const [status, setStatus] = useState<QuestionsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [generatedScope, setGeneratedScope] = useState<{ subjectId: number; chapterIds: number[]; topicIds: number[]; syllabus: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [regeneratePromptKey, setRegeneratePromptKey] = useState<string | null>(null);
  const [regenerateInstruction, setRegenerateInstruction] = useState("");
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
    if (!canUseAi) {
      setError(aiUpgradeMessage);
      if (!aiLoading) {
        showUpgradeModal({ message: aiUpgradeMessage });
      }
      return;
    }
    setError(null);
    setPaper(null);
    setRegeneratePromptKey(null);
    setRegenerateInstruction("");
    setLoadingMessageIndex(0);
    abortRef.current = new AbortController();
    setStatus("generating");

    try {
      const response = await generateQuestionPaper(
        {
          sections: sectionsToPaperPayload(sections),
          title: paperTitle.trim() || undefined,
          syllabus: syllabus.trim() || undefined,
          durationMinutes,
          subjectId,
          chapterIds,
          topicIds,
          overallDifficulty: overall,
        },
        abortRef.current.signal
      );
      setPaper(response.paper);
      setGeneratedScope({ subjectId, chapterIds: [...chapterIds], topicIds: [...topicIds], syllabus });
      onPaperReady?.(response.paper);
      if (!paperHeader.instructions.trim()) {
        const hasChoice = response.paper.sections.some((s) =>
          s.questionGroups.some((g) => g.attemptRule?.type === "ANY_N")
        );
        const attemptQuestions = response.paper.sections.reduce(
          (total, s) =>
            total +
            s.questionGroups.reduce(
              (sum, g) =>
                sum +
                (g.attemptRule?.type === "ANY_N" && g.attemptRule.count
                  ? Math.min(g.attemptRule.count, g.questions.length)
                  : g.questions.length),
              0
            ),
          0
        );
        onPaperHeaderChange({
          ...paperHeader,
          instructions:
            response.paper.instructions?.trim() ||
            defaultPaperInstructionLines(response.paper.totalQuestions, attemptQuestions, hasChoice).join("\n"),
        });
      }
      setStatus("done");
      toast.success({
        title: "Question paper ready",
        description: `${response.paper.totalQuestions} questions, ${response.paper.totalMarks} marks across ${response.paper.sections.length} sections.`,
      });
    } catch (err) {
      if (isCanceledRequest(err)) {
        setStatus("idle");
        return;
      }
      setError(errorMessage(err, "Failed to generate the question paper. Please try again."));
      setStatus("error");
    }
  }, [sections, paperTitle, syllabus, subjectId, chapterIds, topicIds, overall, totalNeeded, durationMinutes, toast, onPaperReady, paperHeader, onPaperHeaderChange, canUseAi, aiLoading, aiUpgradeMessage]);

  const paperHeading = paperTitle.trim() || paperHeader.heading.trim() || "Question Paper";

  const handleDownloadPdf = useCallback(async () => {
    if (!paper) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadPaperPdf({
        paper,
        header: { ...paperHeader, heading: paperHeading, subject: paperHeader.subject.trim() },
      });
      toast.success({
        title: "PDF downloaded",
        description: "Print-ready paper saved with your header details.",
      });
    } catch (err) {
      setError(errorMessage(err, "Failed to download the paper. Please try again."));
    } finally {
      setDownloading(false);
    }
  }, [paper, paperHeader, paperHeading, toast]);

  const handleRegenerate = useCallback(() => {
    setPaper(null);
    setError(null);
    setStatus("idle");
    void handleGenerate();
  }, [handleGenerate]);

  const handleRegenerateQuestion = useCallback(async (
    sectionIndex: number,
    groupIndex: number,
    questionIndex: number,
    instruction?: string
  ) => {
    const scope = generatedScope ?? (subjectId ? { subjectId, chapterIds, topicIds, syllabus } : null);
    if (!paper || !scope || regeneratingKey) return;
    if (!canUseAi) {
      if (!aiLoading) {
        showUpgradeModal({ message: aiUpgradeMessage });
      }
      return;
    }
    const question = paper.sections[sectionIndex]?.questionGroups[groupIndex]?.questions[questionIndex];
    if (!question) return;

    const key = `${sectionIndex}-${groupIndex}-${questionIndex}`;
    setRegeneratingKey(key);

    try {
      const response = await generateSubjectiveQuestions(
        buildRegenerateQuestionPayload(
          paper,
          { sectionIndex, groupIndex, questionIndex },
          scope,
          instruction
        )
      );
      const replacement = response.questions[0];
      if (!replacement) throw new Error("The AI did not return a replacement question.");
      setPaper((current) => current
        ? replacePaperQuestion(current, { sectionIndex, groupIndex, questionIndex }, replacement)
        : current
      );
      setRegeneratePromptKey(null);
      setRegenerateInstruction("");
      toast.success({
        title: "Question regenerated",
        description: instruction?.trim()
          ? "Your custom instruction was applied."
          : "Difficulty, question type and marks were kept unchanged.",
      });
    } catch (err) {
      toast.error({
        title: "Could not regenerate question",
        description: errorMessage(err, "Please try again."),
      });
    } finally {
      setRegeneratingKey(null);
    }
  }, [paper, generatedScope, subjectId, chapterIds, topicIds, syllabus, regeneratingKey, toast, canUseAi, aiLoading, aiUpgradeMessage]);

  const handleRegenerateClick = useCallback((key: string) => {
    if (regeneratingKey !== null) return;
    if (regeneratePromptKey === key) {
      setRegeneratePromptKey(null);
      setRegenerateInstruction("");
      return;
    }
    setRegeneratePromptKey(key);
    setRegenerateInstruction("");
  }, [regeneratingKey, regeneratePromptKey]);

  const numbering = paper ? buildPaperNumbering(paper.sections) : [];

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

          <StepSection step={1} title="Paper details" hint="Give the paper a title and set the printed header">
            <input
              type="text"
              value={paperTitle}
              onChange={(e) => onPaperTitleChange(e.target.value)}
              disabled={status === "generating"}
              placeholder="e.g. Mid Semester Examination"
              className="h-12 w-full max-w-xl rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:opacity-60"
            />
            <div className="mt-4 max-w-3xl">
              <PaperHeaderFields
                value={paperHeader}
                onChange={onPaperHeaderChange}
                showHeading={false}
                disabled={status === "generating"}
              />
            </div>
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
                    AI can make mistakes. Review the paper before downloading.
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
          className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[4px_4px_0_var(--qs-sun)]"
        >
          <div className="border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[var(--qs-ink)]">
                  {paperHeading}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[var(--qs-muted)]">
                  {paper.totalQuestions} questions · {paper.totalMarks} marks
                  {paper.durationMinutes ? ` · ${paper.durationMinutes} min` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleRegenerate} className="b sm gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadPdf()}
                  disabled={downloading}
                  className="b b-pri sm gap-1.5"
                >
                  {downloading ? (
                    <SecureLogo variant="mark" size={14} className="animate-pulse motion-reduce:animate-none" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {downloading ? "Preparing…" : "Download PDF"}
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-[12px] border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] px-3 py-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-[var(--qs-ok)]" />
              <p className="text-[11px] font-bold text-[var(--qs-ok)]">
                Your question paper is ready — review every question before downloading.
              </p>
            </div>
          </div>

          <div className="px-5 py-5">
            <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-4 text-center">
              {paperHeader.instituteName.trim() && (
                <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ink)]">
                  {paperHeader.instituteName.trim()}
                </p>
              )}
              <p className="mt-1 text-[15px] font-extrabold text-[var(--qs-ink)]">{paperHeading}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-left text-[11px] font-semibold text-[var(--qs-muted)] sm:grid-cols-3">
                {paperHeader.subject.trim() && (
                  <span><strong className="font-extrabold text-[var(--qs-ink)]">Subject:</strong> {paperHeader.subject.trim()}</span>
                )}
                {paperHeader.className.trim() && (
                  <span><strong className="font-extrabold text-[var(--qs-ink)]">Class:</strong> {paperHeader.className.trim()}</span>
                )}
                {paperHeader.date.trim() && (
                  <span><strong className="font-extrabold text-[var(--qs-ink)]">Date:</strong> {paperHeader.date.trim()}</span>
                )}
                {paperHeader.timeAllowed.trim() && (
                  <span><strong className="font-extrabold text-[var(--qs-ink)]">Time:</strong> {paperHeader.timeAllowed.trim()}</span>
                )}
                <span><strong className="font-extrabold text-[var(--qs-ink)]">Max Marks:</strong> {paper.totalMarks}</span>
                {paperHeader.setName.trim() && (
                  <span><strong className="font-extrabold text-[var(--qs-ink)]">Set:</strong> {paperHeader.setName.trim()}</span>
                )}
              </div>
              {paperHeader.showStudentBlock && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-[11px] font-bold text-[var(--qs-ink)]">
                  <span>Name: ______________________</span>
                  <span>Roll No.: ______________________</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5 px-5 pb-4">
            {paper.sections.map((s, si) => (
              <div key={`${s.order}-${s.label}`}>
                <div className="flex items-center justify-between rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2">
                  <p className="text-[13px] font-extrabold text-[var(--qs-ink)]">
                    Section {s.label} — {s.name}
                  </p>
                  <span className="text-xs font-bold text-[var(--qs-muted)] tabular-nums">
                    {s.sectionMarks} marks
                  </span>
                </div>
                {s.title && (
                  <p className="mt-1.5 px-1 text-xs font-bold text-[var(--qs-ink)]">{s.title}</p>
                )}
                {s.instructions && (
                  <p className="mt-0.5 px-1 text-[11px] italic text-[var(--qs-muted)]">
                    {s.instructions}
                  </p>
                )}
                {s.questionGroups.map((g, gi) => {
                  const groupNumbering = numbering[si]?.[gi];
                  const attempt =
                    g.attemptRule.type === "ANY_N" && g.attemptRule.count
                      ? `Attempt any ${g.attemptRule.count} out of ${g.questions.length} questions.`
                      : "Answer all questions.";
                  return (
                  <div key={`${s.label}-${gi}`} className="mt-3 px-1">
                    {groupNumbering?.heading && (
                      <p className="text-xs font-bold text-[var(--qs-ink)]">
                        {groupNumbering.heading} ({g.questions.length} × {g.marksPerQuestion} marks)
                      </p>
                    )}
                    <p className="text-[11px] italic text-[var(--qs-muted)]">{attempt}</p>
                    <div className="mt-1.5 space-y-2">
                      {g.questions.map((q, qi) => {
                        const label = groupNumbering?.labels[qi] ?? `Q${q.num}`;
                        const questionKey = `${si}-${gi}-${qi}`;
                        return (
                          <div key={questionKey} className="flex gap-2 text-[13px]">
                            <span className="shrink-0 font-bold text-[var(--qs-ink)] tabular-nums">
                              {label}.
                            </span>
                            <div className="min-w-0 flex-1">
                              {q.questionHtml?.trim() ? (
                                <QuestionHtml
                                  html={q.questionHtml}
                                  className="text-[13px] font-normal leading-relaxed"
                                />
                              ) : (
                                <p className="whitespace-pre-wrap text-[var(--qs-ink)]">{q.question}</p>
                              )}
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] capitalize text-[var(--qs-muted)]">
                                <span>{q.difficulty} · {q.kind}</span>
                              </p>
                              {regeneratePromptKey === questionKey && (
                                <div className="mt-2 rounded-[10px] border-2 border-[var(--qs-brand)] bg-[var(--qs-surface)] p-2">
                                  <input
                                    autoFocus
                                    value={regenerateInstruction}
                                    onChange={(event) => setRegenerateInstruction(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        void handleRegenerateQuestion(si, gi, qi, regenerateInstruction);
                                      }
                                      if (event.key === "Escape") {
                                        setRegeneratePromptKey(null);
                                        setRegenerateInstruction("");
                                      }
                                    }}
                                    placeholder="Optional: describe the kind of question you want…"
                                    aria-label={`Instruction for regenerating ${label}`}
                                    className="h-8 w-full rounded-[7px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 text-[11px] font-medium text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                                  />
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => void handleRegenerateQuestion(si, gi, qi, regenerateInstruction)}
                                      disabled={regeneratingKey !== null}
                                      className="inline-flex h-7 items-center gap-1 rounded-[7px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-2 text-[10px] font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {regeneratingKey === questionKey ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <RotateCcw className="h-3 w-3" />
                                      )}
                                      {regeneratingKey === questionKey ? "Regenerating…" : "Regenerate"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRegeneratePromptKey(null);
                                        setRegenerateInstruction("");
                                      }}
                                      className="inline-flex h-7 items-center rounded-[7px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 text-[10px] font-bold text-[var(--qs-muted)] hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)]"
                                    >
                                      Cancel
                                    </button>
                                    <span className="text-[10px] font-medium text-[var(--qs-muted)]">
                                      Empty is fine
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 items-start gap-1.5">
                              {q.bankQuestionId ? (
                                <button
                                  type="button"
                                  onClick={() => void approve(q.bankQuestionId)}
                                  disabled={pendingId !== null || isApproved(q.bankQuestionId)}
                                  className={cn(
                                    "inline-flex h-7 items-center gap-1 rounded-[7px] border-2 px-1.5 text-[10px] font-bold transition disabled:cursor-not-allowed",
                                    isApproved(q.bankQuestionId)
                                      ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]"
                                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-ok)] hover:text-[var(--qs-ok)] disabled:opacity-40"
                                  )}
                                  title={isApproved(q.bankQuestionId) ? "Question approved" : "Approve this question and update its usage count"}
                                  aria-label={`${isApproved(q.bankQuestionId) ? "Approved" : "Approve"} ${label}`}
                                >
                                  {pendingId === q.bankQuestionId ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  <span className="hidden sm:inline">
                                    {isApproved(q.bankQuestionId) ? "Approved" : "Approve"}
                                  </span>
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleRegenerateClick(questionKey)}
                                disabled={regeneratingKey !== null}
                                className="inline-flex h-7 items-center gap-1 rounded-[7px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-1.5 text-[10px] font-bold text-[var(--qs-muted)] transition hover:border-[var(--qs-brand)] hover:text-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-40"
                                title="Regenerate this question with an optional instruction"
                                aria-label={`Regenerate ${label}`}
                                aria-expanded={regeneratePromptKey === questionKey}
                              >
                                {regeneratingKey === questionKey ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden sm:inline">Regenerate</span>
                              </button>
                              <span className="text-xs font-bold text-[var(--qs-muted)] tabular-nums">
                                [{q.marks} marks]
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t-2 border-[var(--qs-line)] px-5 py-3">
            <span className="text-xs font-bold text-[var(--qs-muted)]">
              Total: {paper.totalQuestions} questions
            </span>
            <span className="text-xs font-bold text-[var(--qs-muted)]">
              Total Marks: {paper.totalMarks}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 border-t border-[var(--qs-line)] px-5 py-2.5 text-[10px] font-semibold text-[var(--qs-muted)]">
            <span className="grid h-3.5 w-3.5 place-items-center rounded-[3px] bg-[var(--qs-ink)] text-[8px] font-black text-[var(--qs-bg)]">Q</span>
            QuizSupport
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
          <p className="text-xs font-semibold text-[var(--qs-muted)]">
            Go back to Sections and add at least one question group before generating the paper.
          </p>
        </div>
      )}
    </div>
  );
}
