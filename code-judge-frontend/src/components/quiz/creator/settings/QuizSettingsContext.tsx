"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getQuizByCode, getQuizProblems, updateQuiz, updateQuizStatus, type Quiz } from "@/services/quiz";
import { QuizDetails, DEFAULT_QUIZ_DETAILS } from "@/components/quiz/creator/types";
import { loadQuizState, saveQuizDetails, computeQuestionsSignature, getSyncedSignature } from "@/utils/quizStorage";
import { useQuizProblemsStore } from "@/store/quizProblemsStore";
import { useToast } from "@/hooks/useToast";

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

/**
 * Validate the quiz configuration that is required before it can be started.
 * Returns a human-readable message describing the first missing requirement,
 * or `null` when everything needed is in place.
 */
function validateQuizStart(details: QuizDetails): string | null {
  if (!details.name.trim()) return "Quiz name is required.";
  if (!details.subject.trim()) return "Subject is required.";
  if (details.timeLimit <= 0) return "Quiz duration must be greater than 0 minutes.";
  if (details.registrationEnabled) {
    if (!details.registrationStart) return "Registration start time is required.";
    if (!details.registrationEnd) return "Registration end time is required.";
  }
  return null;
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
  confirmingStart: boolean;
  confirmingEnd: boolean;
  actionBusy: boolean;
  startValidationError: string | null;
  requestStart: () => Promise<void>;
  confirmStart: () => Promise<void>;
  cancelStart: () => void;
  requestEnd: () => void;
  confirmEnd: () => Promise<void>;
  cancelEnd: () => void;
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
  const toast = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingStart, setConfirmingStart] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [startValidationError, setStartValidationError] = useState<string | null>(null);
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
    // Only hydrate the name from the backend when the quiz object itself
    // changes (initial load or explicit refresh) — never while the user is
    // actively editing the name field.
    if (quiz?.name && !details.name.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the quiz name from backend when quiz object changes
      setDetails((d) => ({ ...d, name: quiz.name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only sync once per quiz load, not on every keystroke
  }, [quiz]);

  const updateDetails = useCallback((patch: Partial<QuizDetails>) => {
    setDetails((d) => ({ ...d, ...patch }));
    // Editing settings clears any stale "cannot start" validation message.
    setStartValidationError(null);
  }, []);

  const hydrateProblems = useQuizProblemsStore((s) => s.hydrate);

  /**
   * Validate the current quiz configuration and, when valid, open the
   * "Start Quiz" confirmation. When something is missing, the message is
   * surfaced inline in the sidebar and as a toast instead of starting.
   */
  const requestStart = useCallback(async () => {
    if (!quiz?.id) {
      setStartValidationError("Save the quiz before starting it.");
      toast.error({
        title: "Cannot start quiz",
        description: "Save the quiz first, then try starting it again.",
      });
      return;
    }

    const message = validateQuizStart(details);
    if (message) {
      setStartValidationError(message);
      toast.error({ title: "Cannot start quiz", description: message });
      return;
    }

    // A quiz needs at least one problem before it can be started. Check the
    // local creator workspace first, then fall back to the backend.
    hydrateProblems();
    const localQuestions = useQuizProblemsStore.getState().problems;
    const localCount = localQuestions.length;
    let backendCount = 0;
    try {
      const problems = await getQuizProblems(String(quiz.id));
      backendCount = problems.length;
    } catch {
      // Ignore backend errors here — the local workspace may still have problems.
    }
    if (localCount === 0 && backendCount === 0) {
      setStartValidationError("Add at least one problem before starting the quiz.");
      toast.error({
        title: "Cannot start quiz",
        description: "Add at least one problem before starting the quiz.",
      });
      return;
    }

    // All local questions must be saved to the server before the quiz can start.
    if (localCount > 0) {
      const signature = computeQuestionsSignature(localQuestions);
      const savedSignature = getSyncedSignature(code);
      if (!savedSignature || signature !== savedSignature) {
        setStartValidationError("Save all questions before starting the quiz.");
        toast.error({
          title: "Cannot start quiz",
          description: "Save all questions before starting the quiz.",
        });
        return;
      }
    }

    setStartValidationError(null);
    setConfirmingStart(true);
  }, [quiz, details, code, toast, hydrateProblems]);

  /**
   * Confirm the quiz start: persist the current settings, then publish the
   * quiz so it is immediately accessible to students.
   */
  const confirmStart = useCallback(async () => {
    if (!quiz?.id) return;
    setActionBusy(true);
    try {
      saveQuizDetails(details);
      await updateQuiz(String(quiz.id), { name: details.name, code });
      await updateQuizStatus(String(quiz.id), "published");
      await refresh();
      setConfirmingStart(false);
      toast.success({
        title: "Quiz started",
        description: "Your quiz is now active for registered students.",
      });
    } catch (err) {
      console.error("Failed to start quiz:", err);
      toast.error({
        title: "Could not start quiz",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setActionBusy(false);
    }
  }, [quiz, details, code, refresh, toast]);

  const cancelStart = useCallback(() => {
    setConfirmingStart(false);
    setStartValidationError(null);
  }, []);

  const requestEnd = useCallback(() => {
    if (!quiz?.id) return;
    setConfirmingEnd(true);
  }, [quiz]);

  const confirmEnd = useCallback(async () => {
    if (!quiz?.id) return;
    setActionBusy(true);
    try {
      await updateQuizStatus(String(quiz.id), "archived");
      await refresh();
      setConfirmingEnd(false);
      toast.success({
        title: "Quiz ended",
        description:
          "Further participation is stopped. All submitted responses and results are preserved.",
      });
    } catch (err) {
      console.error("Failed to end quiz:", err);
      toast.error({
        title: "Could not end quiz",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setActionBusy(false);
    }
  }, [quiz, refresh, toast]);

  const cancelEnd = useCallback(() => setConfirmingEnd(false), []);

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
      confirmingStart,
      confirmingEnd,
      actionBusy,
      startValidationError,
      requestStart,
      confirmStart,
      cancelStart,
      requestEnd,
      confirmEnd,
      cancelEnd,
    }),
    [
      code,
      quiz,
      loading,
      error,
      derivedStatus,
      isLive,
      isEnded,
      details,
      updateDetails,
      refresh,
      confirmingStart,
      confirmingEnd,
      actionBusy,
      startValidationError,
      requestStart,
      confirmStart,
      cancelStart,
      requestEnd,
      confirmEnd,
      cancelEnd,
    ]
  );

  return <QuizSettingsContext.Provider value={value}>{children}</QuizSettingsContext.Provider>;
}
