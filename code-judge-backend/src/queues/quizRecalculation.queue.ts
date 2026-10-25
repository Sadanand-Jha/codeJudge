// BullMQ queue for teacher-edit driven quiz result recalculation.
// Jobs are quiz-wide (not per attempt) so repeated option saves can be
// coalesced by a revision-based job id.
import { Queue, type Job } from "bullmq";
import { getBullmqConnection } from "./connection.ts";

export const QUIZ_RECALCULATION_QUEUE = "quiz-recalculations";

export interface QuizRecalculationJobData {
  quizId: number;
  revision: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __quizRecalculationQueue: Queue<QuizRecalculationJobData> | undefined;
}

export function isQuizRecalculationQueueConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function quizRecalculationJobId(quizId: number, revision: string): string {
  // BullMQ custom IDs must not contain ":".
  const safeRevision = String(revision || Date.now())
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);
  return `quiz-recalculate-${quizId}-${safeRevision}`;
}

export function getQuizRecalculationQueue(): Queue<QuizRecalculationJobData> {
  if (!global.__quizRecalculationQueue) {
    global.__quizRecalculationQueue = new Queue<QuizRecalculationJobData>(QUIZ_RECALCULATION_QUEUE, {
      connection: getBullmqConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return global.__quizRecalculationQueue;
}

export async function enqueueQuizRecalculation(
  data: QuizRecalculationJobData
): Promise<Job<QuizRecalculationJobData>> {
  const queue = getQuizRecalculationQueue();
  const jobId = quizRecalculationJobId(data.quizId, data.revision);
  const existing = await queue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state !== "failed") return existing;
    await existing.remove();
  }
  return queue.add("recalculate-quiz", data, { jobId });
}
