"use client";

import { create } from "zustand";

export interface QuizCryptoKey {
  keyHex: string;
  keyFingerprint: string;
}

interface QuizCryptoState {
  keys: Record<string, QuizCryptoKey>;
  getKey: (quizId: string) => QuizCryptoKey | undefined;
  setKey: (quizId: string, key: QuizCryptoKey) => void;
  clearKey: (quizId: string) => void;
}

/**
 * In-browser quiz keys for the current session. The key never leaves the
 * browser; it is reused on later edits so the downloaded key PDF keeps working.
 */
export const useQuizCryptoStore = create<QuizCryptoState>((set, get) => ({
  keys: {},
  getKey: (quizId) => get().keys[quizId],
  setKey: (quizId, key) =>
    set((state) => ({ keys: { ...state.keys, [quizId]: key } })),
  clearKey: (quizId) =>
    set((state) => {
      const keys = { ...state.keys };
      delete keys[quizId];
      return { keys };
    }),
}));
