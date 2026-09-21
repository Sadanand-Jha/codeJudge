// Application entry point. Imports the configured Express app and starts the
// HTTP server ONLY when running locally. On Vercel, the app is imported via
// api/index.js and handled as a serverless function (no listen).
import app from './app.ts';

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
}

export default app;
