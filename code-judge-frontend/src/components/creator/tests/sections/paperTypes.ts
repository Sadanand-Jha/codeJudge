import type { Section } from "./types";

export interface PaperQuestion {
  num: number;
  question: string;
  questionHtml?: string | null;
  difficulty: string;
  kind: string;
  marks: number;
  /** Curriculum ids assigned to this question by the AI. */
  subjectId?: number;
  chapterId?: number | null;
  topicId?: number | null;
  /** Bank row created for this question; used to track PDF downloads. */
  bankQuestionId?: number | null;
}

export interface PaperGroup {
  name: string;
  type: string;
  marksPerQuestion: number;
  attemptRule: { type: string; count: number | null };
  questions: PaperQuestion[];
}

export interface PaperSection {
  order: number;
  label: string;
  name: string;
  title: string;
  instructions: string;
  questionGroups: PaperGroup[];
  totalQuestions: number;
  totalAvailableMarks: number;
  sectionMarks: number;
}

export interface QuestionPaper {
  title: string;
  instructions: string;
  syllabus: string;
  sections: PaperSection[];
  totalQuestions: number;
  totalMarks: number;
  durationMinutes?: number;
  meta?: {
    instituteName?: string;
    heading?: string;
    subject?: string;
    className?: string;
    date?: string;
    timeAllowed?: string;
    setName?: string;
    showStudentBlock?: boolean;
    easyMarks?: number;
    mediumMarks?: number;
    hardMarks?: number;
    instructions?: string;
    /** @deprecated replaced by per-difficulty marks */
    marksPerQuestion?: number;
  };
}

export interface GeneratePaperResponse {
  paper: QuestionPaper;
}

export interface GeneratePaperPayload {
  sections: Array<{
    order: number;
    label: string;
    name: string;
    title: string;
    instructions: string;
    questionGroups: Array<{
      name: string;
      type: string;
      questionCount: number;
      marksPerQuestion: number;
      attemptRule: { type: string; count: number | null };
    }>;
  }>;
  title?: string;
  instructions?: string;
  syllabus?: string;
  durationMinutes?: number;
  subjectId: number;
  chapterId?: number | null;
  topicId?: number | null;
  chapterIds?: number[];
  topicIds?: number[];
  /** Paper-level tone (Easy/Balanced/Challenging). AI decides kinds itself. */
  overallDifficulty?: "easy" | "balanced" | "challenging";
  difficulty?: "any" | "easy" | "medium" | "hard";
  kind?: "any" | "theory" | "numerical";
}

/** Convert editor sections into the shape the paper API expects. */
export function sectionsToPaperPayload(sections: Section[]): GeneratePaperPayload["sections"] {
  return sections.map((s, idx) => ({
    order: idx + 1,
    label: String.fromCharCode(65 + idx),
    name: s.name,
    title: s.title,
    instructions: s.instructions,
    questionGroups: s.questionGroups.map((g) => ({
      name: g.name || g.type,
      type: g.type,
      questionCount: g.type === "NESTED" && g.children ? g.children.length : g.questionCount,
      marksPerQuestion: g.marksPerQuestion,
      attemptRule: {
        type: g.attemptRule === "any_n" ? "ANY_N" : g.attemptRule === "compulsory_plus_optional" ? "COMPULSORY_PLUS_OPTIONAL" : "ALL",
        count: g.attemptRule === "any_n" ? g.attemptCount || null : null,
      },
    })),
  }));
}

export interface SubjectiveQuestion {
  num: number;
  question: string;
  questionHtml?: string | null;
  difficulty: string;
  kind: string;
  /** Curriculum ids assigned to this question by the AI. */
  subjectId?: number;
  chapterId?: number | null;
  topicId?: number | null;
  /** Bank row created for this question; used to track PDF downloads. */
  bankQuestionId?: number | null;
}

export interface GenerateQuestionsPayload {
  numberOfQuestions: number;
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  theoryCount?: number;
  numericalCount?: number;
  reasoningEffort?: "plus" | "pro" | "max";
  syllabus?: string;
  kind?: "any" | "theory" | "numerical";
  subjectId: number;
  chapterId?: number | null;
  topicId?: number | null;
  chapterIds?: number[];
  topicIds?: number[];
  /** Persist the generated problems to the creator's question bank. */
  saveToBank?: boolean;
}

export interface GenerateQuestionsResponse {
  questions: SubjectiveQuestion[];
}

export interface PaperGroupNumbering {
  heading: string | null;
  labels: string[];
}

type ParsedPaperGroupNumber =
  | { kind: "single"; start: number }
  | { kind: "range"; start: number; end: number };

const parsePaperGroupNumber = (name?: string): ParsedPaperGroupNumber | null => {
  const value = (name ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!value) return null;
  const range = value.match(/^Q?(\d+)(?:[-–—]|TO)Q?(\d+)$/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (start > 0 && end >= start) return { kind: "range", start, end };
    return null;
  }
  const single = value.match(/^Q?(\d+)$/);
  if (!single) return null;
  const start = Number(single[1]);
  return start > 0 ? { kind: "single", start } : null;
};

export function buildPaperNumbering(sections: PaperSection[]): PaperGroupNumbering[][] {
  let next = 1;
  return sections.map((section) =>
    section.questionGroups.map((group) => {
      const count = group.questions.length;
      const parsed = parsePaperGroupNumber(group.name);
      if (parsed?.kind === "range" && parsed.end - parsed.start + 1 === count) {
        next = Math.max(next, parsed.end + 1);
        return {
          heading: null,
          labels: Array.from({ length: count }, (_, index) => `Q${parsed.start + index}`),
        };
      }
      if (parsed?.kind === "single" && count > 1) {
        next = Math.max(next, parsed.start + 1);
        return {
          heading: `Q${parsed.start}`,
          labels: Array.from({ length: count }, (_, index) => `(${String.fromCharCode(97 + index)})`),
        };
      }
      if (parsed?.kind === "single") {
        next = Math.max(next, parsed.start + 1);
        return { heading: null, labels: [`Q${parsed.start}`] };
      }
      const labels = Array.from({ length: count }, (_, index) => `Q${next + index}`);
      next += count;
      return { heading: group.name?.trim() || null, labels };
    })
  );
}
