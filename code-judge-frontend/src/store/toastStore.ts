/**
 * Toast Notification Store (Zustand)
 * Manages toast state with max 4 visible toasts
 */

import { create } from "zustand";
import type { ToastItem, ToastOptions, ToastType } from "@/types/toast";

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 3000;

let toastIdCounter = 0;

function generateId(): string {
  toastIdCounter += 1;
  return `toast-${Date.now()}-${toastIdCounter}`;
}

function createToastItem(
  type: ToastType,
  options: ToastOptions
): ToastItem {
  return {
    id: generateId(),
    type,
    title: options.title,
    description: options.description ?? "",
    duration: options.duration ?? DEFAULT_DURATION,
    action: options.action,
    timestamp: options.timestamp,
    dismissible: options.dismissible ?? true,
    createdAt: Date.now(),
    paused: false,
    elapsedAtPause: 0,
  };
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (type: ToastType, options: ToastOptions) => string;
  removeToast: (id: string) => void;
  updateToast: (
    id: string,
    options: Partial<ToastOptions> & { type?: ToastType }
  ) => void;
  pauseToast: (id: string, elapsed: number) => void;
  resumeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (type, options) => {
    const id = generateId();
    const item = createToastItem(type, options);

    set((state) => {
      // Keep only the most recent MAX_VISIBLE toasts
      const next = [...state.toasts, item];
      if (next.length > MAX_VISIBLE) {
        next.splice(0, next.length - MAX_VISIBLE);
      }
      return { toasts: next };
    });

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  updateToast: (id, options) => {
    set((state) => ({
      toasts: state.toasts.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          type: options.type ?? t.type,
          title: options.title ?? t.title,
          description: options.description ?? t.description,
          duration: options.duration ?? t.duration,
          action: options.action ?? t.action,
          timestamp: options.timestamp ?? t.timestamp,
          dismissible: options.dismissible ?? t.dismissible,
          // Reset timer state when updating
          createdAt: Date.now(),
          paused: false,
          elapsedAtPause: 0,
        };
      }),
    }));
  },

  pauseToast: (id, elapsed) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, paused: true, elapsedAtPause: elapsed } : t
      ),
    }));
  },

  resumeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id
          ? {
              ...t,
              paused: false,
              // Adjust createdAt so the remaining duration is preserved
              createdAt: Date.now() - t.elapsedAtPause,
            }
          : t
      ),
    }));
  },

  clearToasts: () => set({ toasts: [] }),
}));