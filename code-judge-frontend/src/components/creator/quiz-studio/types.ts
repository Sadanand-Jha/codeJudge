import type {
  CreatorQuestion,
  CreatorOption,
  CreatorQuestionType,
  BloomLevel,
} from "@/components/quiz/creator/types";
import type { GameMechanicsConfig } from "./types/gameMechanics";
import { DEFAULT_GAME_MECHANICS } from "./types/gameMechanics";

export type { CreatorQuestion, CreatorOption, CreatorQuestionType, BloomLevel };
export type { GameMechanicsConfig };

export type StudioStepId =
  | "setup"
  | "questions"
  | "gameMechanics"
  | "settings"
  | "audience"
  | "registration"
  | "pricing"
  | "branding"
  | "review"
  | "publish";

// ─────────────────────────────────────────
// Registration — creator-defined fields.
// The creator types any field name they want (free-form, max 200 characters).
// Identity and contact information (name, email, phone, password, government
// IDs, address) are platform-managed and are collected automatically.
// ─────────────────────────────────────────

/** Maximum length of a creator-defined registration field name. */
export const REGISTRATION_FIELD_NAME_MAX = 200;

/** A creator-defined registration field. */
export interface RegistrationFieldConfig {
  id: string;
  /** Field name shown to participants, e.g. "Roll Number". */
  name: string;
}

export interface RegistrationFormSettings {
  /** Whether participants must fill the additional registration form. */
  collectAdditionalInfo: boolean;
  formTitle: string;
  description: string;
  deadline: string;
  maxRegistrations: number;
  allowEditAfterSubmit: boolean;
  allowSaveProgress: boolean;
  showProgress: boolean;
  requireEmailVerification: boolean;
  requireOtpVerification: boolean;
  allowMultipleRegistrations: boolean;
  confirmationMessage: string;
}

export const DEFAULT_REGISTRATION_SETTINGS: RegistrationFormSettings = {
  collectAdditionalInfo: true,
  formTitle: "Registration",
  description: "",
  deadline: "",
  maxRegistrations: 0,
  allowEditAfterSubmit: false,
  allowSaveProgress: true,
  showProgress: true,
  requireEmailVerification: false,
  requireOtpVerification: false,
  allowMultipleRegistrations: false,
  confirmationMessage: "Your registration has been received.",
};

export interface StudioSection {
  id: string;
  name: string;
  description: string;
  questionIds: string[];
  marksPerQuestion: number;
  timeLimit: number;
  randomization: boolean;
}

export interface StudioQuizInfo {
  id: string;
  code: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  subject: string;
  subjectId: string | number;
  exam: string;
  examId: string | number;
  classGrade: string;
  difficulty: string;
  difficultyId: string | number;
  language: string;
  duration: number;
  passingMarks: number;
  tags: string[];
  thumbnailUrl: string;
  startDate: string;
  endDate: string;
  quizLifecycle: "draft" | "scheduled" | "live" | "ended";
}

export type AccessMode = "public" | "private" | "classroom";

export interface StudioSettings {
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  negativeMarking: boolean;
  negativeMarkValue: number;
  showResultsImmediately: boolean;
  fullscreenMode: boolean;
  tabSwitchDetection: boolean;
  copyProtection: boolean;
}

export interface StudioAudience {
  mode: AccessMode;
  accessCode: string;
  /** Room ids whose members can attempt this quiz (classroom mode). */
  roomIds: string[];
  /** roomId → roll numbers explicitly allowed to attempt (defaults to all room members). */
  roomStudentSelections: Record<string, string[]>;
  /** Individually invited student emails (classroom mode). */
  invitedEmails: string[];
  selectedStudents: Array<{ id: string; name: string; roll: string; email: string }>;
  csvPreview: string;
}

export interface StudioPricing {
  mode: "free" | "paid";
  price: number;
  originalPrice: number;
  platformFee: number;
  creatorEarnings: number;
}

