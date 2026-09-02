// Objective answer evaluator. Handles deterministic scoring for all non-AI question
// types (MCQ, MSQ, true/false, fill-blank, matching, ordering, numerical) with
// configurable partial credit and negative marking.
import type {
  StudentAnswer,
  NormalizedAnswer,
  EvaluationResult,
  QuestionType,
} from "../types/quiz-answer.js";

/**
 * Option from quiz_problem_options table.
 */
export interface ProblemOption {
  id: number;
  problem_id: number;
  option_statement: string;
  option_description?: string;
  iscorrect: boolean;
  matching_target?: string;
}

/**
 * Problem metadata from quiz_problems table.
 */
export interface ProblemMeta {
  id: number;
  quiz_id: number;
  quiz_problem_type: number;
  marks?: number;
  negative_marks?: number;
}

/**
 * Deterministic evaluation result for objective questions.
 */
export interface ObjectiveEvaluationResult extends EvaluationResult {
  correctAnswer?: unknown;
}

/**
 * Evaluate a student's answer against the correct answer for objective question types.
 *
 * This function performs deterministic evaluation without AI.
 * It supports: MCQ, MSQ, TRUE_FALSE, NUMERICAL, FILL_BLANK, MATCHING, ORDERING.
 *
 * @param parsed - The validated student answer
 * @param options - The problem options from quiz_problem_options
 * @param problem - The problem metadata
 * @returns Evaluation result with score and correctness
 */
export function evaluateObjectiveAnswer(
  parsed: StudentAnswer,
  options: ProblemOption[],
  problem: ProblemMeta
): ObjectiveEvaluationResult {
  const maxScore = problem.marks ?? 1;
  const negativeMarks = problem.negative_marks ?? 0;

  switch (parsed.type) {
    case "MCQ":
      return evaluateMCQ(parsed, options, maxScore, negativeMarks);

    case "MSQ":
      return evaluateMSQ(parsed, options, maxScore, negativeMarks);

    case "TRUE_FALSE":
      return evaluateTrueFalse(parsed, options, maxScore, negativeMarks);

    case "NUMERICAL":
      return evaluateNumerical(parsed, options, maxScore, negativeMarks);

    case "FILL_BLANK":
      return evaluateFillBlank(parsed, options, maxScore, negativeMarks);

    case "MATCHING":
      return evaluateMatching(parsed, options, maxScore, negativeMarks);

    case "ORDERING":
      return evaluateOrdering(parsed, options, maxScore, negativeMarks);

    default:
      return {
        isCorrect: false,
        score: 0,
        maxScore,
        details: `Unsupported objective question type: ${parsed.type}`,
      };
  }
}

/**
 * Evaluate MCQ (single correct option).
 */
function evaluateMCQ(
  answer: Extract<StudentAnswer, { type: "MCQ" }>,
  options: ProblemOption[],
  maxScore: number,
  negativeMarks: number
): ObjectiveEvaluationResult {
  const selectedOption = options.find((o) => o.id === answer.selectedOptionId);

  if (!selectedOption) {
    return {
      isCorrect: false,
      score: -negativeMarks,
      maxScore,
      details: "Selected option not found",
      correctAnswer: options.find((o) => o.iscorrect)?.id,
    };
  }

  if (selectedOption.iscorrect) {
    return {
      isCorrect: true,
      score: maxScore,
      maxScore,
      correctAnswer: selectedOption.id,
    };
  }

  return {
    isCorrect: false,
    score: -negativeMarks,
    maxScore,
    details: "Incorrect option selected",
    correctAnswer: options.find((o) => o.iscorrect)?.id,
  };
}

/**
 * Evaluate MSQ (multiple correct options).
 * All correct options must be selected, no incorrect options.
 */
function evaluateMSQ(
  answer: Extract<StudentAnswer, { type: "MSQ" }>,
  options: ProblemOption[],
  maxScore: number,
  negativeMarks: number
): ObjectiveEvaluationResult {
  const correctOptionIds = options
    .filter((o) => o.iscorrect)
    .map((o) => o.id)
    .sort((a, b) => a - b);

  const selectedIds = [...answer.selectedOptionIds].sort((a, b) => a - b);

  // Check if all selected options are valid
  const allValid = selectedIds.every((id) =>
    options.some((o) => o.id === id)
  );
  if (!allValid) {
    return {
      isCorrect: false,
      score: -negativeMarks,
      maxScore,
      details: "One or more selected options are invalid",
      correctAnswer: correctOptionIds,
    };
  }

  // Check exact match
  const isExactMatch =
    selectedIds.length === correctOptionIds.length &&
    selectedIds.every((id, i) => id === correctOptionIds[i]);

  if (isExactMatch) {
    return {
      isCorrect: true,
      score: maxScore,
      maxScore,
      correctAnswer: correctOptionIds,
    };
  }

  // Partial credit: if all selected are correct but not all correct are selected
  const allSelectedAreCorrect = selectedIds.every((id) =>
    correctOptionIds.includes(id)
  );

  if (allSelectedAreCorrect && selectedIds.length < correctOptionIds.length) {
    // Partial credit: 50% of marks
    const partialScore = Math.floor(maxScore * 0.5);
    return {
      isCorrect: false,
      score: partialScore,
      maxScore,
      details: "Partial correct (missing some correct options)",
      correctAnswer: correctOptionIds,
    };
  }

  // Some incorrect options selected
  return {
    isCorrect: false,
    score: -negativeMarks,
    maxScore,
    details: "Incorrect options selected",
    correctAnswer: correctOptionIds,
  };
}

