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
export interface RawAIGeneratedQuestion {
  question: string;
  type?: string;
  difficulty?: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  hint?: string;
  tags?: string[];
}

export interface GenerateFromFilesOptions {
  numberOfQuestions: number;
  questionTypes: string[];
  difficulty: string[];
  bloomsLevel: string;
  includeExplanations: boolean;
  includeHints: boolean;
  includeReferenceNotes: boolean;
  includeTags: boolean;
}

interface GenerateFromFilesResponse {
  success: boolean;
  message?: string;
  data?: { questions: RawAIGeneratedQuestion[] };
}

/**
 * Upload study material files to the backend and return AI-generated questions.
 * The backend returns `{ questions: [ { question, options, answer, ... } ] }`.
 */
export const generateQuestionsFromFiles = async (
  files: File[],
  options: GenerateFromFilesOptions
): Promise<RawAIGeneratedQuestion[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  formData.append("numberOfQuestions", String(options.numberOfQuestions));
  formData.append("questionTypes", JSON.stringify(options.questionTypes));
  formData.append("difficulty", JSON.stringify(options.difficulty));
  formData.append("bloomsLevel", options.bloomsLevel);
  formData.append("includeExplanations", String(options.includeExplanations));
  formData.append("includeHints", String(options.includeHints));
  formData.append("includeReferenceNotes", String(options.includeReferenceNotes));
  formData.append("includeTags", String(options.includeTags));

  const response = await fetch(`${API_BASE}/v1/user/ai/generate-questions`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const payload = (await response.json().catch(() => ({}))) as GenerateFromFilesResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  return payload.data?.questions ?? [];
};

export const streamChat = async (
  message: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> => {
  const response = await fetch(`${API_BASE}/v1/user/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    credentials: "include",
    signal,
  });

  return consumeSSEResponse(response, callbacks);
};

/**
 * Stream a chat request with attached files to the backend `/ai/chat-files`
 * endpoint over SSE. Sends the prompt plus raw files as multipart/form-data —
 * the backend extracts their text (Docling for PDF/PPTX/…) and streams the
 * model reply using the same SSE protocol as `streamChat`.
 */
export const streamChatWithFiles = async (
  prompt: string,
  files: File[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> => {
  const formData = new FormData();
  formData.append("prompt", prompt);
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/v1/user/ai/chat-files`, {
    method: "POST",
    body: formData,
    credentials: "include",
    signal,
  });

  return consumeSSEResponse(response, callbacks);
};

const consumeSSEResponse = async (
  response: Response,
  callbacks: StreamCallbacks
): Promise<void> => {
  const { onReasoning, onContent, onDone, onUsage, onError } = callbacks;

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
