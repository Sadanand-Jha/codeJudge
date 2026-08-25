"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { QuestionList } from "../components/QuestionList";
import { QuestionEditor } from "../components/QuestionEditor";
import { LiveRail } from "../components/LiveRail";
import { AiGenerateModal } from "../components/AiGenerateModal";
import { StudentPreviewModal } from "../components/StudentPreviewModal";
import { useStudio, isQuestionValidationError } from "../StudioProvider";
import { Plus, Sparkles, ListChecks } from "lucide-react";
import type { CreatorQuestion } from "../types";
import { downloadQuizPaperPdf } from "@/utils/quizPdf";
import { type PdfConfig, type PdfStudent } from "@/utils/pdfConfig";
import { QuizSettingsProvider } from "@/components/quiz/creator/settings/QuizSettingsContext";
import PdfConfigModal from "@/components/quiz/creator/settings/PdfConfigModal";
import { toast } from "@/lib/toast";

function hashState(questions: CreatorQuestion[], info: { title: string; shortDescription: string; fullDescription: string; subject: string; difficulty: string; duration: number; passingMarks: number; tags: string[] }) {
  return JSON.stringify({ questions, title: info.title, shortDescription: info.shortDescription, fullDescription: info.fullDescription, subject: info.subject, difficulty: info.difficulty, duration: info.duration, passingMarks: info.passingMarks, tags: info.tags });
}

export function QuestionsStep() {
  const { state, addQuestion, importQuestions, saveToServer } = useStudio();
  const [aiOpen, setAiOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [studentPreviewOpen, setStudentPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const snapshotRef = useRef(hashState(state.questions, state.info));
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(hashState(state.questions, state.info) !== snapshotRef.current);
  }, [state.questions, state.info]);

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

  return (
    <>
      <div className="flex min-h-0 flex-col gap-3 bg-background lg:flex-1 lg:min-h-0 lg:flex-row lg:overflow-hidden">
        {sidebarOpen && <div className="fixed inset-0 z-40 lg:hidden bg-black/20" onClick={() => setSidebarOpen(false)} />}

        <aside
          className={`
            fixed inset-y-0 left-0 z-50 flex w-[280px] shrink-0 flex-col border border-border bg-card rounded-xl transition-transform duration-200 lg:static lg:z-auto lg:flex overflow-visible
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <QuestionList onAiGenerate={() => setAiOpen(true)} onDownloadPdf={() => setPdfModalOpen(true)} onSave={handleSave} saving={saving} hasChanges={hasChanges} onToggleSidebar={() => setSidebarOpen(false)} />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-card-hover"
            >
              <ListChecks className="h-3.5 w-3.5" />
              Questions ({state.questions.length})
            </button>
            <span className="text-xs text-text-muted">
              {state.questions.length > 0 ? `${state.questions.filter((q) => q.title.trim()).length} / ${state.questions.length} complete` : ""}
            </span>
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

        <div className={`${rightCollapsed ? "w-10" : "w-[340px]"} hidden shrink-0 lg:flex`}>
          <LiveRail onDownloadPdf={() => setPdfModalOpen(true)} onStudentPreview={() => setStudentPreviewOpen(true)} collapsed={rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)} />
        </div>
      </div>

      <AiGenerateModal open={aiOpen} onClose={() => setAiOpen(false)} onQuestionsAdded={handleAiQuestions} />

      <StudentPreviewModal
        open={studentPreviewOpen}
        onClose={() => setStudentPreviewOpen(false)}
        questions={state.questions}
        quizTitle={state.info.title}
      />

      {state.info.code && (
        <QuizSettingsProvider code={state.info.code}>
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
