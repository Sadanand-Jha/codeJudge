import { randomUUID } from "node:crypto";
import { z } from "zod";
import * as cheerio from "cheerio";
import { pool } from "../config/database.ts";
import { generateJsonFromDocument } from "./ai.service.ts";

const GeneratedQuestionSchema = z.object({
  question_text: z.string().trim().min(3).max(10_000),
  question_html: z.string().trim().min(3).max(30_000),
  subject_id: z.number().int().positive(),
  chapter_id: z.number().int().positive().nullable(),
  topic_id: z.number().int().positive().nullable(),
  difficulty_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
});

const GeneratedPayloadSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(1),
});

export type GeneratedSubjectiveQuestion = z.infer<typeof GeneratedQuestionSchema>;

export interface ImportScope {
  subjectId: number;
  chapterId: number | null;
  topicId: number | null;
}

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question_text", "question_html", "subject_id", "chapter_id", "topic_id", "difficulty_id", "category_id"],
        properties: {
          question_text: { type: "string", minLength: 3 },
          question_html: { type: "string", minLength: 3 },
          subject_id: { type: "integer" },
          chapter_id: { type: ["integer", "null"] },
          topic_id: { type: ["integer", "null"] },
          difficulty_id: { type: "integer" },
          category_id: { type: "integer" },
        },
      },
    },
  },
};

const ALLOWED_HTML_TAGS = new Set([
  "p", "br", "strong", "em", "u", "sup", "sub", "ul", "ol", "li",
  "blockquote", "pre", "code", "table", "thead", "tbody", "tr", "th", "td",
]);

function sanitizeQuestionHtml(input: string): { html: string; text: string } {
  const $ = cheerio.load(`<div id="question-root">${input}</div>`, null, false);
  $("script,style,iframe,object,embed,form,input,button,svg,math,img,a").remove();
  $("#question-root *").each((_index, element) => {
    const tag = String(element.tagName || "").toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(tag)) {
      $(element).replaceWith($(element).contents());
      return;
    }
    for (const attribute of [...(element.attributes ?? [])]) {
      $(element).removeAttr(attribute.name);
    }
  });
  const html = $("#question-root").html()?.trim() || "";
  const text = $("#question-root").text().replace(/\s+/g, " ").trim();
  if (!html || !text) throw new Error("AI produced an empty question after HTML sanitization.");
  return { html, text };
}

const stripJsonFences = (value: string) => {
  const cleaned = value.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
};

async function resolveScope(scope: ImportScope) {
  const { rows } = await pool.query(
    `SELECT s.id AS subject_id, s.subject_name,
            sc.id AS chapter_id, sc.chapter_name,
            ct.id AS topic_id, ct.topic_name
     FROM subjects s
     LEFT JOIN subject_chapters sc ON sc.id = $2 AND sc.subject_id = s.id
     LEFT JOIN chapter_topics ct ON ct.id = $3 AND ct.chapter_id = sc.id
     WHERE s.id = $1`,
    [scope.subjectId, scope.chapterId, scope.topicId]
  );
  const row = rows[0];
  if (!row) throw new Error("Selected subject was not found.");
  if (scope.chapterId && !row.chapter_id) throw new Error("Selected chapter does not belong to this subject.");
  if (scope.topicId && !scope.chapterId) throw new Error("Select a chapter before selecting a topic.");
  if (scope.topicId && !row.topic_id) throw new Error("Selected topic does not belong to this chapter.");
  return row as { subject_id: number; subject_name: string; chapter_id: number | null; chapter_name: string | null; topic_id: number | null; topic_name: string | null };
}

async function getAiClassificationCatalog(subjectId: number) {
  const [chapters, topics, difficulties, categories] = await Promise.all([
    pool.query(`SELECT id, subject_id, chapter_name AS name FROM subject_chapters WHERE subject_id = $1 ORDER BY id`, [subjectId]).then((r) => r.rows),
    pool.query(
      `SELECT ct.id, ct.chapter_id, ct.topic_name AS name
       FROM chapter_topics ct JOIN subject_chapters sc ON sc.id = ct.chapter_id
       WHERE sc.subject_id = $1 ORDER BY ct.chapter_id, ct.id`,
      [subjectId]
    ).then((r) => r.rows),
    pool.query(`SELECT id, name FROM question_difficulty ORDER BY id`).then((r) => r.rows),
    pool.query(`SELECT id, name FROM question_category ORDER BY id`).then((r) => r.rows),
  ]);
  return { chapters, topics, difficulties, categories };
}

