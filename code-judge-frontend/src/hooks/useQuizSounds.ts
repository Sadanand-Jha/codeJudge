"use client";

import { useCallback, useSyncExternalStore } from "react";

export type QuizSound = "select" | "navigate" | "submit" | "stage" | "success" | "error";

const PREFERENCE_KEY = "byteclash_quiz_sounds";
const PREFERENCE_EVENT = "byteclash-quiz-sounds-change";
let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number, type: OscillatorType = "sine") {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playQuizSound(sound: QuizSound): void {
  if (typeof document !== "undefined" && document.hidden) return;
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime + 0.005;

  switch (sound) {
    case "select":
      tone(ctx, 640, now, 0.09, 0.025, "sine");
      tone(ctx, 880, now + 0.045, 0.08, 0.018, "sine");
      break;
    case "navigate":
      tone(ctx, 430, now, 0.075, 0.018, "triangle");
      break;
    case "submit":
      tone(ctx, 420, now, 0.13, 0.025, "sine");
      tone(ctx, 610, now + 0.085, 0.15, 0.025, "sine");
      break;
    case "stage":
      tone(ctx, 760, now, 0.085, 0.014, "sine");
      break;
    case "success":
      tone(ctx, 520, now, 0.13, 0.024, "sine");
      tone(ctx, 660, now + 0.09, 0.13, 0.024, "sine");
      tone(ctx, 880, now + 0.18, 0.2, 0.026, "sine");
      break;
    case "error":
      tone(ctx, 260, now, 0.14, 0.02, "triangle");
      tone(ctx, 190, now + 0.1, 0.18, 0.018, "triangle");
      break;
  }
}

export function useQuizSounds() {
  const enabled = useSyncExternalStore(
    (notify) => {
      window.addEventListener(PREFERENCE_EVENT, notify);
      window.addEventListener("storage", notify);
      return () => {
        window.removeEventListener(PREFERENCE_EVENT, notify);
        window.removeEventListener("storage", notify);
      };
    },
    () => {
      try { return localStorage.getItem(PREFERENCE_KEY) !== "off"; } catch { return true; }
    },
    () => true,
  );

  const play = useCallback((sound: QuizSound) => {
    if (enabled) playQuizSound(sound);
  }, [enabled]);

  const toggle = useCallback(() => {
    const next = !enabled;
    try {
      localStorage.setItem(PREFERENCE_KEY, next ? "on" : "off");
    } catch {
      // The current tab can still play sounds when storage is unavailable.
    }
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
    if (next) playQuizSound("select");
  }, [enabled]);

  return { soundEnabled: enabled, playQuizSound: play, toggleQuizSounds: toggle };
}