export interface StudioBranding {
  logoUrl: string;
  accentColor: string;
  creatorName: string;
  organizationName: string;
  footerText: string;
  certificateEnabled: boolean;
  certificateTitle: string;
  certificateIssuer: string;
  completionThreshold: number;
}

export interface StudioState {
  step: StudioStepId;
  info: StudioQuizInfo;
  questions: CreatorQuestion[];
  activeQuestionId: string | null;
  sections: StudioSection[];
  settings: StudioSettings;
  audience: StudioAudience;
  registration: {
    settings: RegistrationFormSettings;
    fields: RegistrationFieldConfig[];
  };
  pricing: StudioPricing;
  branding: StudioBranding;
  gameMechanics: GameMechanicsConfig;
  saveStatus: "idle" | "saving" | "saved" | "unsaved";
  lastSaved: Date | string | null;
  published: boolean;
  serverQuizId?: string | null;
  editMode?: boolean;
}

export const DEFAULT_QUIZ_INFO: StudioQuizInfo = {
  id: "",
  code: "",
  title: "",
  shortDescription: "",
  fullDescription: "",
  subject: "",
  subjectId: "",
  exam: "",
  examId: "",
  classGrade: "",
  difficulty: "Medium",
  difficultyId: "",
  language: "English",
  duration: 60,
  passingMarks: 0,
  tags: [],
  thumbnailUrl: "",
  startDate: "",
  endDate: "",
  quizLifecycle: "draft",
};

export const DEFAULT_SETTINGS: StudioSettings = {
  randomizeQuestions: true,
  randomizeOptions: true,
  negativeMarking: false,
  negativeMarkValue: 1,
  showResultsImmediately: true,
  fullscreenMode: true,
  tabSwitchDetection: true,
  copyProtection: true,
};

export const DEFAULT_REGISTRATION: {
  settings: RegistrationFormSettings;
  fields: RegistrationFieldConfig[];
} = {
  settings: { ...DEFAULT_REGISTRATION_SETTINGS },
  fields: [
    { id: "rfld_roll", name: "Roll Number" },
    { id: "rfld_branch", name: "Branch" },
    { id: "rfld_year", name: "Year" },
    { id: "rfld_section", name: "Section" },
  ],
};

export const DEFAULT_AUDIENCE: StudioAudience = {
  mode: "public",
  accessCode: "",
  roomIds: [],
  roomStudentSelections: {},
  invitedEmails: [],
  selectedStudents: [],
  csvPreview: "",
};

export const DEFAULT_PRICING: StudioPricing = {
  mode: "free",
  price: 0,
  originalPrice: 0,
  platformFee: 0,
  creatorEarnings: 0,
};

export const DEFAULT_BRANDING: StudioBranding = {
  logoUrl: "",
  accentColor: "#7C3AED",
  creatorName: "",
  organizationName: "",
  footerText: "",
  certificateEnabled: false,
  certificateTitle: "",
  certificateIssuer: "",
  completionThreshold: 60,
};

export const DEFAULT_GAME_MECHANICS_STATE = DEFAULT_GAME_MECHANICS;

export const STEPS: Array<{ id: StudioStepId; label: string }> = [
  { id: "setup", label: "Setup" },
  { id: "questions", label: "Questions" },
  // DISCONNECTED (game mechanics not included as of now):
  // { id: "gameMechanics", label: "Game Mechanics" },
  { id: "settings", label: "Settings" },
  { id: "audience", label: "Audience" },
  { id: "registration", label: "Registration" },
  { id: "pricing", label: "Pricing" },
  // DISCONNECTED (branding removed from quiz creation):
  // { id: "branding", label: "Branding" },
  { id: "review", label: "Review" },
  { id: "publish", label: "Publish" },
];

/**
 * Mobile shows a focused subset of the Studio flow (the dropdown + Continue
 * only move through these). `publish` is included so create-flow stays
 * reachable on mobile; editMode filters it out, leaving exactly 5 steps.
 */
