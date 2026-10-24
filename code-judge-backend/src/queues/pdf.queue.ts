// BullMQ queue for PDF rendering. Playwright/Chromium is CPU-heavy, so PDF
// jobs run in a dedicated worker with a hard concurrency cap of 2. The API
// waits for the job result (base64) and streams the PDF back to the client.
import { Queue, QueueEvents, type Job } from "bullmq";
import { getBullmqConnection } from "./connection.ts";
import { renderPaperPdf, type PaperPdfInput } from "../services/paperPdf.service.ts";

export const PDF_QUEUE = "pdf-generation";

export type PdfJobData = PaperPdfInput;

export function isPdfQueueConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

declare global {
  // eslint-disable-next-line no-var
  var __pdfQueue: Queue<PdfJobData> | undefined;
  // eslint-disable-next-line no-var
  var __pdfQueueEvents: QueueEvents | undefined;
}

export function getPdfQueue(): Queue<PdfJobData> {
  if (!global.__pdfQueue) {
    global.__pdfQueue = new Queue<PdfJobData>(PDF_QUEUE, {
      connection: getBullmqConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return global.__pdfQueue;
}

export function getPdfQueueEvents(): QueueEvents {
  if (!global.__pdfQueueEvents) {
    global.__pdfQueueEvents = new QueueEvents(PDF_QUEUE, {
      connection: getBullmqConnection(),
    });
  }
  return global.__pdfQueueEvents;
}

/**
 * Render a PDF in the background worker and wait for the buffer. Without a
 * configured Redis (or worker) it falls back to inline rendering.
 */
export async function renderPaperPdfQueued(input: PaperPdfInput): Promise<Buffer> {
  if (!isPdfQueueConfigured()) {
    return renderPaperPdf(input);
  }

  const queue = getPdfQueue();
  const workers = await queue.getWorkersCount().catch(() => 0);
  if (workers === 0) {
    // Serverless / worker-less deployments cannot consume the job.
    return renderPaperPdf(input);
  }
  const job = await queue.add("render-paper-pdf", input);
  const base64 = await job.waitUntilFinished(getPdfQueueEvents(), 120_000);
  return Buffer.from(String(base64), "base64");
}

export type PdfJob = Job<PdfJobData>;
