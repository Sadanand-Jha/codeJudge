"use client";

import { useState } from "react";
import { QuestionList } from "../components/QuestionList";
import { QuestionEditor } from "../components/QuestionEditor";
import { LiveRail } from "../components/LiveRail";
import { AiGenerateModal } from "../components/AiGenerateModal";
import { useStudio } from "../StudioProvider";
import { Plus, Sparkles, ListChecks } from "lucide-react";
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
  const [rightCollapsed, setRightCollapsed] = useState(false);
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
      <div className="flex min-h-0 flex-col gap-3 bg-[#F8FAFC] lg:flex-1 lg:min-h-0 lg:flex-row lg:overflow-hidden">
        {sidebarOpen && <div className="fixed inset-0 z-40 lg:hidden bg-black/20" onClick={() => setSidebarOpen(false)} />}

        <aside
          className={`
            fixed inset-y-0 left-0 z-50 flex w-[280px] shrink-0 flex-col border border-zinc-200 bg-white rounded-xl transition-transform duration-200 lg:static lg:z-auto lg:flex overflow-visible
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <QuestionList onAiGenerate={() => setAiOpen(true)} onToggleSidebar={() => setSidebarOpen(false)} />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white rounded-xl border border-zinc-200">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <ListChecks className="h-3.5 w-3.5" />
              Questions ({state.questions.length})
            </button>
            <span className="text-xs text-zinc-500">
              {state.questions.length > 0 ? `${state.questions.filter((q) => q.title.trim()).length} / ${state.questions.length} complete` : ""}
            </span>
          </div>

          {state.questions.length === 0 || !state.activeQuestionId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center bg-[#FCFCF9]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-zinc-200 shadow-sm">
                <ListChecks className="h-6 w-6 text-zinc-600" />
              </div>
              <h3 className="text-[18px] font-semibold text-zinc-900">Build your first question</h3>
              <p className="max-w-sm text-sm leading-relaxed text-zinc-500">Create a question manually or let AI generate one from your content.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => addQuestion()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  <Plus className="h-4 w-4" /> Create Question
                </button>
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <Sparkles className="h-4 w-4 text-violet-600" /> Generate with AI
                </button>
              </div>
            </div>
          ) : (
            <QuestionEditor />
          )}
        </main>

        <div className={`${rightCollapsed ? "w-10" : "w-[340px]"} hidden shrink-0 lg:flex`}>
          <LiveRail onDownloadPdf={() => setPdfModalOpen(true)} collapsed={rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)} />
        </div>
      </div>

      <AiGenerateModal open={aiOpen} onClose={() => setAiOpen(false)} onQuestionsAdded={handleAiQuestions} />

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
