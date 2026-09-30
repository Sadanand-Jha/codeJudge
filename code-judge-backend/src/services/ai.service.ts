/**
 * AI LLM client — the single choke-point for talking to the model.
 *
 * Everything that touches the actual language model goes through this module:
 *   - `streamChatWithAI` : streaming completion (used by `/ai/chat` and
 *                          `/ai/chat-files`, which forward deltas over SSE).
 *   - `chatWithAI`       : one-shot completion (used by question generation
 *                          and Word-bank problem selection).
 *
 * The client is OpenAI-compatible and points at a local/remote LLM endpoint
 * configured through env vars (first set wins):
 *   - Base URL: `AI_BASE_URL` → provider `*_BASE_URL` → `LM_STUDIO_URL`
 *     (e.g. LM Studio / Groq / Together / DeepSeek / OpenRouter / OpenAI).
 *   - API key: `AI_API_KEY` → `GROQ_API_KEY` / `TOGETHER_API_KEY` /
 *     `DEEPSEEK_API_KEY` / `OPENROUTER_API_KEY` / `OPENAI_API_KEY`
 *     (falls back to `"lm-studio"` for local servers that skip auth).
 *   - Coder model: `AI_MODEL` → `LM_STUDIO_MODEL_CODER` → `LM_STUDIO_MODEL`.
 *   - Testor model: `AI_TESTOR_MODEL` → `LM_STUDIO_MODEL_TESTOR` → coder model.
 *
 * Token usage is normalized into a provider-agnostic `LiveUsage` shape before
 * it ever crosses the wire, and reasoning (chain-of-thought) text is read from
 * the `reasoning_content` field some providers (e.g. DeepSeek reasoner) expose.
 */
import OpenAI from "openai";
import { recordAiObservation } from "./aiObservability.ts";

const resolveBaseURL = (): string =>
  process.env.AI_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  process.env.GROQ_BASE_URL ||
  process.env.TOGETHER_BASE_URL ||
  process.env.DEEPSEEK_BASE_URL ||
  process.env.OPENROUTER_BASE_URL ||
  process.env.LM_STUDIO_URL ||
  "http://localhost:1234/v1";

const resolveApiKey = (): string =>
  process.env.AI_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.GROQ_API_KEY ||
  process.env.TOGETHER_API_KEY ||
  process.env.DEEPSEEK_API_KEY ||
  process.env.OPENROUTER_API_KEY ||
  "lm-studio";

const resolveCoderModel = (): string =>
  process.env.AI_MODEL ||
  process.env.LM_STUDIO_MODEL_CODER ||
  process.env.LM_STUDIO_MODEL ||
  "";

const resolveTestorModel = (): string =>
  process.env.AI_TESTOR_MODEL ||
  process.env.LM_STUDIO_MODEL_TESTOR ||
  resolveCoderModel();

const baseURL = resolveBaseURL();
const providerName = baseURL.includes("openrouter") ? "OpenRouter"
  : baseURL.includes("openai") ? "OpenAI"
  : baseURL.includes("google") || baseURL.includes("gemini") ? "Gemini"
  : baseURL.includes("localhost") || baseURL.includes("127.0.0.1") ? "local"
  : "OpenAI-compatible";

// OpenRouter recommends identifying headers; harmless for other providers.
const defaultHeaders: Record<string, string> =
  baseURL.includes("openrouter.ai")
    ? {
        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL || process.env.FRONTEND_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME || "CodeJudge",
      }
    : {};

const client = new OpenAI({
  baseURL,
  apiKey: resolveApiKey(),
  defaultHeaders,
});

export interface AIStreamChunk {
  reasoning?: string;
  content?: string;
  usage?: LiveUsage;
}

export interface AIResponse {
  content: string;
  reasoning?: string;
  usage?: LiveUsage;
}

/**
 * Provider-agnostic token usage normalized before it crosses the wire.
 * Fields are intentionally optional — a provider that doesn't surface a
 * given count (e.g. reasoning_tokens) simply leaves it undefined rather
 * than inventing a value.
 */
export interface LiveUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
}

// Some OpenAI-compatible providers (e.g. DeepSeek reasoner) expose the
// model's chain-of-thought through `reasoning_content` on the message/delta.
interface ReasoningDelta {
  reasoning_content?: string;
}

type StreamDelta = OpenAI.ChatCompletionChunk.Choice.Delta & ReasoningDelta;
type Message = OpenAI.ChatCompletionMessage & ReasoningDelta;

/** A single conversation turn as accepted by `/ai/chat`. */
export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export interface ChatMessageInput {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
}

const DEFAULT_SYSTEM_MESSAGE =
  "You are the AI assistant for a competitive programming and quiz platform.";

/**
 * Normalize the incoming conversation into the message list sent to the model.
 * A plain string (legacy `{ message }` payloads) becomes a single user turn;
 * a messages array is used as-is. A system message is always present — the
 * client may send its own, otherwise the default is prepended.
 */
