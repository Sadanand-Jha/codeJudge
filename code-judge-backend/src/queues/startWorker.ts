// Standalone worker entry: `npm run worker`.
// Used on a VPS / long-lived host where the API and worker run as separate
// processes. Keeps running until SIGTERM/SIGINT.
import "dotenv/config";
import { startQuizSubmissionWorker } from "./quizSubmission.worker.ts";

startQuizSubmissionWorker();

const shutdown = async (signal: string) => {
  console.log(`[bullmq] received ${signal}, shutting down worker...`);
  const { getBullmqConnection } = await import("./connection.ts");
  try {
    await getBullmqConnection().quit();
  } catch {}
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
