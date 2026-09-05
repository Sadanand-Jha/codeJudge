// Quiz result generation orchestrator. Evaluates all student answers (objective
// + subjective/AI), computes scores with marks/negative marking, generates the
// marksheet, and optionally sends it via email.
import { pool } from "../app.ts";
import { generateMarksheet } from "./marksheet.service.ts";
import { sendMarksheetEmail } from "./email.service.ts";
import logger from "../utils/logger.ts";
import {
  parseStudentAnswer,
  evaluateObjectiveAnswer,
  evaluateSubjectiveAnswer,
  isObjectiveQuestion,
  requiresAIEvaluation,
  type ProblemOption,
  type ProblemMeta,
  type StudentAnswer,
} from "../quiz-evaluation.ts";

export interface GenerateResultsOptions {
  force?: boolean;
  sendEmail?: boolean;
}

export interface GenerateResultsResponse {
  emailSent: boolean;
  emailError?: string;
  stats: {
    evaluated: number;
  };
}

export class ResultGenerationService {
  async hasGeneratedResults(quizId: number): Promise<boolean> {
    const query = `
      SELECT 1 FROM quiz_attempt
      WHERE quiz_id = $1 AND status = 'completed' AND rank IS NOT NULL
      LIMIT 1
    `;
    const result = await pool.query(query, [quizId]);
    return result.rows.length > 0;
  }

