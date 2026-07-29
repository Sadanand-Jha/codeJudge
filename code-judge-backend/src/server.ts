import express, { type Express, type Request, type Response } from 'express';
import app from './app.ts';



app.listen(process.env.PORT || 8000, () => {
  console.log(`Server is running on port ${process.env.PORT || 8000}`);
})