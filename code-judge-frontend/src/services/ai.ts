const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Normalized, provider-agnostic token usage. Every field is optional — a
 * provider that doesn't surface a given count (e.g. no reasoning_tokens)
 * simply leaves it undefined rather than inventing a value.
 */
export interface LiveUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
}

export interface GenerationMeta {
  usage?: LiveUsage;
  timeMs?: number;
}

export interface StreamCallbacks {
  onReasoning?: (chunk: string) => void;
  onContent?: (chunk: string) => void;
  onDone?: () => void;
  onUsage?: (meta: GenerationMeta) => void;
  onError?: (message: string) => void;
}

interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  reasoning_tokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
}

interface SSEPayload {
  type?: string;
  chunk?: string;
  message?: string;
  usage?: RawUsage;
  time_ms?: number;
}

const toLiveUsage = (raw?: RawUsage): LiveUsage | undefined => {
  if (!raw) return undefined;
  return {
    inputTokens: raw.inputTokens ?? raw.prompt_tokens,
    outputTokens: raw.outputTokens ?? raw.completion_tokens,
    totalTokens: raw.totalTokens ?? raw.total_tokens,
    reasoningTokens: raw.reasoningTokens ?? raw.reasoning_tokens,
  };
};

/**
 * Stream a chat request to the backend `/ai/chat` endpoint over SSE.
 *
 * The backend emits `data:` JSON lines shaped like:
 *   { "type": "reasoning", "chunk": "..." }
 *   { "type": "content",   "chunk": "..." }
 *   { "type": "usage",     "usage": {...}, "time_ms": 1234 }  (final, real)
 *   { "type": "done" }
 *   { "type": "error",     "message": "..." }
 *
 * `usage` only appears when the model/server actually reports token counts
 * (e.g. via `stream_options: { include_usage: true }`); it is never guessed.
 * Each chunk is forwarded to the matching callback as it arrives. Pass an
 * AbortSignal to cancel the request mid-stream. Resolves when the stream
 * completes; rejects on transport errors or an `error` event.
 */
export const streamChat = async (
  message: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> => {
  const { onReasoning, onContent, onDone, onUsage, onError } = callbacks;

  const response = await fetch(`${API_BASE}/v1/user/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const data = await response.json();
      detail = data?.message || "";
    } catch {
      // Ignore — fall back to the status text below.
    }
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this browser");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleLine = (raw: string) => {
    const line = raw.trim();
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload) return;

    let data: SSEPayload;
    try {
      data = JSON.parse(payload) as SSEPayload;
    } catch {
      return;
    }

    const emitUsage = () => {
      const usage = toLiveUsage(data.usage);
      if (usage) {
        onUsage?.({ usage, timeMs: typeof data.time_ms === "number" ? data.time_ms : undefined });
      }
    };

    switch (data.type) {
      case "reasoning":
        if (data.chunk) onReasoning?.(data.chunk);
        break;
      case "content":
        if (data.chunk) onContent?.(data.chunk);
        break;
      case "usage":
        emitUsage();
        break;
      case "error":
        onError?.(data.message || "Failed to get AI response");
        throw new Error(data.message || "Failed to get AI response");
      case "done":
      default:
        break;
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        handleLine(line);
      }
    }
    if (buffer.trim()) handleLine(buffer.trim());
    onDone?.();
  } finally {
    reader.releaseLock();
  }
};
