import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type RegistrationStatus = 
  | "unregistered" 
  | "registered" 
  | "unregistering" 
  | "waiting" 
  | "quiz-ready" 
  | "in-progress" 
  | "submitted";

export interface QuizRegistration {
  quizId: string;
  quizCode: string;
  quizName: string;
  status: RegistrationStatus;
  registeredAt?: string;
  studentName?: string;
  rollNumber?: string;
  attemptId?: number;
  startedAt?: string;
  submittedAt?: string;
  score?: number;
  totalPoints?: number;
}

interface QuizRegistrationState {
  registrations: Record<string, QuizRegistration>;
  
  // Actions
  register: (quizId: string, quizCode: string, quizName: string, studentName: string, rollNumber: string) => void;
  unregister: (quizId: string) => void;
  setWaiting: (quizId: string) => void;
  setQuizReady: (quizId: string) => void;
  startAttempt: (quizId: string, attemptId: number) => void;
  submitAttempt: (quizId: string, score: number, totalPoints: number) => void;
  getRegistration: (quizId: string) => QuizRegistration | null;
  isRegistered: (quizId: string) => boolean;
  isSubmitted: (quizId: string) => boolean;
  clearAll: () => void;
}

const STORAGE_KEY = "byteclash_quiz_registrations";

export const useQuizRegistrationStore = create<QuizRegistrationState>()(
  persist(
    (set, get) => ({
      registrations: {},

      register: (quizId, quizCode, quizName, studentName, rollNumber) => {
        set((state) => ({
          registrations: {
            ...state.registrations,
            [quizId]: {
              quizId,
              quizCode,
              quizName,
              status: "registered",
              registeredAt: new Date().toISOString(),
              studentName,
              rollNumber,
            },
          },
        }));
      },

      unregister: (quizId) => {
        set((state) => {
          const { [quizId]: removed, ...rest } = state.registrations;
          return { registrations: rest };
        });
      },

      setWaiting: (quizId) => {
        set((state) => {
          const reg = state.registrations[quizId];
          if (!reg) return state;
          return {
            registrations: {
              ...state.registrations,
              [quizId]: { ...reg, status: "waiting" },
            },
          };
        });
      },

      setQuizReady: (quizId) => {
        set((state) => {
          const reg = state.registrations[quizId];
          if (!reg) return state;
          return {
            registrations: {
              ...state.registrations,
              [quizId]: { ...reg, status: "quiz-ready" },
            },
          };
        });
      },

      startAttempt: (quizId, attemptId) => {
        set((state) => {
          const reg = state.registrations[quizId];
          if (!reg) return state;
          return {
            registrations: {
              ...state.registrations,
              [quizId]: { 
                ...reg, 
                status: "in-progress", 
                attemptId, 
                startedAt: new Date().toISOString() 
              },
            },
          };
        });
      },

      submitAttempt: (quizId, score, totalPoints) => {
        set((state) => {
          const reg = state.registrations[quizId];
          if (!reg) return state;
          return {
            registrations: {
              ...state.registrations,
              [quizId]: { 
                ...reg, 
                status: "submitted", 
                submittedAt: new Date().toISOString(),
                score,
                totalPoints,
              },
            },
          };
        });
      },

      getRegistration: (quizId) => {
        return get().registrations[quizId] || null;
      },

      isRegistered: (quizId) => {
        const reg = get().registrations[quizId];
        return reg ? ["registered", "waiting", "quiz-ready", "in-progress", "submitted"].includes(reg.status) : false;
      },

      isSubmitted: (quizId) => {
        const reg = get().registrations[quizId];
        return reg?.status === "submitted";
      },

      clearAll: () => {
        set({ registrations: {} });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ registrations: state.registrations }),
    }
  )
);