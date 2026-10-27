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
  isQuizCodeTakenError,
  updateQuiz,
  updateQuizStatus,
  setQuizParticipants,
  getQuizParticipants,
  loadQuizMetadataForEdit,
  getQuizProblems,
  deleteQuizProblem,
  type QuizParticipantInput,
  type QuizBasic,
  type QuizProblemWithOptions,
} from "@/services/quiz";
import { syncQuizQuestions, computeChangedQuestions, buildQuestionSnapshot } from "@/utils/quizQuestionSync";
import { containsHtml, htmlToPlainText } from "@/utils/htmlText";
import { useRoomStore } from "@/store/roomStore";
import {
  type StudioState,
  type StudioStepId,
  type CreatorQuestion,
  type CreatorQuestionType,
  type CreatorOption,
  type GameMechanicsConfig,
  STEPS,
  MOBILE_STEP_IDS,
  DEFAULT_QUIZ_INFO,
  DEFAULT_SETTINGS,
  DEFAULT_AUDIENCE,
  DEFAULT_REGISTRATION,
  DEFAULT_PRICING,
  DEFAULT_BRANDING,
  DEFAULT_GAME_MECHANICS_STATE,
  createEmptyQuestion,
} from "./types";
import { DEFAULT_GAME_MECHANICS, normalizeGameMechanics, zeroAllMechanics } from "./types/gameMechanics";

const STORAGE_KEY = "studio_quiz_draft";
const GAME_MECHANICS_STORAGE_PREFIX = "studio_game_mechanics_";
const PROBLEMS_RETRY_MAX_DELAY_MS = 8_000;

function getProblemsRetryDelay(attempt: number): number {
  return Math.min(1_000 * 2 ** Math.min(attempt - 1, 3), PROBLEMS_RETRY_MAX_DELAY_MS);
}

function waitForProblemsRetry(delay: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

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
    options = p.options.map((o, i) => {
      const raw = o.option_statement ?? "";
      const hasHtml = containsHtml(raw);
      return {
        id: String(o.id),
        label: String.fromCharCode(65 + i),
        content: hasHtml ? htmlToPlainText(raw) : raw,
        contentHtml: hasHtml ? raw : undefined,
        isCorrect: o.iscorrect ?? false,
      };
    });
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
    marks: Number(p.marks) || 10,
    negativeMarks: Number(p.negative_marks) || 0,
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
  const raw = ((quiz as any).status as string | null)?.trim().toLowerCase() ?? "";
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
  importQuestionsAndSave: (questions: CreatorQuestion[]) => Promise<void>;
  removeQuestion: (id: string) => Promise<void>;
  duplicateQuestion: (id: string) => void;
  reorderQuestions: (ids: string[]) => void;
  setActiveQuestion: (id: string | null) => void;
  stepIndex: number;
  steps: Array<{ id: StudioStepId; label: string }>;
  /** Mobile-visible subset of steps (dropdown + mobile Continue stay within these). */
  mobileSteps: Array<{ id: StudioStepId; label: string }>;
  mobileStepIndex: number;
  goToStep: (id: StudioState["step"]) => void;
  nextStep: () => void;
  prevStep: () => void;
  /** Continue/Back restricted to the mobile step subset. */
  nextMobileStep: () => void;
  prevMobileStep: () => void;
  publish: () => void;
  saveToServer: (opts?: { publish?: boolean }) => Promise<{ quizId: string; code: string }>;
  savingToServer: boolean;
  /** True when the Questions step differs from the last saved snapshot. */
  questionsDirty: boolean;
  setQuestionsDirty: (dirty: boolean) => void;
  /** Progress of the current save: { saved, total } while saving, null otherwise */
  saveProgress: { saved: number; total: number } | null;
  loading: boolean;
  loadError: string | null;
  /** True while /problems is still fetching in the background (setup is already interactive). */
  questionsLoading: boolean;
  editMode: boolean;
  summary: {
    questionCount: number;
    totalMarks: number;
    totalTime: number;
    validQuestions: number;
    incompleteQuestions: number;
  };
  questionsValid: boolean;
  saveAudienceParticipants: () => Promise<void>;
  audienceDirty: boolean;
  /** Rich content rendered inside the header Help panel, set by the active step. */
  helpExtra: ReactNode;
  setHelpExtra: Dispatch<SetStateAction<ReactNode>>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function initialState(): StudioState {
  const code = generateQuizCode();
  // Try hydrate gameMechanics from localStorage for new draft
  let persistedGameMechanics: any = null;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(GAME_MECHANICS_STORAGE_PREFIX + code) : null;
    if (raw) persistedGameMechanics = JSON.parse(raw);
  } catch {}
  return {
  step: "details",
  info: { ...DEFAULT_QUIZ_INFO, id: code, code },
  // A new draft starts with no questions — the creator adds the first one
  // (manually or via AI) from the Questions step's empty state.
  questions: [],
  activeQuestionId: null,
  sections: [],
  settings: { ...DEFAULT_SETTINGS },
  audience: { ...DEFAULT_AUDIENCE, accessCode: generateQuizCode() },
  registration: {
    settings: { ...DEFAULT_REGISTRATION.settings },
    fields: DEFAULT_REGISTRATION.fields.map((f) => ({ ...f })),
  },
  pricing: { ...DEFAULT_PRICING },
  branding: { ...DEFAULT_BRANDING },
  gameMechanics: persistedGameMechanics ? { ...JSON.parse(JSON.stringify(DEFAULT_GAME_MECHANICS)), ...persistedGameMechanics } : JSON.parse(JSON.stringify(DEFAULT_GAME_MECHANICS)),
  saveStatus: "idle",
  lastSaved: null,
  published: false,
};
}

