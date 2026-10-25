// BullMQ worker for teacher-edit driven quiz result recalculation.
import { Worker, type Job } from "bullmq";
import { getBullmqConnection } from "./connection.ts";
import {
  QUIZ_RECALCULATION_QUEUE,
  type QuizRecalculationJobData,
} from "./quizRecalculation.queue.ts";
import { processQuizRecalculation } from "../services/quizSubmission.service.ts";

const WORKER_CONCURRENCY = Math.min(
  2,
  Math.max(1, Number(process.env.QUIZ_RECALCULATION_CONCURRENCY) || 2)
);

declare global {
  // eslint-disable-next-line no-var
  var __quizRecalculationWorkerStarted: boolean | undefined;
}

export function startQuizRecalculationWorker(): Worker<QuizRecalculationJobData> | null {
  if (global.__quizRecalculationWorkerStarted) return null;
  global.__quizRecalculationWorkerStarted = true;

  const worker = new Worker<QuizRecalculationJobData>(
    QUIZ_RECALCULATION_QUEUE,
    async (job: Job<QuizRecalculationJobData>) => {
      console.log(
        `[bullmq] quiz recalculation started (job ${job.id}, quiz ${job.data.quizId})`
      );
      const result = await processQuizRecalculation(job.data);
      console.log(
        `[bullmq] quiz recalculation finished (quiz ${job.data.quizId}, attempts=${result.attempts}, skipped=${result.skipped})`
      );
      return result;
    },
    {
      connection: getBullmqConnection(),
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[bullmq] quiz recalculation job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      err.message
    );
  });
  worker.on("error", (err) => {
    console.error("[bullmq] quiz recalculation worker error:", err.message);
  });

  console.log(`[bullmq] quiz-recalculations worker started (concurrency=${WORKER_CONCURRENCY})`);
  return worker;
}
