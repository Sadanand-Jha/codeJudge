/**
 * AI controller — HTTP layer for the AI endpoints.
 *
 * Responsibilities:
 *   - `chat`                   : stream a conversation as SSE. The client sends
 *                                ONLY the user message + a few identifiers; the
 *                                backend builds the complete LLM conversation
 *                                (private system prompt + problem context +
 *                                conversation history) via `streamAiChat`.
 *   - `chatWithFiles`          : stream a conversation that also ingests
 *                                uploaded documents as context (SSE).
 *   - `generateQuestionsFromUpload` : one-shot, non-streaming generation of
 *                                quiz questions from study-material files.
 *
 * Prompt construction, problem context and conversation history live entirely
 * server-side (see `src/ai/`). The controller never logs prompt content, and
 * internal LLM errors are never surfaced verbatim to the client.
 */
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { streamChatWithAI, chatWithAI } from "../services/ai.service.js";
import type { LiveUsage, ChatMessageInput } from "../services/ai.service.js";
import { streamAiChat } from "../ai/services/aiService.js";
import { generateQuestionsFromFiles } from "../services/question-generation.service.js";
import { parseQuestionsJSON } from "../services/question-generation.service.js";
import { QUIZ_EXTRACTION_GUIDE } from "../services/question-generation.service.js";
import type { GeneratedQuestionPayload } from "../services/question-generation.service.js";
import { extractFileText } from "../services/question-generation.service.js";
import { isDoclingAvailable } from "../services/docling-extract.service.js";
import { generateFromQuestionBank } from "../services/question-bank.service.js";

/**
 * Best-effort user id for operational logging. The AI endpoints are not
 * hard-gated behind `authenticate` (the assistant also works logged-out), so a
 * missing/invalid token simply yields `undefined` — never a failed request.
 */
const getUserId = (req: Request): string | undefined => {
  const token =
    req.cookies?.session_token ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return undefined;
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-fallback-secret-key-change-in-production"
    ) as { userId?: string };
    return decoded.userId;
  } catch {
    return undefined;
  }
};

/** Stream an SSE reply to the client, mirroring the `/chat` wire protocol. */
const streamSseReply = async (
  res: Response,
  messages: ChatMessageInput[] | string,
  controller: AbortController
) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let wroteAny = false;
  let lastUsage: LiveUsage | undefined;
  let fullContent = "";
  const startedAt = Date.now();

  const onClientClose = () => controller.abort();
  res.on("close", onClientClose);

  const send = (type: string, payload: Record<string, unknown> = {}) => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    wroteAny = true;
  };

  let questions: GeneratedQuestionPayload[] | null = null;

  const parseAndSendQuestions = (content: string) => {
    if (questions) return;
    try {
      const parsed = parseQuestionsJSON(content);
      if (parsed.length > 0) {
        questions = parsed;
        send("questions", { questions: parsed });
      }
    } catch {
      // Not a structured question response — skip gracefully.
    }
  };

  try {
    for await (const chunk of streamChatWithAI(messages, controller.signal)) {
      if (chunk.reasoning) send("reasoning", { chunk: chunk.reasoning });
      if (chunk.content) {
        fullContent += chunk.content;
        send("content", { chunk: chunk.content });
      }
      if (chunk.usage) lastUsage = chunk.usage;
    }
  } catch (error) {
    if (!res.writableEnded && !wroteAny) {
      // Model likely does not support streaming — fall back to a one-shot reply.
      try {
        const { content, reasoning, usage } = await chatWithAI(messages, controller.signal);
        if (reasoning) send("reasoning", { chunk: reasoning });
        if (content) {
          fullContent += content;
          send("content", { chunk: content });
        }
        lastUsage = usage;
      } catch (fallbackError) {
        console.error("AI error:", fallbackError);
        send("error", { message: "Failed to get AI response" });
      }
    } else {
      console.error("AI streaming error:", error);
      send("error", { message: "Failed to get AI response" });
    }
  } finally {
    if (!res.writableEnded) {
      parseAndSendQuestions(fullContent);
      send("usage", {
        usage: lastUsage,
        time_ms: Date.now() - startedAt,
      });
      send("done", {});
      res.end();
    }
    res.off("close", onClientClose);
  }
};

