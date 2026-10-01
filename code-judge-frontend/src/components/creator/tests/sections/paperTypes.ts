import type { Section } from "./types";

export interface PaperQuestion {
  num: number;
  question: string;
  difficulty: string;
  kind: string;
  marks: number;
  /** True when the AI composed this question itself (bank had too few). */
  aiGenerated?: boolean;
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
  difficulty: string;
  kind: string;
  /** True when the AI composed this question itself (bank had too few). */
  aiGenerated?: boolean;
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
}

export interface GenerateQuestionsResponse {
  questions: SubjectiveQuestion[];
}
