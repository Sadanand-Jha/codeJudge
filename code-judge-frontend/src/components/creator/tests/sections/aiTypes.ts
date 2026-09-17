export type AIQuestionType =
  | "MCQ_SINGLE"
  | "MCQ_MULTIPLE"
  | "TRUE_FALSE"
  | "FILL_IN_THE_BLANK"
  | "ONE_WORD"
  | "SHORT_ANSWER"
  | "LONG_ANSWER"
  | "VERY_SHORT_ANSWER"
  | "NUMERICAL"
  | "ASSERTION_REASON"
  | "MATCHING"
  | "CASE_BASED"
  | "PASSAGE_BASED"
  | "SOURCE_BASED"
  | "DIAGRAM_BASED"
  | "IMAGE_BASED"
  | "MAP_BASED"
  | "GRAPH_BASED"
  | "TABLE_BASED"
  | "CODING"
  | "CODE_OUTPUT"
  | "PROOF"
  | "DERIVATION"
  | "EXPERIMENTAL"
  | "PRACTICAL"
  | "DESCRIPTIVE"
  | "DIFFERENTIATE"
  | "EXPLAIN"
  | "LIST"
  | "ORDERING"
  | "SEQUENCE"
  | "REARRANGEMENT"
  | "DICTIONARY"
  | "CLOZE"
  | "SUB_PART"
  | "OPEN_ENDED"
  | "DESIGN"
  | "APPLICATION"
  | "CRITICAL_THINKING"
  | "OTHER"
  | "NESTED"
  | string;

export type AIAttemptRuleType = "ALL" | "ANY_N" | "COMPULSORY_PLUS_OPTIONAL";

export interface AIAttemptRule {
  type: AIAttemptRuleType;
  count: number | null;
}

export interface AIQuestionChild {
  type: string;
  content: string;
  marks: number;
}

export interface AIQuestionGroup {
  name: string;
  type: AIQuestionType;
  questionCount: number;
  marksPerQuestion: number;
  attemptRule?: AIAttemptRule;
  children?: AIQuestionChild[];
}

export interface AISection {
  id: null;
  order: number;
  label: string;
  name: string;
  title: string;
  instructions: string;
  questionGroups: AIQuestionGroup[];
  questionTypes?: AIQuestionGroup[];
  totalQuestions?: number;
  totalAvailableMarks?: number;
  sectionMarks?: number;
}

export interface AIGenerateResponse {
  sections: AISection[];
}

export type AIGenerateStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "analyzing"
  | "building"
  | "done"
  | "error";

export interface AIGenerateError {
  type: "upload" | "extraction" | "analysis" | "validation" | "empty" | "network";
  message: string;
}
