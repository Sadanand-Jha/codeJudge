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
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/12 to-violet-600/12 text-pink-500">
              <ListChecks className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-extrabold text-text-primary">
              Create your first question
            </h3>
            <p className="max-w-sm text-xs text-text-secondary">
              You can reorder, duplicate, and edit questions anytime.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => addQuestion()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-xs font-bold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Create Question
              </button>
              <button
                type="button"
                onClick={() => toast.info({ title: "AI", description: "Generate questions with AI." })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" /> Generate with AI
              </button>
              <button
                type="button"
                onClick={() => toast.info({ title: "Import", description: "Import questions from a file." })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary"
              >
                Import Questions
              </button>
              <button
                type="button"
                onClick={() => toast.info({ title: "Question Bank", description: "Open your reusable question bank." })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/[0.03] px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary"
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
