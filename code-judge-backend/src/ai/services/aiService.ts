/**
 * AI chat service — the orchestrator that assembles the complete LLM
 * conversation on the backend.
 *
 * Given only the user's message plus a few identifiers, it:
 *   1. picks the backend-controlled system prompt for the requested mode,
 *   2. loads the problem context from the DB (trusted) and the user's code
 *      (untrusted) as context,
 *   3. loads the conversation history for the conversation id,
 *   4. builds a structured message list and streams the model reply,
 *   5. persists the new turns.
 *
 * The client never supplies a system prompt, a full prompt, or instructions —
 * and never receives them back.
 */
import { streamChatWithAI, chatWithAI } from "../../services/ai.service.ts";
import type { AIStreamChunk, LiveUsage } from "../../services/ai.service.ts";
import { getSystemPrompt, buildMessages } from "../prompts/index.ts";
import type { AIMode } from "../prompts/index.ts";
import { buildContextMessage } from "../context/buildCodingContext.ts";
import type { CodeContextInput } from "../context/buildCodingContext.ts";
import { getConversation, appendConversation } from "../conversationStore.ts";
import { randomUUID } from "node:crypto";

/** Minimal client request. No prompt material is accepted from the client. */
export interface AiChatRequest {
  message: string;
  mode?: AIMode | string;
  problemId?: string;
  code?: string;
  language?: string;
  filename?: string;
  selection?: string;
  selectionRange?: CodeContextInput["selectionRange"];
  conversationId?: string;
}

export interface AiChatStreamChunk extends AIStreamChunk {
  /** Present on the final chunk — the authoritative conversation id. */
  conversationId?: string;
}

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

/**
 * Stream the AI reply for a coding/chat request.
 *
 * Yields reasoning/content deltas as they arrive, a final `usage` chunk when
 * the provider reports one, and a final chunk carrying `conversationId`.
 * Falls back to a one-shot completion if the model does not support streaming
 * and nothing has been yielded yet.
 */
export async function* streamAiChat( // * Isme function ek saath pura result return nahi karta. Ye chunks one-by-one stream karta hai.
  request: AiChatRequest,
  signal?: AbortSignal
): AsyncGenerator<AiChatStreamChunk> {
  const conversationId = request.conversationId ?? randomUUID();
  const mode: AIMode = (request.mode as AIMode) ?? "general";

  const system = getSystemPrompt(mode);

  const { context } = await buildContextMessage(request.problemId, {
    code: request.code,
    language: request.language,
    filename: request.filename,
    selection: request.selection,
    selectionRange: request.selectionRange,
  });

  const history = await getConversation(conversationId);
  const messages = buildMessages({
    system,
    context,
    history,
    userMessage: request.message,
  });

  let fullContent = "";
  let lastUsage: LiveUsage | undefined;
  let yieldedAny = false;

  const emit = (chunk: AIStreamChunk): void => {
    if (chunk.reasoning) {
      yieldedAny = true;
    }
    if (chunk.content) {
      fullContent += chunk.content;
      yieldedAny = true;
    }
    if (chunk.usage) lastUsage = chunk.usage;
  };

  try {
    for await (const chunk of streamChatWithAI(messages, signal)) {
      emit(chunk);
      if (chunk.reasoning) yield { reasoning: chunk.reasoning };
      if (chunk.content) yield { content: chunk.content };
    }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) throw error;
    if (yieldedAny) throw error;
    // Model likely does not support streaming — fall back to one-shot.
    try {
      const { content, reasoning, usage } = await chatWithAI(messages, signal);
      emit({ content, reasoning, usage });
      if (reasoning) yield { reasoning };
      if (content) yield { content };
    } catch {
      throw error;
    }
  }

  await appendConversation(conversationId, [
    { role: "user", content: request.message },
    { role: "assistant", content: fullContent },
  ]);

  if (lastUsage) yield { usage: lastUsage };
  yield { conversationId };
}