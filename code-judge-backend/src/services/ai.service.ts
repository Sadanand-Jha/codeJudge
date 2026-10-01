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
import mammoth from "mammoth";
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

const resolveDocumentModel = (): string =>
  process.env.DOCUMENT_AI_MODEL || resolveCoderModel();

// Dedicated base URL for document imports (/platform preview). Falls back to
// the shared provider URL. Set DOCUMENT_AI_BASE_URL=http://localhost:1234/v1
// to run previews against a local LM Studio server.
const resolveDocumentBaseURL = (): string =>
  process.env.DOCUMENT_AI_BASE_URL || resolveBaseURL();

const providerNameFor = (url: string): string =>
  url.includes("openrouter") ? "OpenRouter"
  : url.includes("openai") ? "OpenAI"
  : url.includes("google") || url.includes("gemini") ? "Gemini"
  : url.includes("localhost") || url.includes("127.0.0.1") ? "local"
  : "OpenAI-compatible";

const isLocalBaseURL = (url: string): boolean =>
  url.includes("localhost") || url.includes("127.0.0.1");

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

export interface DirectDocumentJsonRequest {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
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

/** Generate question-import JSON through the configured local model. */
export const generateJsonFromDocument = async (
  request: DirectDocumentJsonRequest,
  onProgress?: (chars: number, tail: string, delta?: string) => void
): Promise<{ content: string; usage?: LiveUsage }> => {
  const startedAt = new Date();
  const model = process.env.LOCAL_AI_MODEL
    || process.env.LM_STUDIO_MODEL_CODER
    || process.env.LM_STUDIO_MODEL
    || "";
  const docBaseURL = process.env.LOCAL_AI_BASE_URL
    || process.env.DOCUMENT_AI_BASE_URL
    || process.env.LM_STUDIO_URL
    || "http://localhost:1234/v1";
  const docProvider = "local";

  if (!model) {
    console.error("[ai-document] local model is not configured (set LOCAL_AI_MODEL or LM_STUDIO_MODEL_CODER)");
    throw new Error("Local document AI model is not configured.");
  }

  console.log("[ai-document] start", {
    provider: docProvider,
    baseURL: docBaseURL,
    model,
    schemaName: request.schemaName,
    filename: request.filename,
    mimeType: request.mimeType,
    bufferBytes: request.buffer?.length,
    promptChars: request.prompt?.length,
  });

  return generateJsonFromDocumentText(request, {
    model,
    docBaseURL,
    docProvider,
    startedAt,
    onProgress,
  });
};

/** Remote document path: PDF sent directly (inline base64), output streamed. */
const generateJsonFromDocumentRemote = async (
  request: DirectDocumentJsonRequest,
  ctx: { model: string; docBaseURL: string; docProvider: string; startedAt: Date; onProgress?: (chars: number, tail: string, delta?: string) => void }
): Promise<{ content: string; usage?: LiveUsage }> => {
  const { model, docBaseURL, docProvider, startedAt, onProgress } = ctx;
  const docHeaders: Record<string, string> =
    docBaseURL.includes("openrouter.ai")
      ? {
          "HTTP-Referer":
            process.env.OPENROUTER_SITE_URL || process.env.FRONTEND_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME || "CodeJudge",
        }
      : {};
  const docClient = new OpenAI({ baseURL: docBaseURL, apiKey: resolveApiKey(), defaultHeaders: docHeaders });

  // The PDF goes DIRECTLY to the model as inline base64 in the request —
  // no Files API upload, no local extraction, nothing else.
  console.log("[ai-document] sending PDF directly to model (inline base64, streamed)", {
    filename: request.filename, bytes: request.buffer.length, mimeType: request.mimeType,
  });

  try {
    // OpenRouter free-tier models rate-limit aggressively (429s that clear
    // within a minute). Retry those + gateway 5xx briefly before giving up to
    // the local fallback.
    const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504, 529]);
    const RETRY_DELAYS_MS = [12_000, 30_000];
    type DocFinal = Awaited<ReturnType<typeof docClient.responses.create>>;
    let final: DocFinal | null = null;
    let streamedText = "";
    let attempt = 0;
    for (;;) {
      attempt++;
      try {
        console.log("[ai-document] opening response stream …", { attempt });
        const stream = await docClient.responses.stream({
          model,
          instructions: "Read the attached document directly. Return only the requested structured data. Never include markdown or commentary.",
          input: [{
            role: "user",
            content: [
              {
                type: "input_file",
                filename: request.filename,
                file_data: `data:${request.mimeType};base64,${request.buffer.toString("base64")}`,
              },
              { type: "input_text", text: request.prompt },
            ],
          }],
          text: {
            format: {
              type: "json_schema",
              name: request.schemaName,
              schema: request.schema,
              strict: true,
            },
          },
          store: false,
        });
        streamedText = "";
        let lastProgressLog = 0;
        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            streamedText += event.delta;
            onProgress?.(streamedText.length, streamedText.slice(-160), event.delta);
            const now = Date.now();
            if (now - lastProgressLog > 5000) {
              lastProgressLog = now;
              console.log("[ai-document] stream progress", {
                attempt, chars: streamedText.length, tail: streamedText.slice(-160),
              });
            }
          } else if (event.type === "response.completed") {
            console.log("[ai-document] stream completed event", { attempt, chars: streamedText.length });
          } else if (event.type === "response.incomplete" || event.type === "response.failed") {
            console.warn("[ai-document] stream terminal event", { attempt, type: event.type });
          }
        }
        final = await stream.finalResponse();
        break;
      } catch (attemptError) {
        const status = (attemptError as { status?: number })?.status;
        const delay = RETRY_DELAYS_MS[attempt - 1];
        if (status != null && RETRYABLE.has(status) && delay != null) {
          console.warn("[ai-document] stream hit retryable status", {
            attempt, status, retryingInMs: delay,
            message: attemptError instanceof Error ? attemptError.message : String(attemptError),
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw attemptError;
      }
    }
    if (!final) throw new Error("AI provider returned no response object");
    console.log("[ai-document] stream finished", {
      status: final.status,
      model: (final as { model?: string }).model,
      incompleteDetails: final.incomplete_details ?? null,
      streamedChars: streamedText.length,
      finalTextLength: (final.output_text ?? "").length,
    });

    if (final.status === "incomplete") {
      const reason = final.incomplete_details?.reason || "provider output limit";
      console.error("[ai-document] response incomplete", { reason, details: final.incomplete_details });
      throw new Error(`document JSON was incomplete (${reason}); no partial import was created`);
    }

    // Prefer the streamed accumulation (what we actually saw arrive); fall
    // back to the final response text if the stream yielded nothing.
    const outputText = streamedText.trim() ? streamedText : (final.output_text ?? "");
    if (!outputText.trim()) {
      console.error("[ai-document] provider returned EMPTY output text", { status: final.status });
      throw new Error("AI provider returned an empty response for this document");
    }
    const responseUsage = final.usage;
    const usage: LiveUsage | undefined = responseUsage ? {
      inputTokens: responseUsage.input_tokens,
      outputTokens: responseUsage.output_tokens,
      totalTokens: responseUsage.total_tokens,
    } : undefined;
    await recordAiObservation({ provider: docProvider, model, operation: "subjective_bank_import", startedAt, success: true, statusCode: 200, usage });
    console.log("[ai-document] success", { usage, outputChars: outputText.length });
    return { content: outputText, usage };
  } catch (error) {
    const err = error as Error & { status?: number; code?: string; response?: unknown; cause?: unknown; error?: unknown };
    console.error("[ai-document] FAILED", {
      provider: docProvider,
      baseURL: docBaseURL,
      model,
      name: err?.name,
      message: err?.message,
      status: err?.status,
      code: err?.code,
      providerBody: typeof err?.error === "object" ? JSON.stringify(err.error).slice(0, 1000) : err?.error,
      cause: err?.cause instanceof Error ? { name: err.cause.name, message: err.cause.message } : err?.cause,
      stack: err?.stack,
    });
    await recordAiObservation({ provider: docProvider, model, operation: "subjective_bank_import", startedAt, success: false, errorMessage: (error as Error).message });
    throw new Error(`The configured AI provider could not read this document directly: ${(error as Error).message}`);
  }
};

