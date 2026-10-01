// BullMQ queue for quiz submissions.
// Submit flow: POST /attempt/:attemptId/submit enqueues one job per attempt
// (jobId = quiz-submit:{attemptId}, so double-submits dedupe to one job) and
// returns 202 immediately. A worker grades in the background; the client polls
// GET /attempt/:attemptId/submit-status until completed/failed.
import { Queue, type Job } from "bullmq";
import { getBullmqConnection } from "./connection.ts";
import crypto from "node:crypto";
import redisClient from "../config/redis.ts";

export const QUIZ_SUBMISSION_QUEUE = "quiz-submissions";

export interface QuizSubmissionResponse {
  problemId: number;
  option?: string;
  options?: string[];
  textAnswer?: string;
}

export interface QuizSubmissionJobData {
  attemptId: number;
  userId: number;
  responses: QuizSubmissionResponse[];
  violations: number;
  flagged: boolean;
  flagReason?: string;
  /** Late at submit time (enqueue time = submission time). */
  isLate: boolean;
  submittedAt: string;
}

export type QuizSubmissionStatus = "queued" | "processing" | "completed" | "failed" | "none";

export function isQuizSubmissionQueueConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function quizSubmitJobId(attemptId: number | string): string {
  // NOTE: BullMQ custom IDs must not contain ":".
  return `quiz-submit-${attemptId}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __quizSubmissionQueue: Queue<QuizSubmissionJobData> | undefined;
}

export function getQuizSubmissionQueue(): Queue<QuizSubmissionJobData> {
  if (!global.__quizSubmissionQueue) {
    global.__quizSubmissionQueue = new Queue<QuizSubmissionJobData>(QUIZ_SUBMISSION_QUEUE, {
      connection: getBullmqConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }
  return global.__quizSubmissionQueue;
}

export async function enqueueQuizSubmission(
  data: QuizSubmissionJobData
): Promise<Job<QuizSubmissionJobData>> {
  const queue = getQuizSubmissionQueue();
  return queue.add("grade-submission", data, {
    jobId: quizSubmitJobId(data.attemptId),
  });
}

export async function getQuizSubmissionJob(
  attemptId: number | string
): Promise<Job<QuizSubmissionJobData> | undefined> {
  const queue = getQuizSubmissionQueue();
  return queue.getJob(quizSubmitJobId(attemptId));
}

const FALLBACK_TTL_SECONDS = 24 * 60 * 60;
const RECOVERY_LOCK_PREFIX = "quiz-submissions:recovery-lock";
const RECOVERY_CONCURRENCY = Math.min(10, Math.max(1, Number(process.env.QUIZ_SUBMISSION_CONCURRENCY) || 3));

const fallbackKey = (attemptId: number | string) => `quiz-submissions:fallback:${attemptId}`;

/** Durable HTTP-Redis copy used when BullMQ RESP or its worker is unavailable. */
export async function storeFallbackQuizSubmission(data: QuizSubmissionJobData): Promise<void> {
  const stored = await redisClient.setEx(fallbackKey(data.attemptId), FALLBACK_TTL_SECONDS, JSON.stringify(data));
  if (!stored) throw new Error("Submission fallback storage is unavailable");
}

export async function getFallbackQuizSubmission(attemptId: number | string): Promise<QuizSubmissionJobData | null> {
  const stored = await redisClient.get(fallbackKey(attemptId));
  if (!stored) return null;
  try {
    return (typeof stored === "string" ? JSON.parse(stored) : stored) as QuizSubmissionJobData;
  } catch {
    return null;
  }
}

export async function deleteFallbackQuizSubmission(attemptId: number | string): Promise<void> {
  await redisClient.del(fallbackKey(attemptId));
}

/**
 * Cross-instance lock: at most one serverless status poll may perform inline
 * recovery grading at a time. A TTL prevents a crashed invocation deadlocking
 * every later submission.
 */
export async function acquireQuizSubmissionRecoveryLock(): Promise<string | null> {
  for (let slot = 0; slot < RECOVERY_CONCURRENCY; slot += 1) {
    const token = crypto.randomUUID();
    const acquired = await redisClient.set(`${RECOVERY_LOCK_PREFIX}:${slot}`, token, { nx: true, ex: 120 });
    if (acquired === "OK") return `${slot}|${token}`;
  }
  return null;
}

export async function releaseQuizSubmissionRecoveryLock(lock: string): Promise<void> {
  const separator = lock.indexOf("|");
  if (separator <= 0) return;
  const slot = lock.slice(0, separator);
  const token = lock.slice(separator + 1);
  const key = `${RECOVERY_LOCK_PREFIX}:${slot}`;
  const current = await redisClient.get(key);
  if (current === token) await redisClient.del(key);
}
