"use client";

import { QuizDetails, CreatorQuestion, DEFAULT_QUIZ_DETAILS, QuizAudience, DEFAULT_QUIZ_AUDIENCE } from "@/components/quiz/creator/types";
import { STORAGE_KEYS } from "@/utils/storageKeys";

const STORAGE_KEY = STORAGE_KEYS.QUIZ_CREATION;

export interface QuizCreationState {
  details: QuizDetails;
  questions: CreatorQuestion[];
  activeQuestionId: string;
  currentStage: "settings" | "builder";
  updatedAt: string;
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function saveQuizState(state: QuizCreationState): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save quiz state to localStorage:", err);
  }
}

export function loadQuizState(): QuizCreationState | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuizCreationState;
    if (!parsed.details || !Array.isArray(parsed.questions)) return null;
    return parsed;
  } catch (err) {
    console.error("Failed to load quiz state from localStorage:", err);
    return null;
  }
}

export function clearQuizState(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear quiz state from localStorage:", err);
  }
}

export function saveQuizDetails(details: QuizDetails): void {
  if (!isClient()) return;
  const existing = loadQuizState();
  const state: QuizCreationState = {
    details,
    questions: existing?.questions || [],
    activeQuestionId: existing?.activeQuestionId || "",
    currentStage: "settings",
    updatedAt: new Date().toISOString(),
  };
  saveQuizState(state);
}

export function saveQuizQuestions(
  questions: CreatorQuestion[],
  activeQuestionId: string
): void {
  if (!isClient()) return;
  const existing = loadQuizState();
  const state: QuizCreationState = {
    details: existing?.details || DEFAULT_QUIZ_DETAILS,
    questions,
    activeQuestionId,
    currentStage: "builder",
    updatedAt: new Date().toISOString(),
  };
  saveQuizState(state);
}

export function saveActiveQuestionId(activeQuestionId: string): void {
  if (!isClient()) return;
  const existing = loadQuizState();
  if (!existing) return;
  saveQuizState({
    ...existing,
    activeQuestionId,
    updatedAt: new Date().toISOString(),
  });
}

export function hasSavedQuiz(): boolean {
  if (!isClient()) return false;
  return loadQuizState() !== null;
}

/**
 * Fingerprint of the question set used to detect when local questions have
 * changed since they were last synced to the server. Any edit bumps
 * `updatedAt`, so a different signature means the questions need re-saving.
 */
export function computeQuestionsSignature(questions: CreatorQuestion[]): string {
  if (!questions || questions.length === 0) return "";
  return questions.map((q) => `${q.id}:${q.updatedAt}`).join("|");
}

export function getSyncedSignature(code: string): string | null {
  if (!isClient()) return null;
  try {
    return localStorage.getItem(`${STORAGE_KEYS.QUIZ_SYNC_SIGNATURE_PREFIX}${code}`);
  } catch (err) {
    console.error("Failed to read synced signature:", err);
    return null;
  }
}

export function setSyncedSignature(code: string, signature: string): void {
  if (!isClient()) return;
  try {
    const key = `${STORAGE_KEYS.QUIZ_SYNC_SIGNATURE_PREFIX}${code}`;
    if (signature) localStorage.setItem(key, signature);
    else localStorage.removeItem(key);
  } catch (err) {
    console.error("Failed to store synced signature:", err);
  }
}

/* =============================================
   Per-quiz audience persistence
   ============================================= */

/**
 * Persist the audience config for a specific quiz code. The audience lives in
 * the shared QuizDetails too, but this per-quiz copy lets the student
 * registration page resolve eligibility without the full creator workspace.
 */
export function saveQuizAudience(code: string, audience: QuizAudience): void {
  if (!isClient() || !code) return;
  try {
    localStorage.setItem(`${STORAGE_KEYS.QUIZ_AUDIENCE_PREFIX}${code}`, JSON.stringify(audience));
  } catch (err) {
    console.error("Failed to save quiz audience:", err);
  }
}

export function loadQuizAudience(code: string): QuizAudience | null {
  if (!isClient() || !code) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.QUIZ_AUDIENCE_PREFIX}${code}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuizAudience>;
    return { ...DEFAULT_QUIZ_AUDIENCE, ...parsed };
  } catch (err) {
    console.error("Failed to load quiz audience:", err);
    return null;
  }
}

/** Remove the per-quiz audience copy (used when a quiz is deleted). */
export function clearQuizAudience(code: string): void {
  if (!isClient() || !code) return;
  try {
    localStorage.removeItem(`${STORAGE_KEYS.QUIZ_AUDIENCE_PREFIX}${code}`);
  } catch (err) {
    console.error("Failed to clear quiz audience:", err);
  }
}