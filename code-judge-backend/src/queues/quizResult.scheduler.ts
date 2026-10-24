// Periodic end-of-quiz trigger for long-lived hosts. Grades only when the quiz
// window is closed (teacher stop or scheduled end), never at submit time.
import { enqueueDueQuizResultCalculations } from "../services/quizSubmission.service.ts";
import { isQuizSubmissionQueueConfigured } from "./quizSubmission.queue.ts";

const SCHEDULER_INTERVAL_MS = 15_000;

declare global {
  // eslint-disable-next-line no-var
  var __quizResultScheduler: ReturnType<typeof setInterval> | undefined;
}

export function startQuizResultScheduler(): ReturnType<typeof setInterval> | null {
  if (global.__quizResultScheduler) return global.__quizResultScheduler;
  if (!isQuizSubmissionQueueConfigured()) {
    console.warn("[bullmq] result scheduler skipped: REDIS_URL is not configured");
    return null;
  }

  const tick = () => {
    void enqueueDueQuizResultCalculations().catch((error) => {
      console.error("[bullmq] result scheduler tick failed:", error);
    });
  };

  tick();
  const timer = setInterval(tick, SCHEDULER_INTERVAL_MS);
  timer.unref?.();
  global.__quizResultScheduler = timer;
  console.log(`[bullmq] result scheduler started (every ${SCHEDULER_INTERVAL_MS / 1000}s)`);
  return timer;
}