/**
 * Evaluate True/False question.
 * Uses the options to determine which is the correct boolean value.
 */
function evaluateTrueFalse(
  answer: Extract<StudentAnswer, { type: "TRUE_FALSE" }>,
  options: ProblemOption[],
  maxScore: number,
  negativeMarks: number
): ObjectiveEvaluationResult {
  // Find the correct option - it should be the one marked iscorrect=true
  const correctOption = options.find((o) => o.iscorrect);
  if (!correctOption) {
    return {
      isCorrect: false,
      score: 0,
      maxScore,
      details: "No correct answer defined",
    };
  }

  // Determine the expected boolean value from the option statement
  const expectedValue = parseTrueFalseValue(correctOption.option_statement);

  if (expectedValue === null) {
    return {
      isCorrect: false,
      score: 0,
      maxScore,
      details: "Cannot determine correct T/F value from options",
    };
  }

  if (answer.value === expectedValue) {
    return {
      isCorrect: true,
      score: maxScore,
      maxScore,
      correctAnswer: expectedValue,
    };
  }

  return {
    isCorrect: false,
    score: -negativeMarks,
    maxScore,
    details: "Incorrect boolean value",
    correctAnswer: expectedValue,
  };
}

/**
 * Parse a True/False value from an option statement string.
 */
function parseTrueFalseValue(statement: string): boolean | null {
  const normalized = statement.toLowerCase().trim();
  if (["true", "t", "yes", "1", "correct", "right"].includes(normalized)) {
    return true;
  }
  if (["false", "f", "no", "0", "incorrect", "wrong"].includes(normalized)) {
    return false;
  }
  return null;
}

/**
 * Evaluate Numerical answer.
 * Checks if the student's numeric value matches the correct answer.
 */
function evaluateNumerical(
  answer: Extract<StudentAnswer, { type: "NUMERICAL" }>,
  options: ProblemOption[],
  maxScore: number,
  negativeMarks: number
): ObjectiveEvaluationResult {
  const correctOption = options.find((o) => o.iscorrect);
  if (!correctOption) {
    return {
      isCorrect: false,
      score: 0,
      maxScore,
      details: "No correct answer defined",
    };
  }

  const expectedValue = parseFloat(correctOption.option_statement);
  if (isNaN(expectedValue)) {
    return {
      isCorrect: false,
      score: 0,
      maxScore,
      details: "Cannot parse correct numerical answer",
    };
  }

  // Allow small floating point tolerance
  const tolerance = 0.001;
  if (Math.abs(answer.value - expectedValue) <= tolerance) {
    return {
      isCorrect: true,
      score: maxScore,
      maxScore,
      correctAnswer: expectedValue,
    };
  }

  return {
    isCorrect: false,
    score: -negativeMarks,
    maxScore,
    details: `Expected ${expectedValue}, got ${answer.value}`,
    correctAnswer: expectedValue,
  };
}

/**
 * Evaluate Fill in the Blank answer.
 * Compares each blank value against expected values.
 */
