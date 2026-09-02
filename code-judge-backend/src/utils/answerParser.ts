// Centralized answer parser. Validates raw student answers against Zod schemas per
// question type, normalizes them into a canonical format, determines whether AI
// evaluation is needed, and provides question type utility functions.
import { z } from "zod";
import {
  StudentAnswerSchema,
  type StudentAnswer,
  type NormalizedAnswer,
  QuestionType,
  type ValidationError,
} from "../types/quiz-answer.js";

/**
 * Question type ID to display name mapping.
 */
const QUESTION_TYPE_NAMES: Record<number, string> = {
  [QuestionType.SINGLE_CHOICE]: "MCQ",
  [QuestionType.MULTIPLE_CHOICE]: "MSQ",
  [QuestionType.TRUE_FALSE]: "TRUE_FALSE",
  [QuestionType.TEXT]: "TEXT",
  [QuestionType.PARAGRAPH]: "PARAGRAPH",
  [QuestionType.FILL_BLANKS]: "FILL_BLANK",
  [QuestionType.TABLE_FILL]: "TABLE_FILL",
  [QuestionType.CODE_OUTPUT]: "CODE_OUTPUT",
  [QuestionType.MATH]: "MATH",
  [QuestionType.GRAPH]: "GRAPH",
  [QuestionType.FORMULA]: "FORMULA",
  [QuestionType.MATCHING]: "MATCHING",
  [QuestionType.ORDERING]: "ORDERING",
  [QuestionType.DRAG_DROP]: "DRAG_DROP",
  [QuestionType.CATEGORIZE]: "CATEGORIZE",
  [QuestionType.HOTSPOT]: "HOTSPOT",
  [QuestionType.IMAGE_LABEL]: "IMAGE_LABEL",
  [QuestionType.DRAWING]: "DRAWING",
  [QuestionType.VIDEO_RESPONSE]: "VIDEO_RESPONSE",
  [QuestionType.AUDIO_RESPONSE]: "AUDIO_RESPONSE",
  [QuestionType.POLL]: "POLL",
  [QuestionType.WORD_CLOUD]: "WORD_CLOUD",
};

/**
 * Question types that can be evaluated deterministically (no AI needed).
 */
const OBJECTIVE_QUESTION_TYPES = new Set([
  "MCQ",
  "MSQ",
  "TRUE_FALSE",
  "NUMERICAL",
  "FILL_BLANK",
  "MATCHING",
  "ORDERING",
  "TABLE_FILL",
]);

/**
 * Question types that require AI/subjective evaluation.
 */
const SUBJECTIVE_QUESTION_TYPES = new Set([
  "TEXT",
  "PARAGRAPH",
  "SUBJECTIVE",
  "CODE_OUTPUT",
  "MATH",
  "GRAPH",
  "FORMULA",
  "DRAWING",
  "VIDEO_RESPONSE",
  "AUDIO_RESPONSE",
]);

/**
 * Maps question type IDs from DB to the answer format type strings.
 */
function getAnswerTypeForQuestionType(
  questionTypeId: number
): string | null {
  const typeName = QUESTION_TYPE_NAMES[questionTypeId];
  if (!typeName) return null;

  // Some DB types map to different answer format types
  const mapping: Record<string, string> = {
    MCQ: "MCQ",
    MSQ: "MSQ",
    TRUE_FALSE: "TRUE_FALSE",
    TEXT: "TEXT",
    PARAGRAPH: "PARAGRAPH",
    FILL_BLANK: "FILL_BLANK",
    TABLE_FILL: "TABLE_FILL",
    CODE_OUTPUT: "CODE_OUTPUT",
    MATH: "MATH",
    GRAPH: "GRAPH",
    FORMULA: "FORMULA",
    MATCHING: "MATCHING",
    ORDERING: "ORDERING",
    DRAG_DROP: "DRAG_DROP",
    CATEGORIZE: "CATEGORIZE",
    HOTSPOT: "HOTSPOT",
    IMAGE_LABEL: "IMAGE_LABEL",
    DRAWING: "DRAWING",
    VIDEO_RESPONSE: "VIDEO_RESPONSE",
    AUDIO_RESPONSE: "AUDIO_RESPONSE",
    POLL: "POLL",
    WORD_CLOUD: "WORD_CLOUD",
  };

  return mapping[typeName] || null;
}