export const MOBILE_STEP_IDS: StudioStepId[] = [
  "setup",
  "questions",
  "settings",
  "audience",
  "review",
  "publish",
];

export const EXAMS = [
  "JEE",
  "NEET",
  "UPSC",
  "SSC",
  "GATE",
  "CAT",
  "CUET",
  "Banking",
  "School Exams",
  "Coding",
  "Custom",
];

export const LANGUAGES = [
  { id: "english", label: "English" },
  { id: "hindi", label: "Hindi" },
  { id: "spanish", label: "Spanish" },
  { id: "french", label: "French" },
  { id: "german", label: "German" },
  { id: "chinese", label: "Chinese" },
  { id: "japanese", label: "Japanese" },
  { id: "arabic", label: "Arabic" },
  { id: "kannada", label: "Kannada" },
  { id: "tamil", label: "Tamil" },
];

export const createMatchQuestion = (id: string): CreatorQuestion => {
  const li1 = `${id}_left_1`;
  const li2 = `${id}_left_2`;
  const li3 = `${id}_left_3`;
  const li4 = `${id}_left_4`;
  const ri1 = `${id}_right_1`;
  const ri2 = `${id}_right_2`;
  const ri3 = `${id}_right_3`;
  const ri4 = `${id}_right_4`;
  return {
    id,
    type: "match_following",
    title: "Match the following",
    options: [
      { id: `${id}_a`, label: "A", content: "", isCorrect: false },
      { id: `${id}_b`, label: "B", content: "", isCorrect: false },
    ],
    correctAnswer: -1,
    explanation: "",
    hint: "",
    marks: 1,
    negativeMarks: 0,
    difficulty: "Medium",
    expectedTime: 2,
    topic: "",
    bloomLevel: "Understand",
    tags: [],
    visibility: "visible",
    status: "draft",
    required: true,
    attachments: [],
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverId: undefined,
    matchItems: [
      { id: li1, content: "" },
      { id: li2, content: "" },
      { id: li3, content: "" },
      { id: li4, content: "" },
    ],
    matchMatches: [
      { id: ri1, content: "" },
      { id: ri2, content: "" },
      { id: ri3, content: "" },
      { id: ri4, content: "" },
    ],
    matchMapping: {},
    shuffleColumnA: true,
    shuffleColumnB: true,
    partialMarking: false,
    negativeMarkingEnabled: false,
    interactionMode: "both",
    showCorrectAfterSubmit: true,
    showExplanationAfterSubmit: true,
  };
};

export const createEmptyQuestion = (id: string): CreatorQuestion => ({
  id,
  type: "single_choice",
  title: "",
  options: [
    { id: `${id}_a`, label: "A", content: "", isCorrect: false },
    { id: `${id}_b`, label: "B", content: "", isCorrect: false },
    { id: `${id}_c`, label: "C", content: "", isCorrect: false },
    { id: `${id}_d`, label: "D", content: "", isCorrect: false },
  ],
  correctAnswer: -1,
  explanation: "",
  hint: "",
  marks: 10,
  negativeMarks: 0,
  difficulty: "Medium",
  expectedTime: 2,
  topic: "",
  bloomLevel: "Understand",
  tags: [],
  visibility: "visible",
  status: "draft",
  required: true,
  attachments: [],
  images: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  serverId: undefined,
});

export const QUESTION_TYPE_META: Array<{
  id: CreatorQuestionType;
  label: string;
  description: string;
}> = [
  { id: "single_choice", label: "Single Choice", description: "One correct answer" },
  { id: "multiple_choice", label: "Multiple Choice", description: "One or more correct" },
  { id: "true_false", label: "True / False", description: "Boolean selector" },
  { id: "fill_blanks", label: "Fill in the Blank", description: "Blank(s) to fill" },
  // short answer (text) removed for now — keep type in backend but hide in creator
  { id: "match_following", label: "Match the Following", description: "Connect pairs" },
];
