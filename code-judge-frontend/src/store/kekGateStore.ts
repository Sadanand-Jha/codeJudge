"use client";

import { create } from "zustand";
import { getKekConfig, type KekConfigResponse } from "@/services/quizCrypto";
import { useKekStore } from "@/store/kekStore";

export class KekGateCancelledError extends Error {
  constructor() {
    super("Encryption key setup was cancelled.");
    this.name = "KekGateCancelledError";
  }
}

interface PendingRequest {
  resolve: (kek: CryptoKey) => void;
  reject: (error: Error) => void;
}

interface KekGateState {
  open: boolean;
  mode: "setup" | "unlock" | null;
  config: KekConfigResponse | null;
  pending: PendingRequest | null;
  loading: boolean;
  request: () => Promise<CryptoKey>;
  complete: (kek: CryptoKey) => void;
  cancel: () => void;
}

export const useKekGateStore = create<KekGateState>((set, get) => ({
  open: false,
  mode: null,
  config: null,
  pending: null,
  loading: false,
  request: async () => {
    const existing = useKekStore.getState().getKek();
    if (existing) return existing;
    const current = get();
    if (current.open && current.pending) {
      return new Promise<CryptoKey>((resolve, reject) => {
        const pending = current.pending!;
        const originalResolve = pending.resolve;
        const originalReject = pending.reject;
        set({
          pending: {
            resolve: (kek) => {
              originalResolve(kek);
              resolve(kek);
            },
            reject: (error) => {
              originalReject(error);
              reject(error);
            },
          },
        });
      });
    }
    set({ loading: true });
    try {
      const config = await getKekConfig();
      const promise = new Promise<CryptoKey>((resolve, reject) => {
        set({
          open: true,
          mode: config.configured ? "unlock" : "setup",
          config,
          pending: { resolve, reject },
          loading: false,
        });
      });
      return promise;
    } catch (error) {
      set({ open: false, mode: null, config: null, pending: null, loading: false });
      throw error;
    }
  },
  complete: (kek) => {
    const pending = get().pending;
    set({
      open: false,
      mode: null,
      config: null,
      pending: null,
      loading: false,
    });
    pending?.resolve(kek);
  },
  cancel: () => {
    const pending = get().pending;
    set({
      open: false,
      mode: null,
      config: null,
      pending: null,
      loading: false,
    });
    pending?.reject(new KekGateCancelledError());
  },
}));
