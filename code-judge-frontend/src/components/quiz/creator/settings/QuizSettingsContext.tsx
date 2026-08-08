"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getQuizByCode, type Quiz } from "@/services/quiz";
import { QuizDetails, DEFAULT_QUIZ_DETAILS } from "@/components/quiz/creator/types";
import { loadQuizState } from "@/utils/quizStorage";

export type QuizStatus = "draft" | "scheduled" | "registration_open" | "live" | "ended" | "completed";

function deriveQuizStatus(opts: {
  hasQuizId: boolean;
  status?: string;
  startTime?: string | null;
  endTime?: string | null;
  registrationEnabled?: boolean;
  registrationStart?: string;
  registrationEnd?: string;
}): QuizStatus {
  if (!opts.hasQuizId) return "draft";

  const status = opts.status;
  const now = new Date();

  if (status === "archived") return "completed";
  if (status === "draft") return "draft";

  const start = opts.startTime ? new Date(opts.startTime) : null;
  const end = opts.endTime ? new Date(opts.endTime) : null;

  if (end && now >= end) return "ended";
  if (start && now < start) {
    if (
      opts.registrationEnabled &&
      opts.registrationStart &&
      opts.registrationEnd &&
      now >= new Date(opts.registrationStart) &&
      now < new Date(opts.registrationEnd)
    ) {
      return "registration_open";
    }
    return "scheduled";
  }
  return "live";
}

interface QuizSettingsContextValue {
  code: string;
  quizId?: number;
  quiz: Quiz | null;
  loading: boolean;
  error: string | null;
  derivedStatus: QuizStatus;
  isLive: boolean;
  isEnded: boolean;
  details: QuizDetails;
  updateDetails: (patch: Partial<QuizDetails>) => void;
  refresh: () => Promise<void>;
}

const QuizSettingsContext = createContext<QuizSettingsContextValue | null>(null);

export function useQuizSettings(): QuizSettingsContextValue {
  const ctx = useContext(QuizSettingsContext);
  if (!ctx) {
    throw new Error("useQuizSettings must be used within QuizSettingsProvider");
  }
  return ctx;
}

export function QuizSettingsProvider({
  code,
  children,
}: {
  code: string;
  children: ReactNode;
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<QuizDetails>(() => {
    const saved = loadQuizState();
    if (saved?.details) return { ...DEFAULT_QUIZ_DETAILS, ...saved.details };
    return { ...DEFAULT_QUIZ_DETAILS };
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await getQuizByCode(code);
      if (loaded) {
        setQuiz(loaded);
        setError(null);
      } else {
        setError("Quiz not found");
      }
    } catch {
      setError("We couldn't load this quiz.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (quiz?.name && !details.name.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the quiz name once loaded
      setDetails((d) => ({ ...d, name: quiz.name }));
    }
  }, [quiz, details.name]);

  const updateDetails = useCallback((patch: Partial<QuizDetails>) => {
    setDetails((d) => ({ ...d, ...patch }));
  }, []);

  const derivedStatus = useMemo<QuizStatus>(
    () =>
      deriveQuizStatus({
        hasQuizId: Boolean(quiz?.id),
        status: quiz?.status ?? undefined,
        startTime: quiz?.starttime ?? null,
        endTime: quiz?.endtime ?? null,
        registrationEnabled: details.registrationEnabled,
        registrationStart: details.registrationStart,
        registrationEnd: details.registrationEnd,
      }),
    [quiz, details.registrationEnabled, details.registrationStart, details.registrationEnd]
  );

  const isLive = derivedStatus === "live";
  const isEnded = derivedStatus === "ended" || derivedStatus === "completed";

  const value = useMemo<QuizSettingsContextValue>(
    () => ({
      code,
      quizId: quiz?.id,
      quiz,
      loading,
      error,
      derivedStatus,
      isLive,
      isEnded,
      details,
      updateDetails,
      refresh,
    }),
    [code, quiz, loading, error, derivedStatus, isLive, isEnded, details, updateDetails, refresh]
  );

  return <QuizSettingsContext.Provider value={value}>{children}</QuizSettingsContext.Provider>;
}
