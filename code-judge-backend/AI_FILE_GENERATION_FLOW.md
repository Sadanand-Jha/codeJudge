# AI File → Question Generation — Complete Flow

This document explains the end-to-end path of **uploading a study-material file → sending it to the AI → generating a quiz**. It covers the frontend UI, the API layer, text extraction (fast-path + Docling), the prompt sent to the model, and how the returned JSON is parsed and surfaced back to the quiz editor.

---

## 1. Files involved

| Layer    | File                                                          | Role                                    |
|----------|---------------------------------------------------------------|-----------------------------------------|
| Frontend | `code-judge-frontend/src/components/quiz/creator/AIStudio.tsx`          | Upload → Configure → Generate UI       |
| Frontend | `code-judge-frontend/src/components/quiz/creator/AIQuestionReviewOverlay.tsx` | Full-screen review of generated questions |
| Frontend | `code-judge-frontend/src/services/ai.ts`                       | HTTP calls + SSE parser                 |
| Backend  | `code-judge-backend/src/routes/v1/user/ai.routes.ts`          | Routes + multer upload parsing         |
| Backend  | `code-judge-backend/src/controllers/ai.controller.ts`         | Request validation & orchestration      |
| Backend  | `code-judge-backend/src/services/question-generation.service.ts` | Text extraction + prompt + JSON parse  |
| Backend  | `code-judge-backend/src/services/docling-extract.service.ts`  | Docling Serve wrapper (PDF/PPTX/etc.)   |
| Backend  | `code-judge-backend/src/services/ai.service.ts`               | LLM client (OpenAI-compatible)          |

---

## 2. High-level flow

```
[AIStudio.tsx]  upload file → configure → click Generate
      │
      │  POST /api/v1/user/ai/generate-questions   (multipart/form-data)
      ▼
[ai.routes.ts]  multer memory storage  (25 MB/file, 25 files max)
      │
      ▼
[ai.controller.ts]  generateQuestionsFromUpload()
      │       │  validate files exist, clamp/coerce form fields
      │       ▼
      │   [question-generation.service.ts]  generateQuestionsFromFiles()
      │       │  1. isDoclingAvailable()?            (health check, 30s cache)
      │       │  2. extractFileText() per file       (extraction ladder, see §5)
      │       │  3. build prompt                       (see §6)
      │       │  4. chatWithAI(prompt)                (non-streaming LLM call)
      │       │  5. parseQuestionsJSON(content)       (strict parse, see §7)
      │       ▼
      │   { success: true, data: { questions: [...], usage } }
      ▼
[ai.ts]  generateQuestionsFromFiles() → RawAIGeneratedQuestion[]
      │
      ▼
[AIStudio.tsx]  map raw → GeneratedQuestion[]   (options get A/B/C/D ids, isCorrect derived)
      │
      ▼
[AIQuestionReviewOverlay.tsx]  review → Accept / Reject / Accept All
      │
      ▼
parent onQuestionsGenerated(questions)  →  questions added to quiz editor
```

---

## 3. Frontend — `AIStudio.tsx`

`AIStudio` is a slide-out side panel with three tabs: **Upload → Generate → Review**.

### 3.1 Upload tab
- Drag & drop or browse files.
- `handleFileUpload()` validates the extension against `SUPPORTED_FILE_TYPES`:
  `.pdf .ppt .pptx .doc .docx .xls .xlsx .csv .md .txt .zip .png .jpg .jpeg .gif .webp`.
- Each file becomes an `UploadedFile { id, name, size, type, status, progress, file }` — **client-only state, nothing is uploaded yet**.
- `getSmartSuggestions()` inspects the first file's extension and suggests recommended question types (e.g. `.pptx` → MCQ + True/False).

### 3.2 Generate tab (options → form fields)
`GenerationOptions` is sent as multipart form fields:

| Frontend option               | Backend field             | Format                |
|-------------------------------|---------------------------|------------------------|
| `numberOfQuestions`           | `numberOfQuestions`        | string int            |
| `questionTypes[]`             | `questionTypes`            | JSON array string     |
| `difficulty[]`                | `difficulty`               | JSON array string     |
| `bloomsLevel[0]`              | `bloomsLevel`              | plain string          |
| `includeExplanations` etc.    | `includeExplanations` …    | `"true"` / `"false"`  |
| files                         | `files` (repeated)         | binary parts          |

The tab also shows an estimated credit cost and the user's credit balance via `useAICreditConsumption`.

