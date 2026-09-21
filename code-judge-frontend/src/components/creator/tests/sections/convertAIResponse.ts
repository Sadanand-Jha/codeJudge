import type {
  AIGenerateResponse,
  AIQuestionGroup,
  AIAttemptRule,
  AIQuestionChild,
} from "./aiTypes";
import type { Section, QuestionType, QuestionGroup, AttemptRuleType, SubQuestion, NestedTypeConfigItem } from "./types";

/* ------------------------------------------------------------------ */
/*  Question type normalization                                        */
/* ------------------------------------------------------------------ */

const AI_TO_APP: Record<string, QuestionType> = {
  MCQ: "MCQ_SINGLE",
  MCQ_SINGLE: "MCQ_SINGLE",
  MCQ_MULTIPLE: "MCQ_MULTIPLE",
  MULTIPLE_SELECT: "MCQ_MULTIPLE",
  TRUE_FALSE: "TRUE_FALSE",
  FILL_IN_THE_BLANK: "FILL_IN_THE_BLANK",
  FILL_BLANKS: "FILL_IN_THE_BLANK",
  FILL_IN_THE_BLANKS: "FILL_IN_THE_BLANK",
  ONE_WORD: "ONE_WORD",
  SHORT_ANSWER: "SHORT_ANSWER",
  LONG_ANSWER: "LONG_ANSWER",
  VERY_SHORT_ANSWER: "VERY_SHORT_ANSWER",
  NUMERICAL: "NUMERICAL",
  ASSERTION_REASON: "ASSERTION_REASON",
  MATCHING: "MATCHING",
  MATCH_FOLLOWING: "MATCHING",
  CASE_BASED: "CASE_BASED",
  PASSAGE_BASED: "PASSAGE_BASED",
  SOURCE_BASED: "SOURCE_BASED",
  DIAGRAM_BASED: "DIAGRAM_BASED",
  IMAGE_BASED: "IMAGE_BASED",
  MAP_BASED: "MAP_BASED",
  GRAPH_BASED: "GRAPH_BASED",
  TABLE_BASED: "TABLE_BASED",
  CODING: "CODING",
  CODE_OUTPUT: "CODE_OUTPUT",
  PROOF: "PROOF",
  DERIVATION: "DERIVATION",
  EXPERIMENTAL: "EXPERIMENTAL",
  PRACTICAL: "PRACTICAL",
  DESCRIPTIVE: "DESCRIPTIVE",
  DIFFERENTIATE: "DIFFERENTIATE",
  EXPLAIN: "EXPLAIN",
  LIST: "LIST",
  ORDERING: "ORDERING",
  SEQUENCE: "SEQUENCE",
  REARRANGEMENT: "REARRANGEMENT",
  DICTIONARY: "DICTIONARY",
  CLOZE: "CLOZE",
  SUB_PART: "SUB_PART",
  OPEN_ENDED: "OPEN_ENDED",
  DESIGN: "DESIGN",
  APPLICATION: "APPLICATION",
  CRITICAL_THINKING: "CRITICAL_THINKING",
  ESSAY: "DESCRIPTIVE",
  OTHER: "OTHER",
  NESTED: "NESTED",
};

const LABEL_MAP: Record<string, QuestionType> = {
  "multiple choice questions": "MCQ_SINGLE",
  "multiple choice question": "MCQ_SINGLE",
  "single choice": "MCQ_SINGLE",
  "objective type": "MCQ_SINGLE",
  "objective": "MCQ_SINGLE",
  "mcq": "MCQ_SINGLE",
  "msq": "MCQ_MULTIPLE",
  "multiple select": "MCQ_MULTIPLE",
  "true or false": "TRUE_FALSE",
  "true/false": "TRUE_FALSE",
  "boolean": "TRUE_FALSE",
  "fill in the blanks": "FILL_IN_THE_BLANK",
  "fill blanks": "FILL_IN_THE_BLANK",
  "one word": "ONE_WORD",
  "short answer": "SHORT_ANSWER",
  "saq": "SHORT_ANSWER",
  "very short answer": "VERY_SHORT_ANSWER",
  "vsaq": "VERY_SHORT_ANSWER",
  "long answer": "LONG_ANSWER",
  "laq": "LONG_ANSWER",
  "numerical": "NUMERICAL",
  "assertion reason": "ASSERTION_REASON",
  "matching": "MATCHING",
  "match the following": "MATCHING",
  "case based": "CASE_BASED",
  "passage based": "PASSAGE_BASED",
  "source based": "SOURCE_BASED",
  "diagram based": "DIAGRAM_BASED",
  "image based": "IMAGE_BASED",
  "map based": "MAP_BASED",
  "graph based": "GRAPH_BASED",
  "table based": "TABLE_BASED",
  "coding": "CODING",
  "code output": "CODE_OUTPUT",
  "descriptive": "DESCRIPTIVE",
  "essay": "DESCRIPTIVE",
  "explain": "EXPLAIN",
  "list": "LIST",
  "ordering": "ORDERING",
  "sequence": "SEQUENCE",
  "open ended": "OPEN_ENDED",
  "application": "APPLICATION",
  "critical thinking": "CRITICAL_THINKING",
  "nested": "NESTED",
};