/**
 * POST /api/v1/user/ai/chat-files
 *
 * Multipart/form-data streaming chat. Accepts `prompt` (text field) plus
 * optional `files` — their text is extracted (Docling for PDFs/PPTX/…, plain
 * decode otherwise) and combined as context, then the model reply streams back
 * as SSE identical to `/chat`.
 */
export const chatWithFiles = async (req: Request, res: Response) => {
  const prompt = String(req.body.prompt ?? "").trim();
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  console.log(`Received chat request with prompt: "${prompt}" and ${files.length} file(s)`);

  if (!prompt && files.length === 0) {
    return res.status(400).json({ message: "A prompt or at least one file is required" });
  }

  const doclingAvailable = await isDoclingAvailable();

  const extracted: string[] = [];
  for (const file of files) {
    try {
      const text = await extractFileText(
        { name: file.originalname, buffer: file.buffer },
        doclingAvailable
      );
      if (text.trim()) extracted.push(`--- ${file.originalname} ---\n${text.trim()}`);
    } catch (error) {
      console.warn(`Skipping ${file.originalname}:`, error);
    }
  }

  const contextParts: string[] = [];
  if (extracted.length > 0) {
    contextParts.push(
      `The user attached the following document(s). Use them as context when answering:\n\n${extracted.join("\n\n")}`
    );
  }
  if (prompt) contextParts.push(prompt);

  // Auto-detect quiz documents in one pass: the guide tells the model to reply
  // with the questions JSON when the document already contains quiz problems,
  // and to answer normally otherwise.
  if (extracted.length > 0) {
    contextParts.unshift(QUIZ_EXTRACTION_GUIDE);
  }

  const message = contextParts.join("\n\n");
  return streamSseReply(res, message, new AbortController());
};

/** Parse a comma-or-JSON-array string from a multipart text field. */
const parseList = (value: unknown): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  const raw = String(value).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((v) => String(v));
  } catch {
    // Fall through to comma splitting.
  }
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

/**
 * POST /api/v1/user/ai/generate-questions
 *
 * Multipart/form-data. Accepts:
 *   - `files` (multiple) — study material to generate questions from
 *   - `numberOfQuestions`, `questionTypes[]`, `difficulty[]`, `bloomsLevel`,
 *     `includeExplanations`, `includeHints`, `includeReferenceNotes`, `includeTags`
 *
 * Returns:
 *   { success: true, data: { questions: [ { question, options, answer, explanation?, hint?, tags? } ] } }
 */
export const generateQuestionsFromUpload = async (req: Request, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one file is required" });
    }

    const numberOfQuestions = Math.min(50, Math.max(1, Number(req.body.numberOfQuestions) || 5));
    const boolOf = (v: unknown) => v === "true" || v === true || v === "1";

    const result = await generateQuestionsFromFiles({
      files: files.map((f) => ({ name: f.originalname, buffer: f.buffer })),
      numberOfQuestions,
      questionTypes: parseList(req.body.questionTypes),
      difficulty: parseList(req.body.difficulty),
      bloomsLevel: String(req.body.bloomsLevel || "Understand"),
      includeExplanations: boolOf(req.body.includeExplanations),
      includeHints: boolOf(req.body.includeHints),
      includeReferenceNotes: boolOf(req.body.includeReferenceNotes),
      includeTags: boolOf(req.body.includeTags),
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Question generation error:", error);
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate questions",
    });
  }
};

/**
 * POST /api/v1/user/ai/generate-from-bank
 *
 * JSON body. Curated balanced selection from internal OS question bank.
 * Body: { numberOfQuestions?: number, easyCount?: number, mediumCount?: number, hardCount?: number }
 * Returns: { success: true, data: { questions, extractedText, usage } }
 */
export const generateFromQuestionBankHandler = async (req: Request, res: Response) => {
  try {
    const numberOfQuestions = Math.min(50, Math.max(1, Number(req.body.numberOfQuestions) || 10));
    const easyCount = req.body.easyCount != null ? Number(req.body.easyCount) : undefined;
    const mediumCount = req.body.mediumCount != null ? Number(req.body.mediumCount) : undefined;
    const hardCount = req.body.hardCount != null ? Number(req.body.hardCount) : undefined;
    const hardnessHint = req.body.hardnessHint ? String(req.body.hardnessHint) : undefined;

    // validate counts sum if all provided
    if (easyCount != null && mediumCount != null && hardCount != null) {
      const sum = easyCount + mediumCount + hardCount;
      if (sum !== numberOfQuestions) {
        return res.status(400).json({
          success: false,
          message: `easyCount+mediumCount+hardCount (${sum}) must equal numberOfQuestions (${numberOfQuestions})`,
        });
      }
    }

    const result = await generateFromQuestionBank({
      numberOfQuestions,
      easyCount: easyCount != null ? Math.max(0, Number(easyCount)) : undefined,
      mediumCount: mediumCount != null ? Math.max(0, Number(mediumCount)) : undefined,
      hardCount: hardCount != null ? Math.max(0, Number(hardCount)) : undefined,
      hardnessHint,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Question bank selection error:", error);
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate from question bank",
    });
  }
};