### 3.3 `handleGenerate()`
1. Collects the actual `File` objects from `uploadedFiles`. Errors if none.
2. Calls `generateQuestionsFromFiles(files, options)` from `services/ai.ts`.
3. Maps each raw question into `GeneratedQuestion`:
   - `options` → letter ids (`A`, `B`, …); `isCorrect` = `optionText === raw.answer`.
   - `type` — validated against the known set; falls back to `mcq` if options exist, else `short`.
   - `difficulty` — validated; defaults `medium`.
   - `correctAnswer` = the correct option's letter id, or the raw `answer` for non-choice types.
4. Shows the **Review** tab and opens the `AIQuestionReviewOverlay`.

### 3.4 Review / accept flow
- `AIQuestionReviewOverlay` renders every question with its options, explanation, hint and tags.
- Per-question **Accept** → `handleAccept(q)`: removes it from `generatedQuestions` and forwards via `onQuestionsGenerated([q])`.
- **Accept All** → `handleAcceptAll()`: forwards the whole batch via `onQuestionsGenerated(questions)`.
- **Reject All** → `handleRejectAll()`: clears the batch without forwarding.
- The parent's `onQuestionsGenerated` callback inserts the questions into the quiz being authored.

---

## 4. Backend — route & controller

### 4.1 `ai.routes.ts`
```ts
router.post("/chat", chat);
router.post("/chat-files", upload.array("files", 25), chatWithFiles);
router.post("/generate-questions", upload.array("files", 25), generateQuestionsFromUpload);
```
- `multer` with **memory storage** — buffers held in RAM (25 MB/file).
- The full router is mounted behind the shared `authenticate` middleware, so `req.user` is available.

### 4.2 `generateQuestionsFromUpload` (controller)
- Rejects `400` if `files` is empty.
- Coerces form fields:
  - `numberOfQuestions` → clamped to `[1, 50]`, default `5`.
  - `questionTypes` / `difficulty` → `parseList()` handles **comma-separated** strings **or JSON arrays**.
  - `include*` → `boolOf()` accepts `"true" | true | "1"`.
- Calls `generateQuestionsFromFiles(...)` and returns `{ success: true, data: result }`.
- Any thrown error → `400 { success: false, message }`.

---

## 5. Text extraction ladder (`extractFileText`)

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

## 6. Docling Serve wrapper

- Expected at `DOCLING_URL` (default `http://localhost:5001`), run externally.
- `isDoclingAvailable()`: `client.health()` with a **2s timeout**, memoized with a **30s TTL** (`HEALTH_CHECK_TTL_MS`) so the backend doesn't hammer an unavailable service. When Docling is down, callers silently fall back to the raw decode path.
- `extractTextWithDocling(buffer, filename)`: `client.convert(buffer, filename, { to_formats: ["md"] })`, returns `md_content` (fallback `text_content`), throws if empty.

---

## 7. The prompt sent to the AI

`generateQuestionsFromFiles()` makes a **single non-streaming** `chatWithAI(prompt)` call. The prompt instructs the model to return **only** strict JSON:

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

---

## 8. Parsing the model output (`parseQuestionsJSON`)

- `stripJsonFences()` removes ```` ```json ```` / ```` ``` ```` fences and slices to the first `{` … last `}`.
- `JSON.parse` then reads a top-level `questions` array (or a bare array).
- Each item is normalized:
  - `question` ← `q.question ?? q.content`
  - `options` ← string array, trimmed, empties dropped
  - `answer` ← string
  - `explanation` / `hint` / `type` / `difficulty` / `tags` kept when present
- Items with an empty `question` are dropped.
- If zero valid questions remain → throws `"AI response did not contain any questions"`.
- Usage (token counts) from the provider is optionally returned alongside.

---

## 9. Wire format — streaming chat (context)

For completeness — `/chat` and `/chat-files` stream (unlike generation). SSE payloads:

- `{ "type": "reasoning", "chunk": "…" }`
- `{ "type": "content",   "chunk": "…" }`
- `{ "type": "usage",     "usage": {...}, "time_ms": 1234 }` (final, real)
- `{ "type": "done" }`
- `{ "type": "error",     "message": "…" }`

`streamChat` / `streamChatWithFiles` (in `services/ai.ts`) parse these lines and dispatch to the matching callbacks. If the model doesn't support streaming, the backend falls back to a one-shot `chatWithAI` reply.