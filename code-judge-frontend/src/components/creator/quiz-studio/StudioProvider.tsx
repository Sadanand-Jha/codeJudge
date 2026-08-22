"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { generateQuizCode } from "@/utils/quizCode";
import { toast } from "@/lib/toast";
import {
  createQuiz,
  updateQuiz,
  updateQuizStatus,
  setQuizParticipants,
  type QuizParticipantInput,
} from "@/services/quiz";
import { syncQuizQuestions } from "@/utils/quizQuestionSync";
import { useRoomStore } from "@/store/roomStore";
import {
  type StudioState,
  type CreatorQuestion,
  STEPS,
  DEFAULT_QUIZ_INFO,
  DEFAULT_SETTINGS,
  DEFAULT_AUDIENCE,
  DEFAULT_REGISTRATION,
  DEFAULT_PRICING,
  DEFAULT_BRANDING,
  createEmptyQuestion,
} from "./types";

const STORAGE_KEY = "studio_quiz_draft";

function findDuplicateOptionValues(q: CreatorQuestion): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const o of q.options) {
    const v = o.content.trim().toLowerCase();
    if (!v) continue;
    if (seen.has(v)) dupes.add(o.content.trim());
    else seen.add(v);
  }
  return [...dupes];
}

interface StudioContextValue {
  state: StudioState;
  setState: Dispatch<SetStateAction<StudioState>>;
  updateInfo: (p: Partial<StudioState["info"]>) => void;
  updateSettings: (p: Partial<StudioState["settings"]>) => void;
  updateAudience: (p: Partial<StudioState["audience"]>) => void;
  updatePricing: (p: Partial<StudioState["pricing"]>) => void;
  updateBranding: (p: Partial<StudioState["branding"]>) => void;
  updateQuestion: (id: string, patch: Partial<CreatorQuestion>) => void;
  addQuestion: () => string;
  importQuestions: (questions: CreatorQuestion[]) => void;
  removeQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => void;
  reorderQuestions: (ids: string[]) => void;
  setActiveQuestion: (id: string | null) => void;
  stepIndex: number;
  goToStep: (id: StudioState["step"]) => void;
  nextStep: () => void;
  prevStep: () => void;
  publish: () => void;
  saveToServer: (opts?: { publish?: boolean }) => Promise<{ quizId: string; code: string }>;
  savingToServer: boolean;
  summary: {
    questionCount: number;
    totalMarks: number;
    totalTime: number;
    validQuestions: number;
    incompleteQuestions: number;
  };
}

const StudioContext = createContext<StudioContextValue | null>(null);

