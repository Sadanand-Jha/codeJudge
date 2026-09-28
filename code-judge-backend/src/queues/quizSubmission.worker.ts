// BullMQ worker for the quiz-submissions queue.
// Long-lived processes (local dev server, VPS worker) call
// startQuizSubmissionWorker() once at boot. Serverless (Vercel) cannot host
// a worker — there the submit endpoint falls back to inline processing.
import { Worker, type Job } from "bullmq";
import { getBullmqConnection } from "./connection.ts";
import {
  QUIZ_SUBMISSION_QUEUE,
  type QuizSubmissionJobData,
} from "./quizSubmission.queue.ts";
import { processQuizSubmission } from "../services/quizSubmission.service.ts";

const WORKER_CONCURRENCY = Number(process.env.QUIZ_SUBMISSION_CONCURRENCY || 3);

export function startQuizSubmissionWorker(): Worker<QuizSubmissionJobData> | null {
  if (global.__bullmqWorkerStarted) {
    return null;
  }
  global.__bullmqWorkerStarted = true;

  const worker = new Worker<QuizSubmissionJobData>(
    QUIZ_SUBMISSION_QUEUE,
    async (job: Job<QuizSubmissionJobData>) => {
      console.log(`[bullmq] grading submission job ${job.id} (attempt ${job.data.attemptId}, try ${job.attemptsMade + 1})`);
      const result = await processQuizSubmission(job.data);
      console.log(`[bullmq] submission job ${job.id} completed`);
      return result;
    },
    {
      connection: getBullmqConnection(),
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[bullmq] submission job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
  });
  worker.on("error", (err) => {
    console.error("[bullmq] worker error:", err.message);
  });

  console.log(`[bullmq] quiz-submissions worker started (concurrency=${WORKER_CONCURRENCY})`);
  return worker;
}
