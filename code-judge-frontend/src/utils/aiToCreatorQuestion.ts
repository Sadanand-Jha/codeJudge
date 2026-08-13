import type { AIQuestionPreview } from "@/services/ai";
import {
  createDefaultQuestion,
  type BloomLevel,
  type CreatorQuestion,
  type CreatorQuestionType,
} from "@/components/quiz/creator/types";

/**
 * Map an AI Question type to the quiz creator's native question type.
 */
const toCreatorType = (type: AIQuestionPreview["type"]): CreatorQuestionType => {
  switch (type) {
    case "mcq":
      return "single_choice";
    case "true_false":
      return "true_false";
    case "fill":
      return "fill_blanks";
    case "integer":
      return "integer";
    case "short":
      return "text";
    case "long":
      return "paragraph";
    case "coding":
      return "code_output";
    default:
      return "single_choice";
  }
};

const toCreatorDifficulty = (difficulty: AIQuestionPreview["difficulty"]): CreatorQuestion["difficulty"] => {
  switch (difficulty) {
    case "easy":
      return "Easy";
    case "hard":
      return "Hard";
    case "expert":
      return "Expert";
    case "medium":
    default:
      return "Medium";
  }
};

const toBloomLevel = (difficulty: AIQuestionPreview["difficulty"]): BloomLevel => {
  switch (difficulty) {
    case "easy":
      return "Remember";
    case "hard":
    case "expert":
      return "Analyze";
    case "medium":
    default:
      return "Understand";
  }
};

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/**
 * Convert AI-generated/previewed questions into the quiz creator's
 * CreatorQuestion shape so they render as editable cards on the
 * `/quiz/{code}/problems` screen.
 */
export const mapToCreatorQuestions = (previews: AIQuestionPreview[]): CreatorQuestion[] => {
  if (!previews || previews.length === 0) return [];

  const now = new Date().toISOString();
  return previews.map((p, i) => {
    const base = createDefaultQuestion(p.id || `ai_${Date.now()}_${i}`);
    const type = toCreatorType(p.type);
    const difficulty = toCreatorDifficulty(p.difficulty);
    const title = (p.title || p.content || `${type} Question ${i + 1}`).trim();

    const hasOptions = Array.isArray(p.options) && p.options.length > 0;

    let options: CreatorQuestion["options"] = base.options;
    let correctAnswer: string | number | number[] = base.correctAnswer;

    if (hasOptions && p.options) {
      options = p.options.map((opt, oi) => ({
        id: opt.id || `opt_${Date.now()}_${i}_${oi}`,
        label: OPTION_LABELS[oi] ?? String.fromCharCode(65 + oi),
        content: opt.content,
        isCorrect: !!opt.isCorrect,
      }));
      const correctIndex = options.findIndex((o) => o.isCorrect);

      if (type === "true_false") {
        correctAnswer = correctIndex >= 0 ? options[correctIndex].label : "";
      } else if (type === "multiple_choice") {
        correctAnswer = options
          .map((o, oi) => (o.isCorrect ? oi : -1))
          .filter((i) => i >= 0);
      } else {
        correctAnswer = correctIndex >= 0 ? correctIndex : -1;
      }
    } else {
      // Non-choice question: use the correctAnswer/answer text directly.
      const answer = String(p.correctAnswer ?? "").trim();
      correctAnswer = type === "integer" ? (Number(answer) || answer) : answer;
    }

    return {
      ...base,
      id: base.id,
      type,
      title,
      options,
      correctAnswer,
      explanation: p.explanation ?? "",
      hint: p.hint ?? "",
      difficulty,
      bloomLevel: toBloomLevel(p.difficulty),
      tags: Array.isArray(p.tags) ? p.tags : [],
      updatedAt: now,
    };
  });
};