export async function getSubjectiveImportCatalog() {
  const [subjects, chapters, topics, difficulties, categories] = await Promise.all([
    pool.query(`SELECT id, subject_name AS name FROM subjects ORDER BY subject_name`).then((r) => r.rows),
    pool.query(`SELECT id, subject_id, chapter_name AS name FROM subject_chapters ORDER BY chapter_name`).then((r) => r.rows),
    pool.query(`SELECT id, chapter_id, topic_name AS name FROM chapter_topics ORDER BY topic_name`).then((r) => r.rows),
    pool.query(`SELECT id, name FROM question_difficulty ORDER BY id`).then((r) => r.rows),
    pool.query(`SELECT id, name FROM question_category ORDER BY id`).then((r) => r.rows),
  ]);
  return { subjects, chapters, topics, difficulties, categories };
}

export async function createSubjectiveImportPreview(input: {
  userId: number;
  file: { filename: string; mimeType: string; buffer: Buffer };
  scope: ImportScope;
}) {
  const scope = await resolveScope(input.scope);
  const classificationCatalog = await getAiClassificationCatalog(input.scope.subjectId);
  const scopeLabel = [scope.subject_name, scope.chapter_name, scope.topic_name].filter(Boolean).join(" → ");
  const prompt = `Extract the subjective problems/questions that are actually present in the attached document.

Import scope: ${scopeLabel}.
The selected subject_id is ${input.scope.subjectId}.${input.scope.chapterId ? ` Lock every question to chapter_id ${input.scope.chapterId}.` : " Choose the best matching chapter_id from the catalog, or null when no confident match exists."}${input.scope.topicId ? ` Lock every question to topic_id ${input.scope.topicId}.` : " Choose the best matching topic_id under the chosen chapter, or null when no confident match exists."}

Process the entire document from beginning to end and return EVERY subjective problem/question that is present, preserving its wording and source order. Do not sample, summarize, stop after an arbitrary count, or omit repeated-looking questions unless they are exact duplicates. Do not create unrelated questions and do not include answers or solutions.

The JSON response must contain one object in the questions array for every detected question in the complete file. There is no application-level question-count limit.

Return both:
- question_text: clean plain text used for search and duplicate detection
- question_html: polished semantic HTML for website rendering. Use only p, br, strong, em, u, sup, sub, ul, ol, li, blockquote, pre, code, table, thead, tbody, tr, th, and td. Do not use attributes, links, images, scripts, styles, SVG, or MathML.

For every question return exact integer IDs from this database catalog. Never invent an ID:
${JSON.stringify({ subject: { id: scope.subject_id, name: scope.subject_name }, ...classificationCatalog })}

A Numerical category requires calculation, derivation, or quantitative reasoning. Everything else is Theory. chapter_id and topic_id may be null only as described above.`;

  const generated = await generateJsonFromDocument({
    filename: input.file.filename,
    mimeType: input.file.mimeType,
    buffer: input.file.buffer,
    prompt,
    schemaName: "subjective_question_import",
    schema: OUTPUT_SCHEMA,
  });

  let parsed: z.infer<typeof GeneratedPayloadSchema>;
  try {
    parsed = GeneratedPayloadSchema.parse(JSON.parse(stripJsonFences(generated.content)));
  } catch (error) {
    throw new Error(`AI returned invalid question JSON: ${error instanceof Error ? error.message : "validation failed"}`);
  }

  const chapterIds = new Set(classificationCatalog.chapters.map((row) => Number(row.id)));
  const topicToChapter = new Map(classificationCatalog.topics.map((row) => [Number(row.id), Number(row.chapter_id)]));
  const difficultyNames = new Map(classificationCatalog.difficulties.map((row) => [Number(row.id), String(row.name)]));
  const categoryNames = new Map(classificationCatalog.categories.map((row) => [Number(row.id), String(row.name)]));
  const chapterNames = new Map(classificationCatalog.chapters.map((row) => [Number(row.id), String(row.name)]));
  const topicNames = new Map(classificationCatalog.topics.map((row) => [Number(row.id), String(row.name)]));

  const seen = new Set<string>();
  const questions = parsed.questions.map((question) => {
    if (question.subject_id !== input.scope.subjectId) throw new Error(`AI returned invalid subject_id ${question.subject_id}.`);
    if (input.scope.chapterId && question.chapter_id !== input.scope.chapterId) throw new Error(`AI did not use the selected chapter_id ${input.scope.chapterId}.`);
    if (question.chapter_id !== null && !chapterIds.has(question.chapter_id)) throw new Error(`AI returned invalid chapter_id ${question.chapter_id}.`);
    if (input.scope.topicId && question.topic_id !== input.scope.topicId) throw new Error(`AI did not use the selected topic_id ${input.scope.topicId}.`);
    if (question.topic_id !== null && (question.chapter_id === null || topicToChapter.get(question.topic_id) !== question.chapter_id)) throw new Error(`AI returned topic_id ${question.topic_id} outside its chapter.`);
    if (!difficultyNames.has(question.difficulty_id)) throw new Error(`AI returned invalid difficulty_id ${question.difficulty_id}.`);
    if (!categoryNames.has(question.category_id)) throw new Error(`AI returned invalid category_id ${question.category_id}.`);
    const sanitized = sanitizeQuestionHtml(question.question_html);
    return { ...question, question_text: sanitized.text, question_html: sanitized.html };
  }).filter((question) => {
    const key = question.question_text.toLocaleLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!questions.length) throw new Error("AI did not find any subjective questions in this document.");

  const batchId = randomUUID();
  await pool.query(
    `INSERT INTO subjective_question_import_batches
      (id, created_by, subject_id, chapter_id, topic_id, source_filename, questions, question_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [batchId, input.userId, input.scope.subjectId, input.scope.chapterId, input.scope.topicId,
      input.file.filename, JSON.stringify(questions), questions.length]
  );

  const previewQuestions = questions.map((question) => ({
    ...question,
    chapter_name: question.chapter_id ? chapterNames.get(question.chapter_id) ?? null : null,
    topic_name: question.topic_id ? topicNames.get(question.topic_id) ?? null : null,
    difficulty_name: difficultyNames.get(question.difficulty_id)!,
    category_name: categoryNames.get(question.category_id)!,
  }));
  return { batchId, sourceFilename: input.file.filename, scope, questions: previewQuestions, usage: generated.usage, expiresInSeconds: 86_400 };
}

export async function commitSubjectiveImport(input: {
  userId: number;
  batchId: string;
  selectedIndexes?: number[];
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const batchResult = await client.query(
      `SELECT * FROM subjective_question_import_batches
       WHERE id = $1 AND created_by = $2 FOR UPDATE`,
      [input.batchId, input.userId]
    );
    const batch = batchResult.rows[0];
    if (!batch) throw new Error("Import preview was not found.");
    if (batch.status !== "pending") throw new Error(`This import batch is already ${batch.status}.`);
    if (new Date(batch.expires_at).getTime() <= Date.now()) {
      await client.query(`UPDATE subjective_question_import_batches SET status = 'expired' WHERE id = $1`, [input.batchId]);
      await client.query("COMMIT");
      throw new Error("This import preview has expired. Generate a new preview.");
    }

    const questions = GeneratedPayloadSchema.shape.questions.parse(batch.questions) as GeneratedSubjectiveQuestion[];
    const requested = input.selectedIndexes
      ? [...new Set(input.selectedIndexes)].filter((index) => Number.isInteger(index) && index >= 0 && index < questions.length)
      : questions.map((_, index) => index);
    if (!requested.length) throw new Error("Select at least one question to import.");

    let inserted = 0;
    let skippedDuplicates = 0;
    for (const index of requested) {
      const question = questions[index];
      const scopeValid = await client.query(
        `SELECT EXISTS(SELECT 1 FROM subjects WHERE id = $1) AS subject_ok,
                ($2::int IS NULL OR EXISTS(SELECT 1 FROM subject_chapters WHERE id = $2 AND subject_id = $1)) AS chapter_ok,
                ($3::int IS NULL OR EXISTS(SELECT 1 FROM chapter_topics WHERE id = $3 AND chapter_id = $2)) AS topic_ok,
                EXISTS(SELECT 1 FROM question_difficulty WHERE id = $4) AS difficulty_ok,
                EXISTS(SELECT 1 FROM question_category WHERE id = $5) AS category_ok`,
        [question.subject_id, question.chapter_id, question.topic_id, question.difficulty_id, question.category_id]
      );
      if (!Object.values(scopeValid.rows[0]).every(Boolean)) throw new Error("A generated question contains a stale or invalid classification ID.");

      const duplicate = await client.query(
        `SELECT 1 FROM subjective_question_bank
         WHERE subject_id = $1
           AND chapter_id IS NOT DISTINCT FROM $2
           AND topic_id IS NOT DISTINCT FROM $3
           AND lower(btrim(question_text)) = lower(btrim($4))
         LIMIT 1`,
        [question.subject_id, question.chapter_id, question.topic_id, question.question_text]
      );
      if (duplicate.rowCount) {
        skippedDuplicates++;
        continue;
      }

      await client.query(
        `INSERT INTO subjective_question_bank
          (subject_id, chapter_id, topic_id, difficulty_id, category_id, question_text, question_html)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [question.subject_id, question.chapter_id, question.topic_id, question.difficulty_id,
          question.category_id, question.question_text, question.question_html]
      );
      inserted++;
    }

    await client.query(
      `UPDATE subjective_question_import_batches
       SET status = 'imported', inserted_count = $2, imported_at = NOW()
       WHERE id = $1`,
      [input.batchId, inserted]
    );
    await client.query("COMMIT");
    return { inserted, skippedDuplicates, selected: requested.length };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
