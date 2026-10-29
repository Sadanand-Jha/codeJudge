"use client";

import { create } from "zustand";
import type { QuizKeyEntry } from "@/store/quizKeyStore";

export class QuizKeyGateCancelledError extends Error {
  constructor() {
    super("Teacher key entry was cancelled.");
    this.name = "QuizKeyGateCancelledError";
  }
}

interface QuizKeyGateRequest {
  quizId: string;
  title?: string;
  verify?: (key: CryptoKey) => Promise<boolean>;
}

interface PendingRequest {
  request: QuizKeyGateRequest;
  resolve: (entry: QuizKeyEntry) => void;
  reject: (error: Error) => void;
}

interface QuizKeyGateState {
  open: boolean;
  request: QuizKeyGateRequest | null;
  pending: PendingRequest | null;
  openGate: (request: QuizKeyGateRequest) => Promise<QuizKeyEntry>;
  complete: (entry: QuizKeyEntry) => void;
  cancel: () => void;
}

export const useQuizKeyGateStore = create<QuizKeyGateState>((set, get) => ({
  open: false,
  request: null,
  pending: null,
  openGate: (request) => {
    const current = get();
    if (current.open && current.pending) {
      if (current.pending.request.quizId === request.quizId) {
        return new Promise<QuizKeyEntry>((resolve, reject) => {
          const pending = current.pending!;
          const originalResolve = pending.resolve;
          const originalReject = pending.reject;
          set({
            pending: {
              request: current.pending!.request,
              resolve: (entry) => {
                originalResolve(entry);
                resolve(entry);
              },
              reject: (error) => {
                originalReject(error);
                reject(error);
              },
            },
          });
        });
      }
      current.pending.reject(new QuizKeyGateCancelledError());
    }
    return new Promise<QuizKeyEntry>((resolve, reject) => {
      set({
        open: true,
        request,
        pending: { request, resolve, reject },
      });
    });
  },
  complete: (entry) => {
    const pending = get().pending;
    set({ open: false, request: null, pending: null });
    pending?.resolve(entry);
  },
  cancel: () => {
    const pending = get().pending;
    set({ open: false, request: null, pending: null });
    pending?.reject(new QuizKeyGateCancelledError());
  },
}));
