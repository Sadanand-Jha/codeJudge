// Application entry point. Imports the configured Express app and starts the
// HTTP server plus background workers on long-lived hosts (VPS/local). On
// Vercel, the app is imported via api/index.js and workers are skipped.
import type { Server } from 'node:http';
import type { Worker } from 'bullmq';
import app, { pool } from './app.ts';
import redisClient from './config/redis.ts';
import { closeBullmqConnection } from './queues/connection.ts';
import { startQuizSubmissionWorker } from './queues/quizSubmission.worker.ts';
import { startQuizRecalculationWorker } from './queues/quizRecalculation.worker.ts';
import { startQuizResultScheduler } from './queues/quizResult.scheduler.ts';
import { startEmailWorker } from './queues/email.worker.ts';
import { startPdfWorker } from './queues/pdf.worker.ts';
import { closePaperPdfBrowser } from './services/paperPdf.service.ts';

const PORT = process.env.PORT || 8000;
const isVercel = process.env.VERCEL === '1';
const shouldStartWorkers = !isVercel && process.env.DISABLE_BACKGROUND_WORKERS !== '1';

let httpServer: Server | null = null;
let resultScheduler: ReturnType<typeof setInterval> | null = null;
const startedWorkers: Worker[] = [];

if (!isVercel) {
  httpServer = app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`   → http://localhost:${PORT}/health`);
  });

  redisClient.connect().catch((err: Error) => {
    console.error('⚠️ Redis connection failed:', err.message);
  });
}

if (shouldStartWorkers) {
  try {
    for (const start of [
      startQuizSubmissionWorker,
      startQuizRecalculationWorker,
      startEmailWorker,
      startPdfWorker,
    ]) {
      const worker = start();
      if (worker) startedWorkers.push(worker);
    }
    resultScheduler = startQuizResultScheduler();
  } catch (err: any) {
    console.warn('⚠️ Background workers failed to start (durable recovery queue remains available):', err.message);
  }
}

// Docker/systemd stop sends SIGTERM. Without this handler Node exits
// immediately in production, cutting in-flight requests and Chromium jobs.
if (!isVercel && process.env.NODE_ENV === 'production') {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[api] received ${signal}; shutting down`);

    const forceExit = setTimeout(() => {
      console.error('[api] graceful shutdown timed out; forcing exit');
      process.exit(1);
    }, 30_000);
    forceExit.unref();

    try {
      if (resultScheduler) clearInterval(resultScheduler);

      const httpClosed = new Promise<void>((resolve) => {
        if (!httpServer) return resolve();
        httpServer.close(() => resolve());
        httpServer.closeIdleConnections();
      });

      // Let active BullMQ jobs finish and keep queued jobs for the next start.
      await Promise.allSettled(startedWorkers.map((worker) => worker.close()));
      await httpClosed;
      await closePaperPdfBrowser();
      await closeBullmqConnection();
      await pool.end().catch(() => {});
      await redisClient.quit().catch(() => {});
    } catch (err) {
      console.error('[api] shutdown error:', err);
    }

    clearTimeout(forceExit);
    process.exit(0);
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

export default app;
