"use client";

import { create } from "zustand";
import { CreatorQuestion, createDefaultQuestion, getQuestionStatus } from "@/components/quiz/creator/types";
import { loadQuizState, saveQuizQuestions } from "@/utils/quizStorage";

interface HistoryEntry {
  problems: CreatorQuestion[];
  activeProblemId: string | null;
}

interface QuizProblemsState {
  /** Problems for the current quiz, hydrated from the shared quiz storage. */
  problems: CreatorQuestion[];
  activeProblemId: string | null;
  hydrated: boolean;
  /** Snapshots of prior list states for Ctrl/Cmd+Z undo of structural actions. */
  history: HistoryEntry[];
  hydrate: () => void;
  addProblem: () => string;
  addProblems: (questions: CreatorQuestion[]) => void;
  updateProblem: (id: string, updates: Partial<CreatorQuestion>) => void;
  deleteProblem: (id: string) => void;
  deleteAllProblems: () => void;
  duplicateProblem: (id: string) => string;
  reorderProblem: (fromIndex: number, toIndex: number) => void;
  setActiveProblem: (id: string) => void;
  /** Restore the last structural change. Returns true when something was undone. */
  undo: () => boolean;
  save: () => void;
}

const MAX_HISTORY = 30;

/**
 * Snapshot the current problems list before a structural mutation, then apply
 * the mutation. Snapshots are shallow copies of the problems array and each
 * question, so later immutable edits never leak into history entries.
 */
function pushHistory(
  get: () => QuizProblemsState,
  set: (partial: Partial<QuizProblemsState>) => void,
  replace: { problems: CreatorQuestion[]; activeProblemId: string | null }
) {
  const { problems, activeProblemId, history } = get();
  set({
    history: [
      ...history,
      { problems: problems.map((p) => ({ ...p })), activeProblemId },
    ].slice(-MAX_HISTORY),
    ...replace,
  });
}

/**
 * The problem workspace is backed by the same localStorage state used by the
 * quiz creator, so problems added here are editable across the creator flow.
 */
export const useQuizProblemsStore = create<QuizProblemsState>((set, get) => ({
  problems: [],
  activeProblemId: null,
  hydrated: false,
  history: [],

  hydrate: () => {
    if (get().hydrated) return;
    const saved = loadQuizState();
    const problems = saved?.questions && saved.questions.length > 0 ? saved.questions : [];
    set({
      problems,
      activeProblemId: problems[0]?.id ?? null,
      hydrated: true,
      history: [],
    });
  },

  addProblem: () => {
    const problem = createDefaultQuestion(`q_${Date.now()}`);
    const problems = [...get().problems, problem];
    pushHistory(get, set, { problems, activeProblemId: problem.id });
    get().save();
    return problem.id;
  },

  addProblems: (questions) => {
    if (!questions || questions.length === 0) return;
    const existing = [...get().problems];
    const ids = new Set(existing.map((p) => p.id));
    const fresh: CreatorQuestion[] = [];
    for (const q of questions) {
      let id = q.id;
      if (!id || ids.has(id)) id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      ids.add(id);
      fresh.push({ ...q, id });
    }
    const problems = [...existing, ...fresh];
    const last = fresh[fresh.length - 1];
    pushHistory(get, set, { problems, activeProblemId: last?.id ?? get().activeProblemId });
    get().save();
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
    pushHistory(get, set, { problems: next, activeProblemId: active });
    get().save();
  },

  deleteAllProblems: () => {
    pushHistory(get, set, { problems: [], activeProblemId: null });
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
    pushHistory(get, set, { problems: next, activeProblemId: copy.id });
    get().save();
    return copy.id;
  },

  reorderProblem: (fromIndex, toIndex) => {
    const problems = [...get().problems];
    if (toIndex < 0 || toIndex >= problems.length) return;
    const [moved] = problems.splice(fromIndex, 1);
    problems.splice(toIndex, 0, moved);
    pushHistory(get, set, { problems, activeProblemId: get().activeProblemId });
    get().save();
  },

  setActiveProblem: (id) => set({ activeProblemId: id }),

  undo: () => {
    const { history } = get();
    if (history.length === 0) return false;
    const last = history[history.length - 1];
    set({
      problems: last.problems,
      activeProblemId: last.activeProblemId,
      history: history.slice(0, -1),
    });
    get().save();
    return true;
  },

  save: () => {
    const { problems, activeProblemId } = get();
    saveQuizQuestions(problems, activeProblemId ?? "");
  },
}));

/** Convenience: map a problem to its completion status for UI badges. */
export { getQuestionStatus };
