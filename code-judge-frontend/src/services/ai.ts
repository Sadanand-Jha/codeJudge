const rawBase =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://quizbackend-dun.vercel.app/api";
const API_BASE = rawBase.replace(/\/v1\/?$/, "").replace(/\/$/, "");

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
  onQuestions?: (questions: RawAIGeneratedQuestion[]) => void;
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
  questions?: RawAIGeneratedQuestion[];
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

export type AIQuestionType = "mcq" | "coding" | "true_false" | "fill" | "short" | "integer" | "long";
export type AIDifficulty = "easy" | "medium" | "hard" | "expert";

export interface AIQuestionPreview {
  id: string;
  type: AIQuestionType;
  title: string;
  content: string;
  options?: { id: string; content: string; isCorrect: boolean }[];
  correctAnswer?: string | number;
  explanation?: string;
  hint?: string;
  difficulty: AIDifficulty;
  tags: string[];
}

const QUESTION_TYPES: readonly AIQuestionType[] = [
  "mcq",
  "coding",
  "true_false",
  "fill",
  "short",
  "integer",
  "long",
] as const;

const DIFFICULTIES: readonly AIDifficulty[] = ["easy", "medium", "hard", "expert"] as const;

/**
 * Map the backend's raw generated-question shape into the review-overlay
 * PreviewQuestion shape. Shared by AIStudio and the AI Assistant chat panel so
 * both flows render identically in AIQuestionReviewOverlay.
 */
export const mapRawQuestionsToPreview = (
  rawQuestions: RawAIGeneratedQuestion[]
): AIQuestionPreview[] =>
  rawQuestions.map((raw, i) => {
    const type = QUESTION_TYPES.includes(raw.type as AIQuestionType)
      ? (raw.type as AIQuestionType)
      : raw.options && raw.options.length > 0
        ? "mcq"
        : "short";
    const difficulty = DIFFICULTIES.includes(raw.difficulty as AIDifficulty)
      ? (raw.difficulty as AIDifficulty)
      : "medium";

    const options = raw.options?.length
      ? raw.options.map((content, oi) => ({
          id: String.fromCharCode(65 + oi),
          content,
          isCorrect: content.trim() === (raw.answer ?? "").trim(),
        }))
      : undefined;

    // Safety net: ensure exactly one option is marked correct. Prefer the model
    // answer (by exact text, then by letter e.g. "A"); if none resolves, mark
    // "A" so the review overlay always has a highlighted correct answer.
    if (options && options.length > 0 && !options.some((o) => o.isCorrect)) {
      const answer = typeof raw.answer === "string" ? raw.answer.trim() : "";
      const byLetter = answer
        ? options.find((o) => o.id === answer.toUpperCase().replace(/[^A-Z:.]/g, "")[0])
        : undefined;
      if (byLetter) byLetter.isCorrect = true;
      else options[0].isCorrect = true;
    }

    return {
      id: `gen-${Date.now()}-${i}`,
      type,
      title: raw.question || `Generated Question ${i + 1}`,
      content: raw.question || "",
      options,
      correctAnswer: options?.find((o) => o.isCorrect)?.id ?? raw.answer,
      explanation: raw.explanation,
      hint: raw.hint,
      difficulty,
      tags: raw.tags ?? [],
    };
  });

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

export interface GenerateFromBankOptions {
  numberOfQuestions: number;
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  hardnessHint?: string;
}

export interface GenerateFromBankResponse {
  success: boolean;
  message?: string;
  data?: { questions: RawAIGeneratedQuestion[]; extractedText?: string; usage?: LiveUsage };
}

export const generateFromQuestionBank = async (
  options: GenerateFromBankOptions
): Promise<RawAIGeneratedQuestion[]> => {
  const response = await fetch(`${API_BASE}/v1/user/ai/generate-from-bank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      numberOfQuestions: options.numberOfQuestions,
      easyCount: options.easyCount,
      mediumCount: options.mediumCount,
      hardCount: options.hardCount,
      hardnessHint: options.hardnessHint,
    }),
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as GenerateFromBankResponse;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }
  return payload.data?.questions ?? [];
};

export interface SelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/**
 * Minimal request payload for `/ai/chat`. All prompt material (system prompt,
 * problem context, conversation history, coding-coach instructions) is
 * constructed server-side — the client only sends the user's message plus a
 * few identifiers that let the backend assemble the full LLM conversation.
 */
export interface ChatRequestInput {
  /** The user's message (always required). */
  message: string;
  /** Assistant mode, e.g. "coding_coach" | "general". Optional. */
  mode?: string;
  /** Problem id — the backend loads the full problem from the DB. Optional. */
  problemId?: string;
  /** The user's code (treated as untrusted user content by the backend). */
  code?: string;
  language?: string;
  filename?: string;
  /** Currently selected text inside the editor. */
  selection?: string;
  selectionRange?: SelectionRange;
  /** Client-generated conversation id; backend persists history under it. */
  conversationId?: string;
}

/**
 * Stream a chat request to the backend `/ai/chat` endpoint over SSE.
 *
 * Sends only the user message + identifiers; the backend builds the complete
 * conversation (private system prompt + problem context + history) and streams
 * the reply. Each chunk is forwarded to the matching callback as it arrives.
 * Pass an AbortSignal to cancel the request mid-stream.
 */
export const streamChat = async (
  input: ChatRequestInput,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> => {
  const response = await fetch(`${API_BASE}/v1/user/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
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
  const { onReasoning, onContent, onDone, onUsage, onError, onQuestions } = callbacks;

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
      case "questions":
        if (Array.isArray(data.questions)) onQuestions?.(data.questions);
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
