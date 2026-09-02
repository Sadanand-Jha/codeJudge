// ============================================
// Answer Types
// ============================================
export {
  QuestionType,
  StudentAnswerSchema,
  type StudentAnswer,
  type NormalizedAnswer,
  type EvaluationResult,
  type ValidationError,
  type QuestionTypeId,
} from "./types/quiz-answer.js";

// ============================================
// Answer Parser
// ============================================
export {
  parseStudentAnswer,
  requiresAIEvaluation,
  isObjectiveQuestion,
  getQuestionTypeName,
} from "./utils/answerParser.js";

// ============================================
// Objective Answer Evaluator
// ============================================
export {
  evaluateObjectiveAnswer,
  type ProblemOption,
  type ProblemMeta,
  type ObjectiveEvaluationResult,
} from "./utils/answerEvaluator.js";

// ============================================
// AI Answer Evaluator
// ============================================
export {
  evaluateSubjectiveAnswer,
  prepareForAIEvaluation,
  type AIEvaluationContext,
  type AIEvaluationResult,
} from "./utils/aiEvaluator.js";
