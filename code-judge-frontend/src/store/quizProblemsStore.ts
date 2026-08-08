"use client";

import { create } from "zustand";
import { CreatorQuestion, createDefaultQuestion, getQuestionStatus } from "@/components/quiz/creator/types";
import { loadQuizState, saveQuizQuestions } from "@/utils/quizStorage";

interface QuizProblemsState {
  /** Problems for the current quiz, hydrated from the shared quiz storage. */
  problems: CreatorQuestion[];
  activeProblemId: string | null;
  hydrated: boolean;
  hydrate: () => void;
  addProblem: () => string;
  updateProblem: (id: string, updates: Partial<CreatorQuestion>) => void;
  deleteProblem: (id: string) => void;
  duplicateProblem: (id: string) => string;
  reorderProblem: (fromIndex: number, toIndex: number) => void;
  setActiveProblem: (id: string) => void;
  save: () => void;
}

/**
 * The problem workspace is backed by the same localStorage state used by the
 * quiz creator, so problems added here are editable across the creator flow.
 */
export const useQuizProblemsStore = create<QuizProblemsState>((set, get) => ({
  problems: [],
  activeProblemId: null,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const saved = loadQuizState();
    const problems = saved?.questions && saved.questions.length > 0 ? saved.questions : [];
    set({
      problems,
      activeProblemId: problems[0]?.id ?? null,
      hydrated: true,
    });
  },

  addProblem: () => {
    const problem = createDefaultQuestion(`q_${Date.now()}`);
    const problems = [...get().problems, problem];
    set({ problems, activeProblemId: problem.id });
    get().save();
    return problem.id;
  },

  updateProblem: (id, updates) => {
    const problems = get().problems.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    set({ problems });
    get().save();
  },

  deleteProblem: (id) => {
    const { problems, activeProblemId } = get();
    const next = problems.filter((p) => p.id !== id);
    const active = activeProblemId === id ? (next[0]?.id ?? null) : activeProblemId;
    set({ problems: next, activeProblemId: active });
    get().save();
  },

  duplicateProblem: (id) => {
    const problems = get().problems;
    const index = problems.findIndex((p) => p.id === id);
    if (index === -1) return id;
    const copy = {
      ...problems[index],
      id: `q_${Date.now()}`,
      title: `${problems[index].title} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [...problems];
    next.splice(index + 1, 0, copy);
    set({ problems: next, activeProblemId: copy.id });
    get().save();
    return copy.id;
  },

  reorderProblem: (fromIndex, toIndex) => {
    const problems = [...get().problems];
    if (toIndex < 0 || toIndex >= problems.length) return;
    const [moved] = problems.splice(fromIndex, 1);
    problems.splice(toIndex, 0, moved);
    set({ problems });
    get().save();
  },

  setActiveProblem: (id) => set({ activeProblemId: id }),

  save: () => {
    const { problems, activeProblemId } = get();
    saveQuizQuestions(problems, activeProblemId ?? "");
  },
}));

/** Convenience: map a problem to its completion status for UI badges. */
export { getQuestionStatus };
