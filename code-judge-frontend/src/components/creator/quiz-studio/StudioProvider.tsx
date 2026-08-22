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
  loadQuizForEdit,
  addQuizProblem,
  updateQuizProblem,
  type QuizParticipantInput,
  type Quiz,
  type QuizProblemWithOptions,
  type QuizProblemCreate,
  type QuizProblemOptionCreate,
} from "@/services/quiz";
import { syncQuizQuestions } from "@/utils/quizQuestionSync";
import { useRoomStore } from "@/store/roomStore";
import {
  type StudioState,
  type StudioStepId,
  type CreatorQuestion,
  type CreatorQuestionType,
  type CreatorOption,
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

const BACKEND_TYPE_MAP: Record<number, CreatorQuestionType> = {
  1: "single_choice",
  2: "multiple_choice",
  3: "true_false",
  4: "fill_blanks",
  5: "integer",
  6: "text",
  7: "paragraph",
  8: "code_output",
};

const DIFFICULTY_MAP: Record<string, CreatorQuestion["difficulty"]> = {
  Easy: "Easy",
  Medium: "Medium",
  Hard: "Hard",
  Expert: "Expert",
};

function mapBackendProblem(
  p: QuizProblemWithOptions,
  idx: number
): CreatorQuestion {
  const type = BACKEND_TYPE_MAP[p.quiz_problem_type ?? 1] ?? "single_choice";
  const isChoiceType =
    type === "single_choice" ||
    type === "multiple_choice" ||
    type === "true_false";

  let options: CreatorOption[];
  let correctAnswer: string | number | number[];

  if (isChoiceType && p.options && p.options.length > 0) {
    options = p.options.map((o, i) => ({
      id: String(o.id),
      label: String.fromCharCode(65 + i),
      content: o.option_statement ?? "",
      isCorrect: o.iscorrect ?? false,
    }));
    const correctOpts = options.filter((o) => o.isCorrect);
    correctAnswer =
      type === "multiple_choice"
        ? (correctOpts.map((o) => o.id) as unknown as number[])
        : correctOpts[0]
        ? correctOpts[0].id
        : -1;
  } else {
    const answer = p.options?.[0]?.option_statement ?? "";
    correctAnswer = answer;
    options = [
      { id: `${p.id}_answer`, label: "A", content: answer, isCorrect: true },
    ];
  }

  const diffName = p.difficulty_name ?? "Medium";
  const diffKey =
    diffName.charAt(0).toUpperCase() + diffName.slice(1).toLowerCase();

  return {
    id: `server_${p.id}`,
    type,
    title: p.problem_statement ?? "",
    options,
    correctAnswer,
    explanation: p.explaination ?? "",
    hint: p.hint ?? "",
    marks: 10,
    negativeMarks: 0,
    difficulty: (DIFFICULTY_MAP[diffKey] as CreatorQuestion["difficulty"]) ?? "Medium",
    expectedTime: 2,
    topic: p.problem_description ?? "",
    bloomLevel: "Understand",
    tags: [],
    visibility: "visible",
    status: "published",
    required: true,
    attachments: [],
    images: [],
    createdAt: p.created_at ?? new Date().toISOString(),
    updatedAt: p.updated_at ?? new Date().toISOString(),
  };
}

function mapQuizToStudioInfo(quiz: Quiz & { subject_name?: string; exam_cat_name?: string }): StudioState["info"] {
  return {
    id: String(quiz.id),
    code: quiz.code ?? "",
    title: quiz.name ?? "",
    shortDescription: "",
    fullDescription: "",
    subject: quiz.subject_name ?? "",
    subjectId: quiz.subject_id ?? "",
    exam: quiz.exam_cat_name ?? "",
    examId: quiz.exam_cat ?? "",
    classGrade: "",
    difficulty: quiz.difficulty_name ?? "Medium",
    difficultyId: quiz.difficulty ?? "",
    language: "English",
    duration: quiz.duration ?? 60,
    passingMarks: quiz.passing_marks ?? 0,
    tags: [],
    thumbnailUrl: "",
    startDate: quiz.starttime ?? "",
    endDate: quiz.endtime ?? "",
  };
}

function mapQuizToStudioSettings(quiz: Quiz): StudioState["settings"] {
  return {
    randomizeQuestions: quiz.shuffle_questions ?? false,
    randomizeOptions: quiz.shuffle_options ?? false,
    negativeMarking: quiz.negative_marking ?? false,
    negativeMarkValue: 1,
    showResultsImmediately: quiz.show_results_immediately ?? true,
    fullscreenMode: false,
    tabSwitchDetection: false,
    copyProtection: false,
  };
}

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
  addQuestion: () => Promise<string>;
  importQuestions: (questions: CreatorQuestion[]) => void;
  removeQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => void;
  reorderQuestions: (ids: string[]) => void;
  setActiveQuestion: (id: string | null) => void;
  stepIndex: number;
  steps: Array<{ id: StudioStepId; label: string }>;
  goToStep: (id: StudioState["step"]) => void;
  nextStep: () => void;
  prevStep: () => void;
  publish: () => void;
  saveToServer: (opts?: { publish?: boolean }) => Promise<{ quizId: string; code: string }>;
  savingToServer: boolean;
  loading: boolean;
  editMode: boolean;
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

interface StudioProviderProps {
  children: ReactNode;
  editMode?: boolean;
  initialQuizId?: string;
}

export function StudioProvider({ children, editMode = false, initialQuizId }: StudioProviderProps) {
  const steps = STEPS;

  const [state, setState] = useState<StudioState>(() => {
    if (editMode && initialQuizId) {
      return {
        step: "setup",
        info: { ...DEFAULT_QUIZ_INFO },
        questions: [],
        activeQuestionId: null,
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
        serverQuizId: initialQuizId,
        editMode: true,
      } as StudioState;
    }
    return initialState();
  });

  const [loading, setLoading] = useState(editMode && !!initialQuizId);

  useEffect(() => {
    if (!editMode || !initialQuizId) return;
    let cancelled = false;
    (async () => {
      try {
        const { quiz, problems } = await loadQuizForEdit(initialQuizId);
        if (cancelled) return;
        const info = mapQuizToStudioInfo(quiz);
        const settings = mapQuizToStudioSettings(quiz);
        const questions = problems.map((p, i) => mapBackendProblem(p, i));
        setState((s) => ({
          ...s,
          info: { ...DEFAULT_QUIZ_INFO, ...info },
          settings: { ...DEFAULT_SETTINGS, ...settings },
          questions: questions.length > 0 ? questions : [createEmptyQuestion("q_1")],
          activeQuestionId:
            questions.length > 0 ? questions[0].id : createEmptyQuestion("q_1").id,
          serverQuizId: initialQuizId,
        }));
      } catch (err) {
        console.error("Failed to load quiz for editing:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editMode, initialQuizId]);

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
        // localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        // setState((s) => ({ ...s, saveStatus: "saved", lastSaved: new Date() }));
      } catch {
        // setState((s) => ({ ...s, saveStatus: "idle" }));
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

  function mapCreatorQuestionToBackend(q: CreatorQuestion, quizId: number, questionNumber: number): QuizProblemCreate {
    const TYPE_MAP: Record<CreatorQuestionType, number> = {
      single_choice: 1,
      multiple_choice: 2,
      true_false: 3,
      fill_blanks: 4,
      integer: 5,
      text: 6,
      paragraph: 7,
      code_output: 8,
    };

    const DIFFICULTY_MAP: Record<CreatorQuestion["difficulty"], number> = {
      Easy: 1,
      Medium: 2,
      Hard: 3,
      Expert: 4,
    };

    return {
      problem_statement: q.title,
      problem_description: q.explanation,
      quiz_problem_type: TYPE_MAP[q.type],
      question_number: questionNumber,
      explanation: q.hint,
      hint: q.solution,
      difficulty: DIFFICULTY_MAP[q.difficulty],
      reference_notes: q.tags.join(", "),
      internal_comments: "",
    };
  }

  function mapCreatorOptionsToBackend(options: CreatorOption[]): QuizProblemOptionCreate[] {
    return options.map((opt) => ({
      option_statement: opt.content,
      option_description: opt.caption || "",
      isCorrect: opt.isCorrect,
    }));
  }

  const updateQuestion = (id: string, patch: Partial<CreatorQuestion>) =>
    setState((s) => ({
      ...s,
      questions: s.questions.map((q) => (q.id === id ? { ...q, ...patch, updatedAt: new Date().toISOString() } : q)),
    }));

  const addQuestion = async () => {
    const activeId = state.activeQuestionId;
    if (activeId && state.serverQuizId) {
      await saveToServer({ setupOnly: true });
    }
    const next = createEmptyQuestion(`q_${Date.now()}`);
    setState((s) => {
      const questions = [...s.questions, next];
      return { ...s, questions, activeQuestionId: next.id };
    });

    if (state.serverQuizId && state.info.title.trim().length >= 3) {
      try {
        const questionNumber = state.questions.length + 1;
        const problemData = mapCreatorQuestionToBackend(next, state.serverQuizId, questionNumber);
        const createdProblem = await addQuizProblem(String(state.serverQuizId), problemData);
        const optionsData = mapCreatorOptionsToBackend(next.options);
        for (const opt of optionsData) {
          await addQuizProblemOption(String(createdProblem.id), opt);
        }
        setState((s) => ({
          ...s,
          questions: s.questions.map((q) => (q.id === next.id ? { ...q, serverId: createdProblem.id } : q)),
        }));
      } catch (err) {
        console.error("Failed to save question to backend:", err);
        toast.error({ title: "Save failed", description: "Could not save question to server" });
      }
    }

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

  const stepIndex = steps.findIndex((s) => s.id === state.step);

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
    if (id !== state.step && state.step !== "setup" && state.step !== "publish" && !validateAllQuestions()) return;
    setState((s) => ({ ...s, step: id }));
  };
  const nextStep = async () => {
    const i = steps.findIndex((st) => st.id === state.step);
    if (state.step !== "setup" && state.step !== "publish" && !validateAllQuestions()) return;

    if (state.step === "setup") {
      try {
        const { quizId } = await saveToServer({ setupOnly: true });
        setState((s) => ({ ...s, serverQuizId: quizId }));
        if (!editMode) {
          window.location.href = `/creator/quizzes/${quizId}/edit`;
          return;
        }
      } catch (err) {
        toast.error({
          title: "Could not save quiz",
          description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        });
        return;
      }
    }

    setState((s) => {
      const idx = steps.findIndex((st) => st.id === s.step);
      return { ...s, step: idx < steps.length - 1 ? steps[idx + 1].id : s.step };
    });
  };
  const prevStep = () =>
    setState((s) => {
      const i = steps.findIndex((st) => st.id === s.step);
      return { ...s, step: i > 0 ? steps[i - 1].id : s.step };
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
        subjectId: state.info.subjectId ? Number(state.info.subjectId) : undefined,
        examId: state.info.examId ? Number(state.info.examId) : undefined,
        difficulty: state.info.difficulty,
        difficultyId: state.info.difficultyId ? Number(state.info.difficultyId) : undefined,
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
          subjectId: payload.subjectId,
          examId: payload.examId,
          difficulty: payload.difficultyId,
          duration: payload.timeLimit,
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
      steps,
      goToStep,
      nextStep,
      prevStep,
      publish,
      saveToServer,
      savingToServer,
      loading,
      editMode,
      summary,
    }),
    [state, stepIndex, summary, savingToServer, loading, editMode, steps]
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

