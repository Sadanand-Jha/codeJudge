export type QuestionType =
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
  | "NESTED";

export type AttemptRuleType = "all" | "any_n" | "compulsory_plus_optional";

/** One row in the nested type config: "3 × MCQ_SINGLE" */
export interface NestedTypeConfigItem {
  id: string;
  type: QuestionType;
  count: number;
  marksPerQuestion: number;
}

/** A sub-question inside a NESTED question group */
export interface SubQuestion {
  id: string;
  label: string;
  type: QuestionType;
  category: "objective" | "subjective" | "composite" | "technical" | "structural" | "other";
  content: string;
  marks: number;
  options?: Array<{ id: string; label: string; content: string; isCorrect: boolean }>;
  correctAnswer?: string | number | number[];
}

export interface QuestionGroup {
  id: string;
  name: string;
  type: QuestionType;
  category: "objective" | "subjective" | "composite" | "technical" | "structural" | "other";
  questionCount: number;
  marksPerQuestion: number;
  attemptRule: AttemptRuleType;
  attemptCount: number;
  /** Only used when type === "NESTED" — the sub-questions inside */
  children?: SubQuestion[];
  /** Config rows that define the nested structure */
  nestedConfig?: NestedTypeConfigItem[];
}

export interface Section {
  id: string;
  name: string;
  title: string;
  instructions: string;
  questionGroups: QuestionGroup[];
  negativeMarking: boolean;
  negativeMarks: number;
  partialMarking: boolean;
}

export const QUESTION_TYPES: { id: QuestionType; label: string; category: "objective" | "subjective" | "composite" | "technical" | "structural" | "other" }[] = [
  { id: "MCQ_SINGLE", label: "MCQ (Single)", category: "objective" },
  { id: "MCQ_MULTIPLE", label: "MCQ (Multiple)", category: "objective" },
  { id: "TRUE_FALSE", label: "True / False", category: "objective" },
  { id: "FILL_IN_THE_BLANK", label: "Fill in the Blank", category: "subjective" },
  { id: "ONE_WORD", label: "One Word", category: "subjective" },
  { id: "SHORT_ANSWER", label: "Short Answer", category: "subjective" },
  { id: "LONG_ANSWER", label: "Long Answer", category: "subjective" },
  { id: "VERY_SHORT_ANSWER", label: "Very Short Answer", category: "subjective" },
  { id: "NUMERICAL", label: "Numerical", category: "objective" },
  { id: "ASSERTION_REASON", label: "Assertion & Reason", category: "objective" },
  { id: "MATCHING", label: "Matching", category: "objective" },
  { id: "CASE_BASED", label: "Case Based", category: "composite" },
  { id: "PASSAGE_BASED", label: "Passage Based", category: "composite" },
  { id: "SOURCE_BASED", label: "Source Based", category: "composite" },
  { id: "DIAGRAM_BASED", label: "Diagram Based", category: "composite" },
  { id: "IMAGE_BASED", label: "Image Based", category: "composite" },
  { id: "MAP_BASED", label: "Map Based", category: "composite" },
  { id: "GRAPH_BASED", label: "Graph Based", category: "composite" },
  { id: "TABLE_BASED", label: "Table Based", category: "composite" },
  { id: "CODING", label: "Coding", category: "technical" },
  { id: "CODE_OUTPUT", label: "Code Output", category: "technical" },
  { id: "PROOF", label: "Proof", category: "subjective" },
  { id: "DERIVATION", label: "Derivation", category: "subjective" },
  { id: "EXPERIMENTAL", label: "Experimental", category: "subjective" },
  { id: "PRACTICAL", label: "Practical", category: "subjective" },
  { id: "DESCRIPTIVE", label: "Descriptive", category: "subjective" },
  { id: "DIFFERENTIATE", label: "Differentiate", category: "subjective" },
  { id: "EXPLAIN", label: "Explain", category: "subjective" },
  { id: "LIST", label: "List", category: "subjective" },
  { id: "ORDERING", label: "Ordering", category: "objective" },
  { id: "SEQUENCE", label: "Sequence", category: "objective" },
  { id: "REARRANGEMENT", label: "Rearrangement", category: "objective" },
  { id: "DICTIONARY", label: "Dictionary", category: "objective" },
  { id: "CLOZE", label: "Cloze", category: "composite" },
  { id: "SUB_PART", label: "Sub Part", category: "structural" },
  { id: "OPEN_ENDED", label: "Open Ended", category: "subjective" },
  { id: "DESIGN", label: "Design", category: "subjective" },
  { id: "APPLICATION", label: "Application", category: "subjective" },
  { id: "CRITICAL_THINKING", label: "Critical Thinking", category: "subjective" },
  { id: "OTHER", label: "Other", category: "other" },
  { id: "NESTED", label: "Nested", category: "other" },
];

export function createDefaultSection(index: number): Section {
  return {
    id: `sec_${Date.now()}_${index}`,
    name: `Section ${String.fromCharCode(65 + index)}`,
    title: "",
    instructions: "",
    questionGroups: [],
    negativeMarking: false,
    negativeMarks: 0,
    partialMarking: false,
  };
}

