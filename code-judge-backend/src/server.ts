// Application entry point. Imports the configured Express app and starts the
// HTTP server plus background workers on long-lived hosts (VPS/local). On
// Vercel, the app is imported via api/index.js and workers are skipped.
import app from './app.ts';
import { startQuizSubmissionWorker } from './queues/quizSubmission.worker.ts';
import { startQuizResultScheduler } from './queues/quizResult.scheduler.ts';
import { startEmailWorker } from './queues/email.worker.ts';
import { startPdfWorker } from './queues/pdf.worker.ts';

const PORT = process.env.PORT || 8000;
const isVercel = process.env.VERCEL === '1';
const shouldStartWorkers = !isVercel && process.env.DISABLE_BACKGROUND_WORKERS !== '1';

if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`   → http://localhost:${PORT}/health`);
  });
}

if (shouldStartWorkers) {
  try {
    startQuizSubmissionWorker();
    startQuizResultScheduler();
    startEmailWorker();
    startPdfWorker();
  } catch (err: any) {
    console.warn('⚠️ Background workers failed to start (durable recovery queue remains available):', err.message);
  }
}

export default app;
