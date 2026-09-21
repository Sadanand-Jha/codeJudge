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

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { QuestionList } from "../components/QuestionList";
import { QuestionEditor } from "../components/QuestionEditor";
import { LiveRail } from "../components/LiveRail";
import { AiGenerateModal } from "../components/AiGenerateModal";
import { StudentPreviewModal } from "../components/StudentPreviewModal";
import { useStudio, isQuestionValidationError } from "../StudioProvider";
import { Plus, Sparkles, ListChecks, Settings2, ChevronLeft, ChevronRight, Save, Eye } from "lucide-react";
import type { CreatorQuestion } from "../types";
import { downloadQuizPaperPdf } from "@/utils/quizPdf";
import { type PdfConfig, type PdfStudent } from "@/utils/pdfConfig";
import { QuizSettingsProvider } from "@/components/quiz/creator/settings/QuizSettingsContext";
import PdfConfigModal from "@/components/quiz/creator/settings/PdfConfigModal";
import { generateQuizCode } from "@/services/quiz";
import { toast } from "@/lib/toast";
import { MobileQuestionBankSheet } from "../components/mobile/MobileQuestionBankSheet";
import { MobileQuestionSettingsSheet } from "../components/mobile/MobileQuestionSettingsSheet";
import { MobileQuestionEditor } from "../components/mobile/MobileQuestionEditor";

function hashState(questions: CreatorQuestion[], info: { title: string; shortDescription: string; fullDescription: string; subject: string; difficulty: string; duration: number; passingMarks: number; tags: string[] }) {
  return JSON.stringify({ questions, title: info.title, shortDescription: info.shortDescription, fullDescription: info.fullDescription, subject: info.subject, difficulty: info.difficulty, duration: info.duration, passingMarks: info.passingMarks, tags: info.tags });
}

