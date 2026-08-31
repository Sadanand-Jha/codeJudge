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
 * Maps frontend question type strings to backend numeric IDs.
 * These IDs must match the `quiz_problem_type` table in the database.
 * Last synced: 2026-08-27
 */
const TYPE_TO_NUMBER: Record<CreatorQuestionType, number> = {
  single_choice: 1,
  multiple_choice: 2,
  true_false: 3,
  text: 4,
  fill_blanks: 6,
  match_following: 12,
  integer: 5,   // not in DB yet — kept for forward compat
  paragraph: 7, // not in DB yet — kept for forward compat
  code_output: 8, // not in DB yet — kept for forward compat
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
 * Create a deterministic content hash of a question for change detection.
 * Excludes volatile fields (id, serverId, createdAt, updatedAt) so that
 * only actual content changes trigger a backend save.
 */
function hashQuestion(q: CreatorQuestion): string {
  const payload = {
    type: q.type,
    title: q.title,
    options: q.options.map((o) => ({ content: o.content, isCorrect: o.isCorrect, caption: o.caption })),
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    hint: q.hint,
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    difficulty: q.difficulty,
    expectedTime: q.expectedTime,
    topic: q.topic,
    // match-specific fields
    matchItems: q.matchItems,
    matchMatches: q.matchMatches,
    matchMapping: q.matchMapping,
    shuffleColumnA: q.shuffleColumnA,
    shuffleColumnB: q.shuffleColumnB,
  };
  return JSON.stringify(payload);
}

/**
 * Compare current questions against the initial snapshot and return only
 * the questions that need saving: newly added (no serverId) or content-changed.
 */
export function computeChangedQuestions(
  current: CreatorQuestion[],
  initialSnapshot: Map<string, string> // questionId -> hash at load time
): CreatorQuestion[] {
  return current.filter((q) => {
    const prevHash = initialSnapshot.get(q.id);
    // New question — never saved before
    if (!prevHash) return true;
    // Content changed since last save
    return hashQuestion(q) !== prevHash;
  });
}

/**
 * Build the initial snapshot hash map from a list of questions.
 * Call this after loading questions from the server.
 */
export function buildQuestionSnapshot(questions: CreatorQuestion[]): Map<string, string> {
  const snap = new Map<string, string>();
  for (const q of questions) {
    snap.set(q.id, hashQuestion(q));
  }
  return snap;
}

/**
 * Persist the current question set to the server for a quiz using transactional
 * upserts. For each question:
 *  - If the question has a `serverId`, it is updated on the server (preserving ID).
 *  - If not, it is inserted as a new row and the returned ID is tracked.
 *  - Options are always replaced atomically per problem.
 *
 * If `onlyChangedIds` is provided, only questions whose IDs are in the set get
 * upserted — all others are skipped. The delete sweep always runs against the
 * full list so removed questions are cleaned up from the server.
 *
 * After saving, problems that were newly created get their `serverId` set in-place.
 * Returns the number of questions actually saved to the backend.
 */
export async function syncQuizQuestions(
  quizId: string,
  questions: CreatorQuestion[],
  onlyChangedIds?: Set<string>,
  onProgress?: (saved: number, total: number) => void
): Promise<number> {
  let savedCount = 0;
  // Count how many questions will actually be saved for accurate progress
  const toSave = onlyChangedIds
    ? questions.filter((q) => onlyChangedIds.has(q.id))
    : questions;
  const totalToSave = toSave.length;

  // Upsert each question — skip if onlyChangedIds is set and this question hasn't changed
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (onlyChangedIds && !onlyChangedIds.has(q.id)) continue;

    let options: { optionStatement: string; optionDescription?: string; matchingTarget?: string | null; matching_target?: string | null; isCorrect: boolean }[];
    if (q.type === "match_following") {
      // For type 12, second column goes to matching_target column (per DB migration 01_quiz.sql)
      // Each left item is stored as a row: option_statement = Column A, matching_target = mapped Column B
      const left = q.matchItems ?? [];
      const right = q.matchMatches ?? [];
      const mapping = q.matchMapping ?? {};
      // Build a lookup for right content by id
      const rightById = new Map<string, string>(right.map((r) => [r.id, r.content]));
      if (left.length === 0) {
        options = [];
      } else {
        options = left.map((l, idx) => {
          // Line-wise: creator just adds columns line-wise; correct answer is the item directly in front (same row)
          // Fallback to same-index right if no explicit mapping (so students see shuffled B)
          const rightId = mapping[l.id] ?? right[idx]?.id;
          const rightContent = rightId ? rightById.get(rightId) ?? right[idx]?.content ?? "" : right[idx]?.content ?? "";
          return {
            optionStatement: l.content,
            optionDescription: undefined,
            matchingTarget: rightContent,
            matching_target: rightContent,
            isCorrect: true,
          };
        });
        // Persist shuffle flags as an extra meta option if needed (optional)
        // Keep backward compat: also store full payload as hidden meta via problem_description if required,
        // but primary storage is now per-pair rows.
      }
    } else if (q.type === "fill_blanks") {
      // For type 6 (fill_blanks), store correct answers in matching_target column per requirement
      const raw = String(q.correctAnswer ?? "").trim();
      if (!raw) {
        options = [];
      } else {
        // Support multiple blanks separated by comma/newline/pipe — split and store each as a row with matching_target
        // For simplicity, store as comma-joined string in one row if single value, or multiple rows if multiple answers
        const answers = raw.includes("|") ? raw.split("|").map((s) => s.trim()).filter(Boolean)
          : raw.includes(",") && raw.split(",").length > 1 && q.title.includes("___")
            ? raw.split(",").map((s) => s.trim()).filter(Boolean)
            : [raw];
        if (answers.length === 1) {
          options = [{
            optionStatement: "",
            optionDescription: undefined,
            matchingTarget: answers[0],
            matching_target: answers[0],
            isCorrect: true,
          }];
        } else {
          options = answers.map((ans) => ({
            optionStatement: "",
            optionDescription: undefined,
            matchingTarget: ans,
            matching_target: ans,
            isCorrect: true,
          }));
        }
      }
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
    savedCount++;
    // Report progress after each question save
    onProgress?.(savedCount, totalToSave);
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

  return savedCount;
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
      // Line-wise: same row = correct pair, so fallback to index-wise if no explicit mapping
      const unmapped = left.filter((l, idx) => {
        if (mapping[l.id]) return false;
        return !right[idx]?.content?.trim();
      }).length;
      if (unmapped > 0) {
        issues.push({ index, id: q.id, message: `Q${index}: ${unmapped} item(s) still need a correct match (keep pairs on same line).` });
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
