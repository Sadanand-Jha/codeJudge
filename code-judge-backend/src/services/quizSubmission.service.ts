// Background grading for quiz submissions.
// This is the exact grading pipeline formerly executed inline in
// POST /attempt/:attemptId/submit (quiz.controller.ts): load problems +
// options, grade in memory, persist answers, finalize the attempt.
// The submit endpoint now only validates + enqueues; a BullMQ worker runs
// this function. It is also used as the synchronous fallback when Redis is
// unreachable, so behavior is identical in both paths.
import { QuizService } from "./database/quiz.service.ts";
import type { QuizSubmissionJobData } from "../queues/quizSubmission.queue.ts";

const quizService = new QuizService();

export async function processQuizSubmission(data: QuizSubmissionJobData): Promise<any> {
  const { attemptId, userId, responses, violations, flagged, flagReason, isLate } = data;

  const attempt = await quizService.getQuizAttemptById(Number(attemptId));
  if (!attempt || Number(attempt.user_id) !== Number(userId)) {
    throw new Error("Quiz attempt not found");
  }

  // Idempotency: a retried/deduped job for an already-graded attempt is a no-op.
  if (attempt.status === "completed") {
    return attempt;
  }

  const quizRow = await quizService.getQuizById(String(attempt.quiz_id));

  const problems = await quizService.getQuizProblems(String(attempt.quiz_id));
  const optionsMap = new Map<number, any[]>();
  for (const problem of problems) {
    const options = await quizService.getQuizProblemOptions(String(problem.id));
    optionsMap.set(problem.id, options);
  }

  const problemMap = new Map(problems.map(p => [p.id, p]));

  let score = 0;
  let earnedMarks = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let skippedQuestions = problems.length;

  const validResponses: Array<{ problemId: number; option?: string; options?: string[]; textAnswer?: string }> = [];
  const totalQuestions = problems.length;
  const totalMarks = Number(quizRow?.total_marks) || 0;
  const defaultQuestionMarks = totalQuestions > 0 ? totalMarks / totalQuestions : 0;
  const uniqueResponses = new Map<number, { problemId: number; option?: string; options?: string[]; textAnswer?: string }>();
  for (const response of responses) {
    uniqueResponses.set(Number(response.problemId), response);
  }

  for (const response of uniqueResponses.values()) {
    const problemId = Number(response.problemId);
    const problem = problemMap.get(problemId);

    if (!problem) continue;

    const problemOptions = optionsMap.get(problemId) ?? [];
    const selectedOption = problemOptions.find((o) => o.id === Number(response.option));
    const isMultipleChoice = Number(problem.quiz_problem_type) === 2;

    if (isMultipleChoice && Array.isArray(response.options) && response.options.length > 0) {
      const selectedIds = new Set(response.options.map(Number).filter(Number.isInteger));
      const correctIds = new Set(problemOptions.filter((o) => o.iscorrect).map((o) => Number(o.id)));
      const exactlyCorrect = selectedIds.size === correctIds.size && [...selectedIds].every((id) => correctIds.has(id));
      skippedQuestions--;
      validResponses.push(response);
      if (exactlyCorrect) {
        correctAnswers++;
        score += 1;
        earnedMarks += Number(problem.marks) || defaultQuestionMarks;
      } else {
        wrongAnswers++;
        if (quizRow?.negative_marking === true) earnedMarks -= Math.abs(Number(problem.negative_marks) || 0);
      }
    } else if (selectedOption) {
      skippedQuestions--;
      validResponses.push(response);

      if (selectedOption.iscorrect) {
        correctAnswers++;
        score += 1;
        earnedMarks += Number(problem.marks) || defaultQuestionMarks;
      } else {
        wrongAnswers++;
        if (quizRow?.negative_marking === true) {
          earnedMarks -= Math.abs(Number(problem.negative_marks) || 0);
        }
      }
    } else if (response.textAnswer) {
      skippedQuestions--;
      validResponses.push(response);
      const autoGradable = [5, 6, 8].includes(Number(problem.quiz_problem_type));
      if (autoGradable) {
        const submitted = response.textAnswer.trim().toLowerCase();
        const accepted = problemOptions
          .flatMap((option) => [option.matching_target, option.option_statement])
          .filter(Boolean)
          .map((value) => String(value).trim().toLowerCase());
        if (accepted.includes(submitted)) {
          correctAnswers++;
          score += 1;
          earnedMarks += Number(problem.marks) || defaultQuestionMarks;
        } else {
          wrongAnswers++;
          if (quizRow?.negative_marking === true) earnedMarks -= Math.abs(Number(problem.negative_marks) || 0);
        }
      }
    }
  }

  const marksObtained = Math.round((totalMarks > 0 ? earnedMarks : score) * 100) / 100;
  const percentage = totalMarks > 0
    ? Math.round((marksObtained / totalMarks) * 10000) / 100
    : totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 10000) / 100
      : 0;

  // Persist every submitted answer in the quiz student response table
  // (upsert — autosave may already have stored some of them).
  for (const response of validResponses) {
    try {
      await quizService.saveStudentResponse({
        attemptId: Number(attemptId),
        problemId: Number(response.problemId),
        option: response.option,
        options: response.options,
        textAnswer: response.textAnswer,
      });
    } catch (responseError) {
      console.error("Error persisting quiz response on submit:", responseError);
    }
  }

  const startedAt = attempt.started_at ?? attempt.created_at;
  const timeTaken = startedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    : undefined;

  const updatedAttempt = await quizService.updateQuizAttempt(Number(attemptId), {
    status: isLate ? "timed_out" : "completed",
    completed_at: new Date(),
    score,
    percentage,
    correct_answers: correctAnswers,
    wrong_answers: wrongAnswers,
    skipped_questions: skippedQuestions,
    total_marks: totalMarks,
    marks_obtained: marksObtained,
    violations,
    flagged,
    ...(flagReason !== undefined ? { flag_reason: flagReason } : {}),
    ...(timeTaken !== undefined ? { time_taken: timeTaken } : {}),
  });

  return updatedAttempt;
}
