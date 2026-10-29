"use client";

import { create } from "zustand";

export interface QuizKeyEntry {
  keyHex: string;
  key: CryptoKey;
  keyFingerprint: string;
}

interface QuizKeyState {
  keys: Record<string, QuizKeyEntry>;
  getKey: (quizId: string) => QuizKeyEntry | undefined;
  setKey: (quizId: string, entry: QuizKeyEntry) => void;
  clearKey: (quizId: string) => void;
  clearAll: () => void;
}

/**
 * Per-quiz teacher keys for the current browser session only. There is no
 * persistence layer: a refresh always asks the teacher to enter the key again.
 */
export const useQuizKeyStore = create<QuizKeyState>((set, get) => ({
  keys: {},
  getKey: (quizId) => get().keys[quizId],
  setKey: (quizId, entry) =>
    set((state) => ({ keys: { ...state.keys, [quizId]: entry } })),
  clearKey: (quizId) =>
    set((state) => {
      const keys = { ...state.keys };
      delete keys[quizId];
      return { keys };
    }),
  clearAll: () => set({ keys: {} }),
}));