/**
 * POST /api/v1/user/ai/chat
 *
 * Streams the LLM response as Server-Sent Events.
 *
 * Request body (all prompt material is constructed server-side):
 *   {
 *     "message": "Why is my code failing?",
 *     "mode": "coding_coach",            // optional
 *     "problemId": "2227A",              // optional — problem fetched from DB
 *     "code": "#include <bits/stdc++.h>…", // optional — untrusted user code
 *     "language": "cpp",
 *     "filename": "solution.cpp",
 *     "selection": "…",                  // optional
 *     "selectionRange": { "startLine":1,… }, // optional
 *     "conversationId": "…"              // optional — backend persists history
 *   }
 *
 * Each SSE data payload is JSON:
 *   `{ "type": "reasoning", "chunk": "..." }`
 *   `{ "type": "content",   "chunk": "..." }`
 *   `{ "type": "usage",     "usage": {...}, "time_ms": 1234 }`  (final, real)
 *   `{ "type": "done",      "conversationId": "…" }`
 *   `{ "type": "error",     "message": "..." }`
 *
 * The system prompt, problem context and conversation history are NEVER sent
 * to the client.
 */
export const chat = async (req: Request, res: Response) => {
  const {
    message,
    mode,
    problemId,
    code,
    language,
    filename,
    selection,
    selectionRange,
    conversationId,
  } = (req.body ?? {}) as {
    message?: unknown;
    mode?: unknown;
    problemId?: unknown;
    code?: unknown;
    language?: unknown;
    filename?: unknown;
    selection?: unknown;
    selectionRange?: unknown;
    conversationId?: unknown;
  };

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ message: "A message is required" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const controller = new AbortController();
  const requestId = randomUUID();
  const userId = getUserId(req);
  let wroteAny = false;
  let lastUsage: LiveUsage | undefined;
  let responseConversationId: string | undefined;
  const startedAt = Date.now();

  console.log(conversationId, "conversationId");
  console.log(requestId, "requestId");

  const onClientClose = () => controller.abort();
  res.on("close", onClientClose);

  const send = (type: string, payload: Record<string, unknown> = {}) => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    wroteAny = true;
  };

  console.log(
    `[ai] chat requestId=${requestId} userId=${userId ?? "anon"} problemId=${problemId ?? "-"} mode=${mode ?? "general"}`
  );

  try {
    for await (const chunk of streamAiChat(
      {
        message: String(message).trim(),
        mode: typeof mode === "string" ? mode : undefined,
        problemId: typeof problemId === "string" ? problemId : undefined,
        code: typeof code === "string" ? code : undefined,
        language: typeof language === "string" ? language : undefined,
        filename: typeof filename === "string" ? filename : undefined,
        selection: typeof selection === "string" ? selection : undefined,
        selectionRange:
          selectionRange && typeof selectionRange === "object"
            ? (selectionRange as {
                startLine: number;
                startColumn: number;
                endLine: number;
                endColumn: number;
              })
            : undefined,
        conversationId: typeof conversationId === "string" ? conversationId : undefined,
      },
      controller.signal
    )) {
      if (chunk.reasoning) send("reasoning", { chunk: chunk.reasoning });
      if (chunk.content) send("content", { chunk: chunk.content });
      if (chunk.usage) lastUsage = chunk.usage;
      if (chunk.conversationId) responseConversationId = chunk.conversationId;
    }
  } catch (error) {
    console.error("[ai] streaming error", error);
    if (!res.writableEnded) {
      send("error", { message: "Failed to get AI response" });
    }
  } finally {
    if (!res.writableEnded) {
      send("usage", {
        usage: lastUsage,
        time_ms: Date.now() - startedAt,
      });
      send("done", { conversationId: responseConversationId });
      res.end();
    }
    res.off("close", onClientClose);
  }
};