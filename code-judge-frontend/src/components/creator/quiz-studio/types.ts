import type {
  CreatorQuestion,
  CreatorOption,
  CreatorQuestionType,
  BloomLevel,
} from "@/components/quiz/creator/types";

export type { CreatorQuestion, CreatorOption, CreatorQuestionType, BloomLevel };

export type StudioStepId =
  | "setup"
  | "questions"
  | "settings"
  | "audience"
  | "pricing"
  | "branding"
  | "review"
  | "publish";

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
  category: string;
  exam: string;
  classGrade: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  language: string;
  duration: number;
  tags: string[];
  thumbnailUrl: string;
  startDate: string;
  endDate: string;
}

export type AccessMode = "public" | "private" | "unlisted" | "classroom";

export interface StudioSettings {
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  oneQuestionPerScreen: boolean;
  allowQuestionNavigation: boolean;
  allowBackNavigation: boolean;
  showProgress: boolean;
  showQuestionNumbers: boolean;
  negativeMarking: boolean;
  negativeMarkValue: number;
  partialMarking: boolean;
  attemptLimit: number;
  resultMode: "immediate" | "after_end" | "manual";
  showScore: boolean;
  showPercentage: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  fullscreenMode: boolean;
  tabSwitchDetection: boolean;
  copyProtection: boolean;
}

export interface StudioAudience {
  mode: AccessMode;
  accessCodeEnabled: boolean;
  accessCode: string;
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
  pricing: StudioPricing;
  branding: StudioBranding;
  saveStatus: "idle" | "saving" | "saved" | "unsaved";
  lastSaved: Date | null;
  published: boolean;
}

export const DEFAULT_QUIZ_INFO: StudioQuizInfo = {
  id: "",
  code: "",
  title: "",
  shortDescription: "",
  fullDescription: "",
  subject: "",
  category: "",
  exam: "",
  classGrade: "",
  difficulty: "Medium",
  language: "English",
  duration: 60,
  tags: [],
  thumbnailUrl: "",
  startDate: "",
  endDate: "",
};

export const DEFAULT_SETTINGS: StudioSettings = {
  randomizeQuestions: false,
  randomizeOptions: false,
  oneQuestionPerScreen: false,
  allowQuestionNavigation: true,
  allowBackNavigation: true,
  showProgress: true,
  showQuestionNumbers: true,
  negativeMarking: false,
  negativeMarkValue: 1,
  partialMarking: false,
  attemptLimit: 1,
  resultMode: "immediate",
  showScore: true,
  showPercentage: true,
  showCorrectAnswers: true,
  showExplanations: true,
  fullscreenMode: false,
  tabSwitchDetection: false,
  copyProtection: false,
};

export const DEFAULT_AUDIENCE: StudioAudience = {
  mode: "public",
  accessCodeEnabled: false,
  accessCode: "",
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

export const STEPS: Array<{ id: StudioStepId; label: string }> = [
  { id: "setup", label: "Setup" },
  { id: "questions", label: "Questions" },
  { id: "settings", label: "Settings" },
  { id: "audience", label: "Audience" },
  { id: "pricing", label: "Pricing" },
  { id: "branding", label: "Branding" },
  { id: "review", label: "Review" },
  { id: "publish", label: "Publish" },
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
  { id: "integer", label: "Integer / Number", description: "Numeric answer" },
  { id: "text", label: "Short Answer", description: "One-line text" },
  { id: "paragraph", label: "Long Answer", description: "Paragraph text" },
  { id: "code_output", label: "Coding", description: "Code with test cases" },
];