/**
 * Old drafts, bookmarks, and handoff URLs used the pre-5-step ids. Resolve
 * those aliases so links such as ?step=questions and ?step=audience keep
 * working after steps were merged.
 */
const STEP_ALIASES: Record<string, StudioStepId> = {
  details: "details",
  setup: "details",
  questions: "questions",
  access: "access",
  audience: "access",
  registration: "access",
  pricing: "access",
  rules: "rules",
  settings: "rules",
  reviewPublish: "reviewPublish",
  "review-publish": "reviewPublish",
  review: "reviewPublish",
  publish: "reviewPublish",
  // Disconnected steps fall through to the closest current step.
  gameMechanics: "questions",
  branding: "details",
};

function resolveStudioStep(value?: string): StudioStepId | null {
  if (!value) return null;
  return STEP_ALIASES[value] ?? null;
}

type QuizMetaSnapshotInput = Pick<StudioState, "info" | "settings"> & {
  audience: Pick<StudioState["audience"], "mode">;
  registration: Pick<StudioState["registration"], "fields">;
};

function buildQuizMetaSnapshot(state: QuizMetaSnapshotInput): string {
  return JSON.stringify({
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
    audienceMode: state.audience.mode,
    settings: {
      randomizeQuestions: state.settings.randomizeQuestions,
      randomizeOptions: state.settings.randomizeOptions,
      showResultsImmediately: state.settings.showResultsImmediately,
      negativeMarking: state.settings.negativeMarking,
      negativeMarkValue: state.settings.negativeMarkValue,
    },
    registrationFields: state.registration.fields.map((f) => f.name.trim()).filter(Boolean),
  });
}

interface StudioProviderProps {
  children: ReactNode;
  editMode?: boolean;
  initialQuizId?: string;
  /**
   * Deep link into a specific step — used by the create flow's handoff
   * (/creator/quizzes/[id]/edit?step=questions) so the creator lands on the
   * Problems step instead of being shown Setup twice. Read during state
   * initialization (not in an effect) so server and client render the same
   * step and there is no hydration mismatch.
   */
  initialStep?: string;
}

