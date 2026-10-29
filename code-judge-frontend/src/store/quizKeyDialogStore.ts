"use client";

import { create } from "zustand";

export interface QuizKeyDialogPayload {
  quizId: string;
  title: string;
  keyHex: string;
  keyFingerprint: string;
}

interface QuizKeyDialogState {
  open: boolean;
  payload: QuizKeyDialogPayload | null;
  show: (payload: QuizKeyDialogPayload) => Promise<void>;
  close: () => void;
}

let resolvePending: (() => void) | null = null;

export const useQuizKeyDialogStore = create<QuizKeyDialogState>((set, get) => ({
  open: false,
  payload: null,
  show: (payload) => {
    get().close();
    return new Promise<void>((resolve) => {
      resolvePending = resolve;
      set({ open: true, payload });
    });
  },
  close: () => {
    set({ open: false, payload: null });
    const resolve = resolvePending;
    resolvePending = null;
    resolve?.();
  },
}));
