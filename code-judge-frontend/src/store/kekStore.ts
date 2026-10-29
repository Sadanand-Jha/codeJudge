"use client";

import { create } from "zustand";
import type { KdfParams } from "@/lib/crypto";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

let idleTimer: ReturnType<typeof setTimeout> | null = null;

interface KekState {
  kek: CryptoKey | null;
  kdf: KdfParams | null;
  unlockedAt: number | null;
  setKek: (kek: CryptoKey, kdf: KdfParams) => void;
  touch: () => void;
  lock: () => void;
  getKek: () => CryptoKey | null;
}

function clearIdleTimer() {
  if (idleTimer !== null) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function scheduleLock(lock: () => void) {
  clearIdleTimer();
  idleTimer = setTimeout(lock, IDLE_TIMEOUT_MS);
}

export const useKekStore = create<KekState>((set, get) => ({
  kek: null,
  kdf: null,
  unlockedAt: null,
  setKek: (kek, kdf) => {
    set({ kek, kdf, unlockedAt: Date.now() });
    scheduleLock(() => get().lock());
  },
  touch: () => {
    if (!get().kek) return;
    set({ unlockedAt: Date.now() });
    scheduleLock(() => get().lock());
  },
  lock: () => {
    clearIdleTimer();
    set({ kek: null, kdf: null, unlockedAt: null });
  },
  getKek: () => {
    touchFromOutside();
    return get().kek;
  },
}));

function touchFromOutside() {
  useKekStore.getState().touch();
}
