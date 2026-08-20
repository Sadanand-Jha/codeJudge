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
import {
  type StudioState,
  type CreatorQuestion,
  STEPS,
  DEFAULT_QUIZ_INFO,
  DEFAULT_SETTINGS,
  DEFAULT_AUDIENCE,
  DEFAULT_PRICING,
  DEFAULT_BRANDING,
  createEmptyQuestion,
} from "./types";

const STORAGE_KEY = "studio_quiz_draft";

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
  removeQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => void;
  reorderQuestions: (ids: string[]) => void;
  setActiveQuestion: (id: string | null) => void;
  stepIndex: number;
  goToStep: (id: StudioState["step"]) => void;
  nextStep: () => void;
  prevStep: () => void;
  publish: () => void;
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
  audience: { ...DEFAULT_AUDIENCE, accessCode: generateQuizCode().slice(0, 6) },
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
            return { ...initialState(), ...parsed, info: { ...DEFAULT_QUIZ_INFO, ...parsed.info } };
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

  const setActiveQuestion = (id: string | null) =>
    setState((s) => ({ ...s, activeQuestionId: id }));

  const stepIndex = STEPS.findIndex((s) => s.id === state.step);
  const goToStep = (id: StudioState["step"]) =>
    setState((s) => ({ ...s, step: id }));
  const nextStep = () =>
    setState((s) => {
      const i = STEPS.findIndex((st) => st.id === s.step);
      return { ...s, step: i < STEPS.length - 1 ? STEPS[i + 1].id : s.step };
    });
  const prevStep = () =>
    setState((s) => {
      const i = STEPS.findIndex((st) => st.id === s.step);
      return { ...s, step: i > 0 ? STEPS[i - 1].id : s.step };
    });
  const publish = () =>
    setState((s) => ({ ...s, published: true }));

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
      removeQuestion,
      duplicateQuestion,
      reorderQuestions,
    setActiveQuestion,
    stepIndex,
    goToStep,
    nextStep,
    prevStep,
    publish,
    summary,
  }),
    [state, stepIndex, summary]
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

