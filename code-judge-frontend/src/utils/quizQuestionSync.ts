import {
  addQuizProblem,
  addQuizProblemOption,
  deleteQuizProblem,
  getQuizProblems,
} from "@/services/quiz";
import {
  type CreatorQuestion,
  type CreatorQuestionType,
} from "@/components/quiz/creator/types";

/**
 * Maps the frontend question types onto the backend `quiz_problem_type` enum
 * (numeric). Kept in sync with the backend contract.
 */
const TYPE_TO_NUMBER: Record<CreatorQuestionType, number> = {
  single_choice: 1,
  multiple_choice: 2,
  true_false: 3,
  fill_blanks: 4,
  integer: 5,
  text: 6,
  paragraph: 7,
  code_output: 8,
};

const DIFFICULTY_TO_NUMBER: Record<CreatorQuestion["difficulty"], number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
  Expert: 4,
};

function isChoiceType(q: CreatorQuestion): boolean {
  return q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false";
}

/**
 * Persist the current question set to the server for a quiz. The backend only
 * exposes create/update/delete for problems and add for options, so the saved
 * set is made to match local state exactly by removing previously saved
 * problems and recreating them in order. Returns the number of questions saved.
 */
export async function syncQuizQuestions(quizId: string, questions: CreatorQuestion[]): Promise<number> {
  let existing: { id: number }[] = [];
  try {
    existing = await getQuizProblems(quizId);
  } catch {
    existing = [];
  }
  await Promise.all(existing.map((p) => deleteQuizProblem(String(p.id)).catch(() => {})));

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const created = await addQuizProblem(quizId, {
      problem_statement: q.title,
      problem_description: q.topic || undefined,
      quiz_problem_type: TYPE_TO_NUMBER[q.type],
      question_number: i + 1,
      explanation: q.explanation || undefined,
      hint: q.hint || undefined,
      difficulty: DIFFICULTY_TO_NUMBER[q.difficulty],
    });

    const options = isChoiceType(q)
      ? q.options
      : String(q.correctAnswer ?? "").trim()
        ? [
            {
              id: "answer",
              label: "A",
              content: String(q.correctAnswer),
              isCorrect: true,
            },
          ]
        : [];

    for (const opt of options) {
      await addQuizProblemOption(String(created.id), {
        option_statement: opt.content,
        option_description: opt.caption,
        isCorrect: opt.isCorrect,
      });
    }
  }

  return questions.length;
}
