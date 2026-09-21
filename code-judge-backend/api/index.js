// Vercel Serverless Entry Point
// This file is the entry for @vercel/node. It imports the Express app
// from the main application file and exports it. Vercel will handle
// routing to this function for all requests.
// No app.listen() is called here — Vercel manages the server.
import app from '../src/app.js';

export default app;
