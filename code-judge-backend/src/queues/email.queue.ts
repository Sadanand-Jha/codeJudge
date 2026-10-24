// BullMQ queue for transactional emails (OTP + quiz result marksheets).
// Delivery runs in a background worker with a hard concurrency cap of 2 and
// 3 attempts per job. When REDIS_URL is absent, callers fall back to inline
// delivery so local/serverless deployments keep working.
import { Queue } from "bullmq";
import { getBullmqConnection } from "./connection.ts";
import { sendOtpEmail } from "../services/email.ts";
import { sendMarksheetEmail, type MarksheetEmailPayload } from "../services/email.service.ts";

export const EMAIL_QUEUE = "emails";

export type EmailJobData =
  | { type: "otp"; to: string; otp: string }
  | {
      type: "result";
      payload: Omit<MarksheetEmailPayload, "endTime" | "marksheetBuffer"> & {
        endTime: string;
        marksheetBase64: string;
      };
    };

export function isEmailQueueConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

declare global {
  // eslint-disable-next-line no-var
  var __emailQueue: Queue<EmailJobData> | undefined;
}

export function getEmailQueue(): Queue<EmailJobData> {
  if (!global.__emailQueue) {
    global.__emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE, {
      connection: getBullmqConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }
  return global.__emailQueue;
}

/** Queue an OTP email; falls back to inline delivery without Redis. */
export async function enqueueOtpEmail(to: string, otp: string): Promise<void> {
  if (!isEmailQueueConfigured()) {
    await sendOtpEmail({ to, otp });
    return;
  }
  await getEmailQueue().add("otp-email", { type: "otp", to, otp });
}

/** Queue a quiz result marksheet email (3 attempts). */
export async function enqueueResultEmail(payload: MarksheetEmailPayload): Promise<void> {
  if (!isEmailQueueConfigured()) {
    await sendMarksheetEmail(payload);
    return;
  }
  const { endTime, marksheetBuffer, ...rest } = payload;
  await getEmailQueue().add("result-email", {
    type: "result",
    payload: {
      ...rest,
      endTime: endTime instanceof Date ? endTime.toISOString() : String(endTime),
      marksheetBase64: Buffer.from(marksheetBuffer).toString("base64"),
    },
  });
}
