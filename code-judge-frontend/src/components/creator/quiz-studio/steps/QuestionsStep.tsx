"use client";

import { useState } from "react";
import { QuestionList } from "../components/QuestionList";
import { QuestionEditor } from "../components/QuestionEditor";
import { LiveRail } from "../components/LiveRail";
import { AiGenerateModal } from "../components/AiGenerateModal";
import { useStudio } from "../StudioProvider";
import { Plus, Sparkles, ListChecks, Download, Loader2 } from "lucide-react";
import type { CreatorQuestion } from "../types";
import { downloadQuizPaperPdf } from "@/utils/quizPdf";
import { type PdfConfig, type PdfStudent } from "@/utils/pdfConfig";
import { QuizSettingsProvider } from "@/components/quiz/creator/settings/QuizSettingsContext";
import PdfConfigModal from "@/components/quiz/creator/settings/PdfConfigModal";
import { toast } from "@/lib/toast";

export function QuestionsStep() {
  const { state, addQuestion, importQuestions } = useStudio();
  const [aiOpen, setAiOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
      <div className="flex flex-col border-t border-border lg:h-[calc(100vh-112px)] lg:min-h-[540px] lg:flex-row">
        {/* Mobile sidebar drawer overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Question list sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 flex h-[calc(100vh-4rem)] w-72 shrink-0 flex-col border-r border-border bg-card/50 transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto lg:flex
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <QuestionList
            onAiGenerate={() => setAiOpen(true)}
            onToggleSidebar={() => setSidebarOpen(false)}
          />
        </aside>

        {/* Main editor */}
        <main className="min-w-0 flex-1 overflow-y-auto lg:overflow-hidden">
          {/* Mobile header with sidebar toggle */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover"
            >
              <ListChecks className="h-3.5 w-3.5" />
              Questions ({state.questions.length})
            </button>
            <button
              type="button"
              onClick={() => setPdfModalOpen(true)}
              disabled={state.questions.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-1.5 text-xs font-medium text-pink-500 transition-colors hover:bg-pink-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>

          {state.questions.length === 0 || !state.activeQuestionId ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-text-muted">
                <ListChecks className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-text-primary">
                Create your first question
              </h3>
              <p className="max-w-sm text-xs leading-relaxed text-text-secondary">
                You can reorder, duplicate, and edit questions anytime.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => addQuestion()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 px-4 py-2 text-xs font-semibold transition-colors duration-150 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Question
                </button>
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Generate with AI
                </button>
                <button
                  type="button"
                  onClick={() => {}}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
                >
                  Import Questions
                </button>
                <button
                  type="button"
                  onClick={() => {}}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
                >
                  Question Bank
                </button>
              </div>
            </div>
          ) : (
            <QuestionEditor />
          )}
        </main>

        {/* Live rail - hidden on mobile, shown on desktop */}
        <div className="lg:w-64 lg:shrink-0">
          <LiveRail onDownloadPdf={() => setPdfModalOpen(true)} />
        </div>
      </div>

      <AiGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onQuestionsAdded={handleAiQuestions}
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
