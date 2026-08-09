const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
}

export interface GenerationMeta {
  usage?: TokenUsage;
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
}

interface SSEPayload {
  type?: string;
  chunk?: string;
  message?: string;
  usage?: RawUsage;
  time_ms?: number;
}

/**
 * Stream a chat request to the backend `/ai/chat` endpoint over SSE.
 *
 * The backend emits `data:` JSON lines shaped like:
 *   { "type": "reasoning", "chunk": "..." }
 *   { "type": "content",   "chunk": "..." }
 *   { "type": "done" }
 *   { "type": "error", "message": "..." }
 *
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

    switch (data.type) {
      case "reasoning":
        if (data.chunk) onReasoning?.(data.chunk);
        break;
      case "content":
        if (data.chunk) onContent?.(data.chunk);
        break;
      case "error":
        onError?.(data.message || "Failed to get AI response");
        throw new Error(data.message || "Failed to get AI response");
      case "done":
      default: {
        if (data.type === "done") {
          const usage = data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
                reasoningTokens: data.usage.reasoning_tokens,
              }
            : undefined;
          onUsage?.({ usage, timeMs: typeof data.time_ms === "number" ? data.time_ms : undefined });
        }
        break;
      }
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
