import express, { type Express, type Request, type Response } from 'express';
import app from './app.ts';
import { startQuizReportWorker } from './workers/quizReportWorker.ts';

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Start background workers
  startQuizReportWorker();
});
