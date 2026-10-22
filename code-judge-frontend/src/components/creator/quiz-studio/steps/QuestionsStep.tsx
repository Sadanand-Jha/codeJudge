/**
 * Question Builder — How it works (creator flow, dev guide)
 * ------------------------------------------------------------------
 * 1. Pick question type (MCQ / Match / Fill blanks etc.) from header dropdown
 * 2. Write question stem in the center editor (rich text allowed)
 * 3. Add options/items LINE-WISE — Column A row 1 ↔ Column B row 1 is the
 *    correct pair for Match; for MCQ click the circle to mark correct
 * 4. For Match: just keep pairs on same line number; Column B will be
 *    shuffled for students (see MatchFollowingEditor line-wise logic)
 * 5. For Fill blanks: type correct answer(s) → stored in matching_target (type 6)
 * 6. Adjust Marks / Difficulty / Time in right Properties (LiveRail - text-center)
 * 7. Click Save, then 👁 Preview as student, finally Continue
 * ------------------------------------------------------------------
 * Note: UI banner removed — this comment is the single source of truth in code.
 */
"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { QuestionList } from "../components/QuestionList";
import { QuestionEditor } from "../components/QuestionEditor";
import { LiveRail } from "../components/LiveRail";
import { AiGenerateModal } from "../components/AiGenerateModal";
import { StudentPreviewModal } from "../components/StudentPreviewModal";
import { useStudio, isQuestionValidationError } from "../StudioProvider";
import { Plus, ListChecks, Settings2, ChevronLeft, ChevronRight, Save, Eye, X, Download } from "lucide-react";
import type { CreatorQuestion } from "../types";
import { downloadQuizPaperPdf, getPaperPdfErrorMessage, type PaperDownloadKind } from "@/utils/paperPdf";
import { formatPaperDate, type PaperMeta } from "@/utils/paperHtml";
import PdfConfigModal, { type PaperDownloadConfig } from "@/components/quiz/creator/settings/PdfConfigModal";
import { generateQuizCode } from "@/services/quiz";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/apiError";
import { MobileQuestionBankSheet } from "../components/mobile/MobileQuestionBankSheet";
import { MobileQuestionSettingsSheet } from "../components/mobile/MobileQuestionSettingsSheet";
import { AiStreamText } from "@/components/ui";
import { AiGenerateButton } from "@/components/creator/common/AiGenerateButton";
import { MobileQuestionEditor } from "../components/mobile/MobileQuestionEditor";

