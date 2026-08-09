import type { Request, Response } from "express";
import { streamChatWithAI, chatWithAI } from "../services/ai.service.js";
import type { LiveUsage } from "../services/ai.service.js";

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
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Message is required" });
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

  try {
    for await (const chunk of streamChatWithAI(message, controller.signal)) {
      if (chunk.reasoning) send("reasoning", { chunk: chunk.reasoning });
      if (chunk.content) send("content", { chunk: chunk.content });
      if (chunk.usage) lastUsage = chunk.usage;
    }
  } catch (error) {
    if (!res.writableEnded && !wroteAny) {
      // Model likely does not support streaming — fall back to a one-shot reply.
      try {
        const { content, reasoning, usage } = await chatWithAI(message, controller.signal);
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
