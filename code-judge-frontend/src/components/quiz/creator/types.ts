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
}

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
  maxParticipants: number;
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
  maxParticipants: 0,
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