function initialState(): StudioState {
  const code = generateQuizCode();
  const first = createEmptyQuestion("q_1");
  return {
  step: "setup",
  info: { ...DEFAULT_QUIZ_INFO, id: code, code },
  questions: [first],
  activeQuestionId: first.id,
  sections: [],
  settings: { ...DEFAULT_SETTINGS },
  audience: { ...DEFAULT_AUDIENCE, accessCode: generateQuizCode() },
  registration: {
    settings: { ...DEFAULT_REGISTRATION.settings },
    fields: DEFAULT_REGISTRATION.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })),
  },
  pricing: { ...DEFAULT_PRICING },
  branding: { ...DEFAULT_BRANDING },
  saveStatus: "idle",
  lastSaved: null,
  published: false,
};
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudioState>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StudioState;
          if (parsed && parsed.info && parsed.questions) {
            return {
              ...initialState(),
              ...parsed,
              info: { ...DEFAULT_QUIZ_INFO, ...parsed.info },
              settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
              audience: {
                ...DEFAULT_AUDIENCE,
                ...parsed.audience,
                roomIds: Array.isArray(parsed.audience?.roomIds)
                  ? parsed.audience.roomIds
                  : [],
                roomStudentSelections:
                  parsed.audience?.roomStudentSelections &&
                  typeof parsed.audience.roomStudentSelections === "object"
                    ? parsed.audience.roomStudentSelections
                    : {},
                invitedEmails: Array.isArray(parsed.audience?.invitedEmails)
                  ? parsed.audience.invitedEmails
                  : [],
                // Older drafts may hold a short/legacy code — upgrade to 16 chars.
                accessCode:
                  parsed.audience?.accessCode?.length === 16
                    ? parsed.audience.accessCode
                    : generateQuizCode(),
              },
              registration: {
                settings: {
                  ...DEFAULT_REGISTRATION.settings,
                  ...(parsed.registration?.settings ?? {}),
                },
                fields: Array.isArray(parsed.registration?.fields)
                  ? parsed.registration.fields
                  : DEFAULT_REGISTRATION.fields,
              },
            };
          }
        }
      } catch {}
    }
    return initialState();
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setState((s) => ({ ...s, saveStatus: "saved", lastSaved: new Date() }));
      } catch {
        setState((s) => ({ ...s, saveStatus: "idle" }));
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  const summary = useMemo(() => {
    const v = state.questions.filter(
      (q) =>
        q.title.trim() &&
        (q.options.length >= 2 || q.correctAnswer !== undefined)
    ).length;
    const marks = state.questions.reduce((s, q) => s + (q.marks || 0), 0);
    const time = state.questions.reduce((s, q) => s + (q.expectedTime || 0), 0);
    return {
      questionCount: state.questions.length,
      totalMarks: marks,
      totalTime: time,
      validQuestions: v,
      incompleteQuestions: state.questions.length - v,
    };
  }, [state.questions]);

  const updateInfo = (p: Partial<StudioState["info"]>) =>
    setState((s) => ({ ...s, info: { ...s.info, ...p } }));
  const updateSettings = (p: Partial<StudioState["settings"]>) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...p } }));
  const updateAudience = (p: Partial<StudioState["audience"]>) =>
    setState((s) => ({ ...s, audience: { ...s.audience, ...p } }));
  const updatePricing = (p: Partial<StudioState["pricing"]>) =>
    setState((s) => ({ ...s, pricing: { ...s.pricing, ...p } }));
  const updateBranding = (p: Partial<StudioState["branding"]>) =>
    setState((s) => ({ ...s, branding: { ...s.branding, ...p } }));

  const updateQuestion = (id: string, patch: Partial<CreatorQuestion>) =>
    setState((s) => ({
      ...s,
      questions: s.questions.map((q) => (q.id === id ? { ...q, ...patch, updatedAt: new Date().toISOString() } : q)),
    }));

  const addQuestion = () => {
    const next = createEmptyQuestion(`q_${Date.now()}`);
    setState((s) => {
      const questions = [...s.questions, next];
      return { ...s, questions, activeQuestionId: next.id };
    });
    return next.id;
  };

  const importQuestions = (questions: CreatorQuestion[]) => {
    setState((s) => {
      const updated = [...s.questions, ...questions];
      return { ...s, questions: updated, activeQuestionId: questions[0]?.id ?? s.activeQuestionId };
    });
  };

  const removeQuestion = (id: string) =>
    setState((s) => {
      const questions = s.questions.filter((q) => q.id !== id);
      return {
        ...s,
        questions,
        activeQuestionId:
          s.activeQuestionId === id
            ? questions[questions.length - 1]?.id ?? null
            : s.activeQuestionId,
      };
    });

  const duplicateQuestion = (id: string) => {
    const src = state.questions.find((q) => q.id === id);
    if (!src) return;
    const copy: CreatorQuestion = {
      ...src,
      id: `q_${Date.now()}`,
      title: src.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options: src.options.map((o) => ({ ...o, id: `${src.id}_${o.label}_${Date.now()}` })),
    };
    setState((s) => ({ ...s, questions: [...s.questions, copy], activeQuestionId: copy.id }));
  };

  const reorderQuestions = (ids: string[]) =>
    setState((s) => ({
      ...s,
      questions: ids
        .map((id) => s.questions.find((q) => q.id === id))
        .filter(Boolean)
        .map((q) => q as CreatorQuestion),
    }));

  const setActiveQuestion = (id: string | null) => {
    if (id !== state.activeQuestionId) {
      const current = state.questions.find((q) => q.id === state.activeQuestionId);
      if (current) {
        const dupes = findDuplicateOptionValues(current);
        if (dupes.length > 0) {
          toast.error({
            title: "Duplicate options",
            description: `Question ${state.questions.indexOf(current) + 1} has identical options (${dupes.join(", ")}). Make each option unique before moving on.`,
          });
          return;
        }
      }
    }
    setState((s) => ({ ...s, activeQuestionId: id }));
  };

  const stepIndex = STEPS.findIndex((s) => s.id === state.step);

  const isMcqType = (t: CreatorQuestion["type"]) =>
    t === "single_choice" || t === "multiple_choice" || t === "true_false";

  const findIncompleteReason = (q: CreatorQuestion): string | null => {
    const titleText = q.title.replace(/<[^>]*>/g, "").trim();
    if (!titleText) return "it has no question text";
    if (isMcqType(q.type)) {
      const emptyIdx = q.options.findIndex((o) => !o.content.trim());
      if (emptyIdx !== -1) {
        const label = q.options[emptyIdx].label || String(emptyIdx + 1);
        return `option ${label} is empty`;
      }
      const correct = q.options.filter((o) => o.isCorrect).length;
      if (correct === 0) return "no correct option is marked";
    } else if (
      q.correctAnswer === "" ||
      q.correctAnswer === undefined ||
      q.correctAnswer === null ||
      q.correctAnswer === -1 ||
      (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0)
    ) {
      return "it has no correct answer";
    }
    return null;
  };

  const validateAllQuestions = (): boolean => {
    for (let i = 0; i < state.questions.length; i++) {
      const q = state.questions[i];
      const reason = findIncompleteReason(q);
      if (reason) {
        toast.error({
          title: `Question ${i + 1} is incomplete`,
          description: `${reason.charAt(0).toUpperCase()}${reason.slice(1)}. Complete it or delete it before continuing.`,
        });
        return false;
      }
      const dupes = findDuplicateOptionValues(q);
      if (dupes.length > 0) {
        toast.error({
          title: "Duplicate options",
          description: `Question ${i + 1} has identical options (${dupes.join(", ")}). Make each option unique before moving on.`,
        });
        return false;
      }
    }
    return true;
  };

  const goToStep = (id: StudioState["step"]) => {
    if (id !== state.step && !validateAllQuestions()) return;
    setState((s) => ({ ...s, step: id }));
  };
  const nextStep = async () => {
    const i = STEPS.findIndex((st) => st.id === state.step);
    if (i < STEPS.length - 1 && !validateAllQuestions()) return;

    if (state.step === "setup") {
      try {
        const { quizId } = await saveToServer({ setupOnly: true });
        setState((s) => ({ ...s, serverQuizId: quizId }));
      } catch (err) {
        toast.error({
          title: "Could not save quiz",
          description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        });
        return;
      }
    }

    setState((s) => {
      const idx = STEPS.findIndex((st) => st.id === s.step);
      return { ...s, step: idx < STEPS.length - 1 ? STEPS[idx + 1].id : s.step };
    });
  };
  const prevStep = () =>
    setState((s) => {
      const i = STEPS.findIndex((st) => st.id === s.step);
      return { ...s, step: i > 0 ? STEPS[i - 1].id : s.step };
    });
  const publish = () =>
    setState((s) => ({ ...s, published: true }));

  const [savingToServer, setSavingToServer] = useState(false);

  const saveToServer = async (
    opts?: { publish?: boolean; setupOnly?: boolean }
  ): Promise<{ quizId: string; code: string }> => {
    if (savingToServer) throw new Error("Save already in progress");
    if (state.info.title.trim().length < 3) {
      throw new Error("Quiz title is required before saving");
    }
    setSavingToServer(true);
    try {
      const payload = {
        name: state.info.title.trim(),
        code: state.info.code,
        description: state.info.shortDescription || undefined,
        fullDescription: state.info.fullDescription || undefined,
        subject: state.info.subject || undefined,
        difficulty: state.info.difficulty,
        timeLimit: state.info.duration || undefined,
        starttime: state.info.startDate || undefined,
        endtime: state.info.endDate || undefined,

        randomizeQuestions: state.settings.randomizeQuestions,
        randomizeOptions: state.settings.randomizeOptions,
        showResultsImmediately: state.settings.showResultsImmediately,
        negativeMarking: state.settings.negativeMarking,
        negativeMarkValue: state.settings.negativeMarkValue,
        totalQuestions: summary.questionCount,
        totalMarks: summary.totalMarks,
        passingMarks: state.info.passingMarks || Math.ceil(summary.totalMarks * 0.4),
        tags: state.info.tags.length > 0 ? state.info.tags : undefined,
      };

      let quizId = state.serverQuizId || null;
      if (quizId) {
        await updateQuiz(quizId, {
          name: payload.name,
          code: payload.code,
          starttime: payload.starttime,
          endtime: payload.endtime,
          shuffleQuestions: payload.randomizeQuestions,
          shuffleOptions: payload.randomizeOptions,
          showResultsImmediately: payload.showResultsImmediately,
          negativeMarking: payload.negativeMarking,
          totalMarks: payload.totalMarks,
          passingMarks: payload.passingMarks,
        });
      } else {
        const quiz = await createQuiz(payload);
        quizId = String(quiz.id);
      }

      if (!opts?.setupOnly) {
        await syncQuizQuestions(quizId, state.questions);

        // Build the unique participant set — union of allowed room members and
        // individually invited emails, deduped by email.
        const audience = state.audience;
        const selRoomIds = audience.roomIds ?? [];
        const selections = audience.roomStudentSelections ?? {};
        const allRooms = useRoomStore.getState().rooms;
        const byEmail = new Map<string, QuizParticipantInput>();

        for (const roomId of selRoomIds) {
          const room = allRooms.find((r) => r.id === roomId);
          if (!room) continue;
          const selected: string[] | undefined = selections[roomId];
          for (const student of room.students) {
            if (!student.active || !student.email) continue;
            if (selected && !selected.includes(student.rollNumber)) continue;
            const key = student.email.toLowerCase();
            if (!byEmail.has(key)) {
              byEmail.set(key, {
                email: student.email,
                name: student.name,
                rollNumber: student.rollNumber,
                source: "room",
                roomId: null,
                allowed: true,
              });
            }
          }
        }

        for (const email of audience.invitedEmails ?? []) {
          const key = email.toLowerCase();
          if (!byEmail.has(key)) {
            byEmail.set(key, { email, source: "individual", allowed: true });
          }
        }

        await setQuizParticipants(quizId, [...byEmail.values()]);
      }

      if (opts?.publish) {
        await updateQuizStatus(quizId, "published");
      }

      setState((s) => ({ ...s, serverQuizId: quizId }));
      return { quizId, code: state.info.code };
    } finally {
      setSavingToServer(false);
    }
  };

  const value: StudioContextValue = useMemo(
    () => ({
      state,
      setState,
      updateInfo,
      updateSettings,
      updateAudience,
      updatePricing,
      updateBranding,
      updateQuestion,
      addQuestion,
      importQuestions,
      removeQuestion,
      duplicateQuestion,
      reorderQuestions,
    setActiveQuestion,
    stepIndex,
    goToStep,
    nextStep,
    prevStep,
    publish,
    saveToServer,
    savingToServer,
    summary,
  }),
    [state, stepIndex, summary, savingToServer]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used within StudioProvider");
  return ctx;
}

export function useSaveStatus() {
  const { state } = useStudio();
  return { status: state.saveStatus, lastSaved: state.lastSaved };
}