/** Max document characters sent to a local model (keeps small-context models safe). */
const LOCAL_DOC_CHAR_LIMIT = 30_000;

/** Best-effort local text extraction (no provider needed): docx/txt/md/pdf. */
const extractDocumentTextLocally = async (
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> => {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? "").trim();
  }

  if (["txt", "md", "markdown", "csv", "tsv", "rtf"].includes(ext) || mimeType.startsWith("text/")) {
    const raw = buffer.toString("utf-8");
    let controls = 0;
    for (let i = 0; i < raw.length; i++) {
      const code = raw.charCodeAt(i);
      if (code === 0) controls += 10;
      else if (code < 9 || (code > 13 && code < 32)) controls++;
    }
    if (controls / Math.max(raw.length, 1) > 0.02) return "";
    return raw.trim();
  }

  if (ext === "pdf") {
    // Real PDF parsing via pdf.js (handles compressed/object streams that the
    // naive regex below cannot see). Naive Tj/TJ scan kept as last resort.
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
      }).promise;
      const pages: string[] = [];
      const total = Math.min(doc.numPages, 200);
      for (let pageNum = 1; pageNum <= total; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        pages.push(
          content.items.map((it) => ("str" in it ? String((it as { str: unknown }).str) : "")).join(" ")
        );
        page.cleanup();
      }
      await (doc as unknown as { destroy?: () => Promise<void> }).destroy?.().catch(() => undefined);
      const text = pages.join("\n").replace(/[ \t]+/g, " ").trim();
      console.log("[ai-document] pdfjs extracted", { pages: total, chars: text.length });
      if (text) return text;
    } catch (pdfError) {
      console.warn("[ai-document] pdfjs extraction failed, trying naive fallback", {
        message: pdfError instanceof Error ? pdfError.message : String(pdfError),
      });
    }
    // Naive pull from uncompressed PDF content streams (Tj / TJ operators).
    const raw = buffer.toString("latin1");
    const parts: string[] = [];
    const tj = /\((?:\\.|[^\\()])*\)\s*Tj/g;
    const tjArr = /\[((?:[^\[\]]|\[(?:[^\[\]])*\])*)\]\s*TJ/g;
    let m: RegExpExecArray | null;
    const unescape = (s: string) =>
      s.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
        .replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\");
    while ((m = tj.exec(raw)) !== null) parts.push(unescape(m[0].slice(1, m[0].lastIndexOf(")"))));
    while ((m = tjArr.exec(raw)) !== null) {
      const inner = m[1];
      const str = /\((?:\\.|[^\\()])*\)/g;
      let s: RegExpExecArray | null;
      while ((s = str.exec(inner)) !== null) parts.push(unescape(s[0].slice(1, -1)));
    }
    return parts.join(" ").replace(/[ \t]+/g, " ").trim();
  }

  return "";
};

