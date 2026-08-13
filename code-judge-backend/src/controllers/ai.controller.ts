/**
 * AI controller — HTTP layer for the three AI endpoints.
 *
 * Responsibilities:
 *   - `chat`                    : stream a plain conversation as SSE.
 *   - `chatWithFiles`           : stream a conversation that also ingests
 *                                 uploaded documents as context (SSE).
 *   - `generateQuestionsFromUpload` : one-shot, non-streaming generation of
 *                                 quiz questions from study-material files.
 *
 * The controller only validates/coerces request input and serializes the
 * result back to the client. All heavy lifting (text extraction, prompt
 * construction, LLM calls, JSON parsing) lives in the services:
 *   - `../services/ai.service.ts`                 → LLM client (stream + one-shot)
 *   - `../services/question-generation.service.ts` → extraction + prompt + parse
 *   - `../services/docling-extract.service.ts`    → Docling Serve wrapper
 */
import type { Request, Response } from "express";
import { streamChatWithAI, chatWithAI } from "../services/ai.service.js";
import type { LiveUsage, ChatMessageInput } from "../services/ai.service.js";
import { generateQuestionsFromFiles } from "../services/question-generation.service.js";
import { parseQuestionsJSON } from "../services/question-generation.service.js";
import { QUIZ_EXTRACTION_GUIDE } from "../services/question-generation.service.js";
import type { GeneratedQuestionPayload } from "../services/question-generation.service.js";
import { extractFileText } from "../services/question-generation.service.js";
import { isDoclingAvailable } from "../services/docling-extract.service.js";

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

  console.log(doclingAvailable ? "Docling Serve is available for text extraction" : "Docling Serve is not available; falling back to simpler extraction");

  const extracted: string[] = [];
  for (const file of files) {
    try {
      const text = await extractFileText(
        { name: file.originalname, buffer: file.buffer },
        doclingAvailable
      );
      console.log(text, "this is the extracted text");
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

  console.log(contextParts.length > 0 ? `Streaming AI request with context: "${prompt}"` : "Streaming AI request without context");

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
 * POST /api/v1/user/ai/chat
 *
 * Streams the LLM response as Server-Sent Events so the client can render
 * `reasoning_content` and `content` incrementally.
 *
 * Each SSE data payload is JSON:
 *   `{ "type": "reasoning", "chunk": "..." }`
 *   `{ "type": "content",   "chunk": "..." }`
 *   `{ "type": "usage",     "usage": {...}, "time_ms": 1234 }`  (final, real)
 *   `{ "type": "done" }`
 *   `{ "type": "error",     "message": "..." }`
 *
 * `usage` is only present when the model/server reports token counts (e.g. when
 * `stream_options: { include_usage: true }` is honored). It is never guessed —
 * if the provider never sends it, the `usage` event simply carries no token
 * numbers. `time_ms` is the backend-measured generation latency and is always
 * real.
 */
export const chat = async (req: Request, res: Response) => {
  const { message, messages } = req.body;

  // Accept either the legacy `{ message }` string or the full conversation as
  // `{ messages: [{ role, content }, ...] }`.
  let payload: ChatMessageInput[] | string | null = null;
  if (Array.isArray(messages)) {
    const clean = messages.filter(
      (m): m is ChatMessageInput =>
        !!m &&
        typeof m.content === "string" &&
        (m.role === "system" || m.role === "user" || m.role === "assistant")
    );
    if (clean.length > 0) payload = clean;
  } else if (typeof message === "string" && message.trim()) {
    payload = message;
  }

  if (!payload) {
    return res.status(400).json({ message: "A message or messages array is required" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const controller = new AbortController();
  let wroteAny = false;
  let lastUsage: LiveUsage | undefined;
  const startedAt = Date.now();

  const onClientClose = () => controller.abort();
  res.on("close", onClientClose);

  const send = (type: string, payload: Record<string, unknown> = {}) => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    wroteAny = true;
  };

  console.log("this is the payload", payload);
  try {
    for await (const chunk of streamChatWithAI(payload, controller.signal)) {
      if (chunk.reasoning) send("reasoning", { chunk: chunk.reasoning });
      if (chunk.content) send("content", { chunk: chunk.content });
      if (chunk.usage) lastUsage = chunk.usage;
    }
  } catch (error) {
    if (!res.writableEnded && !wroteAny) {
      // Model likely does not support streaming — fall back to a one-shot reply.
      try {
        const { content, reasoning, usage } = await chatWithAI(payload, controller.signal);
        if (reasoning) send("reasoning", { chunk: reasoning });
        if (content) send("content", { chunk: content });
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
