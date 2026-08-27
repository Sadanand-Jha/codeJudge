import {
  saveQuizProblemFull,
  getQuizProblems,
  deleteQuizProblem,
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
  text: 4,
  fill_blanks: 6,
  match_following: 12,
  integer: 5,
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
 * Persist the current question set to the server for a quiz using transactional
 * upserts. For each question:
 *  - If the question has a `serverId`, it is updated on the server (preserving ID).
 *  - If not, it is inserted as a new row and the returned ID is tracked.
 *  - Options are always replaced atomically per problem.
 *
 * After saving, problems that were newly created get their `serverId` set in-place.
 * Returns the number of questions saved.
 */
export async function syncQuizQuestions(
  quizId: string,
  questions: CreatorQuestion[]
): Promise<number> {
  // Upsert each question
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    let options: { optionStatement: string; optionDescription?: string; isCorrect: boolean }[];
    if (q.type === "match_following") {
      const payload = {
        matchItems: q.matchItems ?? [],
        matchMatches: q.matchMatches ?? [],
        matchMapping: q.matchMapping ?? {},
        shuffleColumnA: q.shuffleColumnA ?? true,
        shuffleColumnB: q.shuffleColumnB ?? true,
      };
      options = [{ optionStatement: JSON.stringify(payload), optionDescription: undefined, isCorrect: true }];
    } else {
      options = isChoiceType(q)
        ? q.options
            .filter((o) => o.content.trim().length > 0)
            .map((o) => ({
              optionStatement: o.content,
              optionDescription: o.caption,
              isCorrect: o.isCorrect,
            }))
        : String(q.correctAnswer ?? "").trim()
          ? [
              {
                optionStatement: String(q.correctAnswer),
                optionDescription: undefined,
                isCorrect: true,
              },
            ]
          : [];
    }

    const saved = await saveQuizProblemFull({
      problemId: q.serverId || undefined,
      quizId: Number(quizId),
      problemStatement: q.title,
      problemDescription: q.topic || undefined,
      quizProblemType: TYPE_TO_NUMBER[q.type],
      questionNumber: i + 1,
      explanation: q.explanation || undefined,
      hint: q.hint || undefined,
      difficulty: DIFFICULTY_TO_NUMBER[q.difficulty],
      marks: q.marks || undefined,
      negativeMarks: q.negativeMarks || undefined,
      options,
    });

    // Track the server ID so subsequent saves update instead of insert
    if (saved && !q.serverId) {
      q.serverId = saved.id;
    }
  }

  // Delete problems that exist on the server but are no longer in the current list
  try {
    const serverProblems = await getQuizProblems(quizId);
    const currentServerIds = new Set(questions.filter((q) => q.serverId).map((q) => Number(q.serverId)));
    for (const sp of serverProblems) {
      if (!currentServerIds.has(sp.id)) {
        await deleteQuizProblem(String(sp.id));
      }
    }
  } catch {
    // Non-critical: log but don't fail the save
    console.warn("Could not clean up deleted problems from server");
  }

  return questions.length;
}

/**
 * Save the current question set to the server (when a quiz already exists and
 * there is at least one problem) and only then create the next problem. This
 * guarantees the problem currently being edited is persisted to the database
 * before the user moves on to a new row in the problem table.
 *
 * Returns the id of the newly added problem. Throws when the server save fails
 * so the caller can stop and let the user retry instead of losing work.
 */
export async function syncQuizProblemsThenAdd(
  quizId: string | number | null | undefined,
  questions: CreatorQuestion[],
  addProblem: () => string
): Promise<string> {
  if (quizId && questions.length > 0) {
    await syncQuizQuestions(String(quizId), questions);
  }
  return addProblem();
}

/** A single blocking issue found before problems are saved to the server. */
export interface ProblemValidationIssue {
  /** 1-based problem number shown to the user. */
  index: number;
  /** id of the offending problem. */
  id: string;
  /** Human readable explanation. */
  message: string;
}

/**
 * Ensure every problem can actually be saved before the creator continues:
 * the question itself plus its options (or its typed answer) must be filled in.
 * Returns an empty array when everything is ready.
 */
export function validateProblemsForContinue(
  problems: CreatorQuestion[]
): ProblemValidationIssue[] {
  const issues: ProblemValidationIssue[] = [];
  problems.forEach((q, i) => {
    const index = i + 1;

    if (!q.title || q.title.trim().length === 0) {
      issues.push({
        index,
        id: q.id,
        message: `Q${index}: the question text is empty.`,
      });
      return;
    }

    if (q.type === "match_following") {
      const left = q.matchItems ?? [];
      const right = q.matchMatches ?? [];
      if (left.length < 2 || right.length < 2) {
        issues.push({ index, id: q.id, message: `Q${index}: needs at least 2 pairs.` });
        return;
      }
      if (left.some((x) => !x.content.trim()) || right.some((x) => !x.content.trim())) {
        issues.push({ index, id: q.id, message: `Q${index}: fill in all items and matches.` });
        return;
      }
      const mapping = q.matchMapping ?? {};
      const unmapped = left.filter((l) => !mapping[l.id]).length;
      if (unmapped > 0) {
        issues.push({ index, id: q.id, message: `Q${index}: ${unmapped} item(s) still need a correct match.` });
        return;
      }
      return;
    }

    if (isChoiceType(q)) {
      const filledOptions = q.options.filter((o) => o.content.trim().length > 0);
      if (filledOptions.length < 2) {
        issues.push({
          index,
          id: q.id,
          message: `Q${index}: fill in at least two options.`,
        });
        return;
      }
      if (!q.options.some((o) => o.isCorrect)) {
        issues.push({
          index,
          id: q.id,
          message: `Q${index}: select the correct option.`,
        });
      }
      return;
    }

    const hasAnswer = String(q.correctAnswer ?? "").trim().length > 0;
    if (!hasAnswer) {
      issues.push({
        index,
        id: q.id,
        message: `Q${index}: add the correct answer.`,
      });
    }
  });

  return issues;
}
