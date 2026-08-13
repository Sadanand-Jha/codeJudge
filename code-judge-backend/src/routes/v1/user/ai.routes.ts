/**
 * AI feature routes.
 *
 * Exposes the three AI endpoints used by the frontend AI Studio and the AI
 * chat assistant:
 *
 *   1. POST /chat              — streaming chat (plain JSON body).
 *   2. POST /chat-files        — streaming chat with attached documents
 *                                (multipart/form-data).
 *   3. POST /generate-questions — non-streaming question generation from
 *                                uploaded study material (multipart/form-data).
 *
 * All three are mounted under `/api/v1/user/ai` (see `src/routes/v1/user/index.ts`).
 * The `/chat` and `/chat-files` endpoints emit Server-Sent Events (SSE); the
 * `/generate-questions` endpoint returns a plain JSON response.
 */
import { Router } from "express";
import multer from "multer";
import {
  chat,
  chatWithFiles,
  generateQuestionsFromUpload,
} from "../../../controllers/ai.controller.ts";

const router = Router();

/**
 * Multer upload config shared by the two multipart endpoints.
 *
 * Files are kept in memory (Buffer) rather than written to disk so the
 * controller can hand the raw bytes straight to the text-extraction layer.
 * Limits: 25 MB per file and at most 25 files per request.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 25 },
});

// Streaming chat — JSON body: `{ message?: string }` (legacy) or
// `{ messages: [{ role, content }] }`.
router.post("/chat", chat);

// Streaming chat + document context. `prompt` is a text field, `files` may be
// repeated binary parts (max 25). Text is extracted server-side and the model
// streams its reply over SSE.
router.post("/chat-files", upload.array("files", 25), chatWithFiles);

// One-shot question generation. Multipart form fields carry the generation
// options (numberOfQuestions, questionTypes, difficulty, bloomsLevel, …) and
// `files` carries the study material. Returns JSON `{ success, data }`.
router.post("/generate-questions", upload.array("files", 25), generateQuestionsFromUpload);

export default router;