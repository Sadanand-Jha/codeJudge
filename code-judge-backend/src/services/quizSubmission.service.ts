// Background result calculation for quiz attempts.
// Grading starts at the earliest of: the student submits, the teacher ends the
// quiz, or the scheduled quiz end time passes. A BullMQ worker runs
// processQuizSubmission with bounded concurrency; the same function is used by
// request-time recovery when a long-lived worker is unavailable.
import { QuizService } from "./database/quiz.service.ts";
import { maybeQueueQuizResponsesEmail } from "./quizResultsEmail.service.ts";
import {
  enqueueQuizSubmission,
  getQuizSubmissionJob,
  isQuizSubmissionQueueConfigured,
  storeFallbackQuizSubmission,
  type QuizSubmissionJobData,
} from "../queues/quizSubmission.queue.ts";
import {
  enqueueQuizRecalculation,
  isQuizRecalculationQueueConfigured,
  type QuizRecalculationJobData,
} from "../queues/quizRecalculation.queue.ts";
import { getQuizAttemptDeadlineMs } from "../utils/quizAttemptTiming.ts";
import { schedulerLog } from "../utils/schedulerLog.ts";

const quizService = new QuizService();

export async function processQuizSubmission(data: QuizSubmissionJobData): Promise<any> {
  const { attemptId, userId, responses } = data;

  const attempt = await quizService.getQuizAttemptById(Number(attemptId));
  if (!attempt || Number(attempt.user_id) !== Number(userId)) {
    throw new Error("Quiz attempt not found");
  }

  const regrade = data.regrade === true;
  // Idempotency: a retried/deduped job for an already-graded attempt is a no-op.
  // Teacher-edit recalculation explicitly opts out and re-evaluates the attempt.
  if (!regrade && (attempt.status === "completed" || attempt.status === "timed_out")) {
    return attempt;
  }

  const quizRow = await quizService.getQuizById(String(attempt.quiz_id));
  const quizStatus = String(quizRow?.status ?? "").toLowerCase();
  // The quiz end time wins when configured; otherwise the attempt expires
  // after its fixed 15-minute fallback window.
  const attemptDeadlineMs = getQuizAttemptDeadlineMs(quizRow, attempt);
  const attemptSubmittedAtMs = attempt.submitted_at
    ? new Date(attempt.submitted_at).getTime()
    : Number.NaN;
  // Explicit submissions are graded immediately; end-of-quiz jobs still wait
  // for the quiz window to close.
  const explicitlySubmitted = Number.isFinite(attemptSubmittedAtMs);
  const quizEnded =
    quizStatus === "ended"
    || (attemptDeadlineMs !== null && attemptDeadlineMs <= Date.now());
  if (!regrade && !quizEnded && !explicitlySubmitted) {
    console.warn(`[bullmq] result calculation skipped for attempt ${attemptId}: quiz has not ended`);
    return attempt;
  }
  const jobSubmittedAtMs = new Date(data.submittedAt).getTime();
  const submittedAtMs = Number.isFinite(attemptSubmittedAtMs)
    ? attemptSubmittedAtMs
    : jobSubmittedAtMs;
  const wasClosedAtSubmission = attemptDeadlineMs !== null
    ? Number.isFinite(submittedAtMs) && submittedAtMs >= attemptDeadlineMs
    : quizStatus === "ended";
  // Submissions only save answers. If an attempt was explicitly submitted, or
  // the quiz window has already closed, grade the persisted response rows.
  // Legacy inline jobs may still carry unsaved answers, so use those only when
  // they were created before the close.
  const usePersistedResponses =
    regrade
    || Number.isFinite(attemptSubmittedAtMs)
    || wasClosedAtSubmission
    || data.isLate === true;
  const persistedResponses = usePersistedResponses
    ? (await quizService.getStudentResponses(Number(attemptId), Number(userId)))
        .map(savedResponseToSubmission)
        .filter((response): response is QuizSubmissionJobData["responses"][number] => response !== null)
    : [];
  const gradeResponses = usePersistedResponses ? persistedResponses : responses;

  // An attempt with submitted_at happened during the window. An attempt still
  // active when the quiz closes is timed out. Legacy jobs without submitted_at
  // fall back to their enqueue-time lateness flag.
  const isLate = Number.isFinite(attemptSubmittedAtMs)
    ? attemptDeadlineMs !== null && attemptSubmittedAtMs > attemptDeadlineMs
    : data.isLate === true || wasClosedAtSubmission || !Number.isFinite(submittedAtMs);

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
  for (const response of gradeResponses) {
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
      const optionIds = new Set(problemOptions.map((o) => Number(o.id)));
      // If any selected option was deleted by the teacher, the saved answer can
      // no longer be interpreted. Count the whole response as skipped rather
      // than marking it wrong.
      if (selectedIds.size === 0 || [...selectedIds].some((id) => !optionIds.has(id))) {
        continue;
      }
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
  // (upsert — autosave may already have stored some of them). Recalculation
  // only reads the already-persisted answers, so it skips this write-back.
  if (!regrade) {
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
  }

  const startedAt = attempt.started_at ?? attempt.created_at;
  const storedViolations = Number(attempt.violations) || 0;
  const violations = Math.max(storedViolations, Number(data.violations) || 0);
  const flagged = attempt.flagged === true || data.flagged === true;
  const flagReason = [attempt.flag_reason, data.flagReason].filter(Boolean).join("; ").slice(0, 500) || undefined;
  const effectiveCompletionMs = Number.isFinite(attemptSubmittedAtMs)
    ? attemptSubmittedAtMs
    : isLate && attemptDeadlineMs !== null
      ? Math.min(Date.now(), attemptDeadlineMs)
      : Date.now();
  const timeTaken = startedAt
    ? Math.max(0, Math.floor((effectiveCompletionMs - new Date(startedAt).getTime()) / 1000))
    : undefined;

  const updatedAttempt = await quizService.updateQuizAttempt(
    Number(attemptId),
    regrade
      ? {
          score,
          percentage,
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          skipped_questions: skippedQuestions,
          total_questions: totalQuestions,
          total_marks: totalMarks,
          marks_obtained: marksObtained,
        }
      : {
          status: isLate ? "timed_out" : "completed",
          completed_at: new Date(effectiveCompletionMs),
          ...(attempt.submitted_at ? {} : { submitted_at: new Date(effectiveCompletionMs) }),
          score,
          percentage,
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          skipped_questions: skippedQuestions,
          total_questions: totalQuestions,
          total_marks: totalMarks,
          marks_obtained: marksObtained,
          violations,
          flagged,
          ...(flagReason !== undefined ? { flag_reason: flagReason } : {}),
          ...(timeTaken !== undefined ? { time_taken: timeTaken } : {}),
        }
  );

  if (!regrade) {
    try {
      await maybeQueueQuizResponsesEmail(Number(attempt.quiz_id));
    } catch (error) {
      console.error(`Could not queue responses email for quiz ${attempt.quiz_id}:`, error);
    }
  }

  return updatedAttempt;
}

/**
 * Re-grade every final attempt for a quiz after its questions/options changed.
 * The job carries a grading revision so a stale job can no-op when a newer save
 * has already scheduled the next recalculation.
 */
export async function processQuizRecalculation(
  data: QuizRecalculationJobData
): Promise<{ attempts: number; skipped: boolean }> {
  const quizId = Number(data.quizId);
  if (!Number.isInteger(quizId) || quizId <= 0) {
    throw new Error("Invalid quiz id for recalculation");
  }

  if (data.revision) {
    const currentRevision = await quizService.getQuizGradingRevision(quizId);
    if (currentRevision !== data.revision) {
      schedulerLog(
        "grading",
        `quiz ${quizId}: recalculation skipped because revision changed (${data.revision} -> ${currentRevision})`
      );
      return { attempts: 0, skipped: true };
    }
  }

  const attempts = await quizService.getFinalQuizAttempts(quizId);
  schedulerLog("grading", `quiz ${quizId}: recalculating ${attempts.length} final attempt(s)`);

  for (const attempt of attempts) {
    await processQuizSubmission({
      ...resultCalculationJobData(attempt),
      regrade: true,
    });
  }

  return { attempts: attempts.length, skipped: false };
}

/**
 * Called after a grading-relevant problem/option save. Does nothing until the
 * quiz has at least one final attempt. Uses Redis when available; otherwise
 * recalculates inline so the save still leaves consistent results.
 */
export async function scheduleQuizRecalculation(quizId: number): Promise<void> {
  const numericQuizId = Number(quizId);
  if (!Number.isInteger(numericQuizId) || numericQuizId <= 0) return;
  if (!(await quizService.hasFinalQuizAttempts(numericQuizId))) return;

  const revision = await quizService.getQuizGradingRevision(numericQuizId);
  const inlineFallback = !isQuizRecalculationQueueConfigured() || process.env.VERCEL === "1";
  if (inlineFallback) {
    await processQuizRecalculation({ quizId: numericQuizId, revision });
    return;
  }

  try {
    await enqueueQuizRecalculation({ quizId: numericQuizId, revision });
  } catch (error) {
    schedulerLog(
      "grading",
      `quiz ${numericQuizId}: could not enqueue recalculation; processing inline`,
      error
    );
    await processQuizRecalculation({ quizId: numericQuizId, revision });
  }
}

function savedResponseToSubmission(row: any): QuizSubmissionJobData["responses"][number] | null {
  const problemId = Number(row.problem_id);
  if (!Number.isInteger(problemId) || problemId <= 0 || row.answer == null) return null;
  const answer = row.answer;
  if (typeof answer === "object") {
    if (answer.selectedOptionId != null) return { problemId, option: String(answer.selectedOptionId) };
    if (Array.isArray(answer.selectedOptionIds)) {
      return { problemId, options: answer.selectedOptionIds.map(String) };
    }
    if (answer.text != null) return { problemId, textAnswer: String(answer.text) };
  }
  if (typeof answer === "string" && answer.trim()) return { problemId, option: answer };
  return null;
}

function resultCalculationJobData(attempt: any): QuizSubmissionJobData {
  return {
    attemptId: Number(attempt.id),
    userId: Number(attempt.user_id),
    quizId: Number(attempt.quiz_id),
    responses: [],
    violations: Number(attempt.violations) || 0,
    flagged: attempt.flagged === true,
    ...(attempt.flag_reason ? { flagReason: String(attempt.flag_reason) } : {}),
    // An attempt without submitted_at is still active when it is enqueued; it
    // is timed out at the scheduled end. An explicit submitted_at is graded as
    // a normal completion.
    isLate: !attempt.submitted_at,
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Grade one explicitly submitted attempt immediately. Called from the student
 * submit endpoint after the final answers are persisted. The job is deduped by
 * attempt id, so double submits and the end-of-quiz sweep stay safe.
 */
export async function enqueueSubmittedQuizAttempt(attempt: any): Promise<void> {
  const jobData: QuizSubmissionJobData = {
    attemptId: Number(attempt.id),
    userId: Number(attempt.user_id),
    quizId: Number(attempt.quiz_id),
    responses: [],
    violations: Number(attempt.violations) || 0,
    flagged: attempt.flagged === true,
    ...(attempt.flag_reason ? { flagReason: String(attempt.flag_reason) } : {}),
    isLate: false,
    submittedAt: new Date().toISOString(),
  };

  if (!isQuizSubmissionQueueConfigured()) {
    await processQuizSubmission(jobData);
    return;
  }

  const existing = await getQuizSubmissionJob(jobData.attemptId);
  if (existing) {
    const state = await existing.getState();
    if (state !== "failed") return;
    await existing.remove();
  }

  await storeFallbackQuizSubmission(jobData).catch((error) => {
    console.warn(`Could not store fallback for quiz attempt ${jobData.attemptId}:`, error);
  });
  await enqueueQuizSubmission(jobData);
}

/**
 * Enqueue result calculation for every ungraded attempt in a quiz. This is
 * called when a teacher ends the quiz, by the due-quiz scheduler, and before
 * an attempt is resumed/started. Jobs dedupe on attempt id, so repeated calls
 * are safe.
 */
export async function enqueueQuizResultCalculation(
  quizId: number,
  userId?: number
): Promise<number> {
  schedulerLog(
    "grading",
    `quiz ${quizId}: looking for expired in-progress attempts${userId !== undefined ? ` for user ${userId}` : ""}`
  );
  const expired = await quizService.getExpiredQuizAttempts(quizId, userId);
  schedulerLog("grading", `quiz ${quizId}: found ${expired.length} expired attempt(s)`);

  let enqueued = 0;

  for (const attempt of expired) {
    const jobData = resultCalculationJobData(attempt);
    schedulerLog(
      "grading",
      `quiz ${quizId}: processing attempt ${jobData.attemptId} (user ${jobData.userId}, isLate=${jobData.isLate})`
    );
    try {
      if (!isQuizSubmissionQueueConfigured()) {
        schedulerLog(
          "grading",
          `quiz ${quizId}: attempt ${jobData.attemptId} has no Redis queue, processing inline`
        );
        await processQuizSubmission(jobData);
        enqueued += 1;
        schedulerLog("grading", `quiz ${quizId}: attempt ${jobData.attemptId} processed inline`);
        continue;
      }

      schedulerLog("grading", `quiz ${quizId}: attempt ${jobData.attemptId} checking existing queue job`);
      const existing = await getQuizSubmissionJob(jobData.attemptId);
      if (existing) {
        const state = await existing.getState();
        schedulerLog(
          "grading",
          `quiz ${quizId}: attempt ${jobData.attemptId} already has a queue job (state=${state})`
        );
        if (state !== "failed") {
          schedulerLog("grading", `quiz ${quizId}: attempt ${jobData.attemptId} skipped because job is ${state}`);
          continue;
        }
        schedulerLog("grading", `quiz ${quizId}: attempt ${jobData.attemptId} previous job failed, removing it`);
        await existing.remove();
      }

      // Keep a durable fallback so a status poll can recover if the worker is
      // unavailable, then add the same job to BullMQ.
      schedulerLog("grading", `quiz ${quizId}: attempt ${jobData.attemptId} storing durable fallback`);
      await storeFallbackQuizSubmission(jobData).catch((error) => {
        schedulerLog("grading", `quiz ${quizId}: attempt ${jobData.attemptId} fallback store failed`, error);
      });
      schedulerLog("grading", `quiz ${quizId}: attempt ${jobData.attemptId} adding job to BullMQ`);
      await enqueueQuizSubmission(jobData);
      enqueued += 1;
      schedulerLog("grading", `quiz ${quizId}: attempt ${jobData.attemptId} queued successfully`);
    } catch (error) {
      schedulerLog("grading", `quiz ${quizId}: attempt ${jobData.attemptId} queueing failed`, error);
    }
  }

  schedulerLog("grading", `quiz ${quizId}: checking whether the responses email can be queued`);
  try {
    const queued = await maybeQueueQuizResponsesEmail(quizId);
    schedulerLog(
      "grading",
      `quiz ${quizId}: responses email check completed (queued=${queued}, attemptsQueued=${enqueued})`
    );
  } catch (error) {
    schedulerLog("grading", `quiz ${quizId}: responses email check failed`, error);
  }

  schedulerLog("grading", `quiz ${quizId}: DONE (${enqueued} attempt(s) queued)`);
  return enqueued;
}

/** Poll target used on deployments without a long-lived worker/cron. */
export async function enqueueDueQuizResultCalculations(): Promise<number> {
  schedulerLog("grading", "polling database for quizzes that have ended with ungraded attempts");
  const quizIds = await quizService.getQuizIdsAwaitingResultCalculation();
  schedulerLog(
    "grading",
    `database poll returned ${quizIds.length} quiz(zes)${quizIds.length > 0 ? `: [${quizIds.join(", ")}]` : ""}`
  );

  let enqueued = 0;
  for (const quizId of quizIds) {
    schedulerLog("grading", `quiz ${quizId}: beginning result calculation sweep`);
    const queuedForQuiz = await enqueueQuizResultCalculation(quizId);
    enqueued += queuedForQuiz;
    schedulerLog("grading", `quiz ${quizId}: sweep complete (${queuedForQuiz} attempt(s) queued)`);
  }

  schedulerLog("grading", `result calculation poll complete: ${enqueued} total attempt(s) queued`);
  return enqueued;
}

/**
 * Kept for existing request-time callers. It now enqueues the attempts instead
 * of grading inline, so request latency stays independent of class size.
 */
export async function finalizeExpiredQuizAttempts(options: {
  quizId: number;
  userId?: number;
}): Promise<number> {
  return enqueueQuizResultCalculation(options.quizId, options.userId);
}
