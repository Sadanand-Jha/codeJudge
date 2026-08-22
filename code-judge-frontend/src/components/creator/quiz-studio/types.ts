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
  | "registration"
  | "pricing"
  | "branding"
  | "review"
  | "publish";

// ─────────────────────────────────────────
// Registration — platform-controlled field catalog.
// Creators may ONLY configure these predefined fields. Identity and contact
// information (name, email, phone, password, government IDs, address) are
// platform-managed and are intentionally NOT part of this catalog.
// ─────────────────────────────────────────

export interface RegistrationFieldDef {
  key: string;
  label: string;
  inputType: "text" | "select";
  placeholder?: string;
  /** Fixed starting options for select fields (creator-editable copy). */
  options?: string[];
}

export const REGISTRATION_FIELD_CATALOG: Array<{
  group: "Academic / Identity" | "Assessment / Event";
  fields: RegistrationFieldDef[];
}> = [
  {
    group: "Academic / Identity",
    fields: [
      { key: "roll_number", label: "Roll Number", inputType: "text", placeholder: "Enter your roll number" },
      { key: "enrollment_number", label: "Enrollment Number", inputType: "text", placeholder: "Enter enrollment number" },
      { key: "branch", label: "Branch", inputType: "select", options: ["CSE", "ECE", "EEE", "ME", "CE", "IT", "Other"] },
      { key: "course", label: "Course / Program", inputType: "select", options: ["B.Tech", "M.Tech", "B.Sc", "M.Sc", "BCA", "MCA", "Other"] },
      { key: "year", label: "Year", inputType: "select", options: ["1st Year", "2nd Year", "3rd Year", "4th Year"] },
      { key: "semester", label: "Semester", inputType: "select", options: ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"] },
      { key: "section", label: "Section", inputType: "select", options: ["A", "B", "C", "D"] },
      { key: "batch", label: "Batch", inputType: "text", placeholder: "e.g. 2022 – 2026" },
      { key: "college", label: "College / Institution", inputType: "text", placeholder: "Select or enter college" },
      { key: "campus", label: "Campus", inputType: "text", placeholder: "Enter campus" },
    ],
  },
  {
    group: "Assessment / Event",
    fields: [
      { key: "candidate_id", label: "Candidate ID", inputType: "text", placeholder: "Enter candidate ID" },
      { key: "registration_id", label: "Registration ID", inputType: "text", placeholder: "Enter registration ID" },
      { key: "team_name", label: "Team Name", inputType: "text", placeholder: "Enter team name" },
      { key: "group", label: "Group", inputType: "text", placeholder: "Enter group" },
      { key: "exam_center", label: "Exam Center", inputType: "text", placeholder: "Enter exam center" },
      { key: "lab_section", label: "Lab / Section", inputType: "text", placeholder: "Enter lab / section" },
    ],
  },
];

export function getRegistrationFieldDef(key: string): RegistrationFieldDef | undefined {
  for (const g of REGISTRATION_FIELD_CATALOG) {
    const f = g.fields.find((x) => x.key === key);
    if (f) return f;
  }
  return undefined;
}

/** A creator-configured instance of a catalog field. */
export interface RegistrationFieldConfig {
  id: string;
  /** Catalog key — immutable after creation. */
  key: string;
  required: boolean;
  /** Editable copy of the select options. */
  options?: string[];
  /** Text validation. */
  minLength?: number;
  maxLength?: number;
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
  saveStatus: "idle" | "saving" | "saved" | "unsaved";
  lastSaved: Date | string | null;
  published: boolean;
  serverQuizId?: string | null;
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
};

export const DEFAULT_SETTINGS: StudioSettings = {
  randomizeQuestions: false,
  randomizeOptions: false,
  negativeMarking: false,
  negativeMarkValue: 1,
  showResultsImmediately: true,
  fullscreenMode: false,
  tabSwitchDetection: false,
  copyProtection: false,
};

export const DEFAULT_REGISTRATION: {
  settings: RegistrationFormSettings;
  fields: RegistrationFieldConfig[];
} = {
  settings: { ...DEFAULT_REGISTRATION_SETTINGS },
  fields: [
    { id: "rfld_roll", key: "roll_number", required: true },
    { id: "rfld_branch", key: "branch", required: true },
    { id: "rfld_year", key: "year", required: true },
    { id: "rfld_section", key: "section", required: false },
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

export const STEPS: Array<{ id: StudioStepId; label: string }> = [
  { id: "setup", label: "Setup" },
  { id: "questions", label: "Questions" },
  { id: "settings", label: "Settings" },
  { id: "audience", label: "Audience" },
  { id: "registration", label: "Registration" },
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