export function StudioProvider({ children, editMode = false, initialQuizId, initialStep }: StudioProviderProps) {
  const steps = STEPS;

  const mobileSteps = useMemo(() => {
    return steps.filter((s) => MOBILE_STEP_IDS.includes(s.id));
  }, [steps]);

  const [state, setState] = useState<StudioState>(() => {
    if (editMode && initialQuizId) {
      // Honour a validated ?step= deep link, including aliases from the old
      // 8-step flow (e.g. ?step=questions or ?step=audience).
      const deepLinkedStep = resolveStudioStep(initialStep) ?? "details";
      return {
        step: deepLinkedStep,
        info: { ...DEFAULT_QUIZ_INFO },
        questions: [],
        activeQuestionId: null,
        sections: [],
        settings: { ...DEFAULT_SETTINGS },
        audience: { ...DEFAULT_AUDIENCE, accessCode: generateQuizCode() },
        registration: {
          settings: { ...DEFAULT_REGISTRATION.settings },
          fields: DEFAULT_REGISTRATION.fields.map((f) => ({ ...f })),
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

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const [loading, setLoading] = useState(editMode && !!initialQuizId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(editMode && !!initialQuizId);
  const [helpExtra, setHelpExtra] = useState<ReactNode>(null);

  /**
   * Snapshot of question content hashes captured when questions are loaded from
   * the server. Used on save to diff against current state — only questions whose
   * content has actually changed (or are newly added) get sent to the backend.
   */
  const snapshotRef = useRef<Map<string, string>>(new Map());
  const quizSnapshotRef = useRef<string>("");
  const audienceSnapshotRef = useRef<string>("");
  const databaseAutosaveSnapshotRef = useRef<string | null>(null);
  const audienceModeSnapshotRef = useRef<StudioState["audience"]["mode"] | null>(null);
  /**
   * Tracks which background payloads have landed. Save paths must not persist
   * participants until the bg fetch completes — otherwise local defaults would
   * overwrite real server data.
   */
  const bgReadyRef = useRef({ participants: false });

  useEffect(() => {
    if (!editMode || !initialQuizId) return;
    let cancelled = false;
    (async () => {
      let loadedQuiz: (QuizBasic & { subject_name?: string; exam_cat_name?: string }) | null = null;
      try {
        // Phase 1 (blocking, minimal): only quiz metadata — everything the
        // Setup page needs. Mechanics, participants and /problems all load
        // in the background afterwards without blocking Setup.
        const { quiz } = await loadQuizMetadataForEdit(initialQuizId);
        if (cancelled) return;
        loadedQuiz = quiz;
        const info = mapQuizToStudioInfo(quiz);
        const settings = mapQuizToStudioSettings(quiz);
        // Creator-defined registration field names. A NULL column (legacy
        // quizzes) keeps the default seed names; an explicit array wins.
        const registrationFields = Array.isArray(quiz.registration_fields)
          ? quiz.registration_fields
          : DEFAULT_REGISTRATION.fields.map((f) => f.name);
        // Participants load in bg; audienceMode is reconciled there for legacy
        // quizzes without a stored mode. Use the same builder as save so the
        // edit-mode baseline cannot drift from the live state.
        quizSnapshotRef.current = buildQuizMetaSnapshot({
          info,
          settings,
          audience: { mode: quiz.audience_mode ?? DEFAULT_AUDIENCE.mode },
          registration: {
            fields: registrationFields.map((name, i) => ({ id: `rfld_srv_${i}`, name })),
          },
        });

        // Local defaults for now — the background fetch overwrites with
        // server values when it lands (see Phase 2 below).
        const loadedGameMechanics = JSON.parse(JSON.stringify(DEFAULT_GAME_MECHANICS));

        // Audience defaults for now — reconciled with server participants
        // in the background (legacy quizzes infer "classroom").
        const loadedAudience = {
          ...DEFAULT_AUDIENCE,
          accessCode: generateQuizCode(),
          mode: quiz.audience_mode ?? DEFAULT_AUDIENCE.mode,
        };

        setState((s) => ({
          ...s,
          info: { ...DEFAULT_QUIZ_INFO, ...info },
          settings: { ...DEFAULT_SETTINGS, ...settings },
          serverQuizId: initialQuizId,
          gameMechanics: loadedGameMechanics,
          audience: loadedAudience,
          registration: {
            settings: { ...DEFAULT_REGISTRATION.settings },
            fields: registrationFields.map((name, i) => ({ id: `rfld_srv_${i}`, name })),
          },
        }));
      } catch (err) {
        console.error("Failed to load quiz for editing:", err);
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Quiz not found or access denied.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Phase 2 (background): participants, /problems — all independent,
      // none block Setup. Each merges into state when it lands.
      if (cancelled) return;

      // — Participants / audience in bg —
      void (async () => {
        try {
          if (!loadedQuiz) return;
          const quiz = loadedQuiz;
          const participants = await getQuizParticipants(initialQuizId).catch((error) => {
            console.error("[StudioProvider] Failed to load participants:", error);
            return [];
          });
          if (cancelled) return;
          let loadedAudience = {
            ...DEFAULT_AUDIENCE,
            accessCode: generateQuizCode(),
            mode: quiz.audience_mode ?? DEFAULT_AUDIENCE.mode,
          };
          if (participants.length > 0) {
            // Legacy quizzes did not store audience_mode. Preserve their old
            // room-restricted behaviour, while respecting the explicit mode for
            // newly migrated/saved quizzes.
            if (!quiz.audience_mode && participants.some((p) => p.source === 4 || p.source === 2)) {
              loadedAudience = { ...loadedAudience, mode: "classroom" };
            }

            // Set audience snapshot so save doesn't overwrite loaded data
            const snapshotParticipants = participants.map((p) => ({
              userId: p.user_id,
              source: p.source,
            }));
            audienceSnapshotRef.current = JSON.stringify(snapshotParticipants);
          }
          // Keep the quiz-metadata snapshot consistent with the inferred mode
          // so a later save doesn't see a phantom audienceMode change.
          try {
            const parsed = JSON.parse(quizSnapshotRef.current);
            if (parsed && parsed.audienceMode !== loadedAudience.mode) {
              parsed.audienceMode = loadedAudience.mode;
              quizSnapshotRef.current = JSON.stringify(parsed);
            }
          } catch {}
          // Re-baseline autosave so the bg merge itself isn't treated as a change.
          databaseAutosaveSnapshotRef.current = null;
          setState((s) => ({ ...s, audience: loadedAudience }));
        } finally {
          bgReadyRef.current.participants = true;
        }
      })();

      // — /problems is required before the editor is shown. A failed response
      // must never be interpreted as an empty quiz, otherwise a later save can
      // overwrite real questions. Retry with a bounded backoff until HTTP 200.
      let problemsAttempt = 0;
      while (!cancelled) {
        try {
          problemsAttempt += 1;
          const problems = await getQuizProblems(initialQuizId);
          if (cancelled) return;
          const questions = (problems as QuizProblemWithOptions[]).map((p, i) => mapBackendProblem(p, i));
          snapshotRef.current = buildQuestionSnapshot(questions);
          // Re-baseline autosave so the successful server merge itself isn't
          // treated as a local edit.
          databaseAutosaveSnapshotRef.current = null;
          setState((s) => {
            const localOnly = s.questions.filter((q) => q.serverId == null && (q.title.trim() || q.options.some((o) => o.content.trim())));
            // No questions on the server → stay empty (never seed a blank one).
            const merged = [...questions, ...localOnly];
            return {
              ...s,
              questions: merged,
              activeQuestionId: s.activeQuestionId ?? merged[0]?.id ?? null,
            };
          });
          setQuestionsLoading(false);
          break;
        } catch (err) {
          if (cancelled) return;
          const delay = getProblemsRetryDelay(problemsAttempt);
          console.warn(
            `[StudioProvider] Quiz problems request failed (attempt ${problemsAttempt}). Retrying in ${delay}ms.`,
            err
          );
          await waitForProblemsRetry(delay);
        }
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

  const importQuestionsAndSave = async (questions: CreatorQuestion[]) => {
    if (questions.length === 0) return;
    if (savingToServer) throw new Error("Save already in progress");
    if (!state.serverQuizId) throw new Error("Save the quiz setup before generating questions.");

    // Drop only untouched empty placeholders; preserve every authored question.
    const existingQuestions = state.questions.filter((question) =>
      question.title.trim() || question.options.some((option) => option.content.trim())
    );
    const updatedQuestions = [...existingQuestions, ...questions];
    const generatedIds = new Set(questions.map((question) => question.id));

    setSavingToServer(true);
    setSaveProgress({ saved: 0, total: generatedIds.size });
    try {
      await syncQuizQuestions(
        state.serverQuizId,
        updatedQuestions,
        generatedIds,
        (saved, total) => setSaveProgress({ saved, total })
      );
      snapshotRef.current = buildQuestionSnapshot(updatedQuestions);
      setQuestionsDirty(false);
      setState((current) => ({
        ...current,
        questions: updatedQuestions,
        activeQuestionId: questions[0]?.id ?? current.activeQuestionId,
      }));
    } finally {
      setSavingToServer(false);
      setSaveProgress(null);
    }
  };

  const removeQuestion = async (id: string) => {
    const targetIdx = state.questions.findIndex((q) => q.id === id);
    if (targetIdx === -1) return;
    const target = state.questions[targetIdx];
    const serverId = target.serverId;

    // Optimistic local removal so the list updates instantly.
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
    // Drop its change-tracking entry so a later save doesn't try to upsert it.
    snapshotRef.current.delete(id);

    // Never persisted to the backend — local-only removal, no API needed.
    if (!serverId) return;

    // Persisted question — soft-delete on the server immediately
    // (backend sets deleted_at, keeps the row for audit/history).
    try {
      await deleteQuizProblem(String(serverId));
    } catch (err) {
      // Roll back the optimistic removal so the question isn't lost.
      setState((s) => {
        if (s.questions.some((q) => q.id === id)) return s;
        const restored = [...s.questions];
        restored.splice(Math.min(targetIdx, restored.length), 0, target);
        return { ...s, questions: restored };
      });
      toast.error({
        title: "Could not delete question",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    }
  };

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
  const mobileStepIndex = mobileSteps.findIndex((s) => s.id === state.step);

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
      if (q.options.length < 2) return "needs at least 2 options";
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

  const validateAllQuestions = (opts?: { silent?: boolean }): boolean => {
    if (state.questions.length === 0) {
      if (!opts?.silent) {
        toast.error({
          title: "Add at least one question",
          description: "A quiz needs at least one question before you can save or publish.",
        });
      }
      return false;
    }
    for (let i = 0; i < state.questions.length; i++) {
      const q = state.questions[i];
      const reason = findIncompleteReason(q);
      if (reason) {
        if (!opts?.silent) {
          toast.error({
            title: `Question ${i + 1} is incomplete`,
            description: `${reason.charAt(0).toUpperCase()}${reason.slice(1)}. Complete it or delete it before saving or publishing.`,
          });
        }
        return false;
      }
      const dupes = findDuplicateOptionValues(q);
      if (dupes.length > 0) {
        if (!opts?.silent) {
          toast.error({
            title: "Duplicate options",
            description: `Question ${i + 1} has identical options (${dupes.join(", ")}). Make each option unique before moving on.`,
          });
        }
        return false;
      }
    }
    return true;
  };

  const questionsValid = validateAllQuestions({ silent: true });

  const goToStep = (id: StudioState["step"]) => {
    setState((s) => ({ ...s, step: id }));
  };
  const getReviewErrors = (): string[] => {
    const errs: string[] = [];
    if (state.info.title.trim().length < 3) errs.push("Quiz title is required");
    if (summary.questionCount === 0) errs.push("No questions added");
    else if (summary.incompleteQuestions > 0) errs.push(`${summary.incompleteQuestions} question(s) are incomplete`);
    if (state.questions.some((q) => (q.marks || 0) <= 0)) errs.push("Some questions have no marks");
    if (state.audience.mode === "classroom") {
      const roomCount = (state.audience.roomIds ?? []).length;
      const manualCount = (state.audience.invitedEmails ?? []).length;
      if (roomCount === 0 && manualCount === 0) errs.push("No audience selected — select at least one room");
    }
    const regFields = state.registration?.fields ?? [];
    if (regFields.some((f) => !f.name.trim())) {
      errs.push("Some registration fields have no name");
    }
    if (state.pricing.mode === "paid" && state.pricing.price <= 0) errs.push("Paid quiz requires a price");
    return errs;
  };

  const advanceInList = async (list: Array<{ id: StudioStepId; label: string }>) => {
    // Review & publish is the last step. In edit mode Continue saves and
    // exits; in create mode the Start Quiz button inside the step handles
    // the actual publish (including its confirmation modal).
    if (state.step === "reviewPublish") {
      const reviewErrs = getReviewErrors();
      if (reviewErrs.length > 0) {
        toast.error({
          title: reviewErrs[0],
          description: reviewErrs.length > 1 ? `${reviewErrs.length} errors need to be fixed before publishing.` : "Please fix the error before continuing.",
        });
        return;
      }
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
      }
      return;
    }

    if (state.step === "details") {
      try {
        const { quizId } = await saveToServer({ setupOnly: true });
        setState((s) => ({ ...s, serverQuizId: quizId }));
        if (!editMode) {
          // Hand off to the edit route on the Problems (questions) step —
          // Setup is already done, so don't make the creator see it twice.
          const wantsAi = new URLSearchParams(window.location.search).get("ai") === "1";
          window.location.assign(`/creator/quizzes/${quizId}/edit?step=questions${wantsAi ? "&ai=1" : ""}`);
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
      if (validateAllQuestions({ silent: true })) {
        try {
          await saveToServer({ skipParticipants: true });
        } catch (err) {
          if (!isQuestionValidationError(err)) {
            toast.error({
              title: "Could not save questions",
              description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
            });
            return;
          }
        }
      }
    }

    // Unknown current step for this list (e.g. a desktop-only step while on
    // mobile): jump to the nearest following entry instead of getting stuck.
    setState((s) => {
      const idx = list.findIndex((st) => st.id === s.step);
      if (idx === -1) {
        const fullIdx = steps.findIndex((st) => st.id === s.step);
        const next = list.find((st) => steps.findIndex((x) => x.id === st.id) > fullIdx);
        return { ...s, step: next ? next.id : list[list.length - 1].id };
      }
      return { ...s, step: idx < list.length - 1 ? list[idx + 1].id : s.step };
    });
  };

  const nextStep = async () => {
    await advanceInList(steps);
  };

  const nextMobileStep = async () => {
    await advanceInList(mobileSteps);
  };

  const retreatInList = async (list: Array<{ id: StudioStepId; label: string }>) => {
    if (state.step === "questions" && validateAllQuestions({ silent: true })) {
      try {
        await saveToServer();
      } catch (err) {
        if (!isQuestionValidationError(err)) {
          toast.error({
            title: "Could not save questions",
            description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
          });
          return;
        }
      }
    }
    setState((s) => {
      const i = list.findIndex((st) => st.id === s.step);
      if (i === -1) {
        const fullIdx = steps.findIndex((st) => st.id === s.step);
        const prev = [...list].reverse().find((st) => steps.findIndex((x) => x.id === st.id) < fullIdx);
        return { ...s, step: prev ? prev.id : list[0].id };
      }
      return { ...s, step: i > 0 ? list[i - 1].id : s.step };
    });
  };

  const prevStep = async () => {
    await retreatInList(steps);
  };

  const prevMobileStep = async () => {
    await retreatInList(mobileSteps);
  };
  const publish = () =>
    setState((s) => ({ ...s, published: true }));

  const [savingToServer, setSavingToServer] = useState(false);
  const [questionsDirty, setQuestionsDirty] = useState(false);
  const saveInFlightRef = useRef<Promise<{ quizId: string; code: string }> | null>(null);
  const [saveProgress, setSaveProgress] = useState<{ saved: number; total: number } | null>(null);

  useEffect(() => {
    if (loading || questionsLoading) return;
    const questionsChanged = computeChangedQuestions(state.questions, snapshotRef.current).length > 0;
    setQuestionsDirty(questionsChanged || buildQuizMetaSnapshot(state) !== quizSnapshotRef.current);
  }, [state, loading, questionsLoading]);

  const saveToServer = async (
    opts?: { publish?: boolean; setupOnly?: boolean; skipParticipants?: boolean; silentValidation?: boolean }
  ): Promise<{ quizId: string; code: string }> => {
    while (saveInFlightRef.current) {
      if (!opts?.publish && !opts?.setupOnly) {
        return saveInFlightRef.current;
      }
      await saveInFlightRef.current;
    }

    const run = (async (): Promise<{ quizId: string; code: string }> => {
    if (state.info.title.trim().length < 3) {
      throw new Error("Quiz title is required before saving");
    }
    if (state.info.quizLifecycle === "scheduled") {
      if (!state.info.startDate || !state.info.endDate) {
        throw new Error("Scheduled quizzes require both a start and an end time");
      }
      const startsAt = new Date(state.info.startDate).getTime();
      const endsAt = new Date(state.info.endDate).getTime();
      if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
        throw new Error("Scheduled quiz end time must be after the start time");
      }
    }
    // Validate the problems before persisting anything. setupOnly only creates
    // the quiz shell (no questions involved yet), so skip validation there.
    // Background autosave validates silently — no toasts for half-written
    // questions; explicit Save / Continue stays loud.
    if (!opts?.setupOnly && !validateAllQuestions({ silent: opts?.silentValidation })) {
      throw new Error(QUESTION_VALIDATION_FAILED);
    }
    setSavingToServer(true);
    setSaveProgress(null);
    try {
      // Free-form field names only; unnamed draft rows and blanks are dropped.
      const registrationFields = state.registration.fields
        .map((f) => f.name.trim())
        .filter(Boolean);
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
        starttime: state.info.startDate || undefined,
        endtime: state.info.endDate || undefined,
        timeLimit: state.info.duration,
        // Saving content must never publish a quiz. Lifecycle changes only
        // happen through the explicit schedule/start/end controls below.
        status: state.info.quizLifecycle,
        audienceMode: state.audience.mode,

        randomizeQuestions: state.settings.randomizeQuestions,
        randomizeOptions: state.settings.randomizeOptions,
        showResultsImmediately: state.settings.showResultsImmediately,
        negativeMarking: state.settings.negativeMarking,
        negativeMarkValue: state.settings.negativeMarkValue,
        totalQuestions: summary.questionCount,
        totalMarks: summary.totalMarks,
        passingMarks: state.info.passingMarks || Math.ceil(summary.totalMarks * 0.4),
        tags: state.info.tags.length > 0 ? state.info.tags : undefined,
        registrationFields,
      };

      let quizId = state.serverQuizId || null;
      let savedCode = state.info.code;
      const currentSnapshot = buildQuizMetaSnapshot(state);
      if (quizId) {
        if (currentSnapshot !== quizSnapshotRef.current) {
          await updateQuiz(quizId, {
            name: payload.name,
            starttime: payload.starttime,
            endtime: payload.endtime,
            duration: state.info.duration,
            status: payload.status,
            audienceMode: payload.audienceMode,
            subjectId: payload.subjectId,
            examId: payload.examId,
            difficulty: payload.difficultyId,
            shuffleQuestions: payload.randomizeQuestions,
            shuffleOptions: payload.randomizeOptions,
            showResultsImmediately: payload.showResultsImmediately,
            negativeMarking: payload.negativeMarking,
            totalMarks: payload.totalMarks,
            passingMarks: payload.passingMarks,
            registrationFields: payload.registrationFields,
          });
          quizSnapshotRef.current = currentSnapshot;
        }
      } else {
        let quiz: Awaited<ReturnType<typeof createQuiz>>;
        try {
          quiz = await createQuiz(payload);
        } catch (err) {
          if (!isQuizCodeTakenError(err)) throw err;
          const freshCode = generateQuizCode();
          savedCode = freshCode;
          setState((s) => ({ ...s, info: { ...s.info, id: freshCode, code: freshCode } }));
          quiz = await createQuiz({ ...payload, code: freshCode });
        }
        quizId = String(quiz.id);
        quizSnapshotRef.current = currentSnapshot;
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
        // Update snapshot so subsequent saves only diff against the new baseline.
        // Compare against the latest state so edits made during the request
        // keep the Save button enabled.
        const savedQuestionSnapshot = buildQuestionSnapshot(state.questions);
        snapshotRef.current = savedQuestionSnapshot;
        const latest = stateRef.current;
        setQuestionsDirty(
          computeChangedQuestions(latest.questions, savedQuestionSnapshot).length > 0 ||
            buildQuizMetaSnapshot(latest) !== currentSnapshot
        );

        // Skip until the bg participants fetch lands — otherwise local
        // defaults would wipe real server data.
        if (!opts?.skipParticipants && bgReadyRef.current.participants) {
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
      }

      if (opts?.publish) {
        await updateQuizStatus(quizId, state.info.startDate ? "scheduled" : "live");
      }

      setState((s) => ({ ...s, serverQuizId: quizId }));
      return { quizId, code: savedCode };
    } finally {
      setSavingToServer(false);
      setSaveProgress(null);
    }
    })();

    saveInFlightRef.current = run;
    try {
      return await run;
    } finally {
      saveInFlightRef.current = null;
    }
  };

  useEffect(() => {
    if (!editMode || loading || !state.serverQuizId) return;
    if (audienceModeSnapshotRef.current === null) {
      audienceModeSnapshotRef.current = state.audience.mode;
      return;
    }
    if (audienceModeSnapshotRef.current === state.audience.mode) return;

    const nextMode = state.audience.mode;
    // Persist only the active type. Room participants are deliberately not
    // touched, so switching back to Rooms restores the creator's edits.
    void updateQuiz(state.serverQuizId, { audienceMode: nextMode })
      .then(() => {
        audienceModeSnapshotRef.current = nextMode;
      })
      .catch((error) => console.warn("Could not save audience mode:", error));
  }, [editMode, loading, state.serverQuizId, state.audience.mode]);

  useEffect(() => {
    if (!editMode || loading || !state.serverQuizId) return;
    // No autosave on the questions step — problems are saved explicitly
    // with the big per-problem Save button instead.
    if (state.step === "questions") return;

    const snapshot = JSON.stringify({
      info: state.info,
      settings: state.settings,
      questions: state.questions,
      audience: state.audience,
      pricing: state.pricing,
      branding: state.branding,
      registration: state.registration,
    });

    // The first complete server-loaded state is the baseline, not a change.
    if (databaseAutosaveSnapshotRef.current === null) {
      databaseAutosaveSnapshotRef.current = snapshot;
      return;
    }
    if (databaseAutosaveSnapshotRef.current === snapshot) return;

    setState((current) => ({ ...current, saveStatus: "saving" }));
    const timer = window.setTimeout(() => {
      // Silent validation: a freshly added empty question must not pop an
      // "incomplete" toast while the creator is still writing it.
      void saveToServer({ silentValidation: true })
        .then(() => {
          databaseAutosaveSnapshotRef.current = snapshot;
          setState((current) => ({ ...current, saveStatus: "saved", lastSaved: new Date() }));
        })
        .catch((error) => {
          console.warn("Studio autosave deferred:", error);
          setState((current) => ({ ...current, saveStatus: "unsaved" }));
        });
    }, 450);

    return () => window.clearTimeout(timer);
  // saveToServer intentionally captures the state represented by this snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editMode,
    loading,
    state.serverQuizId,
    state.step,
    state.info,
    state.settings,
    state.questions,
    state.audience,
    state.pricing,
    state.branding,
    state.registration,
  ]);

  const saveAudienceParticipants = useCallback(async () => {
    const quizId = state.serverQuizId;
    if (!quizId) throw new Error("Quiz not saved yet — save the quiz first");
    if (!bgReadyRef.current.participants) throw new Error("Participants are still loading — please wait a moment and retry.");

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
      importQuestionsAndSave,
      removeQuestion,
      duplicateQuestion,
      reorderQuestions,
      setActiveQuestion,
      stepIndex,
      steps,
      mobileSteps,
      mobileStepIndex,
      goToStep,
      nextStep,
      prevStep,
      nextMobileStep,
      prevMobileStep,
      publish,
      saveToServer,
      savingToServer,
      questionsDirty,
      setQuestionsDirty,
      saveProgress,
      loading,
      loadError,
      questionsLoading,
      editMode,
      summary,
      questionsValid,
      saveAudienceParticipants,
      audienceDirty,
      helpExtra,
      setHelpExtra,
    }),
    [state, stepIndex, mobileStepIndex, summary, questionsValid, savingToServer, questionsDirty, saveProgress, loading, loadError, questionsLoading, editMode, steps, mobileSteps, saveAudienceParticipants, audienceDirty, helpExtra]
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
