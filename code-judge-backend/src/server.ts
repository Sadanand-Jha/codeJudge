// Application entry point. Imports the configured Express app and starts the
// HTTP server ONLY when running locally. On Vercel, the app is imported via
// api/index.js and handled as a serverless function (no listen).
import app from './app.ts';
import { startQuizSubmissionWorker } from './queues/quizSubmission.worker.ts';

const PORT = process.env.PORT || 8000;

// Only start HTTP server when running locally.
// On Vercel, NODE_ENV === 'production' and VERCEL === '1', so this block is skipped
// and Vercel's serverless handler (api/index.js) will handle requests.
// Equivalent to `if (require.main === module)` for ESM.
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server is running locally on port ${PORT}`);
    console.log(`   → http://localhost:${PORT}/health`);
  });
  // Long-lived process: grade quiz submissions in-process. Vercel serverless
  // cannot host a worker — use `npm run worker` on a persistent host, or the
  // submit endpoint falls back to inline grading.
  try {
    startQuizSubmissionWorker();
  } catch (err: any) {
    console.warn('⚠️ Quiz submission worker failed to start (submit falls back to inline grading):', err.message);
  }
}

export default app;
