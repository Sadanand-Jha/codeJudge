import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.LM_STUDIO_URL,
  apiKey: "lm-studio",
});

export interface AIStreamChunk {
  reasoning?: string;
  content?: string;
  usage?: AIUsage;
}

export interface AIResponse {
  content: string;
  reasoning?: string;
  usage?: AIUsage;
}

/**
 * Normalized token usage. `reasoningTokens` is only populated when the
 * provider exposes it (e.g. DeepSeek's `completion_tokens_details`).
 */
export interface AIUsage {
  promptTokens?: number;
  completionTokens?: number;
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

/**
 * Extract the handful of token counts we care about, falling back to the
 * provider-specific `completion_tokens_details.reasoning_tokens` slot when
 * it exposes how many tokens went into chain-of-thought.
 */
const normalizeUsage = (usage?: OpenAI.CompletionUsage | null): AIUsage | undefined => {
  if (!usage) return undefined;
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
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
  message: string,
  signal?: AbortSignal
): AsyncGenerator<AIStreamChunk> {
  const stream = await client.chat.completions.create(
    {
      model: process.env.LM_STUDIO_MODEL!,
      messages: [
        {
          role: "system",
          content:
            "You are the AI assistant for a competitive programming and quiz platform.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      stream: true,
      stream_options: { include_usage: true },
    },
    { signal }
  );

  let usage: AIUsage | undefined;
  for await (const chunk of stream) {
    // The provider sends usage on a dedicated final chunk before the stream ends.
    const normalized = normalizeUsage(chunk.usage);
    if (normalized) usage = normalized;

    const delta = chunk.choices?.[0]?.delta as StreamDelta | undefined;
    if (!delta) continue;

    if (delta.reasoning_content) {
      yield { reasoning: delta.reasoning_content };
    }
    if (delta.content) {
      yield { content: delta.content };
    }
  }

  if (usage) yield { usage };
};

/**
 * Non-streaming chat completion. Used as a fallback when the model does not
 * support streaming, and returns the complete reasoning + content together.
 */
export const chatWithAI = async (
  message: string,
  signal?: AbortSignal
): Promise<AIResponse> => {
  const response = await client.chat.completions.create(
    {
      model: process.env.LM_STUDIO_MODEL!,
      messages: [
        {
          role: "system",
          content:
            "You are the AI assistant for a competitive programming and quiz platform.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    },
    { signal }
  );

  const msg = response.choices?.[0]?.message as Message | undefined;

  return {
    content: msg?.content ?? "",
    reasoning: msg?.reasoning_content,
    usage: normalizeUsage(response.usage),
  };
};