export function QuestionsStep() {
  const { state, addQuestion, importQuestions, saveToServer, saveProgress, setActiveQuestion } = useStudio();
  const [aiOpen, setAiOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfCode, setPdfCode] = useState(state.info.code);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [studentPreviewOpen, setStudentPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Mobile sheets
  const [mobileBankOpen, setMobileBankOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const snapshotRef = useRef(hashState(state.questions, state.info));
  const [hasChanges, setHasChanges] = useState(false);

  const openPdfModal = useCallback(async () => {
    const code = state.info.code || pdfCode;
    if (code) {
      setPdfCode(code);
      setPdfModalOpen(true);
      return;
    }
    try {
      const newCode = await generateQuizCode();
      setPdfCode(newCode);
      setPdfModalOpen(true);
    } catch {
      toast.error({ title: "Could not load PDF preview", description: "Failed to generate quiz code. Please try again." });
    }
  }, [state.info.code, pdfCode]);

  useEffect(() => {
    setHasChanges(hashState(state.questions, state.info) !== snapshotRef.current);
  }, [state.questions, state.info]);

  useEffect(() => {
    if (state.info.code && !pdfCode) setPdfCode(state.info.code);
  }, [state.info.code]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveToServer();
      snapshotRef.current = hashState(state.questions, state.info);
      setHasChanges(false);
      toast.success({ title: "Saved", description: "Your changes have been saved." });
    } catch (err) {
      if (isQuestionValidationError(err)) return;
      toast.error({ title: "Save failed", description: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }, [saving, saveToServer, state.questions, state.info]);

  const handleAiQuestions = (questions: CreatorQuestion[]) => {
    importQuestions(questions);
  };

  const handleDownloadPdf = (config: PdfConfig, students: PdfStudent[]) => {
    setPdfModalOpen(false);
    if (state.questions.length === 0) return;
    setGeneratingPdf(true);
    downloadQuizPaperPdf(
      {
        config,
        meta: {
          quizName: state.info.title || "Quiz",
          subject: state.info.subject,
          difficulty: state.info.difficulty as "Easy" | "Medium" | "Hard" | "Expert",
          timeLimit: state.info.duration ? `${state.info.duration} min` : undefined,
          quizId: state.info.code || state.info.id,
          totalQuestions: state.questions.length,
          totalMarks: state.questions.reduce((sum, q) => sum + (q.marks || 0), 0),
        },
        questions: state.questions,
        student: null,
      },
      students
    )
      .then(() => {
        toast.success({
          title: "Question paper downloaded",
          description:
            config.generation.mode !== "single"
              ? `Generated ${students.length} student paper${students.length !== 1 ? "s" : ""}.`
              : config.content.includeAnswers
                ? "Printable PDF with questions, answers and explanations."
                : "Student copy with questions only — no answers included.",
        });
      })
      .catch(() => {
        toast.error({
          title: "Could not generate PDF",
          description: "Something went wrong while building the question paper.",
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
        <div className="flex w-full max-w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white px-2 sm:px-3 py-2.5 shadow-sm">
          <button
            onClick={() => setMobileBankOpen(true)}
            className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 sm:px-3 py-2 text-xs font-semibold text-zinc-700"
          >
            <ListChecks className="h-4 w-4 shrink-0 text-zinc-500" />
            <span className="truncate">Questions</span>
            <span className="shrink-0 rounded-full bg-[#E91E63] px-1.5 py-0.5 text-[10px] font-bold text-white">{state.questions.length}</span>
          </button>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden sm:inline text-xs font-medium text-zinc-500">
              {completed} / {state.questions.length} complete
            </span>
            <button
              onClick={() => setMobileSettingsOpen(true)}
              className="flex shrink-0 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 sm:px-3 py-2 text-xs font-semibold text-zinc-700"
            >
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline">Settings</span>
              <span className="xs:hidden">Set</span>
            </button>
          </div>
        </div>

        {/* Question counter + prev/next for quick navigation */}
        {state.questions.length > 0 && state.activeQuestionId && (
          <div className="flex w-full max-w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl border border-zinc-200 bg-white px-2 sm:px-3 py-2 shadow-sm">
            <span className="min-w-0 truncate text-xs font-medium text-zinc-600">
              Q {activeIdx + 1} of {state.questions.length}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => {
                  if (activeIdx > 0) setActiveQuestion(state.questions[activeIdx - 1].id);
                }}
                disabled={activeIdx <= 0}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (activeIdx < state.questions.length - 1) setActiveQuestion(state.questions[activeIdx + 1].id);
                }}
                disabled={activeIdx >= state.questions.length - 1}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[#E91E63] disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main editor */}
        <div className="w-full max-w-full min-w-0 overflow-hidden">
          {state.questions.length === 0 || !state.activeQuestionId ? (
            <div className="flex w-full max-w-full min-w-0 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white px-4 py-10 text-center shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-200">
                <ListChecks className="h-7 w-7 text-zinc-500" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 break-words">Build your first question</h3>
              <p className="max-w-[260px] text-sm leading-relaxed text-zinc-500 break-words">
                Create a question manually or let AI generate one.
              </p>
              <div className="flex w-full max-w-full min-w-0 flex-col gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => addQuestion()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#E91E63] px-5 py-3 text-sm font-bold text-white"
                >
                  <Plus className="h-4 w-4" /> Create Question
                </button>
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700"
                >
                  <Sparkles className="h-4 w-4 text-pink-600" /> Generate with AI
                </button>
              </div>
            </div>
          ) : (
            <MobileQuestionEditor onOpenSettings={() => setMobileSettingsOpen(true)} />
          )}
        </div>

        {/* Mobile bottom action bar — primary actions only */}
        {state.activeQuestionId && (
          <div className="sticky bottom-0 z-10 mt-2 flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-700 disabled:opacity-40"
            >
              <Save className="h-4 w-4 shrink-0" />
              <span className="truncate">{saving ? "Saving..." : "Save"}</span>
            </button>
            <button
              onClick={() => setStudentPreviewOpen(true)}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
          </div>
        )}

        {/* Sheets */}
        <MobileQuestionBankSheet open={mobileBankOpen} onClose={() => setMobileBankOpen(false)} />
        <MobileQuestionSettingsSheet open={mobileSettingsOpen} onClose={() => setMobileSettingsOpen(false)} />
      </div>

      {/* ========== DESKTOP VIEW (unchanged) ========== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden xl:flex min-h-0 flex-col gap-3 bg-background xl:flex-1 xl:min-h-0 xl:flex-row xl:overflow-hidden min-w-0"
      >
        {sidebarOpen && <div className="fixed inset-0 z-40 xl:hidden bg-black/20" onClick={() => setSidebarOpen(false)} />}
        {rightOpen && <div className="fixed inset-0 z-40 xl:hidden bg-black/20" onClick={() => setRightOpen(false)} />}

        <aside
          className={`
            fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] shrink-0 flex-col border border-border bg-card rounded-xl transition-transform duration-200 xl:static xl:z-auto xl:flex overflow-visible
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}
          `}
        >
          <QuestionList onAiGenerate={() => setAiOpen(true)} onDownloadPdf={openPdfModal} onSave={handleSave} saving={saving} hasChanges={hasChanges} saveProgress={saveProgress} onToggleSidebar={() => setSidebarOpen(false)} />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-background px-3 sm:px-4 py-2 xl:hidden gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-card-hover shrink-0"
            >
              <ListChecks className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Questions</span> ({state.questions.length})
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:inline text-xs text-text-muted truncate">
                {state.questions.length > 0 ? `${state.questions.filter((q) => q.title.trim()).length} / ${state.questions.length} complete` : ""}
              </span>
              <button
                type="button"
                onClick={() => setRightOpen(true)}
                className="xl:hidden inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-card-hover shrink-0"
              >
                Properties
              </button>
            </div>
          </div>

          {state.questions.length === 0 || !state.activeQuestionId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center bg-background">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border shadow-sm">
                <ListChecks className="h-6 w-6 text-text-secondary" />
              </div>
              <h3 className="text-[18px] font-semibold text-text-primary">Build your first question</h3>
              <p className="max-w-sm text-sm leading-relaxed text-text-muted">Create a question manually or let AI generate one from your content.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => addQuestion()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#E91E63] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#D81B60]"
                >
                  <Plus className="h-4 w-4" /> Create Question
                </button>
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-card-hover"
                >
                  <Sparkles className="h-4 w-4 text-pink-600" /> Generate with AI
                </button>
              </div>
            </div>
          ) : (
            <QuestionEditor />
          )}
        </main>

        <div className={`${rightCollapsed ? "w-10" : "w-[340px]"} hidden shrink-0 xl:flex`}>
          <LiveRail onDownloadPdf={openPdfModal} onStudentPreview={() => setStudentPreviewOpen(true)} collapsed={rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)} />
        </div>

        {rightOpen && (
          <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
            <div className="absolute inset-0 bg-black/20" onClick={() => setRightOpen(false)} />
            <div className="relative w-[340px] max-w-[92vw] h-full bg-card border-l border-border rounded-l-xl overflow-hidden flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-xs font-semibold">Properties</span>
                <button onClick={() => setRightOpen(false)} className="rounded p-1.5 hover:bg-card-hover text-text-muted">✕</button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <LiveRail onDownloadPdf={() => { setRightOpen(false); openPdfModal(); }} onStudentPreview={() => { setRightOpen(false); setStudentPreviewOpen(true); }} collapsed={false} onToggle={() => {}} />
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <AiGenerateModal open={aiOpen} onClose={() => setAiOpen(false)} onQuestionsAdded={handleAiQuestions} />

      <StudentPreviewModal
        open={studentPreviewOpen}
        onClose={() => setStudentPreviewOpen(false)}
        questions={state.questions}
        quizTitle={state.info.title}
      />

      {pdfCode && (
        <QuizSettingsProvider code={pdfCode}>
          <PdfConfigModal
            open={pdfModalOpen}
            onClose={() => setPdfModalOpen(false)}
            questions={state.questions}
            generating={generatingPdf}
            onGenerate={handleDownloadPdf}
          />
        </QuizSettingsProvider>
      )}
    </>
  );
}
