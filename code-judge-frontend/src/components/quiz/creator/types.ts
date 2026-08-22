export type CreatorQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "fill_blanks"
  | "integer"
  | "text"
  | "paragraph"
  | "code_output";

export type QuestionStatus = "draft" | "complete" | "missing_answer";

export type BloomLevel = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";

export type QuizVisibility = "public" | "private" | "college" | "classroom";

export interface CreatorOption {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
  imageUrl?: string;
  caption?: string;
}

export interface CreatorAttachment {
  id: string;
  type: "image" | "pdf" | "audio" | "video";
  url: string;
  name: string;
}

export interface CreatorQuestion {
  id: string;
  type: CreatorQuestionType;
  title: string;
  options: CreatorOption[];
  correctAnswer: string | number | number[];
  explanation: string;
  hint: string;
  solution?: string;
  marks: number;
  negativeMarks: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  expectedTime: number; // minutes
  topic: string;
  bloomLevel: BloomLevel;
  tags: string[];
  visibility: "visible" | "hidden";
  status: "draft" | "published";
  required: boolean;
  attachments: CreatorAttachment[];
  images: Array<{ id: string; url: string; caption?: string }>;
  createdAt: string;
  updatedAt: string;
  serverId?: number;
}

export interface QuizCollaborator {
  userId: string;
  username?: string;
  addedAt: string;
}

export type AudienceMode = "EVERYONE" | "ROOMS" | "STUDENTS" | "ROOMS_STUDENTS";

/**
 * A student selected individually for a quiz audience. Unlike room
 * membership (which is dynamic), individual selection is stored as a
 * snapshot on the quiz so historical quizzes stay consistent if a student is
 * later removed from a room.
 */
export interface AudienceStudent {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  /** Avatar id (1-7) for the predefined local avatars. */
  avatarId: number;
}

/**
 * Audience configuration for a quiz.
 *
 * Modes:
 *   EVERYONE       — anyone with access can register.
 *   ROOMS          — students belonging to at least one selected room (OR logic).
 *   STUDENTS       — only the individually selected students can register.
 *   ROOMS_STUDENTS — students from selected rooms OR the individually
 *                    selected students (OR logic — one match is enough).
 *
 * `roomNames`, `students` and `eligibleCount` are display-only values. The
 * backend must resolve actual room membership and determine eligibility —
 * the frontend selection is never treated as authoritative.
 */
export interface QuizAudience {
  mode: AudienceMode;
  roomIds: string[];
  roomNames: string[];
  /** Quiz-specific individual student selection (snapshot). */
  students: AudienceStudent[];
  eligibleCount: number;
}

export const DEFAULT_QUIZ_AUDIENCE: QuizAudience = {
  mode: "EVERYONE",
  roomIds: [],
  roomNames: [],
  students: [],
  eligibleCount: 0,
};

export const AUDIENCE_MODES: Array<{ id: AudienceMode; label: string }> = [
  { id: "EVERYONE", label: "Everyone" },
  { id: "ROOMS", label: "Selected Rooms" },
  { id: "STUDENTS", label: "Selected Students" },
  { id: "ROOMS_STUDENTS", label: "Rooms + Students" },
];

export interface QuizDetails {
  name: string;
  description: string;
  subject: string;
  subjectId: number | string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  visibility: QuizVisibility;
  visibilityId: number | null;
  timeLimit: number; // minutes
  startDate: string;
  endDate: string;
  timeZone: string;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  passingPercentage: number;
  allowReattempt: boolean;
  showResultImmediately: boolean;
  showCorrectAnswersAfterSubmission: boolean;
  negativeMarking: boolean;
  negativeMarkValue: number;
  tags: string[];
  totalQuestions: number;
  totalMarks: number;
  marksPerQuestion: number;
  passingMarks: number;
  registrationEnabled: boolean;
  registrationStart: string;
  registrationEnd: string;
  emailResults: boolean;
  leaderboard: boolean;
  leaderboardShowRank: boolean;
  leaderboardShowScore: boolean;
  leaderboardShowTime: boolean;
  resultVisibility: "immediate" | "after_end" | "manual";
  collaborators: QuizCollaborator[];
  audience: QuizAudience;