const toModelMessages = (
  input: ChatMessageInput[] | string
): OpenAI.ChatCompletionMessageParam[] => {
  const messages: ChatMessageInput[] =
    typeof input === "string"
      ? [{ role: "user" as const, content: input }]
      : input;
  const hasSystem = messages.some((m) => m.role === "system");
  const full: ChatMessageInput[] = hasSystem
    ? messages
    : [{ role: "system" as const, content: DEFAULT_SYSTEM_MESSAGE }, ...messages];
  return full as unknown as OpenAI.ChatCompletionMessageParam[];
};

/**
 * Extract the handful of token counts we care about, falling back to the
 * provider-specific `completion_tokens_details.reasoning_tokens` slot when
 * it exposes how many tokens went into chain-of-thought.
 */
const normalizeUsage = (usage?: OpenAI.CompletionUsage | null): LiveUsage | undefined => {
  if (!usage) return undefined;
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    reasoningTokens: (usage as OpenAI.CompletionUsage & {
      completion_tokens_details?: { reasoning_tokens?: number };
    }).completion_tokens_details?.reasoning_tokens,
  };
};

/**
 * Stream a chat completion from the model.
 *
 * Yields the raw `reasoning_content` and `content` deltas as they arrive so
 * the caller can forward them to the client incrementally. When the provider
 * reports token usage (via `stream_options.include_usage`), a final chunk
 * carries the aggregated counts. Pass an AbortSignal to cancel the request
 * (e.g. when the client disconnects).
 */
export const streamChatWithAI = async function* (
  messages: ChatMessageInput[] | string,
  signal?: AbortSignal
): AsyncGenerator<AIStreamChunk> {
  const model = resolveCoderModel();
  const startedAt = new Date();
  if (!model) {
    throw new Error(
      "AI model is not configured. Set AI_MODEL (or LM_STUDIO_MODEL_CODER) in the backend .env."
    );
  }
  let usage: LiveUsage | undefined;
  try {
    const stream = await client.chat.completions.create(
      {
        model,
        messages: toModelMessages(messages),
        temperature: 0.7,
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal }
    );

    for await (const chunk of stream) {
      const normalized = normalizeUsage(chunk.usage);
      if (normalized) usage = normalized;
      const delta = chunk.choices?.[0]?.delta as StreamDelta | undefined;
      if (!delta) continue;
      if (delta.reasoning_content) yield { reasoning: delta.reasoning_content };
      if (delta.content) yield { content: delta.content };
    }
    await recordAiObservation({ provider: providerName, model, operation: "chatbot", startedAt, success: true, statusCode: 200, usage });
  } catch (error) {
    await recordAiObservation({ provider: providerName, model, operation: "chatbot", startedAt, success: false, errorMessage: (error as Error).message });
    throw error;
  }

  if (usage) yield { usage };
};

/**
 * Non-streaming chat completion. Used as a fallback when the model does not
 * support streaming, and returns the complete reasoning + content together.
 */
export const chatWithAI = async (
  messages: ChatMessageInput[] | string,
  signal?: AbortSignal
): Promise<AIResponse> => {
  const model = resolveCoderModel();
  const startedAt = new Date();
  if (!model) {
    throw new Error(
      "AI model is not configured. Set AI_MODEL (or LM_STUDIO_MODEL_CODER) in the backend .env."
    );
  }
  try {
    const response = await client.chat.completions.create(
      { model, messages: toModelMessages(messages), temperature: 0.7 },
      { signal }
    );
    const msg = response.choices?.[0]?.message as Message | undefined;
    const usage = normalizeUsage(response.usage);
    await recordAiObservation({ provider: providerName, model, operation: "question_generation", startedAt, success: true, statusCode: 200, usage });
    return { content: msg?.content ?? "", reasoning: msg?.reasoning_content, usage };
  } catch (error) {
    await recordAiObservation({ provider: providerName, model, operation: "question_generation", startedAt, success: false, errorMessage: (error as Error).message });
    throw error;
  }
};

export const chatWithAI_testor = async (
  messages: ChatMessageInput[] | string,
  signal?: AbortSignal
): Promise<AIResponse> => {
  const model = resolveTestorModel();
  const startedAt = new Date();
  if (!model) {
    throw new Error(
      "AI testor model is not configured. Set AI_TESTOR_MODEL (or LM_STUDIO_MODEL_TESTOR) in the backend .env."
    );
  }
  try {
    const response = await client.chat.completions.create(
      { model, messages: toModelMessages(messages), temperature: 0.7 },
      { signal }
    );
    const msg = response.choices?.[0]?.message as Message | undefined;
    const usage = normalizeUsage(response.usage);
    await recordAiObservation({ provider: providerName, model, operation: "evaluation", startedAt, success: true, statusCode: 200, usage });
    return { content: msg?.content ?? "", reasoning: msg?.reasoning_content, usage };
  } catch (error) {
    await recordAiObservation({ provider: providerName, model, operation: "evaluation", startedAt, success: false, errorMessage: (error as Error).message });
    throw error;
  }
};
