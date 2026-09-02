// Application entry point. Imports the configured Express app and starts the
// HTTP server on the port defined by the PORT environment variable (default 8000).
import express, { type Express, type Request, type Response } from 'express';
import app from './app.ts';

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});