function normalizeQuestionType(raw: string): QuestionType {
  const upper = raw.toUpperCase().trim().replace(/[\s-]+/g, "_");
  if (AI_TO_APP[upper]) return AI_TO_APP[upper];
  const lower = raw.toLowerCase().trim();
  if (LABEL_MAP[lower]) return LABEL_MAP[lower];
  for (const [key, value] of Object.entries(LABEL_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  return "OTHER";
}

const OBJECTIVE_TYPES: Set<string> = new Set([
  "MCQ_SINGLE", "MCQ_MULTIPLE", "TRUE_FALSE", "NUMERICAL",
  "ASSERTION_REASON", "MATCHING", "ORDERING", "SEQUENCE",
  "REARRANGEMENT", "DICTIONARY", "FILL_IN_THE_BLANK",
]);

function isObjective(t: QuestionType): boolean {
  return OBJECTIVE_TYPES.has(t);
}

/* ------------------------------------------------------------------ */
/*  Attempt rule normalization                                         */
/* ------------------------------------------------------------------ */

function normalizeAttemptRule(rule?: AIAttemptRule): {
  attemptRule: AttemptRuleType;
  attemptCount: number;
} {
  if (!rule) return { attemptRule: "all", attemptCount: 0 };
  if (rule.type === "ANY_N") {
    return { attemptRule: "any_n", attemptCount: rule.count ?? 0 };
  }
  if (rule.type === "COMPULSORY_PLUS_OPTIONAL") {
    return { attemptRule: "compulsory_plus_optional", attemptCount: rule.count ?? 0 };
  }
  return { attemptRule: "all", attemptCount: 0 };
}

/* ------------------------------------------------------------------ */
/*  Main conversion                                                    */
/* ------------------------------------------------------------------ */

export function convertAIResponseToSections(
  response: AIGenerateResponse
): Section[] {
  if (!response.sections || !Array.isArray(response.sections)) return [];

  return response.sections.map((aiSection, idx) => {
    const rawGroups = aiSection.questionGroups || (aiSection as any).questionTypes || [];

    const questionGroups: QuestionGroup[] = rawGroups
      .filter((g: AIQuestionGroup) => g.questionCount > 0 || g.type === "NESTED")
      .map((g: AIQuestionGroup): QuestionGroup => {
        const normalizedType = normalizeQuestionType(g.type);
        const { attemptRule, attemptCount } = normalizeAttemptRule(g.attemptRule);
        const isNested = normalizedType === "NESTED";

        const children: SubQuestion[] | undefined = isNested && Array.isArray((g as any).children)
          ? (g as any).children.map((c: AIQuestionChild, ci: number) => ({
              id: `sq_ai_${Date.now()}_${idx}_${ci}`,
              label: `1(${String.fromCharCode(97 + ci)})`,
              type: normalizeQuestionType(c.type || "OTHER"),
              category: isObjective(normalizeQuestionType(c.type || "OTHER")) ? "objective" : "subjective",
              content: c.content || "",
              marks: c.marks || 1,
            }))
          : undefined;

        // Build nestedConfig from AI children so the config panel is pre-populated
        let nestedConfig: NestedTypeConfigItem[] | undefined;
        if (isNested && children && children.length > 0) {
          const configMap = new Map<string, { type: QuestionType; count: number; totalMarks: number }>();
          for (const child of children) {
            const existing = configMap.get(child.type);
            if (existing) {
              existing.count++;
              existing.totalMarks += child.marks;
            } else {
              configMap.set(child.type, { type: child.type, count: 1, totalMarks: child.marks });
            }
          }
          nestedConfig = Array.from(configMap.values()).map((entry) => ({
            id: `nc_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: entry.type,
            count: entry.count,
            marksPerQuestion: entry.totalMarks / entry.count,
          }));
        }

        const questionCount = isNested && children ? children.length : Math.max(0, Math.round(g.questionCount));
        const marksPerQuestion = isNested ? 0 : Math.max(0, g.marksPerQuestion);

        return {
          id: `qg_ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          name: g.name || g.type,
          type: normalizedType,
          category: isNested ? "other" : isObjective(normalizedType) ? "objective" : "subjective",
          questionCount,
          marksPerQuestion,
          attemptRule,
          attemptCount,
          children,
          nestedConfig,
        };
      });

    return {
      id: `sec_ai_${Date.now()}_${idx}`,
      name: aiSection.name || `Section ${String.fromCharCode(65 + idx)}`,
      title: aiSection.title || "",
      instructions: aiSection.instructions || "",
      questionGroups,
      negativeMarking: false,
      negativeMarks: 0,
      partialMarking: false,
    };
  });
}