function evaluateFillBlank(
  answer: Extract<StudentAnswer, { type: "FILL_BLANK" }>,
  options: ProblemOption[],
  maxScore: number,
  negativeMarks: number
): ObjectiveEvaluationResult {
  // For fill blanks, correct answers are stored in options with matching_target
  // or as separate options marked iscorrect=true
  const correctOptions = options.filter((o) => o.iscorrect);

  if (correctOptions.length === 0) {
    return {
      isCorrect: false,
      score: 0,
      maxScore,
      details: "No correct answers defined",
    };
  }

  // Normalize student answers
  const studentValues = answer.values.map((v) => v.toLowerCase().trim());

  // Get expected answers (from option_statement or matching_target)
  const expectedValues = correctOptions.map((o) =>
    (o.matching_target || o.option_statement).toLowerCase().trim()
  );

  // Check if all blanks match
  if (studentValues.length !== expectedValues.length) {
    return {
      isCorrect: false,
      score: -negativeMarks,
      maxScore,
      details: `Expected ${expectedValues.length} blanks, got ${studentValues.length}`,
      correctAnswer: expectedValues,
    };
  }

  let allMatch = true;
  for (let i = 0; i < studentValues.length; i++) {
    if (studentValues[i] !== expectedValues[i]) {
      allMatch = false;
      break;
    }
  }

  if (allMatch) {
    return {
      isCorrect: true,
      score: maxScore,
      maxScore,
      correctAnswer: expectedValues,
    };
  }

  // Partial credit for fill blanks
  let correctCount = 0;
  for (let i = 0; i < studentValues.length; i++) {
    if (studentValues[i] === expectedValues[i]) {
      correctCount++;
    }
  }

  const partialScore = Math.floor((correctCount / expectedValues.length) * maxScore);
  if (partialScore > 0) {
    return {
      isCorrect: false,
      score: partialScore,
      maxScore,
      details: `${correctCount}/${expectedValues.length} blanks correct`,
      correctAnswer: expectedValues,
    };
  }

  return {
    isCorrect: false,
    score: -negativeMarks,
    maxScore,
    details: "No blanks correct",
    correctAnswer: expectedValues,
  };
}

/**
 * Evaluate Matching question.
 * Compares pairs of leftId:rightId.
 */
function evaluateMatching(
  answer: Extract<StudentAnswer, { type: "MATCHING" }>,
  options: ProblemOption[],
  maxScore: number,
  negativeMarks: number
): ObjectiveEvaluationResult {
  // Correct matches are stored in options with matching_target
  // Each option represents a left item, matching_target is the right item
  const correctPairs = options
    .filter((o) => o.matching_target)
    .map((o) => ({
      leftId: o.id,
      rightId: parseInt(o.matching_target!, 10),
    }))
    .filter((p) => !isNaN(p.rightId));

  if (correctPairs.length === 0) {
    return {
      isCorrect: false,
      score: 0,
      maxScore,
      details: "No correct matching defined",
    };
  }

  // Normalize student answer
  const studentPairs = answer.matches
    .map((m) => `${m.leftId}:${m.rightId}`)
    .sort();
  const expectedPairs = correctPairs
    .map((p) => `${p.leftId}:${p.rightId}`)
    .sort();

  // Exact match
  if (
    studentPairs.length === expectedPairs.length &&
    studentPairs.every((p, i) => p === expectedPairs[i])
  ) {
    return {
      isCorrect: true,
      score: maxScore,
      maxScore,
      correctAnswer: correctPairs,
    };
  }

  // Partial credit
  let correctCount = 0;
  for (const pair of studentPairs) {
    if (expectedPairs.includes(pair)) {
      correctCount++;
    }
  }

  const partialScore = Math.floor(
    (correctCount / expectedPairs.length) * maxScore
  );

  return {
    isCorrect: false,
    score: Math.max(partialScore, -negativeMarks),
    maxScore,
    details: `${correctCount}/${expectedPairs.length} matches correct`,
    correctAnswer: correctPairs,
  };
}

/**
 * Evaluate Ordering question.
 * Compares the order of items.
 */
function evaluateOrdering(
  answer: Extract<StudentAnswer, { type: "ORDERING" }>,
  options: ProblemOption[],
  maxScore: number,
  negativeMarks: number
): ObjectiveEvaluationResult {
  // Correct order is stored as option IDs in order of question_number or option_statement
  // For now, assume the correct order is the options sorted by their ID
  const correctOrder = options.map((o) => o.id);

  if (correctOrder.length === 0) {
    return {
      isCorrect: false,
      score: 0,
      maxScore,
      details: "No correct order defined",
    };
  }

  // Compare orderings
  const isCorrectOrder =
    answer.orderedIds.length === correctOrder.length &&
    answer.orderedIds.every((id, i) => id === correctOrder[i]);

  if (isCorrectOrder) {
    return {
      isCorrect: true,
      score: maxScore,
      maxScore,
      correctAnswer: correctOrder,
    };
  }

  // Calculate partial credit based on correct positions
  let correctPositions = 0;
  for (let i = 0; i < Math.min(answer.orderedIds.length, correctOrder.length); i++) {
    if (answer.orderedIds[i] === correctOrder[i]) {
      correctPositions++;
    }
  }

  const partialScore = Math.floor(
    (correctPositions / correctOrder.length) * maxScore
  );

  return {
    isCorrect: false,
    score: Math.max(partialScore, -negativeMarks),
    maxScore,
    details: `${correctPositions}/${correctOrder.length} positions correct`,
    correctAnswer: correctOrder,
  };
}
