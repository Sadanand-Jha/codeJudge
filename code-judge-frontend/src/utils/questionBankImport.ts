import type { CreatorQuestion, CreatorQuestionType } from "@/components/quiz/creator/types";
import type { UserBankQuestion } from "@/services/ai";
import { containsHtml, htmlToPlainText } from "@/utils/htmlText";

/**
 * The quiz problem editor supports single choice, multiple choice, true/false,
 * fill-in-the-blank and short text. Every other bank type (theory, numerical,
 * subjective, coding) imports as a text question so the editor stays usable.
 */
function toCreatorType(raw: string | null): CreatorQuestionType {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("multi")) return "multiple_choice";
  if (value.includes("true") || value.includes("false") || value.includes("boolean")) return "true_false";
  if (value.includes("fill") || value.includes("blank")) return "fill_blanks";
  if (value.includes("mcq") || value.includes("single") || value.includes("choice")) return "single_choice";
  return "text";
}

function toDifficulty(raw: string | null): CreatorQuestion["difficulty"] {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("easy")) return "Easy";
  if (value.includes("hard") || value.includes("difficult")) return "Hard";
  if (value.includes("expert")) return "Expert";
  return "Medium";
}

export function bankQuestionToCreatorQuestion(question: UserBankQuestion): CreatorQuestion {
  const timestamp = new Date().toISOString();
  const type = toCreatorType(question.question_type);
  const options = (Array.isArray(question.options) ? question.options : []).map((option, index) => {
    const rawText = option.text ?? "";
    const html = option.html?.trim() || (containsHtml(rawText) ? rawText : "");
    const plain = rawText && !containsHtml(rawText) ? rawText : htmlToPlainText(rawText || html);
    return {
      id: `bank_${question.id}_opt_${index}`,
      label: String.fromCharCode(65 + index),
      content: plain,
      contentHtml: html || undefined,
      isCorrect: Boolean(option.isCorrect),
    };
  });
  const answers = Array.isArray(question.answers) ? question.answers : [];
  const tags = Array.from(new Set([question.topic, question.chapter].filter(Boolean) as string[]));
  const correctIndex = options.findIndex((option) => option.isCorrect);
  const firstAnswer = String(answers[0] ?? "");
  let correctAnswer: CreatorQuestion["correctAnswer"];

  if (type === "multiple_choice") {
    correctAnswer = options.flatMap((option, index) => (option.isCorrect ? [index] : []));
  } else if (type === "single_choice") {
    correctAnswer =
      correctIndex >= 0
        ? correctIndex
        : options.findIndex(
            (option) => option.label === firstAnswer || option.content === firstAnswer
          );
  } else if (type === "true_false") {
    correctAnswer =
      correctIndex >= 0
        ? options[correctIndex].label
        : firstAnswer;
  } else if (type === "fill_blanks" && answers.length > 1) {
    correctAnswer = answers.join(" | ");
  } else {
    correctAnswer = firstAnswer;
  }

  return {
    id: `bank_${question.id}`,
    type,
    title: question.question_html?.trim() || question.question_text,
    options,
    correctAnswer,
    explanation: question.explanation ?? "",
    hint: question.hint ?? "",
    solution: "",
    marks: 10,
    negativeMarks: 0,
    difficulty: toDifficulty(question.difficulty),
    expectedTime: 2,
    topic: tags.join(" · "),
    bloomLevel: "Understand",
    tags,
    visibility: "visible",
    status: "draft",
    required: true,
    attachments: [],
    images: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    bankQuestionId: question.id,
  };
}
