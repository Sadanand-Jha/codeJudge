import express, { type Express, type Request, type Response } from 'express';
import app from './app.ts';

 

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CodeJudge Backend Running 🚀"
  });
});
app.listen(process.env.PORT || 8000, () => {
  console.log(`Server is running on port ${process.env.PORT || 8000}`);
})