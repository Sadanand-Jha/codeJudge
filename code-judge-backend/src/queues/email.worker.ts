// Worker for transactional emails. Concurrency is hard-capped at 2.
import { Worker, type Job } from "bullmq";
import { getBullmqConnection } from "./connection.ts";
import { EMAIL_QUEUE, type EmailJobData } from "./email.queue.ts";
import { sendOtpEmail } from "../services/email.ts";
import { sendMarksheetEmail } from "../services/email.service.ts";

declare global {
  // eslint-disable-next-line no-var
  var __emailWorkerStarted: boolean | undefined;
}

const WORKER_CONCURRENCY = Math.min(
  2,
  Math.max(1, Number(process.env.EMAIL_QUEUE_CONCURRENCY) || 2)
);

export function startEmailWorker(): Worker<EmailJobData> | null {
  if (global.__emailWorkerStarted) return null;
  global.__emailWorkerStarted = true;

  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE,
    async (job: Job<EmailJobData>) => {
      if (job.data.type === "otp") {
        await sendOtpEmail({ to: job.data.to, otp: job.data.otp });
        return;
      }

      const { payload } = job.data;
      await sendMarksheetEmail({
        ...payload,
        endTime: new Date(payload.endTime),
        marksheetBuffer: Buffer.from(payload.marksheetBase64, "base64"),
      });
    },
    {
      connection: getBullmqConnection(),
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[bullmq] email job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
  });
  worker.on("error", (err) => {
    console.error("[bullmq] email worker error:", err.message);
  });

  console.log(`[bullmq] email worker started (concurrency=${WORKER_CONCURRENCY})`);
  return worker;
}
