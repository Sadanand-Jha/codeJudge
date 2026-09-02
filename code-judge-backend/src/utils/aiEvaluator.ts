// AI-based subjective answer evaluator. Sends the student's answer + question context
// to the LLM, parses the scored evaluation response, and returns structured evaluation
// results with score and feedback.
import { chatWithAI } from "../services/ai.service.js";
import type {
  StudentAnswer,
  EvaluationResult,
  NormalizedAnswer,
} from "../types/quiz-answer.js";

/**
 * Context for AI evaluation of a subjective question.
 */
export interface AIEvaluationContext {
  questionType: string;
  questionStatement: string;
  questionDescription?: string;
  evaluationCriteria?: string;
  referenceNotes?: string;
  maxScore: number;
  studentAnswer: string;
  correctAnswer?: string;
}

/**
 * Result from AI evaluation.
 */
export interface AIEvaluationResult extends EvaluationResult {
  feedback?: string;
  rubric?: string;
}

/**
 * Evaluate a subjective answer using AI.
 *
 * This function:
 * 1. Prepares a normalized representation for the LLM.
 * 2. Constructs a prompt with evaluation criteria.
 * 3. Calls the AI service for evaluation.
 * 4. Parses the AI response into a structured evaluation result.
 * 5. Never crashes - returns a fallback result on error.
 *
 * @param context - The evaluation context with question and answer details
 * @returns Evaluation result with score and feedback
 */
export async function evaluateSubjectiveAnswer(
  context: AIEvaluationContext
): Promise<AIEvaluationResult> {
  const maxScore = context.maxScore;

  try {
    const prompt = buildEvaluationPrompt(context);
    const response = await chatWithAI(prompt);

    if (!response.content) {
      return {
        isCorrect: false,
        score: 0,
        maxScore,
        details: "AI evaluation returned empty response",
      };
    }

    const parsed = parseAIEvaluationResponse(response.content, maxScore);

    return {
      isCorrect: parsed.score > maxScore * 0.5,
      score: Math.min(parsed.score, maxScore),
      maxScore,
      details: parsed.feedback,
      feedback: parsed.feedback,
      rubric: parsed.rubric,
    };
  } catch (error) {
    console.error("AI evaluation failed:", error);
    return {
      isCorrect: false,
      score: 0,
      maxScore,
      details: `AI evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Build an evaluation prompt for the AI.
 */
function buildEvaluationPrompt(context: AIEvaluationContext): string {
  const parts: string[] = [
    "You are an expert exam evaluator. Evaluate the student's answer based on the given criteria.",
    "",
    "## Question",
    context.questionStatement,
  ];

  if (context.questionDescription) {
    parts.push("", "## Additional Context", context.questionDescription);
  }

  if (context.correctAnswer) {
    parts.push("", "## Reference/Model Answer", context.correctAnswer);
  }

  if (context.evaluationCriteria) {
    parts.push("", "## Evaluation Criteria", context.evaluationCriteria);
  } else {
    parts.push(
      "",
      "## Evaluation Criteria",
      "Evaluate based on: correctness, completeness, clarity, and relevance."
    );
  }

  if (context.referenceNotes) {
    parts.push("", "## Reference Notes", context.referenceNotes);
  }

  parts.push(
    "",
    "## Student's Answer",
    context.studentAnswer,
    "",
    "## Instructions",
    `Score the student's answer from 0 to ${context.maxScore} points.`,
    "Provide your evaluation as JSON with the following structure:",
    '```json',
    `{`,
    `  "score": <number>,`,
    `  "feedback": "<brief explanation of the score>"`,
    `}`,
    '```',
    "",
    "Be fair and consistent in your evaluation.",
    "Consider partial credit where appropriate.",
    "Return ONLY the JSON object, no other text."
  );

  return parts.join("\n");
}

/**
 * Parse the AI evaluation response into a structured result.
 */
function parseAIEvaluationResponse(
  response: string,
  maxScore: number
): { score: number; feedback?: string; rubric?: string } {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        score: 0,
        feedback: "Could not parse AI response",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const score = typeof parsed.score === "number" ? parsed.score : 0;
    const feedback =
      typeof parsed.feedback === "string" ? parsed.feedback : undefined;
    const rubric =
      typeof parsed.rubric === "string" ? parsed.rubric : undefined;

    return {
      score: Math.max(0, Math.min(score, maxScore)),
      feedback,
      rubric,
    };
  } catch {
    // If JSON parsing fails, try to extract a numeric score
    const scoreMatch = response.match(/score[:\s]*(\d+)/i);
    if (scoreMatch) {
      return {
        score: Math.max(0, Math.min(parseInt(scoreMatch[1]), maxScore)),
        feedback: response,
      };
    }

    return {
      score: 0,
      feedback: "Failed to parse AI evaluation response",
    };
  }
}

/**
 * Prepare a normalized representation for AI evaluation.
 *
 * This transforms the raw answer into a clean format that the LLM
 * can easily understand and evaluate.
 */
export function prepareForAIEvaluation(
  normalized: NormalizedAnswer,
  questionStatement: string
): string {
  return JSON.stringify(
    {
      question_type: normalized.questionType,
      question: questionStatement,
      student_answer: normalized.answer,
    },
    null,
    2
  );
}
