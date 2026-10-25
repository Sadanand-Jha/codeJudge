// Periodic end-of-quiz trigger for long-lived hosts. Grades attempts that are
// still pending when the quiz window closes and sends any missing report email.
import { enqueueDueQuizResultCalculations } from "../services/quizSubmission.service.ts";
import { queueDueQuizResponsesEmails } from "../services/quizResultsEmail.service.ts";
import { isQuizSubmissionQueueConfigured } from "./quizSubmission.queue.ts";
import { schedulerLog } from "../utils/schedulerLog.ts";

const SCHEDULER_INTERVAL_MS = 15_000;

declare global {
  // eslint-disable-next-line no-var
  var __quizResultScheduler: ReturnType<typeof setInterval> | undefined;
}

let schedulerTickCount = 0;
let tickInFlight = false;

export function startQuizResultScheduler(): ReturnType<typeof setInterval> | null {
  schedulerLog("lifecycle", "startQuizResultScheduler() called");
  if (global.__quizResultScheduler) {
    schedulerLog("lifecycle", "scheduler already running in this process; reusing existing timer");
    return global.__quizResultScheduler;
  }
  if (!isQuizSubmissionQueueConfigured()) {
    schedulerLog("lifecycle", "scheduler skipped because REDIS_URL is not configured");
    return null;
  }

  const tick = async () => {
    if (tickInFlight) {
      schedulerLog("tick", "previous tick is still running; skipping this interval");
      return;
    }

    tickInFlight = true;
    schedulerTickCount += 1;
    const tickId = schedulerTickCount;
    const tickStartedAt = Date.now();
    schedulerLog("tick", `#${tickId} START`);

    try {
      schedulerLog("tick", `#${tickId} step 1/2 START: polling for quizzes with ungraded attempts`);
      const enqueued = await enqueueDueQuizResultCalculations();
      schedulerLog(
        "tick",
        `#${tickId} step 1/2 END: ${enqueued} attempt(s) queued in ${Date.now() - tickStartedAt}ms`
      );

      const emailStepStartedAt = Date.now();
      schedulerLog("tick", `#${tickId} step 2/2 START: polling for quizzes due a responses email`);
      const queued = await queueDueQuizResponsesEmails();
      schedulerLog(
        "tick",
        `#${tickId} step 2/2 END: ${queued} responses email job(s) queued in ${Date.now() - emailStepStartedAt}ms`
      );
    } catch (error) {
      schedulerLog("tick", `#${tickId} FAILED`, error);
    } finally {
      tickInFlight = false;
      schedulerLog(
        "tick",
        `#${tickId} END in ${Date.now() - tickStartedAt}ms; next tick scheduled in ${SCHEDULER_INTERVAL_MS / 1000}s`
      );
    }
  };

  schedulerLog("lifecycle", "running initial tick immediately after startup");
  void tick();

  const timer = setInterval(() => {
    void tick();
  }, SCHEDULER_INTERVAL_MS);
  timer.unref?.();
  global.__quizResultScheduler = timer;

  schedulerLog(
    "lifecycle",
    `scheduler started (interval=${SCHEDULER_INTERVAL_MS / 1000}s, next scheduled tick at ${new Date(Date.now() + SCHEDULER_INTERVAL_MS).toISOString()})`
  );
  return timer;
}
