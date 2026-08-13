# AI System — Complete Working & Output Generation

This document explains **everything** about the AI subsystem in the CodeJudge platform: which files are involved, how the LLM is reached, what each endpoint does, how uploaded files become text, how prompts are built, and — most importantly — **how AI outputs are generated, parsed, normalized and surfaced** back to the user.

The AI subsystem powers two UX flows:

1. **AI Chat Assistant** — a streaming chat with the model, with optional attached documents (`/chat`, `/chat-files`).
2. **AI Quiz Studio** — upload study material → generate quiz questions from it (`/generate-questions`).

---

## 1. Files involved

| Layer    | File                                                          | Role                                    |
|----------|---------------------------------------------------------------|-----------------------------------------|
| Frontend | `code-judge-frontend/src/services/ai.ts`                       | HTTP calls + SSE parser + output mapping |
| Frontend | `code-judge-frontend/src/components/quiz/creator/AIStudio.tsx`          | Upload → Configure → Generate UI       |
| Frontend | `code-judge-frontend/src/components/quiz/creator/AIQuestionReviewOverlay.tsx` | Full-screen review of generated questions |
| Backend  | `code-judge-backend/src/routes/v1/user/ai.routes.ts`          | Routes + multer upload parsing         |
| Backend  | `code-judge-backend/src/controllers/ai.controller.ts`         | Request validation & orchestration      |
| Backend  | `code-judge-backend/src/services/ai.service.ts`               | LLM client (OpenAI-compatible)          |
| Backend  | `code-judge-backend/src/services/question-generation.service.ts` | Text extraction + prompt + JSON parse  |
| Backend  | `code-judge-backend/src/services/docling-extract.service.ts`  | Docling Serve wrapper (PDF/PPTX/etc.)   |
| Backend  | `code-judge-backend/src/services/docling.service.ts`          | One-off manual snippet (superseded)     |

---

## 2. Environment variables

| Variable            | Used by                          | Purpose                                              |
|---------------------|----------------------------------|------------------------------------------------------|
| `LM_STUDIO_URL`     | `ai.service.ts`                  | Base URL of the OpenAI-compatible LLM server (e.g. LM Studio). |
| `LM_STUDIO_MODEL_CODER`   | `ai.service.ts`                  | Model id served by that endpoint.                    |
| `DOCLING_URL`       | `docling-extract.service.ts`     | Docling Serve base URL (default `http://localhost:5001`). |
| `DOCLING_TIMEOUT_MS`| `docling-extract.service.ts`     | Timeout for Docling convert/health calls (default 60s). |

---

## 3. LLM client layer — `src/services/ai.service.ts`

This is the single choke-point that talks to the model. It uses an **OpenAI-compatible** client, so anything that speaks the OpenAI chat-completions protocol works (LM Studio, llama.cpp, vLLM, DeepSeek, etc.).

```ts
const client = new OpenAI({
  baseURL: process.env.LM_STUDIO_URL,
  apiKey: "lm-studio",   // arbitrary — local servers don't validate it
});
```

It exports two functions:

### 3.1 `streamChatWithAI(messages, signal?)` — streaming
- Creates a `stream: true` completion with `stream_options: { include_usage: true }`.
- Yields `{ reasoning?, content?, usage? }` chunks as deltas arrive.
- **Reasoning**: some providers (e.g. DeepSeek reasoner) expose chain-of-thought via `reasoning_content` on the delta — the service reads that field and yields it as `reasoning`.
- **Usage**: the provider sends a dedicated final chunk carrying token counts; these are normalized through `normalizeUsage()` and yielded once at the end.

### 3.2 `chatWithAI(messages, signal?)` — one-shot (non-streaming)
- Returns `{ content, reasoning?, usage? }` all at once.
- Used as the fallback when a model doesn't support streaming, and by question generation.

### 3.3 Normalization
- `toModelMessages()` guarantees a system message is always present (client-provided, else the default assistant persona).
- `normalizeUsage()` maps provider fields (`prompt_tokens`, `completion_tokens`, `total_tokens`, `completion_tokens_details.reasoning_tokens`) into the provider-agnostic `LiveUsage { inputTokens, outputTokens, totalTokens, reasoningTokens }`. Fields a provider doesn't report are left `undefined` — never guessed.

---

## 4. HTTP layer — routes & controller

### 4.1 `ai.routes.ts`

```ts
router.post("/chat", chat);
router.post("/chat-files", upload.array("files", 25), chatWithFiles);
router.post("/generate-questions", upload.array("files", 25), generateQuestionsFromUpload);
```

- `multer` uses **memory storage** — file bytes are held in RAM (25 MB/file, 25 files max).
- Mounted at `/api/v1/user/ai` (`src/routes/v1/user/index.ts`).

### 4.2 `ai.controller.ts`

