const PREFIX = "[quiz-scheduler";

export function schedulerLog(scope: string, message: string, ...args: unknown[]): void {
  if (process.env.QUIZ_SCHEDULER_VERBOSE === "0") return;
  console.log(`${PREFIX} ${new Date().toISOString()}] [${scope}] ${message}`, ...args);
}
