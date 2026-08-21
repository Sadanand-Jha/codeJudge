"use client";

import { QuestionList } from "../components/QuestionList";
import { QuestionEditor } from "../components/QuestionEditor";
import { LiveRail } from "../components/LiveRail";
import { useStudio } from "../StudioProvider";
import { Plus, Sparkles, ListChecks } from "lucide-react";
import { toast } from "@/lib/toast";

export function QuestionsStep() {
  const { state, addQuestion } = useStudio();

  return (
    <div className="flex h-[calc(100vh-112px)] min-h-[540px] border-t border-border">
      <QuestionList />

      <main className="flex-1 overflow-hidden">
        {state.questions.length === 0 || !state.activeQuestionId ? (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4 px-6 text-center">
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
                onClick={() => toast.info({ title: "AI", description: "Generate questions with AI." })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" /> Generate with AI
              </button>
              <button
                type="button"
                onClick={() => toast.info({ title: "Import", description: "Import questions from a file." })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
              >
                Import Questions
              </button>
              <button
                type="button"
                onClick={() => toast.info({ title: "Question Bank", description: "Open your reusable question bank." })}
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

      <LiveRail />
    </div>
  );
}