export function createDefaultQuestionGroup(): QuestionGroup {
  return {
    id: `qg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    type: "MCQ_SINGLE",
    category: "objective",
    questionCount: 5,
    marksPerQuestion: 1,
    attemptRule: "all",
    attemptCount: 0,
  };
}

export function createDefaultSubQuestion(parentIndex: number, childIndex: number): SubQuestion {
  const id = `sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    label: `${parentIndex + 1}(${String.fromCharCode(97 + childIndex)})`,
    type: "MCQ_SINGLE",
    category: "objective",
    content: "",
    marks: 1,
    options: [
      { id: `${id}_a`, label: "A", content: "", isCorrect: false },
      { id: `${id}_b`, label: "B", content: "", isCorrect: false },
      { id: `${id}_c`, label: "C", content: "", isCorrect: false },
      { id: `${id}_d`, label: "D", content: "", isCorrect: false },
    ],
    correctAnswer: undefined,
  };
}

function createSubQuestionForType(
  type: QuestionType,
  parentIndex: number,
  childIndex: number,
  marks: number
): SubQuestion {
  const id = `sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const meta = QUESTION_TYPES.find((qt) => qt.id === type);
  const isChoice = type === "MCQ_SINGLE" || type === "MCQ_MULTIPLE" || type === "TRUE_FALSE";

  const base: SubQuestion = {
    id,
    label: `${parentIndex + 1}(${String.fromCharCode(97 + childIndex)})`,
    type,
    category: meta?.category || "other",
    content: "",
    marks,
  };

  if (type === "MCQ_SINGLE" || type === "MCQ_MULTIPLE") {
    base.options = [
      { id: `${id}_a`, label: "A", content: "", isCorrect: false },
      { id: `${id}_b`, label: "B", content: "", isCorrect: false },
      { id: `${id}_c`, label: "C", content: "", isCorrect: false },
      { id: `${id}_d`, label: "D", content: "", isCorrect: false },
    ];
  } else if (type === "TRUE_FALSE") {
    base.options = [
      { id: `${id}_true`, label: "A", content: "True", isCorrect: true },
      { id: `${id}_false`, label: "B", content: "False", isCorrect: false },
    ];
  }

  return base;
}

export function createDefaultNestedConfig(): NestedTypeConfigItem {
  return {
    id: `nc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: "MCQ_SINGLE",
    count: 1,
    marksPerQuestion: 1,
  };
}

/** Generate children array from nested config items */
export function generateChildrenFromConfig(
  config: NestedTypeConfigItem[],
  parentIndex: number
): SubQuestion[] {
  const children: SubQuestion[] = [];
  let childIdx = 0;
  for (const item of config) {
    for (let i = 0; i < item.count; i++) {
      children.push(createSubQuestionForType(item.type, parentIndex, childIdx, item.marksPerQuestion));
      childIdx++;
    }
  }
  return relabelSubQuestions(children, parentIndex);
}

/** Regenerate labels for sub-questions based on their index */
export function relabelSubQuestions(children: SubQuestion[], parentIndex: number): SubQuestion[] {
  return children.map((child, i) => ({
    ...child,
    label: `${parentIndex + 1}(${String.fromCharCode(97 + i)})`,
  }));
}

/** Total questions across all groups in a section */
export function getSectionQuestionCount(section: Section): number {
  return section.questionGroups.reduce((sum, g) => {
    if (g.type === "NESTED" && g.children) return sum + g.children.length;
    return sum + g.questionCount;
  }, 0);
}

/** Total available marks (questionCount × marksPerQuestion for each group) */
export function getSectionAvailableMarks(section: Section): number {
  return section.questionGroups.reduce((sum, g) => {
    if (g.type === "NESTED" && g.children) {
      return sum + g.children.reduce((cs, child) => cs + child.marks, 0);
    }
    return sum + g.questionCount * g.marksPerQuestion;
  }, 0);
}

/** Marks the student can actually obtain after applying attempt rules */
export function getSectionMarks(section: Section): number {
  return section.questionGroups.reduce((sum, g) => {
    if (g.type === "NESTED" && g.children) {
      return sum + g.children.reduce((cs, child) => cs + child.marks, 0);
    }
    const available = g.questionCount * g.marksPerQuestion;
    if (g.attemptRule === "all" || g.attemptCount <= 0) return sum + available;
    const effective = Math.min(g.attemptCount, g.questionCount);
    return sum + effective * g.marksPerQuestion;
  }, 0);
}

/** Total available marks across multiple sections */
export function getTotalAvailableMarks(sections: Section[]): number {
  return sections.reduce((sum, s) => sum + getSectionAvailableMarks(s), 0);
}

/** Total obtainable marks across multiple sections */
export function getTotalMarks(sections: Section[]): number {
  return sections.reduce((sum, s) => sum + getSectionMarks(s), 0);
}

/** Total questions across multiple sections */
export function getTotalQuestionCount(sections: Section[]): number {
  return sections.reduce((sum, s) => sum + getSectionQuestionCount(s), 0);
}
