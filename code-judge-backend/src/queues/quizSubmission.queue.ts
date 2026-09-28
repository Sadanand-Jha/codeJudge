// BullMQ queue for quiz submissions.
// Submit flow: POST /attempt/:attemptId/submit enqueues one job per attempt
// (jobId = quiz-submit:{attemptId}, so double-submits dedupe to one job) and
// returns 202 immediately. A worker grades in the background; the client polls
// GET /attempt/:attemptId/submit-status until completed/failed.
import { Queue, type Job } from "bullmq";
import { getBullmqConnection } from "./connection.ts";

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