  async generateResults(quizId: number, opts: GenerateResultsOptions = {}): Promise<GenerateResultsResponse> {
    const { force = false, sendEmail = true } = opts;

    const alreadyGenerated = await this.hasGeneratedResults(quizId);
    if (alreadyGenerated && !force) {
      throw new Error("RESULTS_ALREADY_GENERATED");
    }

    const quizResult = await pool.query(
      `SELECT q.*, u.email AS creator_email, u.username AS creator_username
       FROM quiz q
       JOIN users u ON u.id = q.createdby
       WHERE q.id = $1`,
      [quizId]
    );
    const quiz = quizResult.rows[0];
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    const submissionsResult = await pool.query(
      `SELECT qa.id AS attempt_id, qa.user_id, qa.quiz_id, qa.total_questions,
              qa.time_taken, qa.completed_at, qa.status
       FROM quiz_attempt qa
       WHERE qa.quiz_id = $1 AND qa.status = 'completed'
       ORDER BY qa.completed_at ASC`,
      [quizId]
    );
    const submissions = submissionsResult.rows;

    const problemsResult = await pool.query(
      `SELECT qp.id, qp.quiz_id, qp.question_number, qp.quiz_problem_type,
              qp.marks, qp.negative_marks
       FROM quiz_problems qp
       WHERE qp.quiz_id = $1
       ORDER BY qp.question_number ASC`,
      [quizId]
    );
    const problems = problemsResult.rows;

    const optionsResult = await pool.query(
      `SELECT qpo.id, qpo.problem_id, qpo.option_statement, qpo.option_description,
              qpo.iscorrect, qpo.matching_target
       FROM quiz_problem_options qpo
       JOIN quiz_problems qp ON qp.id = qpo.problem_id
       WHERE qp.quiz_id = $1`,
      [quizId]
    );
    const options = optionsResult.rows;

    const problemIds = problems.map((p: any) => p.id);
    const optionsByProblem = new Map<number, any[]>();
    for (const option of options) {
      if (!optionsByProblem.has(option.problem_id)) {
        optionsByProblem.set(option.problem_id, []);
      }
      optionsByProblem.get(option.problem_id)!.push(option);
    }

    const responsesResult = await pool.query(
      `SELECT qa.user_id, qsr.problem_id, qsr.answer
       FROM quiz_student_response qsr
       JOIN quiz_attempt qa ON qa.id = qsr.attempt_id
       WHERE qsr.problem_id = ANY($1::int[])`,
      [problemIds]
    );
    const responses = responsesResult.rows;

    const responsesByUser = new Map<number, Map<number, unknown>>();
    for (const response of responses) {
      if (!responsesByUser.has(response.user_id)) {
        responsesByUser.set(response.user_id, new Map());
      }
      responsesByUser.get(response.user_id)!.set(response.problem_id, response.answer);
    }

    const evaluatedResults: Array<{
      attemptId: number;
      userId: number;
      score: number;
      correctAnswers: number;
      wrongAnswers: number;
      skippedQuestions: number;
      percentage: number;
      timeTaken: number | null;
      completedAt: Date | null;
    }> = [];

    for (const submission of submissions) {
      const userResponses = responsesByUser.get(submission.user_id) || new Map();
      let score = 0;
      let correctAnswers = 0;
      let wrongAnswers = 0;
      let skippedQuestions = problems.length;

      for (const problem of problems) {
        const rawAnswer = userResponses.get(problem.id);
        if (rawAnswer === undefined || rawAnswer === null) {
          continue;
        }

        const problemOptions = optionsByProblem.get(problem.id) || [];
        const problemMeta: ProblemMeta = {
          id: problem.id,
          quiz_id: problem.quiz_id,
          quiz_problem_type: problem.quiz_problem_type,
          marks: problem.marks,
          negative_marks: problem.negative_marks,
        };

        // Parse the answer using the centralized parser
        const parseResult = parseStudentAnswer(
          problem.quiz_problem_type,
          rawAnswer
        );

        if (!parseResult.success) {
          // Invalid answer format - count as wrong
          skippedQuestions--;
          wrongAnswers++;
          continue;
        }

        skippedQuestions--;

        // Evaluate based on question type
        if (isObjectiveQuestion(problem.quiz_problem_type)) {
          const evalResult = evaluateObjectiveAnswer(
            parseResult.parsed,
            problemOptions as ProblemOption[],
            problemMeta
          );
          score += evalResult.score;
          if (evalResult.isCorrect) {
            correctAnswers++;
          } else {
            wrongAnswers++;
          }
        } else if (requiresAIEvaluation(problem.quiz_problem_type)) {
          // For subjective questions, we'll skip AI evaluation in batch mode
          // and mark as needing manual review
          // AI evaluation can be triggered separately per-question
          wrongAnswers++;
        } else {
          // Unknown question type - skip
          wrongAnswers++;
        }
      }

      const totalQuestions = problems.length;
      const percentage = totalQuestions > 0
        ? parseFloat(((correctAnswers / totalQuestions) * 100).toFixed(2))
        : 0;

      evaluatedResults.push({
        attemptId: submission.attempt_id,
        userId: submission.user_id,
        score,
        correctAnswers,
        wrongAnswers,
        skippedQuestions,
        percentage,
        timeTaken: submission.time_taken,
        completedAt: submission.completed_at,
      });
    }

    const sorted = [...evaluatedResults].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aTime = a.timeTaken ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.timeTaken ?? Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return aDate - bDate;
    });

    const ranks = new Map<number, number>();
    let currentRank = 0;
    let previousScore: number | null = null;
    let previousTime: number | null = null;
    let previousDate: number | null = null;

    for (const result of sorted) {
      const time = result.timeTaken ?? Number.MAX_SAFE_INTEGER;
      const date = result.completedAt ? new Date(result.completedAt).getTime() : 0;

      if (
        previousScore !== null &&
        result.score === previousScore &&
        time === previousTime &&
        date === previousDate
      ) {
        // Tie - same rank
      } else {
        currentRank++;
      }

      ranks.set(result.attemptId, currentRank);
      previousScore = result.score;
      previousTime = time;
      previousDate = date;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const result of evaluatedResults) {
        const rank = ranks.get(result.attemptId) || 0;
        await client.query(
          `UPDATE quiz_attempt
           SET score = $1, percentage = $2, correct_answers = $3,
               wrong_answers = $4, skipped_questions = $5, rank = $6,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $7`,
          [
            result.score,
            result.percentage,
            result.correctAnswers,
            result.wrongAnswers,
            result.skippedQuestions,
            rank,
            result.attemptId,
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    let emailSent = false;
    let emailError: string | undefined;

    if (sendEmail) {
      try {
        const { buffer, stats } = await generateMarksheet(quizId);
        await sendMarksheetEmail({
          to: quiz.creator_email,
          quizName: quiz.name,
          quizCode: quiz.code,
          endTime: quiz.endtime,
          marksheetBuffer: buffer,
          stats,
        });
        emailSent = true;
      } catch (error) {
        emailError = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to send marksheet email for quiz ${quizId}:`, error);
      }
    }

    logger.info(`Results generated for quiz ${quizId}: ${evaluatedResults.length} submissions evaluated`);

    return {
      emailSent,
      emailError,
      stats: {
        evaluated: evaluatedResults.length,
      },
    };
  }

  async retryEmail(quizId: number): Promise<{ emailSent: boolean; emailError?: string }> {
    const quizResult = await pool.query(
      `SELECT q.*, u.email AS creator_email
       FROM quiz q
       JOIN users u ON u.id = q.createdby
       WHERE q.id = $1`,
      [quizId]
    );
    const quiz = quizResult.rows[0];
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    try {
      const { buffer, stats } = await generateMarksheet(quizId);
      await sendMarksheetEmail({
        to: quiz.creator_email,
        quizName: quiz.name,
        quizCode: quiz.code,
        endTime: quiz.endtime,
        marksheetBuffer: buffer,
        stats,
      });
      return { emailSent: true };
    } catch (error) {
      const emailError = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to retry email for quiz ${quizId}:`, error);
      return { emailSent: false, emailError };
    }
  }
}