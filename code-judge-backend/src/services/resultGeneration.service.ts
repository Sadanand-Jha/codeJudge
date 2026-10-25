// Quiz result generation orchestrator. Evaluates all student answers (objective
// + subjective/AI), computes scores with marks/negative marking, generates the
// marksheet, and optionally sends it via email.
import { pool } from "../config/database.ts";
import { generateMarksheet } from "./marksheet.service.ts";
import { enqueueResultEmail } from "../queues/email.queue.ts";
import logger from "../utils/logger.ts";
import {
  enqueueQuizResultCalculation,
  processQuizRecalculation,
} from "./quizSubmission.service.ts";

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
      `SELECT q.*, u.email AS creator_email, u.username AS creator_username,
              qs.name AS quiz_status_name
       FROM quiz q
       JOIN users u ON u.id = q.createdby
       LEFT JOIN quiz_status qs ON qs.id = q.quiz_status
       WHERE q.id = $1`,
      [quizId]
    );
    const quiz = quizResult.rows[0];
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    const quizEnded =
      String(quiz.quiz_status_name ?? "").toLowerCase() === "ended"
      || (quiz.endtime != null && new Date(quiz.endtime).getTime() <= Date.now());
    if (!quizEnded) {
      throw new Error("QUIZ_NOT_ENDED");
    }

    const countPendingAttempts = async () => {
      const pendingAttempts = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM quiz_attempt
         WHERE quiz_id = $1 AND status = 'in_progress' AND deleted_at IS NULL`,
        [quizId]
      );
      return Number(pendingAttempts.rows[0]?.count ?? 0);
    };
    if (await countPendingAttempts() > 0) {
      await enqueueQuizResultCalculation(Number(quizId));
      if (await countPendingAttempts() > 0) {
        throw new Error("RESULTS_PENDING");
      }
    }

    const recalculation = await processQuizRecalculation({
      quizId: Number(quizId),
      revision: "",
    });
    const evaluatedCount = recalculation.attempts;

    let emailSent = false;
    let emailError: string | undefined;

    if (sendEmail) {
      try {
        const { buffer, stats } = await generateMarksheet(quizId);
        await enqueueResultEmail({
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

    logger.info(`Results generated for quiz ${quizId}: ${evaluatedCount} submissions evaluated`);

    return {
      emailSent,
      emailError,
      stats: {
        evaluated: evaluatedCount,
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
      await enqueueResultEmail({
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
