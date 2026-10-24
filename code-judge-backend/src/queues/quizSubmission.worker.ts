// BullMQ worker for the quiz-submissions queue.
// Long-lived processes (local dev server, VPS worker) call
// startQuizSubmissionWorker() once at boot. Serverless (Vercel) cannot host
// a worker — there the durable Redis recovery payload provides backpressure.
import { Worker, type Job } from "bullmq";
import { getBullmqConnection } from "./connection.ts";
import {
  deleteFallbackQuizSubmission,
  QUIZ_SUBMISSION_QUEUE,
  type QuizSubmissionJobData,
} from "./quizSubmission.queue.ts";
import { processQuizSubmission } from "../services/quizSubmission.service.ts";

// Hard cap: end-of-quiz result calculation may use at most 5 parallel slots.
const WORKER_CONCURRENCY = Math.min(
  5,
  Math.max(1, Number(process.env.QUIZ_SUBMISSION_CONCURRENCY) || 5)
);

export function startQuizSubmissionWorker(): Worker<QuizSubmissionJobData> | null {
  if (global.__bullmqWorkerStarted) {
    return null;
  }
  global.__bullmqWorkerStarted = true;

  const worker = new Worker<QuizSubmissionJobData>(
    QUIZ_SUBMISSION_QUEUE,
    async (job: Job<QuizSubmissionJobData>) => {
      console.log(`[bullmq] result calculation started (job ${job.id}, attempt ${job.data.attemptId}, try ${job.attemptsMade + 1})`);
      // Answers are persisted before the job is enqueued, so grading can start
      // immediately. Concurrency still allows up to 5 parallel jobs.
      const result = await processQuizSubmission(job.data);
      await deleteFallbackQuizSubmission(job.data.attemptId);
      console.log(`[bullmq] result calculation completed for attempt ${job.data.attemptId}`);
      return result;
    },
    {
      connection: getBullmqConnection(),
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[bullmq] result calculation job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
  });
  worker.on("error", (err) => {
    console.error("[bullmq] worker error:", err.message);
  });

  console.log(`[bullmq] quiz-submissions worker started (concurrency=${WORKER_CONCURRENCY})`);
  return worker;
}
