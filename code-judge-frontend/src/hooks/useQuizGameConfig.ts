"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getQuizGameConfig,
  updateQuizGameConfig,
  DEFAULT_QUIZ_GAME_CONFIG,
  type QuizGameConfig,
} from "@/services/quiz";

export interface UseQuizGameConfigReturn {
  config: QuizGameConfig | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;
  refetch: () => Promise<void>;
  save: (next: QuizGameConfig) => Promise<QuizGameConfig>;
  setDraft: (next: QuizGameConfig) => void;
  draft: QuizGameConfig | null;
}

export function useQuizGameConfig(quizId: string | number | null | undefined): UseQuizGameConfigReturn {
  const [config, setConfig] = useState<QuizGameConfig | null>(null);
  const [draft, setDraft] = useState<QuizGameConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getQuizGameConfig(quizId);
      setConfig(data);
      setDraft(data);
    } catch (err: any) {
      // Do not expose backend details to the UI — show a generic message instead
      console.error("Failed to load game config", err);
      const status = err?.response?.status;
      const generic = status === 404 ? "Game settings not found." : "Unable to load game settings. Please try again.";
      setError(generic);
      // keep draft as defaults so UI can still show something, but caller should handle error state
      const fallback: QuizGameConfig = { quizId: Number(quizId), ...DEFAULT_QUIZ_GAME_CONFIG };
      setConfig(fallback);
      setDraft(fallback);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const save = useCallback(
    async (next: QuizGameConfig): Promise<QuizGameConfig> => {
      if (!quizId) throw new Error("quizId missing");
      setSaving(true);
      setSaveError(null);
      try {
        const saved = await updateQuizGameConfig(quizId, next);
        setConfig(saved);
        setDraft(saved);
        return saved;
      } catch (err: any) {
        console.error("Failed to save game config", err);
        const status = err?.response?.status;
        let generic = "Unable to save changes. Please try again.";
        if (status === 400) generic = "Some values are invalid. Please check and try again.";
        else if (status === 403) generic = "You don't have permission to update these settings.";
        else if (status === 404) generic = "Quiz not found.";
        setSaveError(generic);
        throw new Error(generic);
      } finally {
        setSaving(false);
      }
    },
    [quizId]
  );

  return {
    config,
    draft,
    setDraft: setDraft as any,
    loading,
    saving,
    error,
    saveError,
    refetch: fetchConfig,
    save,
  };
}
