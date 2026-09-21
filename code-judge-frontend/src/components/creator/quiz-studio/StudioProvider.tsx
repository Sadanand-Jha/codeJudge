"use client";

import {
  createContext,
  useCallback,
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
  getQuizParticipants,
  loadQuizForEdit,
  updateQuizGameMechanics,
  getQuizGameMechanics,
  type QuizParticipantInput,
  type QuizBasic,
  type QuizProblemWithOptions,
} from "@/services/quiz";
import { syncQuizQuestions, computeChangedQuestions, buildQuestionSnapshot } from "@/utils/quizQuestionSync";
import { useRoomStore } from "@/store/roomStore";
import {
  type StudioState,
  type StudioStepId,
  type CreatorQuestion,
  type CreatorQuestionType,
  type CreatorOption,
  type GameMechanicsConfig,
  STEPS,
  DEFAULT_QUIZ_INFO,
  DEFAULT_SETTINGS,
  DEFAULT_AUDIENCE,
  DEFAULT_REGISTRATION,
  DEFAULT_PRICING,
  DEFAULT_BRANDING,
  DEFAULT_GAME_MECHANICS_STATE,
  createEmptyQuestion,
  getRegistrationFieldDef,
} from "./types";
import { DEFAULT_GAME_MECHANICS, normalizeGameMechanics, zeroAllMechanics } from "./types/gameMechanics";

const STORAGE_KEY = "studio_quiz_draft";
const GAME_MECHANICS_STORAGE_PREFIX = "studio_game_mechanics_";

/** Sentinel error used when question validation blocks a save/navigation. */
export const QUESTION_VALIDATION_FAILED = "QUESTION_VALIDATION_FAILED";

export function isQuestionValidationError(err: unknown): boolean {
  return err instanceof Error && err.message === QUESTION_VALIDATION_FAILED;
}

/**
 * Reverse mapping: backend numeric type IDs → frontend string types.
 * Used when loading a quiz from the server to convert `quiz_problem_type`
 * back to the `CreatorQuestionType` union used by the editor.
 * Must stay in sync with TYPE_TO_NUMBER in quizQuestionSync.ts.
 */
const BACKEND_TYPE_MAP: Record<number, CreatorQuestionType> = {
  1: "single_choice",
  2: "multiple_choice",
  3: "true_false",
  4: "text",
  5: "integer",
  6: "fill_blanks",
  7: "paragraph",
  8: "code_output",
  12: "match_following",
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
  let matchItems: any = undefined;
  let matchMatches: any = undefined;
  let matchMapping: any = undefined;

  if (type === "match_following") {
    // New storage: per-pair rows where option_statement = Column A, matching_target = Column B (type 12)
    // Fallback: old storage where a single option holds JSON payload
    const opts = p.options ?? [];
    // Try legacy JSON decode
    if (opts.length === 1 && typeof opts[0]?.option_statement === "string") {
      const raw = opts[0].option_statement.trim();
      if (raw.startsWith("{") && raw.includes("matchItems")) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.matchItems && parsed.matchMatches) {
            matchItems = parsed.matchItems;
            matchMatches = parsed.matchMatches;
            matchMapping = parsed.matchMapping ?? {};
          }
        } catch {}
      }
    }
    if (!matchItems) {
      // New per-pair rows
      if (opts.length > 0 && opts.some((o: any) => (o as any).matching_target != null || (o as any).matchingTarget != null)) {
        matchItems = opts.map((o: any, i: number) => ({
          id: `server_${p.id}_left_${i}_${o.id}`,
          content: o.option_statement ?? "",
          imageUrl: undefined,
        }));
        matchMatches = opts.map((o: any, i: number) => ({
          id: `server_${p.id}_right_${i}_${o.id}`,
          content: (o as any).matching_target ?? (o as any).matchingTarget ?? o.option_description ?? "",
          imageUrl: undefined,
        }));
        matchMapping = {};
        matchItems.forEach((l: any, i: number) => {
          const r = matchMatches[i];
          if (r) matchMapping[l.id] = r.id;
        });
      } else if (opts.length > 0) {
        // No matching_target yet — treat as left only (right empty) for migration
        matchItems = opts.map((o: any, i: number) => ({
          id: `server_${p.id}_left_${i}_${o.id}`,
          content: o.option_statement ?? "",
        }));
        matchMatches = opts.map((o: any, i: number) => ({
          id: `server_${p.id}_right_${i}_${o.id}`,
          content: o.option_description ?? "",
        }));
        matchMapping = {};
        matchItems.forEach((l: any, i: number) => {
          if (matchMatches[i]) matchMapping[l.id] = matchMatches[i].id;
        });
      }
    }
    // Fallback defaults if still empty
    if (!matchItems || matchItems.length === 0) {
      matchItems = [
        { id: `server_${p.id}_left_0`, content: "" },
        { id: `server_${p.id}_left_1`, content: "" },
      ];
      matchMatches = [
        { id: `server_${p.id}_right_0`, content: "" },
        { id: `server_${p.id}_right_1`, content: "" },
      ];
      matchMapping = {};
    }
    options = [
      { id: `${p.id}_a`, label: "A", content: "", isCorrect: false },
      { id: `${p.id}_b`, label: "B", content: "", isCorrect: false },
    ];
    correctAnswer = -1 as any;
  } else if (isChoiceType && p.options && p.options.length > 0) {
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
  } else if (type === "fill_blanks") {
    // For type 6, correct answers are stored in matching_target column
    const opts = p.options ?? [];
    // Collect all matching_target values; fallback to option_statement for legacy rows
    const targets = opts
      .map((o: any) => (o.matching_target ?? o.matchingTarget ?? o.option_statement ?? "").toString().trim())
      .filter(Boolean);
    const answer = targets.length > 1 ? targets.join(", ") : targets[0] ?? opts[0]?.option_statement ?? "";
    correctAnswer = answer;
    options = [
      { id: `${p.id}_answer`, label: "A", content: answer, isCorrect: true },
    ];
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

  const base: any = {
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
    serverId: p.id,
  };
  if (type === "match_following" && matchItems) {
    base.matchItems = matchItems;
    base.matchMatches = matchMatches;
    base.matchMapping = matchMapping;
    base.shuffleColumnA = true;
    base.shuffleColumnB = true;
  }
  return base;
}