export function QuestionsStep() {
  const { state, addQuestion, importQuestionsAndSave, saveToServer, saveProgress, setActiveQuestion, questionsLoading, questionsDirty: hasChanges, savingToServer } = useStudio();
  const [aiOpen, setAiOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [generatedPdfCode, setGeneratedPdfCode] = useState("");
  const pdfCode = state.info.code || generatedPdfCode;
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [studentPreviewOpen, setStudentPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Mobile sheets
  const [mobileBankOpen, setMobileBankOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const openPdfModal = useCallback(async () => {
    if (pdfCode) {
      setPdfModalOpen(true);
      return;
    }
    try {
      const newCode = await generateQuizCode();
      setGeneratedPdfCode(newCode);
      setPdfModalOpen(true);
    } catch {
      toast.error({ title: "Could not load PDF preview", description: "Failed to generate quiz code. Please try again." });
    }
  }, [pdfCode]);

  const handleSave = useCallback(async () => {
    if (saving || !hasChanges) return;
    setSaving(true);
    try {
      await saveToServer();
      toast.success({ title: "Saved", description: "Your changes have been saved." });
    } catch (err) {
      if (isQuestionValidationError(err)) return;
      toast.error({ title: "Save failed", description: getApiErrorMessage(err, "Something went wrong.") });
    } finally {
      setSaving(false);
    }
  }, [saving, hasChanges, saveToServer]);

  const handleAiQuestions = async (questions: CreatorQuestion[]) => {
    await importQuestionsAndSave(questions);
  };

  const paperMeta: PaperMeta = {
    title: state.info.title?.trim() || "Quiz",
    creatorName: state.branding.creatorName?.trim() || undefined,
    subject: state.info.subject || undefined,
    course: state.info.classGrade || state.info.exam || undefined,
    date: formatPaperDate(state.info.startDate) ?? formatPaperDate(new Date()),
    totalMarks: state.questions.reduce((sum, q) => sum + (q.marks || 0), 0),
    totalQuestions: state.questions.length,
    duration: state.info.duration ? `${state.info.duration} min` : undefined,
    difficulty: state.info.difficulty || undefined,
    negativeMarking: state.settings.negativeMarking ? String(state.settings.negativeMarkValue ?? 1) : "None",
  };

  const handleDownloadPdf = (kind: PaperDownloadKind, config: PaperDownloadConfig) => {
    if (state.questions.length === 0) return;
    setGeneratingPdf(true);
    downloadQuizPaperPdf(
      {
        meta: paperMeta,
        questions: state.questions,
        options: config.options,
        mode: config.mode,
        students: config.students,
      },
      kind
    )
      .then((count) => {
        toast.success({
          title: kind === "key" ? "Answer key downloaded" : "Question paper downloaded",
          description:
            kind === "key"
              ? "Compact answer key PDF with Q.No and correct option."
              : config.mode !== "single"
                ? `Generated ${count} student paper${count !== 1 ? "s" : ""}.`
                : config.options.includeAnswerKey
                  ? "Printable PDF with the answer key page at the end."
                  : "Student copy with questions only — no answers included.",
        });
      })
      .catch(async (error) => {
        toast.error({
          title: "Could not generate PDF",
          description: await getPaperPdfErrorMessage(error),
        });
      })
      .finally(() => setGeneratingPdf(false));
  };

  const activeIdx = state.questions.findIndex((q) => q.id === state.activeQuestionId);
  const completed = state.questions.filter((q) => q.title.trim()).length;

  return (
    <>
      {/* ========== MOBILE VIEW (simplified, 360-430, no gamification, bottom sheets) ========== */}
      <div className="xl:hidden flex w-full max-w-full min-w-0 flex-col gap-3 overflow-x-hidden">
        {/* Compact info strip */}
        <div className="flex w-full max-w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 sm:px-3 py-2.5">
          <button
            onClick={() => setMobileBankOpen(true)}
            className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 sm:px-3 py-2 text-xs font-bold text-[var(--qs-ink)]"
          >
            <ListChecks className="h-4 w-4 shrink-0 text-[var(--qs-muted)]" />
            <span className="truncate">Questions</span>
            <span className="shrink-0 rounded-full border-2 border-[var(--qs-brand)]/30 bg-[var(--qs-poly-1)] px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--qs-brand)]">{state.questions.length}</span>
          </button>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden sm:inline text-xs font-medium text-[var(--qs-muted)]">
              {completed} / {state.questions.length} complete
            </span>
            <AiGenerateButton
              size="sm"
              label="AI"
              ariaLabel="AI Generate"
              onClick={() => setAiOpen(true)}
              className="shrink-0"
            />
            <button
              onClick={() => void openPdfModal()}
              disabled={state.questions.length === 0}
              aria-label="Download PDF"
              title={state.questions.length === 0 ? "Add a question to download a PDF" : "Download PDF"}
              className="flex shrink-0 items-center gap-1 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 sm:px-3 py-2 text-xs font-bold text-[var(--qs-ink)] disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              PDF
            </button>
            <button
              onClick={() => setMobileSettingsOpen(true)}
              className="flex shrink-0 items-center gap-1 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 sm:px-3 py-2 text-xs font-bold text-[var(--qs-ink)]"
            >
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline">Settings</span>
              <span className="xs:hidden">Set</span>
            </button>
          </div>
        </div>

        {/* Question counter + prev/next for quick navigation */}
        {state.questions.length > 0 && state.activeQuestionId && (
          <div className="flex w-full max-w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 sm:px-3 py-2">
            <span className="min-w-0 truncate text-xs font-medium text-[var(--qs-muted)]">
              Q {activeIdx + 1} of {state.questions.length}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => {
                  if (activeIdx > 0) setActiveQuestion(state.questions[activeIdx - 1].id);
                }}
                disabled={activeIdx <= 0}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (activeIdx < state.questions.length - 1) setActiveQuestion(state.questions[activeIdx + 1].id);
                }}
                disabled={activeIdx >= state.questions.length - 1}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-brand)] disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main editor */}
        <div className="w-full max-w-full min-w-0 overflow-hidden">
          {questionsLoading && state.questions.length === 0 ? (
            <div className="flex w-full max-w-full min-w-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-10 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--qs-line)] border-t-[var(--qs-brand)]" />
              <p className="text-sm font-medium text-[var(--qs-muted)]">Loading questions…</p>
            </div>
          ) : state.questions.length === 0 || !state.activeQuestionId ? (
            <div className="flex w-full max-w-full min-w-0 flex-col items-center justify-center gap-4 overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)]">
                <ListChecks className="h-7 w-7 text-[var(--qs-brand)]" />
              </div>
              <h3 className="text-base font-extrabold text-[var(--qs-ink)] break-words">Build your first question</h3>
              <p className="min-h-5 max-w-[260px] text-sm font-medium leading-relaxed text-[var(--qs-muted)] break-words">
                <AiStreamText text="Create a question manually or let AI generate one." />
              </p>
              <div className="flex w-full max-w-full min-w-0 flex-col gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => addQuestion()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 py-3 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform active:translate-y-0 active:shadow-none"
                >
                  <Plus className="h-4 w-4" /> Create Question
                </button>
                <AiGenerateButton
                  size="md"
                  label="Generate with AI"
                  onClick={() => setAiOpen(true)}
                  fullWidth
                  className="rounded-[14px] px-5 py-3 text-sm"
                />
              </div>
            </div>
          ) : (
            <MobileQuestionEditor onOpenSettings={() => setMobileSettingsOpen(true)} />
          )}
        </div>

        {/* Mobile bottom action bar — primary actions only */}
        {state.activeQuestionId && (
          <div className="mt-2 flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2">
            <button
              onClick={() => {
                if (!hasChanges) {
                  toast.info({ title: "Nothing to save", description: "You're already up to date." });
                  return;
                }
                void handleSave();
              }}
              disabled={saving || savingToServer}
              aria-disabled={!hasChanges || undefined}
              aria-busy={saving || savingToServer || undefined}
              title={!hasChanges && !saving && !savingToServer ? "Nothing to save" : undefined}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[12px] border-2 bg-[var(--qs-surface)] py-3 text-sm font-bold text-[var(--qs-ink)] transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-40 ${
                hasChanges
                  ? "border-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-sun)]"
                  : "border-[var(--qs-line)]"
              }`}
            >
              <Save className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {saving || savingToServer ? "Saving…" : hasChanges ? "Save" : "Saved"}
              </span>
            </button>
            <AiGenerateButton
              size="md"
              label="AI"
              ariaLabel="AI Generate"
              onClick={() => setAiOpen(true)}
              className="shrink-0 px-4 py-3"
            />
            <button
              onClick={() => setStudentPreviewOpen(true)}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3 text-sm font-bold text-[var(--qs-ink)]"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
          </div>
        )}

        {/* Sheets */}
        <MobileQuestionBankSheet
          open={mobileBankOpen}
          onClose={() => setMobileBankOpen(false)}
          onAiGenerate={() => {
            setMobileBankOpen(false);
            setAiOpen(true);
          }}
        />
        <MobileQuestionSettingsSheet open={mobileSettingsOpen} onClose={() => setMobileSettingsOpen(false)} />
      </div>

      {/* ========== DESKTOP VIEW (unchanged) ========== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden xl:flex min-h-0 flex-col gap-3 xl:flex-1 xl:min-h-0 xl:flex-row xl:overflow-hidden min-w-0"
      >
        {sidebarOpen && <div className="fixed inset-0 z-40 xl:hidden bg-[#1a1240]/40" onClick={() => setSidebarOpen(false)} />}
        {rightOpen && <div className="fixed inset-0 z-40 xl:hidden bg-[#1a1240]/40" onClick={() => setRightOpen(false)} />}

        <aside
          className={`
            fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] shrink-0 flex-col overflow-hidden transition-transform duration-200 xl:static xl:z-auto xl:flex xl:h-[calc(100dvh-13rem)] xl:max-h-full xl:min-h-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}
          `}
        >
          <QuestionList onAiGenerate={() => setAiOpen(true)} onDownloadPdf={openPdfModal} onSave={handleSave} saving={saving} hasChanges={hasChanges} saveProgress={saveProgress} onToggleSidebar={() => setSidebarOpen(false)} />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
          <div className="flex items-center justify-between border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 sm:px-4 py-2 xl:hidden gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-xs font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)] shrink-0"
            >
              <ListChecks className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Questions</span> ({state.questions.length})
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:inline text-xs font-medium text-[var(--qs-muted)] truncate">
                {state.questions.length > 0 ? `${state.questions.filter((q) => q.title.trim()).length} / ${state.questions.length} complete` : ""}
              </span>
              <button
                type="button"
                onClick={() => setRightOpen(true)}
                className="xl:hidden inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-xs font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)] shrink-0"
              >
                Properties
              </button>
            </div>
          </div>

          {questionsLoading && state.questions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--qs-line)] border-t-[var(--qs-brand)]" />
              <p className="text-sm font-medium text-[var(--qs-muted)]">Loading questions…</p>
            </div>
          ) : state.questions.length === 0 || !state.activeQuestionId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)]">
                <ListChecks className="h-6 w-6 text-[var(--qs-brand)]" />
              </div>
              <h3 className="text-[19px] font-extrabold text-[var(--qs-ink)]">Build your first question</h3>
              <p className="min-h-5 max-w-sm text-sm font-medium leading-relaxed text-[var(--qs-muted)]"><AiStreamText text="Create a question manually or let AI generate one from your content." /></p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => addQuestion()}
                  className="inline-flex items-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 py-2.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none"
                >
                  <Plus className="h-4 w-4" /> Create Question
                </button>
                <AiGenerateButton
                  size="md"
                  label="Generate with AI"
                  onClick={() => setAiOpen(true)}
                  className="rounded-[14px] px-5 py-2.5 text-sm"
                />
              </div>
            </div>
          ) : (
            <QuestionEditor />
          )}
        </main>

        <div className={`${rightCollapsed ? "w-10" : "w-[340px]"} hidden h-[calc(100dvh-13rem)] max-h-full min-h-0 shrink-0 xl:flex`}>
          <LiveRail onDownloadPdf={openPdfModal} onStudentPreview={() => setStudentPreviewOpen(true)} collapsed={rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)} />
        </div>

        {rightOpen && (
          <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
            <div className="absolute inset-0 bg-[#1a1240]/40" onClick={() => setRightOpen(false)} />
            <div className="relative w-[340px] max-w-[92vw] h-full bg-[var(--qs-surface)] border-l-2 border-[var(--qs-line)] rounded-l-[22px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-[var(--qs-line)]">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Properties</span>
                <button type="button" onClick={() => setRightOpen(false)} aria-label="Close" title="Close" className="b b-icon b-close b-ghost">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <LiveRail onDownloadPdf={() => { setRightOpen(false); openPdfModal(); }} onStudentPreview={() => { setRightOpen(false); setStudentPreviewOpen(true); }} collapsed={false} onToggle={() => {}} />
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <AiGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onQuestionsAdded={handleAiQuestions}
        defaultSubjectId={state.info.subjectId ? Number(state.info.subjectId) || null : null}
        defaultSubjectName={state.info.subject || undefined}
        quizId={state.serverQuizId ?? null}
        currentQuestionCount={state.questions.length}
      />

      <StudentPreviewModal
        open={studentPreviewOpen}
        onClose={() => setStudentPreviewOpen(false)}
        questions={state.questions}
        quizTitle={state.info.title}
      />

      <PdfConfigModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        questions={state.questions}
        meta={paperMeta}
        quizId={pdfCode}
        shuffleDefaults={{
          shuffleQuestions: state.settings.randomizeQuestions,
          shuffleOptions: state.settings.randomizeOptions,
        }}
        generating={generatingPdf}
        onDownload={handleDownloadPdf}
      />
    </>
  );
}