/**
 * Parse and validate a raw JSONB answer against the expected question type.
 *
 * This function:
 * 1. Reads the question/problem type.
 * 2. Validates that the JSON structure matches the expected structure for that type.
 * 3. Normalizes the answer into a predictable internal representation.
 * 4. Returns the normalized answer or validation errors.
 * 5. Never crashes because of malformed JSON.
 *
 * @param questionTypeId - The numeric question type ID from quiz_problem_type
 * @param rawAnswer - The raw JSONB value from the database
 * @returns Parsed result with either the student answer or validation errors
 */
export function parseStudentAnswer(
  questionTypeId: number,
  rawAnswer: unknown
): {
  success: true;
  parsed: StudentAnswer;
  normalized: NormalizedAnswer;
} | {
  success: false;
  errors: ValidationError[];
} {
  // Handle null/undefined answers
  if (rawAnswer === null || rawAnswer === undefined) {
    return {
      success: false,
      errors: [{ field: "answer", message: "Answer is required" }],
    };
  }

  // Get expected answer type for this question type
  const expectedType = getAnswerTypeForQuestionType(questionTypeId);
  if (!expectedType) {
    return {
      success: false,
      errors: [
        {
          field: "questionType",
          message: `Unknown question type ID: ${questionTypeId}`,
        },
      ],
    };
  }

  // If rawAnswer is a string, try to parse it as JSON
  let answerData = rawAnswer;
  if (typeof rawAnswer === "string") {
    try {
      answerData = JSON.parse(rawAnswer);
    } catch {
      // If it's a plain string and we expect TEXT/PARAGRAPH/SUBJECTIVE,
      // wrap it in the expected format
      if (
        expectedType === "TEXT" ||
        expectedType === "PARAGRAPH" ||
        expectedType === "SUBJECTIVE"
      ) {
        answerData = { type: expectedType, text: rawAnswer };
      } else if (expectedType === "MCQ" || expectedType === "POLL") {
        // Legacy: plain option ID string → MCQ format
        const numId = Number(rawAnswer);
        if (!isNaN(numId) && numId > 0) {
          answerData = { type: "MCQ", selectedOptionId: numId };
        } else {
          return {
            success: false,
            errors: [
              {
                field: "answer",
                message: `Invalid answer format for ${expectedType}. Expected a numeric option ID.`,
              },
            ],
          };
        }
      } else {
        return {
          success: false,
          errors: [
            {
              field: "answer",
              message: `Invalid JSON in answer field: ${rawAnswer}`,
            },
          ],
        };
      }
    }
  }

  // If it's a number (legacy option ID), convert to MCQ format
  if (typeof answerData === "number" || typeof answerData === "string") {
    const numId = Number(answerData);
    if (!isNaN(numId) && numId > 0) {
      if (expectedType === "MCQ" || expectedType === "POLL") {
        answerData = { type: "MCQ", selectedOptionId: numId };
      } else if (expectedType === "TRUE_FALSE") {
        answerData = { type: "TRUE_FALSE", value: Boolean(numId) };
      } else if (expectedType === "NUMERICAL") {
        answerData = { type: "NUMERICAL", value: numId };
      } else if (
        expectedType === "TEXT" ||
        expectedType === "PARAGRAPH" ||
        expectedType === "SUBJECTIVE"
      ) {
        answerData = { type: expectedType, text: String(answerData) };
      }
    }
  }

  // Ensure the type field matches the expected type
  if (
    typeof answerData === "object" &&
    answerData !== null &&
    "type" in answerData
  ) {
    if ((answerData as any).type !== expectedType) {
      return {
        success: false,
        errors: [
          {
            field: "type",
            message: `Expected answer type "${expectedType}" for question type ID ${questionTypeId}, got "${(answerData as any).type}"`,
          },
        ],
      };
    }
  }

  // Validate with Zod schema
  const result = StudentAnswerSchema.safeParse(answerData);
  if (!result.success) {
    const errors: ValidationError[] = result.error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return { success: false, errors };
  }

  // Normalize the answer
  const normalized = normalizeAnswer(result.data);

  return { success: true, parsed: result.data, normalized };
}

