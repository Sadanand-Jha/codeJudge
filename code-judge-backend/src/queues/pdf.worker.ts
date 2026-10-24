// Worker for PDF rendering. Playwright is CPU/memory heavy — hard cap of 2.
import { Worker, type Job } from "bullmq";
import { getBullmqConnection } from "./connection.ts";
import { PDF_QUEUE, type PdfJobData } from "./pdf.queue.ts";
import { renderPaperPdf } from "../services/paperPdf.service.ts";

declare global {
  // eslint-disable-next-line no-var
  var __pdfWorkerStarted: boolean | undefined;
}

const WORKER_CONCURRENCY = Math.min(
  2,
  Math.max(1, Number(process.env.PDF_QUEUE_CONCURRENCY) || 2)
);

export function startPdfWorker(): Worker<PdfJobData> | null {
  if (global.__pdfWorkerStarted) return null;
  global.__pdfWorkerStarted = true;

  const worker = new Worker<PdfJobData>(
    PDF_QUEUE,
    async (job: Job<PdfJobData>) => {
      const buffer = await renderPaperPdf(job.data);
      return buffer.toString("base64");
    },
    {
      connection: getBullmqConnection(),
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[bullmq] PDF job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
  });
  worker.on("error", (err) => {
    console.error("[bullmq] PDF worker error:", err.message);
  });

  console.log(`[bullmq] PDF worker started (concurrency=${WORKER_CONCURRENCY})`);
  return worker;
}
