/**
 * Quiz Progress Local Storage Utility
 * 
 * Handles:
 * - Auto-save with debounce
 * - Crash recovery
 * - Skipped questions (no entries created)
 * - Batch submission preparation
 */

import { STORAGE_KEYS } from "@/utils/storageKeys";

const STORAGE_KEY_PREFIX = STORAGE_KEYS.QUIZ_PROGRESS_PREFIX;

export interface QuizProgress {
  quizId: string;
  attemptId?: number;
  startedAt: string;
  currentQuestion: number;
  remainingTime?: number;
  responses: Record<string, any>;
}

/**
 * Get storage key for a quiz
 */
function getStorageKey(quizId: string): string {
  return `${STORAGE_KEY_PREFIX}${quizId}`;
}

/**
 * Save quiz progress to localStorage
 */
export function saveQuizProgress(progress: QuizProgress): void {
  try {
    const key = getStorageKey(progress.quizId);
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (err) {
    console.error("Failed to save quiz progress:", err);
  }
}

/**
 * Load quiz progress from localStorage
 */
export function loadQuizProgress(quizId: string): QuizProgress | null {
  try {
    const key = getStorageKey(quizId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as QuizProgress;
  } catch (err) {
    console.error("Failed to load quiz progress:", err);
    return null;
  }
}

/**
 * Clear quiz progress from localStorage
 */
export function clearQuizProgress(quizId: string): void {
  try {
    const key = getStorageKey(quizId);
    localStorage.removeItem(key);
  } catch (err) {
    console.error("Failed to clear quiz progress:", err);
  }
}

/**
 * Create debounced save function
 */
export function createDebouncedSave(delay: number = 500): (progress: QuizProgress) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (progress: QuizProgress) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      saveQuizProgress(progress);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Initialize quiz progress
 */
export function initializeQuizProgress(quizId: string, attemptId?: number): QuizProgress {
  return {
    quizId,
    attemptId,
    startedAt: new Date().toISOString(),
    currentQuestion: 0,
    responses: {},
  };
}

/**
 * Update response in progress
 */
export function updateResponse(
  progress: QuizProgress,
  questionId: string | number,
  response: any
): QuizProgress {
  return {
    ...progress,
    responses: {
      ...progress.responses,
      [questionId]: response,
    },
  };
}

/**
 * Remove response from progress (for skipped questions)
 */
export function removeResponse(
  progress: QuizProgress,
  questionId: string | number
): QuizProgress {
  const { [questionId]: _, ...remaining } = progress.responses;
  return {
    ...progress,
    responses: remaining,
  };
}

/**
 * Get all responses as array for batch submission
 */
export function getResponsesArray(progress: QuizProgress): Array<{ problemId: number; option?: string; textAnswer?: string }> {
  return Object.entries(progress.responses).map(([questionId, response]) => {
    const base: any = {
      problemId: Number(questionId),
    };

    if (response.option !== undefined) {
      base.option = String(response.option);
    }
    if (response.textAnswer !== undefined) {
      base.textAnswer = String(response.textAnswer);
    }

    return base;
  });
}

/**
 * Check if quiz has unsaved progress
 */
export function hasUnsavedProgress(quizId: string): boolean {
  const progress = loadQuizProgress(quizId);
  if (!progress) return false;
  return Object.keys(progress.responses).length > 0;
}

/**
 * Get remaining time from progress
 */
export function getRemainingTime(quizId: string): number | null {
  const progress = loadQuizProgress(quizId);
  if (!progress || !progress.remainingTime) return null;
  return progress.remainingTime;
}

/**
 * Update remaining time in progress
 */
export function updateRemainingTime(progress: QuizProgress, remainingTime: number): QuizProgress {
  return {
    ...progress,
    remainingTime,
  };
}