function mapQuizToStudioInfo(quiz: QuizBasic & { subject_name?: string; exam_cat_name?: string }): StudioState["info"] {
  const raw = ((quiz as any).status as string | null)?.toLowerCase() ?? "";
  let quizLifecycle: "draft" | "scheduled" | "live" | "ended" = "draft";
  if (raw === "live") quizLifecycle = "live";
  else if (raw === "scheduled") quizLifecycle = "scheduled";
  else if (raw === "ended" || raw === "completed") quizLifecycle = "ended";

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
    difficulty: (quiz as any).difficulty_name ?? "Medium",
    difficultyId: quiz.difficulty ?? "",
    language: "English",
    duration: quiz.duration ?? 60,
    passingMarks: quiz.passing_marks ?? 0,
    tags: [],
    thumbnailUrl: "",
    startDate: quiz.starttime ?? "",
    endDate: quiz.endtime ?? "",
    quizLifecycle,
  };
}

function mapQuizToStudioSettings(quiz: QuizBasic): StudioState["settings"] {
  return {
    randomizeQuestions: quiz.shuffle_questions ?? false,
    randomizeOptions: quiz.shuffle_options ?? false,
    negativeMarking: quiz.negative_marking ?? false,
    negativeMarkValue: 1,
    showResultsImmediately: quiz.show_results_immediately ?? true,
    fullscreenMode: true,
    tabSwitchDetection: true,
    copyProtection: true,
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
  updateGameMechanics: (patch: Partial<GameMechanicsConfig> | ((prev: GameMechanicsConfig) => GameMechanicsConfig)) => void;
  setGameMechanicsEnabled: (enabled: boolean) => void;
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
  /** Progress of the current save: { saved, total } while saving, null otherwise */
  saveProgress: { saved: number; total: number } | null;
  loading: boolean;
  loadError: string | null;
  editMode: boolean;
  summary: {
    questionCount: number;
    totalMarks: number;
    totalTime: number;
    validQuestions: number;
    incompleteQuestions: number;
  };
  saveAudienceParticipants: () => Promise<void>;
  audienceDirty: boolean;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function initialState(): StudioState {
  const code = generateQuizCode();
  const first = createEmptyQuestion("q_1");
  // Try hydrate gameMechanics from localStorage for new draft
  let persistedGameMechanics: any = null;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(GAME_MECHANICS_STORAGE_PREFIX + code) : null;
    if (raw) persistedGameMechanics = JSON.parse(raw);
  } catch {}
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
  gameMechanics: persistedGameMechanics ? { ...JSON.parse(JSON.stringify(DEFAULT_GAME_MECHANICS)), ...persistedGameMechanics } : JSON.parse(JSON.stringify(DEFAULT_GAME_MECHANICS)),
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
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const steps = useMemo(() => {
    let result = editMode ? STEPS.filter((s) => s.id !== "publish") : STEPS;
    if (isMobile) {
      // Mobile simplified flow: Questions → Settings → Audience → Review → Publish
      // Hide Setup, Game Mechanics, Registration, Pricing, Branding as per mobile spec
      const mobileVisible = new Set(["questions", "settings", "audience", "review", "publish"]);
      result = result.filter((s) => mobileVisible.has(s.id as string));
    }
    return result;
  }, [editMode, isMobile]);

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
        gameMechanics: JSON.parse(JSON.stringify(DEFAULT_GAME_MECHANICS)),
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
  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * Snapshot of question content hashes captured when questions are loaded from
   * the server. Used on save to diff against current state — only questions whose
   * content has actually changed (or are newly added) get sent to the backend.
   */
  const snapshotRef = useRef<Map<string, string>>(new Map());

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
        // Capture content hashes for change detection on future saves
        snapshotRef.current = buildQuestionSnapshot(questions);
        const quizSnapshot = JSON.stringify({
          title: info.title,
          shortDescription: info.shortDescription,
          fullDescription: info.fullDescription,
          subjectId: info.subjectId,
          examId: info.examId,
          difficultyId: info.difficultyId,
          duration: info.duration,
          passingMarks: info.passingMarks,
          startDate: info.startDate,
          endDate: info.endDate,
          tags: info.tags,
          settings: {
            randomizeQuestions: settings.randomizeQuestions,
            randomizeOptions: settings.randomizeOptions,
            showResultsImmediately: settings.showResultsImmediately,
            negativeMarking: settings.negativeMarking,
          },
        });
        quizSnapshotRef.current = quizSnapshot;

        // Load game mechanics from server
        let loadedGameMechanics = JSON.parse(JSON.stringify(DEFAULT_GAME_MECHANICS));
        try {
          const serverMechanics = await getQuizGameMechanics(initialQuizId);
          const CODE_TO_ID: Record<string, string> = {
            FIFTY_FIFTY: "fiftyFifty",
            AUDIENCE_POLL: "audiencePoll",
            HINT: "hint",
            SKIP_QUESTION: "skip",
            EXTRA_TIME: "extraTime",
            ELIMINATE_ONE: "eliminateOne",
            DOUBLE_SCORE: "doublePoints",
            FREEZE_TIME: "freezeTimer",
            STREAK_BONUS: "streakBonus",
            SPEED_BONUS: "speedBonus",
            SECOND_CHANCE: "secondChance",
            DECAYING_POINTS: "decayingPoints",
          };
          for (const sm of serverMechanics) {
            const id = CODE_TO_ID[sm.code];
            if (!id) continue;
            const m: any = (loadedGameMechanics as any)[id];
            if (!m) continue;
            m.enabled = sm.enabled;
            if ("uses" in m) m.uses = sm.quantity;
          }
        } catch (e) {
          console.warn("Failed to load game mechanics (non-critical):", e);
        }

        // ─── Load audience from backend ────────────────────────────────────
        let loadedAudience = { ...DEFAULT_AUDIENCE, accessCode: generateQuizCode() };
        try {
          const participants = await getQuizParticipants(initialQuizId);
          if (!cancelled && participants && participants.length > 0) {
            const hasRoomSource = participants.some((p) => p.source === 4);
            const hasInviteSource = participants.some((p) => p.source === 2);

            if (hasRoomSource || hasInviteSource) {
              loadedAudience = { ...loadedAudience, mode: "classroom" };
            }

            // Set audience snapshot so save doesn't overwrite loaded data
            const snapshotParticipants = participants.map((p) => ({
              userId: p.user_id,
              source: p.source,
            }));
            audienceSnapshotRef.current = JSON.stringify(snapshotParticipants);
          }
        } catch (e) {
          console.error("[StudioProvider] Failed to load participants:", e);
        }

        gameMechanicsSnapshotRef.current = JSON.stringify(loadedGameMechanics);
        setState((s) => ({
          ...s,
          info: { ...DEFAULT_QUIZ_INFO, ...info },
          settings: { ...DEFAULT_SETTINGS, ...settings },
          questions: questions.length > 0 ? questions : [createEmptyQuestion("q_1")],
          activeQuestionId:
            questions.length > 0 ? questions[0].id : createEmptyQuestion("q_1").id,
          serverQuizId: initialQuizId,
          gameMechanics: loadedGameMechanics,
          audience: loadedAudience,
        }));
      } catch (err) {
        console.error("Failed to load quiz for editing:", err);
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Quiz not found or access denied.");
        }
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
  const quizSnapshotRef = useRef<string>("");
  const audienceSnapshotRef = useRef<string>("");
  const gameMechanicsSnapshotRef = useRef<string>("");

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
  const updateGameMechanics = (patch: Partial<GameMechanicsConfig> | ((prev: GameMechanicsConfig) => GameMechanicsConfig)) =>
    setState((s) => {
      const raw = typeof patch === "function" ? (patch as any)(s.gameMechanics) : ({ ...s.gameMechanics, ...patch } as GameMechanicsConfig);
      return { ...s, gameMechanics: normalizeGameMechanics(raw) };
    });

  // Connection: top-down and game mechanics are linked.
  // If game mechanics are all disabled, their uses are already 0 via normalize.
  // If top-down is disabled, mechanics must be zeroed. Expose helper for panels.
  const setGameMechanicsEnabled = (enabled: boolean) =>
    setState((s) => ({
      ...s,
      gameMechanics: enabled ? normalizeGameMechanics(s.gameMechanics) : zeroAllMechanics(s.gameMechanics),
    }));

  const updateQuestion = (id: string, patch: Partial<CreatorQuestion>) =>
    setState((s) => ({
      ...s,
      questions: s.questions.map((q) => (q.id === id ? { ...q, ...patch, updatedAt: new Date().toISOString() } : q)),
    }));

    const addQuestion = () => {
    // Questions are held locally and persisted to the backend together via
    // syncQuizQuestions() whenever the user saves / continues. See saveToServer().
    const next = createEmptyQuestion(`q_${Date.now()}`);
    setState((s) => ({
      ...s,
      questions: [...s.questions, next],
      activeQuestionId: next.id,
    }));
    return Promise.resolve(next.id);
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
    if (q.type === "match_following") {
      const left = q.matchItems ?? [];
      const right = q.matchMatches ?? [];
      if (left.length < 2) return "needs at least 2 items in Column A";
      if (right.length < 2) return "needs at least 2 matches in Column B";
      const emptyLeft = left.findIndex((x) => !x.content.trim());
      if (emptyLeft !== -1) return `Column A item ${emptyLeft + 1} is empty`;
      const emptyRight = right.findIndex((x) => !x.content.trim());
      if (emptyRight !== -1) return `Column B match ${String.fromCharCode(65 + emptyRight)} is empty`;
      const mapping = q.matchMapping ?? {};
      // Line-wise: same row = correct pair, so allow index fallback (students see B shuffled)
      const unmappedLineWise = left.filter((l, idx) => {
        if (mapping[l.id]) return false;
        return !right[idx]?.content?.trim();
      });
      if (unmappedLineWise.length > 0) return `${unmappedLineWise.length} row${unmappedLineWise.length > 1 ? "s" : ""} need matching Column B on same line`;
      // check mapping targets exist
      for (const [k, v] of Object.entries(mapping)) {
        if (!right.some((r) => r.id === v)) return "has a broken mapping (target missing)";
      }
      return null;
    }
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
  const getReviewErrors = (): string[] => {
    const errs: string[] = [];
    if (state.info.title.trim().length < 3) errs.push("Quiz title is required");
    if (state.info.duration <= 0) errs.push("Duration must be greater than 0");
    if (summary.questionCount === 0) errs.push("No questions added");
    else if (summary.incompleteQuestions > 0) errs.push(`${summary.incompleteQuestions} question(s) are incomplete`);
    if (state.questions.some((q) => (q.marks || 0) <= 0)) errs.push("Some questions have no marks");
    if (state.audience.mode === "classroom") {
      const roomCount = (state.audience.roomIds ?? []).length;
      const manualCount = (state.audience.invitedEmails ?? []).length;
      if (roomCount === 0 && manualCount === 0) errs.push("No audience selected — select at least one room");
    }
    const regFields = state.registration?.fields ?? [];
    const emptySelect = regFields.find((f) => {
      const def = getRegistrationFieldDef(f.key);
      return def?.inputType === "select" && (!f.options || f.options.length === 0);
    });
    if (emptySelect) {
      const label = getRegistrationFieldDef(emptySelect.key)?.label ?? emptySelect.key;
      errs.push(`Registration field "${label}" has no options`);
    }
    if (state.pricing.mode === "paid" && state.pricing.price <= 0) errs.push("Paid quiz requires a price");
    return errs;
  };

  const nextStep = async () => {
    const i = steps.findIndex((st) => st.id === state.step);

    // Review step: block if errors exist (publishing blocked until resolved)
    if (state.step === "review") {
      const reviewErrs = getReviewErrors();
      if (reviewErrs.length > 0) {
        toast.error({
          title: reviewErrs[0],
          description: reviewErrs.length > 1 ? `${reviewErrs.length} errors need to be fixed. Check the Review page.` : "Please fix the error using the Fix button before continuing.",
        });
        return;
      }
      // Review is last on mobile-edit (publish hidden) — treat Continue as Save & exit
      const isLast = i === steps.length - 1;
      if (isLast) {
        if (editMode) {
          try {
            await saveToServer();
            toast.success({ title: "Saved", description: "Your quiz has been saved." });
            window.location.href = "/creator/quizzes";
          } catch (err) {
            if (!isQuestionValidationError(err)) {
              toast.error({ title: "Could not save", description: err instanceof Error ? err.message : "Something went wrong." });
            }
          }
          return;
        }
        // create-flow publish: will be handled by publish step
      }
    }

    if (state.step === "setup") {
      try {
        const { quizId } = await saveToServer({ setupOnly: true });
        setState((s) => ({ ...s, serverQuizId: quizId }));
        if (!editMode) {
          window.location.href = `/creator/quizzes/${quizId}/edit`;
          return;
        }
      } catch (err) {
        if (!isQuestionValidationError(err)) {
          toast.error({
            title: "Could not save quiz",
            description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
          });
        }
        return;
      }
    } else if (state.step === "questions") {
      // Validate the problems, then persist the quiz + all problems to the
      // server before moving on. saveToServer runs validation internally, so an
      // incomplete question blocks the save and we stay on this step.
      if (!validateAllQuestions()) return;
      try {
        await saveToServer({ skipParticipants: true });
      } catch (err) {
        if (!isQuestionValidationError(err)) {
          toast.error({
            title: "Could not save questions",
            description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
          });
        }
        return;
      }
    } else if (state.step === "gameMechanics") {
      const currentGmSnapshot = JSON.stringify(state.gameMechanics);
      if (currentGmSnapshot !== gameMechanicsSnapshotRef.current) {
        try {
          await saveGameMechanicsOnly();
          gameMechanicsSnapshotRef.current = currentGmSnapshot;
        } catch (err) {
          toast.error({
            title: "Could not save game mechanics",
            description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
          });
          return;
        }
      }
    } else if (state.step !== "publish") {
      if (!validateAllQuestions()) return;
    }

    setState((s) => {
      const idx = steps.findIndex((st) => st.id === s.step);
      return { ...s, step: idx < steps.length - 1 ? steps[idx + 1].id : s.step };
    });
  };

  const prevStep = async () => {
    if (state.step === "questions") {
      // Validate and save the problems to the server before going back.
      if (!validateAllQuestions()) return;
      try {
        await saveToServer();
      } catch (err) {
        if (!isQuestionValidationError(err)) {
          toast.error({
            title: "Could not save questions",
            description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
          });
        }
        return;
      }
    }
    setState((s) => {
      const i = steps.findIndex((st) => st.id === s.step);
      return { ...s, step: i > 0 ? steps[i - 1].id : s.step };
    });
  };
  const publish = () =>
    setState((s) => ({ ...s, published: true }));

  const [savingToServer, setSavingToServer] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ saved: number; total: number } | null>(null);

  const saveToServer = async (
    opts?: { publish?: boolean; setupOnly?: boolean; skipParticipants?: boolean }
  ): Promise<{ quizId: string; code: string }> => {
    if (savingToServer) throw new Error("Save already in progress");
    if (state.info.title.trim().length < 3) {
      throw new Error("Quiz title is required before saving");
    }
    if (summary.totalMarks > 0 && state.info.passingMarks > summary.totalMarks) {
      throw new Error("Passing marks cannot exceed total marks");
    }
    // Validate the problems before persisting anything. setupOnly only creates
    // the quiz shell (no questions involved yet), so skip validation there.
    if (!opts?.setupOnly && !validateAllQuestions()) {
      throw new Error(QUESTION_VALIDATION_FAILED);
    }
    setSavingToServer(true);
    setSaveProgress(null);
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
        status: state.info.startDate ? "scheduled" : "live",

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
        const currentSnapshot = JSON.stringify({
          title: state.info.title,
          shortDescription: state.info.shortDescription,
          fullDescription: state.info.fullDescription,
          subjectId: state.info.subjectId,
          examId: state.info.examId,
          difficultyId: state.info.difficultyId,
          duration: state.info.duration,
          passingMarks: state.info.passingMarks,
          startDate: state.info.startDate,
          endDate: state.info.endDate,
          tags: state.info.tags,
          settings: {
            randomizeQuestions: state.settings.randomizeQuestions,
            randomizeOptions: state.settings.randomizeOptions,
            showResultsImmediately: state.settings.showResultsImmediately,
            negativeMarking: state.settings.negativeMarking,
          },
        });
        if (currentSnapshot !== quizSnapshotRef.current) {
          await updateQuiz(quizId, {
            name: payload.name,
            starttime: payload.starttime,
            endtime: payload.endtime,
            status: payload.status,
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
          quizSnapshotRef.current = currentSnapshot;
        }
      } else {
        const quiz = await createQuiz(payload);
        quizId = String(quiz.id);
      }

      if (!opts?.setupOnly) {
        // Diff against snapshot: build set of question IDs that actually changed
        const changed = computeChangedQuestions(state.questions, snapshotRef.current);
        const changedIds = changed.length > 0
          ? new Set(changed.map((q) => q.id))
          : null;

        // Only call backend if something actually changed
        if (changedIds && changedIds.size > 0) {
          // Show progress: "Saving 3/10 problems..."
          setSaveProgress({ saved: 0, total: changedIds.size });
          // Pass full list (needed for delete sweep) but only upsert changed questions
          await syncQuizQuestions(quizId, state.questions, changedIds, (saved, total) => {
            setSaveProgress({ saved, total });
          });
        }
        // Update snapshot so subsequent saves only diff against the new baseline
        snapshotRef.current = buildQuestionSnapshot(state.questions);

        if (!opts?.skipParticipants) {
        const audience = state.audience;
        const selRoomIds = audience.roomIds ?? [];
        const selections = audience.roomStudentSelections ?? {};
        const allRooms = useRoomStore.getState().rooms;
        const byKey = new Map<string, QuizParticipantInput>();

        for (const roomId of selRoomIds) {
          const room = allRooms.find((r) => r.id === roomId);
          if (!room) continue;
          const selected: string[] | undefined = selections[roomId];
          for (const student of room.students) {
            if (!student.active || !student.id) continue;
            if (selected && !selected.includes(student.rollNumber)) continue;
            const key = String(student.id);
            if (!byKey.has(key)) {
              byKey.set(key, { userId: Number(student.id), source: 4 });
            }
          }
        }

        for (const uid of audience.invitedEmails ?? []) {
          const numId = Number(uid);
          if (!numId) continue;
          const key = String(numId);
          if (!byKey.has(key)) {
            byKey.set(key, { userId: numId, source: 2 });
          }
        }

        const currentAudienceSnapshot = JSON.stringify([...byKey.values()]);
        if (currentAudienceSnapshot !== audienceSnapshotRef.current) {
          await setQuizParticipants(quizId, [...byKey.values()]);
          audienceSnapshotRef.current = currentAudienceSnapshot;
        }
        } // skipParticipants

        // Save game mechanics to backend
        try {
          const gm = state.gameMechanics;
          const mechanicMap: Record<string, { enabled: boolean; quantity: number }> = {
            FIFTY_FIFTY: { enabled: gm.fiftyFifty.enabled, quantity: typeof gm.fiftyFifty.uses === "number" ? gm.fiftyFifty.uses : 2 },
            AUDIENCE_POLL: { enabled: gm.audiencePoll?.enabled ?? false, quantity: typeof gm.audiencePoll?.uses === "number" ? gm.audiencePoll.uses : 1 },
            HINT: { enabled: gm.hint.enabled, quantity: typeof gm.hint.uses === "number" ? gm.hint.uses : 2 },
            SKIP_QUESTION: { enabled: gm.skip.enabled, quantity: typeof gm.skip.uses === "number" ? gm.skip.uses : 2 },
            EXTRA_TIME: { enabled: gm.extraTime.enabled, quantity: typeof gm.extraTime.uses === "number" ? gm.extraTime.uses : 1 },
            ELIMINATE_ONE: { enabled: gm.eliminateOne?.enabled ?? false, quantity: typeof gm.eliminateOne?.uses === "number" ? gm.eliminateOne.uses : 1 },
            DOUBLE_SCORE: { enabled: gm.doublePoints.enabled, quantity: typeof gm.doublePoints.uses === "number" ? gm.doublePoints.uses : 1 },
            FREEZE_TIME: { enabled: gm.freezeTimer?.enabled ?? false, quantity: typeof gm.freezeTimer?.uses === "number" ? gm.freezeTimer.uses : 1 },
            STREAK_BONUS: { enabled: gm.streakBonus?.enabled ?? false, quantity: typeof gm.streakBonus?.uses === "number" ? gm.streakBonus.uses : 1 },
            SPEED_BONUS: { enabled: gm.speedBonus?.enabled ?? false, quantity: typeof gm.speedBonus?.uses === "number" ? gm.speedBonus.uses : 1 },
            SECOND_CHANCE: { enabled: gm.secondChance?.enabled ?? false, quantity: typeof gm.secondChance?.uses === "number" ? gm.secondChance.uses : 1 },
            DECAYING_POINTS: { enabled: gm.decayingPoints?.enabled ?? false, quantity: 1 },
          };
          const mechanicsPayload = Object.entries(mechanicMap).map(([mechanicCode, { enabled, quantity }]) => ({
            mechanicCode,
            enabled,
            quantity,
          }));
          await updateQuizGameMechanics(quizId, mechanicsPayload);
        } catch (mechanicsErr) {
          console.warn("Failed to save game mechanics (non-critical):", mechanicsErr);
        }
      }

      if (opts?.publish) {
        await updateQuizStatus(quizId, state.info.startDate ? "scheduled" : "live");
      }

      setState((s) => ({ ...s, serverQuizId: quizId }));
      return { quizId, code: state.info.code };
    } finally {
      setSavingToServer(false);
      setSaveProgress(null);
    }
  };

  const saveGameMechanicsOnly = useCallback(async () => {
    const quizId = state.serverQuizId;
    if (!quizId) throw new Error("Quiz not saved yet — save the quiz first");

    setSavingToServer(true);
    try {
      const gm = state.gameMechanics;
      const mechanicMap: Record<string, { enabled: boolean; quantity: number }> = {
        FIFTY_FIFTY: { enabled: gm.fiftyFifty.enabled, quantity: typeof gm.fiftyFifty.uses === "number" ? gm.fiftyFifty.uses : 2 },
        AUDIENCE_POLL: { enabled: gm.audiencePoll?.enabled ?? false, quantity: typeof gm.audiencePoll?.uses === "number" ? gm.audiencePoll.uses : 1 },
        HINT: { enabled: gm.hint.enabled, quantity: typeof gm.hint.uses === "number" ? gm.hint.uses : 2 },
        SKIP_QUESTION: { enabled: gm.skip.enabled, quantity: typeof gm.skip.uses === "number" ? gm.skip.uses : 2 },
        EXTRA_TIME: { enabled: gm.extraTime.enabled, quantity: typeof gm.extraTime.uses === "number" ? gm.extraTime.uses : 1 },
        ELIMINATE_ONE: { enabled: gm.eliminateOne?.enabled ?? false, quantity: typeof gm.eliminateOne?.uses === "number" ? gm.eliminateOne.uses : 1 },
        DOUBLE_SCORE: { enabled: gm.doublePoints.enabled, quantity: typeof gm.doublePoints.uses === "number" ? gm.doublePoints.uses : 1 },
        FREEZE_TIME: { enabled: gm.freezeTimer?.enabled ?? false, quantity: typeof gm.freezeTimer?.uses === "number" ? gm.freezeTimer.uses : 1 },
        STREAK_BONUS: { enabled: gm.streakBonus?.enabled ?? false, quantity: typeof gm.streakBonus?.uses === "number" ? gm.streakBonus.uses : 1 },
        SPEED_BONUS: { enabled: gm.speedBonus?.enabled ?? false, quantity: typeof gm.speedBonus?.uses === "number" ? gm.speedBonus.uses : 1 },
        SECOND_CHANCE: { enabled: gm.secondChance?.enabled ?? false, quantity: typeof gm.secondChance?.uses === "number" ? gm.secondChance.uses : 1 },
        DECAYING_POINTS: { enabled: gm.decayingPoints?.enabled ?? false, quantity: 1 },
      };
      const mechanicsPayload = Object.entries(mechanicMap).map(([mechanicCode, { enabled, quantity }]) => ({
        mechanicCode,
        enabled,
        quantity,
      }));
      await updateQuizGameMechanics(quizId, mechanicsPayload);
    } finally {
      setSavingToServer(false);
    }
  }, [state.serverQuizId, state.gameMechanics]);

  const saveAudienceParticipants = useCallback(async () => {
    const quizId = state.serverQuizId;
    if (!quizId) throw new Error("Quiz not saved yet — save the quiz first");

    const audience = state.audience;
    const selRoomIds = audience.roomIds ?? [];
    const selections = audience.roomStudentSelections ?? {};
    const allRooms = useRoomStore.getState().rooms;
    const byKey = new Map<string, QuizParticipantInput>();

    for (const roomId of selRoomIds) {
      const room = allRooms.find((r) => r.id === roomId);
      if (!room) continue;
      const selected: string[] | undefined = selections[roomId];
      for (const student of room.students) {
        if (!student.active || !student.id) continue;
        if (selected && !selected.includes(student.rollNumber)) continue;
        const key = String(student.id);
        if (!byKey.has(key)) {
          byKey.set(key, { userId: Number(student.id), source: 4 });
        }
      }
    }

    for (const uid of audience.invitedEmails ?? []) {
      const numId = Number(uid);
      if (!numId) continue;
      const key = String(numId);
      if (!byKey.has(key)) {
        byKey.set(key, { userId: numId, source: 2 });
      }
    }

    await setQuizParticipants(quizId, [...byKey.values()]);
    audienceSnapshotRef.current = JSON.stringify([...byKey.values()]);
  }, [state.serverQuizId, state.audience]);

  const audienceDirty = useMemo(() => {
    const audience = state.audience;
    const selRoomIds = audience.roomIds ?? [];
    const selections = audience.roomStudentSelections ?? {};
    const allRooms = useRoomStore.getState().rooms;
    const byKey = new Map<string, QuizParticipantInput>();

    for (const roomId of selRoomIds) {
      const room = allRooms.find((r) => r.id === roomId);
      if (!room) continue;
      const selected: string[] | undefined = selections[roomId];
      for (const student of room.students) {
        if (!student.active || !student.id) continue;
        if (selected && !selected.includes(student.rollNumber)) continue;
        const key = String(student.id);
        if (!byKey.has(key)) {
          byKey.set(key, { userId: Number(student.id), source: 4 });
        }
      }
    }

    for (const uid of audience.invitedEmails ?? []) {
      const numId = Number(uid);
      if (!numId) continue;
      const key = String(numId);
      if (!byKey.has(key)) {
        byKey.set(key, { userId: numId, source: 2 });
      }
    }

    return JSON.stringify([...byKey.values()]) !== audienceSnapshotRef.current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.serverQuizId, state.audience]);

  const value: StudioContextValue = useMemo(
    () => ({
      state,
      setState,
      updateInfo,
      updateSettings,
      updateAudience,
      updatePricing,
      updateBranding,
      updateGameMechanics,
      setGameMechanicsEnabled,
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
      saveProgress,
      loading,
      loadError,
      editMode,
      summary,
      saveAudienceParticipants,
      audienceDirty,
    }),
    [state, stepIndex, summary, savingToServer, saveProgress, loading, loadError, editMode, steps, saveAudienceParticipants, audienceDirty]
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