| Function                       | Endpoint             | Type of response |
|--------------------------------|----------------------|------------------|
| `chat`                         | `POST /chat`         | SSE stream       |
| `chatWithFiles`                | `POST /chat-files`   | SSE stream       |
| `generateQuestionsFromUpload`  | `POST /generate-questions` | JSON (non-streaming) |
| `streamSseReply` (private)     | —                    | SSE helper used by `/chat-files` |
| `parseList` (private)          | —                    | Parses `questionTypes`/`difficulty` form fields (comma-string or JSON array) |

---

## 5. Streaming wire format (SSE)

`/chat` and `/chat-files` respond with `Content-Type: text/event-stream`. Each event is a `data:` line containing JSON with a `type` discriminator:

| `type`       | Payload                                            | Meaning |
|--------------|----------------------------------------------------|---------|
| `reasoning`  | `{ chunk }`                                        | Chain-of-thought delta (may be absent). |
| `content`    | `{ chunk }`                                        | Visible answer text delta. |
| `questions`  | `{ questions: [...] }`                             | Auto-detected quiz questions (only `/chat-files`). |
| `usage`      | `{ usage?, time_ms }`                              | Final token usage + backend-measured latency. |
| `done`       | —                                                  | Stream finished successfully. |
| `error`      | `{ message }`                                      | Stream failed. |

SSE headers set by the controller: `X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`.

If the model does **not** support streaming (the stream throws before anything was written), the controller **falls back** to a one-shot `chatWithAI` call and streams that single reply using the same SSE protocol.

---

## 6. `/chat` — plain streaming chat

**Request**
```json
POST /api/v1/user/ai/chat
{ "messages": [{ "role": "system", "content": "..." }, { "role": "user", "content": "..." }] }
```
(`{ "message": "hi" }` is still accepted for backwards compatibility.)

**Controller flow (`chat`)**
1. Accepts `messages` array (filtered to `system | user | assistant` roles) or a legacy `message` string.
2. Streams `streamChatWithAI` and forwards each `reasoning` / `content` delta to the client as SSE.
3. On completion sends a final real `usage` event (`time_ms` measured by the backend) then `done`.

**Output generated:** the model's text, streamed incrementally.

---

## 7. `/chat-files` — streaming chat with documents

**Request** (multipart/form-data)
```
POST /api/v1/user/ai/chat-files
prompt="summarize this"
files= file1.pdf, file2.docx   (up to 25)
```

**Controller flow (`chatWithFiles`)**
1. Validates that at least a prompt or a file is present.
2. Calls `isDoclingAvailable()` (memoized, 30s TTL) once.
3. For each file → `extractFileText()` (extraction ladder, see §8). Each extracted doc is wrapped as `--- filename ---\n<text>`.
4. Builds the context:
   - the extracted docs wrapped in `The user attached the following document(s)…`,
   - plus the raw `prompt`,
   - and, **prepended**, the `QUIZ_EXTRACTION_GUIDE` (see §10.2) — an adaptive instruction that makes the model reply with questions JSON if the documents contain a quiz, and answer normally otherwise.
5. Streams the reply via `streamSseReply`, which also runs `parseQuestionsJSON()` on the accumulated text; if the reply is valid questions JSON it emits an extra `questions` SSE event so the frontend can auto-open the review overlay.

**Output generated:** either a normal chat answer, or — if the document contains quiz problems — a `questions` event.

---

## 8. Text-extraction ladder — `extractFileText()`

The service decides how a file's bytes become text based on its extension:

1. **Excel fast-path** (`xlsx`, `xlsm`) → read cell-by-cell with `ExcelJS`:
   - `SheetName (N rows):` header per sheet, rows joined with ` | `, capped at 3000 lines.
2. **Plain-text fast-path** (`TEXT_EXTENSIONS`): `txt md markdown csv tsv json xml html yml yaml sql log ini toml` **plus source code** (`ts tsx js jsx py java c cpp cc h hpp go rs rb php sh bash`) → raw UTF-8 decode via `decodeText()`.
   - `decodeText()` detects binary by counting control characters; if >2% of chars are control chars it returns `""`.
3. **Docling path** (`DOCLING_EXTENSIONS`: `pdf ppt pptx doc docx xls zip png jpg jpeg gif webp`) → if `isDoclingAvailable()` is true, extract Markdown via Docling Serve.
4. **Last resort** → raw UTF-8 decode.

Each extracted file is wrapped as `--- filename ---\n<text>` and joined with `\n\n`. If **nothing** extracts readable text, the service throws:
> "Could not read readable text from the uploaded file(s)…"

The combined text is **truncated to 200,000 characters** before being sent to the model.

---

## 9. `/generate-questions` — quiz generation from files

**Request** (multipart/form-data)

| Field                     | Format                          | Notes |
|---------------------------|---------------------------------|-------|
| `files`                   | repeated binary parts           | required |
| `numberOfQuestions`       | string int                      | clamped to `[1, 50]`, default `5` |
| `questionTypes`           | comma-string or JSON array      | e.g. `["mcq","true_false"]` |
| `difficulty`              | comma-string or JSON array      | e.g. `["easy","medium"]` |
| `bloomsLevel`             | plain string                    | default `Understand` |
| `includeExplanations`     | `"true"` / `"false"`            | also accepts `true`/`"1"` |
| `includeHints`            | `"true"` / `"false"`            | |
| `includeReferenceNotes`   | `"true"` / `"false"`            | |
| `includeTags`             | `"true"` / `"false"`            | |

