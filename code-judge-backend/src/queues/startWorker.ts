// Standalone worker entry: `npm run worker`.
// Used on a VPS / long-lived host where the API and worker run as separate
// processes. Keeps running until SIGTERM/SIGINT.
import "dotenv/config";
import type { Worker } from "bullmq";
import { closeBullmqConnection } from "./connection.ts";
import { startQuizSubmissionWorker } from "./quizSubmission.worker.ts";
import { startQuizRecalculationWorker } from "./quizRecalculation.worker.ts";
import { startQuizResultScheduler } from "./quizResult.scheduler.ts";
import { startEmailWorker } from "./email.worker.ts";
import { startPdfWorker } from "./pdf.worker.ts";
import { closePaperPdfBrowser } from "../services/paperPdf.service.ts";

const workers: Worker[] = [
  startQuizSubmissionWorker,
  startQuizRecalculationWorker,
  startEmailWorker,
  startPdfWorker,
]
  .map((start) => start())
  .filter((worker): worker is Worker => worker !== null);

const resultScheduler = startQuizResultScheduler();

let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[bullmq] received ${signal}, shutting down worker...`);

  // Give BullMQ time to finish active jobs; queued jobs remain in Redis.
  const forceExit = setTimeout(() => {
    console.error("[bullmq] graceful shutdown timed out; forcing exit");
    process.exit(1);
  }, 55_000);
  forceExit.unref();

  if (resultScheduler) clearInterval(resultScheduler);

  try {
    await Promise.allSettled(workers.map((worker) => worker.close()));
    await closePaperPdfBrowser();
    await closeBullmqConnection();
  } catch (error) {
    console.error("[bullmq] shutdown error:", error);
  }

  clearTimeout(forceExit);
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