/** Extract text locally, then stream it through an OpenAI-compatible model. */
const generateJsonFromDocumentText = async (
  request: DirectDocumentJsonRequest,
  ctx: { model: string; docBaseURL: string; docProvider: string; startedAt: Date; onProgress?: (chars: number, tail: string, delta?: string) => void },
  retried = false
): Promise<{ content: string; usage?: LiveUsage }> => {
  const { model, docBaseURL, docProvider, startedAt, onProgress } = ctx;
  try {
    const extracted = await extractDocumentTextLocally(request.filename, request.mimeType, request.buffer);
    console.log("[ai-document] document text extracted", {
      chars: extracted.length,
      preview: extracted.slice(0, 200),
    });
    if (!extracted) {
      throw new Error(
        `Could not read text from "${request.filename}" locally. ` +
          `Supported text extraction: PDF, DOCX, TXT, MD, CSV.`
      );
    }
    const truncated = extracted.length > LOCAL_DOC_CHAR_LIMIT
      ? extracted.slice(0, LOCAL_DOC_CHAR_LIMIT)
      : extracted;
    if (truncated.length < extracted.length) {
      console.log("[ai-document] document truncated for model context", {
        from: extracted.length, to: truncated.length,
      });
    }

    const textClient = new OpenAI({
      baseURL: docBaseURL,
      apiKey: isLocalBaseURL(docBaseURL) ? "lm-studio" : resolveApiKey(),
      defaultHeaders: docBaseURL.includes("openrouter.ai") ? defaultHeaders : {},
    });
    console.log(`[ai-document] opening ${docProvider} chat stream …`);
    const stream = await textClient.chat.completions.create({
      model,
      temperature: 0.2,
      stream: true,
      stream_options: { include_usage: true },
      // Constrained decoding emits every required question field. Zod still
      // validates the completed result before a preview batch is created.
      response_format: {
        type: "json_schema",
        json_schema: { name: request.schemaName, strict: true, schema: request.schema },
      } as unknown as { type: "json_schema"; json_schema: { name: string; strict: boolean; schema: Record<string, unknown> } },
      messages: [
        {
          role: "system",
          content: "You extract structured data from documents. Your entire response must be ONE single valid JSON object and nothing else: first character {, last character }. No markdown fences, no commentary, no text before or after the JSON. If extraction is impossible, return {\"questions\": []}.",
        },
        {
          role: "user",
          content: `${request.prompt}\n\nDOCUMENT TEXT (${request.filename}):\n${truncated}`,
        },
      ],
    });
    let content = "";
    let usage: LiveUsage | undefined;
    for await (const chunk of stream) {
      const normalized = normalizeUsage(chunk.usage);
      if (normalized) usage = normalized;
      const delta = chunk.choices?.[0]?.delta?.content;
      if (!delta) continue;
      content += delta;
      onProgress?.(content.length, content.slice(-160), delta);
    }
    console.log(`[ai-document] ${docProvider} stream completed`, {
      contentLength: content.length,
      contentPreview: content.slice(0, 300),
    });
    if (!content.trim()) {
      throw new Error(`${docProvider} model returned an empty response for this document`);
    }
    await recordAiObservation({ provider: docProvider, model, operation: "subjective_bank_import", startedAt, success: true, statusCode: 200, usage });
    console.log(`[ai-document] ${docProvider} success`, { usage, outputChars: content.length });
    return { content, usage };
  } catch (error) {
    const err = error as Error & { status?: number; code?: string; cause?: unknown };
    // LM Studio auto-unloads idle models; the first request after unload fails
    // fast with 400 "Model unloaded" while it loads in the background. Wait
    // once and retry instead of failing the preview.
    if (!retried && /model unloaded/i.test(err?.message ?? "")) {
      console.log("[ai-document] model was unloaded — waiting 20s for LM Studio to load it, then retrying once …");
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      return generateJsonFromDocumentText(request, ctx, true);
    }
    console.error("[ai-document] TEXT STREAM FAILED", {
      provider: docProvider,
      baseURL: docBaseURL,
      model,
      name: err?.name,
      message: err?.message,
      status: err?.status,
      code: err?.code,
      stack: err?.stack,
    });
    await recordAiObservation({ provider: docProvider, model, operation: "subjective_bank_import", startedAt, success: false, errorMessage: (error as Error).message });
    throw new Error(`The configured AI model could not process this document: ${(error as Error).message}`);
  }
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