**Response (JSON)**
```json
{
  "success": true,
  "data": {
    "questions": [ { "question": "...", "options": [...], "answer": "...", "explanation?": "...", "hint?": "...", "type?": "...", "difficulty?": "...", "tags?": [...] } ],
    "extractedText": "...",
    "usage": { "inputTokens": 123, "outputTokens": 45, "totalTokens": 168 }
  }
}
```
Errors → `400 { success: false, message }`.

**Service pipeline (`generateQuestionsFromFiles`)**
1. Check Docling availability once (memoized).
2. `extractFileText()` per file → `--- filename ---\n<text>` blocks.
3. Join, truncate to 200k chars.
4. Build the prompt (see §10.1) from options + truncated text.
5. Single **non-streaming** `chatWithAI(prompt)` call (this is why generation returns JSON, not SSE).
6. `parseQuestionsJSON(content)` → normalized questions.

---

## 10. The prompts sent to the AI

### 10.1 Generation prompt (`generateQuestionsFromFiles`)

```
You are a quiz generator. Based strictly on the study material below,
generate exactly N quiz questions.

Question types to use (mixed): <from questionTypes>.
Target difficulty: <from difficulty>.
Bloom's taxonomy level: <bloomsLevel>.<optional extras line>

Return ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "questions": [
    {
      "question": "the question text",
      "type": "mcq" | "true_false" | "short",
      "difficulty": "easy" | "medium" | "hard" | "expert",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "answer": "the correct option text (or the exact expected answer for non-choice types)",
      "explanation": "why this is correct",
      "hint": "a small hint",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Rules:
- For multiple-choice questions always provide 4 options and ensure "answer" exactly matches one of them.
- For true/false use options ["True", "False"].
- Do not invent facts not present in the material.

STUDY MATERIAL:
<truncated extracted text>
```

Optional extras (each only appended when enabled): a concise explanation, a short hint, brief reference notes, 1-3 topic tags.

### 10.2 `QUIZ_EXTRACTION_GUIDE` (injected into `/chat-files`)

Tells the model: if the attached documents already contain quiz/MCQ questions with options and answers, reply with **only** the questions JSON (so the review overlay opens); otherwise answer normally as a chat assistant. It also encodes answer-resolution rules — e.g. strip option labels like `(A)`, resolve answer-key letters to actual option text, and mark the first option correct when unsure.

---

## 11. How AI output becomes usable data

### 11.1 Strict JSON parsing — `parseQuestionsJSON()`

- `stripJsonFences()` removes ` ```json ` / ` ``` ` fences and slices to the first `{` … last `}`.
- `JSON.parse` reads either a top-level `questions` array **or a bare array**.
- Each item is normalized:
  - `question` ← `q.question ?? q.content`
  - `options` ← string array, trimmed, empties dropped
  - `answer` ← string
  - `explanation` / `hint` / `type` / `difficulty` / `tags` kept only when present
- Items with an empty `question` are dropped.
- If zero valid questions remain → throws `"AI response did not contain any questions"`.

### 11.2 Frontend normalization — `mapRawQuestionsToPreview()` (`services/ai.ts`)

The raw questions returned by the backend are mapped into `AIQuestionPreview` for the review overlay:
- `options` get letter ids (`A`, `B`, …); `isCorrect` = `optionText === raw.answer`.
- If no option matches the answer text, it tries to resolve a letter answer (e.g. `"A"`); otherwise the first option is marked correct as a safety net so the overlay always highlights an answer.
- `type` validated against known types; falls back to `mcq` if options exist, else `short`.
- `difficulty` validated; defaults `medium`.
- `correctAnswer` = the correct option's letter id, or the raw `answer` for non-choice types.

### 11.3 Review & accept flow (frontend)

`AIQuestionReviewOverlay` renders every question; the user can **Accept** (forwards that question via `onQuestionsGenerated`), **Accept All**, or **Reject All**. Accepted questions are inserted into the quiz being authored.

---

## 12. Errors & fallbacks (summary)

| Scenario                                   | Behavior |
|--------------------------------------------|----------|
| Streaming unsupported by model              | Controller falls back to one-shot `chatWithAI`. |
| Client disconnects mid-stream               | `AbortController.abort()` cancels the LLM request. |
| Docling Serve unreachable                   | Memoized health check (30s TTL) → callers fall back to raw decode. |
| File has no extractable text                | File skipped; error thrown only if *all* files fail. |
| Model reply isn't valid questions JSON      | `parseQuestionsJSON` throws → `400 { success: false }`. |
| Provider reports no token usage             | `usage` field is simply omitted/undefined — never guessed. |