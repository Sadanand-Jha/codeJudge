import cron from "node-cron";
import { pool } from "../app.ts";
import { generateMarksheet } from "../services/marksheet.service.ts";
import { sendMarksheetEmail } from "../services/email.service.ts";
import  logger  from "../utils/logger.ts";

let isRunning = false;

async function findQuizzesReadyForReport(): Promise<Array<{ id: number; createdby: number; name: string; code: string; endtime: Date }>> {
  const query = `
    SELECT 
      q.id,
      q.createdby,
      q.name,
      q.code,
      q.endtime
    FROM quiz q
    LEFT JOIN quiz_report_jobs j ON j.quiz_id = q.id AND j.status IN ('pending', 'processing', 'completed')
    WHERE 
      q.status = 'published'
      AND q.endtime IS NOT NULL
      AND q.endtime < NOW() - INTERVAL '2 minutes'
      AND j.id IS NULL
    ORDER BY q.endtime ASC
  `;

  const result = await pool.query(query);
  return result.rows;
}

async function processQuizReport(quiz: { id: number; createdby: number; name: string; code: string; endtime: Date }): Promise<void> {
  const jobId = await createReportJob(quiz.id);
  
  try {
    logger.info(`Starting report generation for quiz ${quiz.id}: ${quiz.name}`);
    await updateReportJob(jobId, 'processing');

    const { buffer, stats } = await generateMarksheet(quiz.id);

    const creatorQuery = `SELECT u.email, u.username FROM users u WHERE u.id = $1`;
    const creatorResult = await pool.query(creatorQuery, [quiz.createdby]);
    
    if (!creatorResult.rows.length) {
      throw new Error(`Creator not found for quiz ${quiz.id}`);
    }

    const creator = creatorResult.rows[0];

    await sendMarksheetEmail({
      to: creator.email,
      quizName: quiz.name,
      quizCode: quiz.code,
      endTime: quiz.endtime,
      marksheetBuffer: buffer,
      stats,
    });

    await updateReportJob(jobId, 'completed');
    logger.info(`Report sent successfully for quiz ${quiz.id}`);
  } catch (error) {
    logger.error(`Failed to generate report for quiz ${quiz.id}:`, error);
    await updateReportJob(jobId, 'failed', error instanceof Error ? error.message : String(error));
  }
}

async function createReportJob(quizId: number): Promise<number> {
  const query = `INSERT INTO quiz_report_jobs (quiz_id, status, created_at, updated_at) VALUES ($1, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`;
  const result = await pool.query(query, [quizId]);
  return result.rows[0].id;
}

async function updateReportJob(jobId: number, status: string, errorMessage?: string): Promise<void> {
  const query = `UPDATE quiz_report_jobs SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`;
  await pool.query(query, [status, errorMessage || null, jobId]);
}

async function runWorker(): Promise<void> {
  if (isRunning) {
    logger.warn("Quiz report worker already running, skipping this iteration");
    return;
  }

  isRunning = true;
  logger.info("Quiz report worker started");

  try {
    const quizzes = await findQuizzesReadyForReport();
    logger.info(`Found ${quizzes.length} quizzes ready for report generation`);

    for (const quiz of quizzes) {
      await processQuizReport(quiz);
    }
  } catch (error) {
    logger.error("Error in quiz report worker:", error);
  } finally {
    isRunning = false;
    logger.info("Quiz report worker finished iteration");
  }
}

export function startQuizReportWorker(): void {
  logger.info("Starting quiz report worker (runs every 2 minutes)");
  
  // Run every 2 minutes
  cron.schedule("*/2 * * * *", () => {
    runWorker();
  });

  // Run once on startup after 1 minute
  setTimeout(() => {
    runWorker();
  }, 60000);
}