/**
 * Normalize a validated StudentAnswer into a predictable internal representation.
 */
function normalizeAnswer(answer: StudentAnswer): NormalizedAnswer {
  switch (answer.type) {
    case "MCQ":
      return {
        questionType: "MCQ",
        answer: answer.selectedOptionId,
      };

    case "MSQ":
      return {
        questionType: "MSQ",
        answer: [...answer.selectedOptionIds].sort((a, b) => a - b),
      };

    case "TRUE_FALSE":
      return {
        questionType: "TRUE_FALSE",
        answer: answer.value,
      };

    case "NUMERICAL":
      return {
        questionType: "NUMERICAL",
        answer: answer.value,
      };

    case "FILL_BLANK":
      return {
        questionType: "FILL_BLANK",
        answer: answer.values.map((v) => v.toLowerCase().trim()),
      };

    case "MATCHING":
      return {
        questionType: "MATCHING",
        answer: answer.matches
          .map((m) => `${m.leftId}:${m.rightId}`)
          .sort(),
      };

    case "ORDERING":
      return {
        questionType: "ORDERING",
        answer: [...answer.orderedIds],
      };

    case "CODING":
      return {
        questionType: "CODING",
        answer: `${answer.language}::${answer.code}`,
      };

    case "SUBJECTIVE":
    case "TEXT":
    case "PARAGRAPH":
      return {
        questionType: answer.type,
        answer: answer.text.trim(),
      };

    case "TABLE_FILL":
      return {
        questionType: "TABLE_FILL",
        answer: JSON.stringify(answer.cells),
      };

    case "CODE_OUTPUT":
      return {
        questionType: "CODE_OUTPUT",
        answer: answer.output.trim(),
      };

    case "MATH":
    case "FORMULA":
      return {
        questionType: answer.type,
        answer: answer.expression.trim(),
      };

    case "GRAPH":
      return {
        questionType: "GRAPH",
        answer: JSON.stringify(answer.points),
      };

    case "DRAG_DROP":
      return {
        questionType: "DRAG_DROP",
        answer: answer.placements
          .map((p) => `${p.itemId}:${p.zoneId}`)
          .sort(),
      };

    case "CATEGORIZE":
      return {
        questionType: "CATEGORIZE",
        answer: answer.placements
          .map((p) => `${p.itemId}:${p.categoryId}`)
          .sort(),
      };

    case "HOTSPOT":
      return {
        questionType: "HOTSPOT",
        answer: `${answer.x},${answer.y}`,
      };

    case "IMAGE_LABEL":
      return {
        questionType: "IMAGE_LABEL",
        answer: JSON.stringify(answer.labels),
      };

    case "DRAWING":
      return {
        questionType: "DRAWING",
        answer: answer.dataUrl,
      };

    case "VIDEO_RESPONSE":
      return {
        questionType: "VIDEO_RESPONSE",
        answer: answer.videoUrl,
      };

    case "AUDIO_RESPONSE":
      return {
        questionType: "AUDIO_RESPONSE",
        answer: answer.audioUrl,
      };

    case "POLL":
      return {
        questionType: "POLL",
        answer: answer.selectedOptionId,
      };

    case "WORD_CLOUD":
      return {
        questionType: "WORD_CLOUD",
        answer: answer.words.map((w) => w.toLowerCase().trim()),
      };

    default:
      return {
        questionType: "UNKNOWN",
        answer: null,
      };
  }
}

/**
 * Check if a question type requires AI evaluation.
 */
export function requiresAIEvaluation(questionTypeId: number): boolean {
  const typeName = QUESTION_TYPE_NAMES[questionTypeId];
  if (!typeName) return false;
  return SUBJECTIVE_QUESTION_TYPES.has(typeName);
}

/**
 * Check if a question type can be evaluated deterministically.
 */
export function isObjectiveQuestion(questionTypeId: number): boolean {
  const typeName = QUESTION_TYPE_NAMES[questionTypeId];
  if (!typeName) return false;
  return OBJECTIVE_QUESTION_TYPES.has(typeName);
}

/**
 * Get the display name for a question type ID.
 */
export function getQuestionTypeName(questionTypeId: number): string {
  return QUESTION_TYPE_NAMES[questionTypeId] || `UNKNOWN_${questionTypeId}`;
}