  // Availability & Scheduling
  availabilityMode: "immediate" | "scheduled";
  availabilityStart: string;
  availabilityEnd: string;
  availabilityEndBehavior: "auto_submit" | "allow_finish" | "stop_immediately";
}

export const DEFAULT_QUIZ_DETAILS: QuizDetails = {
  name: "",
  description: "",
  subject: "",
  subjectId: "",
  topic: "",
  difficulty: "Medium",
  visibility: "public",
  visibilityId: null,
  timeLimit: 30,
  startDate: "",
  endDate: "",
  timeZone: "Asia/Kolkata",
  randomizeQuestions: false,
  randomizeOptions: false,
  passingPercentage: 40,
  allowReattempt: true,
  showResultImmediately: true,
  showCorrectAnswersAfterSubmission: true,
  negativeMarking: false,
  negativeMarkValue: 0,
  tags: [],
  totalQuestions: 0,
  totalMarks: 0,
  marksPerQuestion: 10,
  passingMarks: 0,
  registrationEnabled: false,
  registrationStart: "",
  registrationEnd: "",
  emailResults: false,
  leaderboard: false,
  leaderboardShowRank: true,
  leaderboardShowScore: true,
  leaderboardShowTime: true,
  resultVisibility: "immediate",
  collaborators: [],
  audience: { ...DEFAULT_QUIZ_AUDIENCE },

  // Availability & Scheduling
  availabilityMode: "immediate",
  availabilityStart: "",
  availabilityEnd: "",
  availabilityEndBehavior: "auto_submit",
};

export const QUESTION_TYPE_LABELS: Record<CreatorQuestionType, string> = {
  single_choice: "Multiple Choice",
  multiple_choice: "Multiple Select",
  true_false: "True / False",
  fill_blanks: "Fill Blank",
  integer: "Integer",
  text: "Short Answer",
  paragraph: "Long Answer",
  code_output: "Coding",
};

export const QUESTION_TYPE_ORDER: CreatorQuestionType[] = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "fill_blanks",
  "integer",
  "text",
  "paragraph",
  "code_output",
];

export const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard", "Expert"] as const;

export const BLOOM_LEVELS: BloomLevel[] = [
  "Remember",
  "Understand",
  "Apply",
  "Analyze",
  "Evaluate",
  "Create",
];

export const VISIBILITY_OPTIONS: Array<{ id: QuizVisibility; label: string; description: string }> = [
  { id: "public", label: "Public", description: "Anyone can view and attempt" },
  { id: "private", label: "Private", description: "Only you and collaborators" },
  { id: "college", label: "College", description: "Restricted to your college" },
  { id: "classroom", label: "Classroom", description: "Restricted to a classroom" },
];

export function createDefaultQuestion(id: string): CreatorQuestion {
  const timestamp = Date.now();
  return {
    id,
    type: "single_choice",
    title: "",
    options: [
      { id: `opt_${timestamp}_a`, label: "A", content: "", isCorrect: false },
      { id: `opt_${timestamp}_b`, label: "B", content: "", isCorrect: false },
      { id: `opt_${timestamp}_c`, label: "C", content: "", isCorrect: false },
      { id: `opt_${timestamp}_d`, label: "D", content: "", isCorrect: false },
    ],
    correctAnswer: -1,
  explanation: "",
  hint: "",
  solution: "",
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
  };
}

export function getQuestionStatus(q: CreatorQuestion): QuestionStatus {
  const hasTitle = q.title.trim().length > 0;
  if (!hasTitle) return "draft";

  if (q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false") {
    const hasOptions = q.options.length >= 2 && q.options.every((o) => o.content.trim() !== "");
    const hasCorrect = q.options.some((o) => o.isCorrect);
    if (!hasOptions || !hasCorrect) return "missing_answer";
    return "complete";
  }

  if (q.type === "fill_blanks" || q.type === "integer" || q.type === "text" || q.type === "paragraph") {
    const hasAnswer = String(q.correctAnswer).trim().length > 0;
    if (!hasAnswer) return "missing_answer";
    return "complete";
  }

  return "draft";
}