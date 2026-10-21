import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Pool, PoolClient } from "pg";
import { pool } from "../config/database.ts";
import { generateJsonFromDocument } from "./ai.service.ts";

const MAX_SUBJECTS = 25;
const MIN_CHAPTERS_PER_SUBJECT = 5;
const MAX_CHAPTERS_PER_SUBJECT = 10;
const MIN_TOPICS_PER_CHAPTER = 3;
const MAX_TOPICS_PER_CHAPTER = 7;
const SAFETY_MAX_CHAPTERS_PER_SUBJECT = 20;
const SAFETY_MAX_TOPICS_PER_CHAPTER = 15;
const MAX_TOPIC_CHARS = 80;
const MAX_NAME_CHARS = 120;
const SYLLABUS_IMPORT_LOCK_KEY = 741_852_963;

type Queryable = Pool | PoolClient;

const GeneratedSyllabusSchema = z.object({
  subjects: z
    .array(
      z.object({
        subject_name: z.string().trim().min(1),
        chapters: z
          .array(
            z.object({
              chapter_name: z.string().trim().min(1),
              topics: z.array(z.string().trim().min(1)).max(SAFETY_MAX_TOPICS_PER_CHAPTER),
            })
          )
          .max(SAFETY_MAX_CHAPTERS_PER_SUBJECT),
      })
    )
    .min(0)
    .max(MAX_SUBJECTS),
});

export interface CleanSyllabusChapter {
  chapter_name: string;
  topics: string[];
}

export interface CleanSyllabusSubject {
  subject_name: string;
  chapters: CleanSyllabusChapter[];
}

export interface SyllabusImportTopicPreview {
  name: string;
  existing: boolean;
  existingId: number | null;
}

export interface SyllabusImportChapterPreview {
  name: string;
  existing: boolean;
  existingId: number | null;
  topics: SyllabusImportTopicPreview[];
}

export interface SyllabusImportSubjectPreview {
  name: string;
  existing: boolean;
  existingId: number | null;
  chapters: SyllabusImportChapterPreview[];
}

export interface SyllabusImportSummary {
  subjects: { total: number; existing: number; new: number };
  chapters: { total: number; existing: number; new: number };
  topics: { total: number; existing: number; new: number };
  totalNew: number;
  totalExisting: number;
}

export interface SyllabusImportPreview {
  batchId: string;
  sourceFilename: string;
  subjects: SyllabusImportSubjectPreview[];
  summary: SyllabusImportSummary;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  expiresInSeconds: number;
}

export interface SyllabusImportCommitResult {
  subjectsCreated: number;
  subjectsReused: number;
  chaptersCreated: number;
  chaptersReused: number;
  topicsCreated: number;
  topicsReused: number;
}

interface ExistingNode {
  id: number;
  name: string;
}

interface ExistingCurriculum {
  subjects: Map<string, ExistingNode>;
  chapters: Map<number, Map<string, ExistingNode>>;
  topics: Map<number, Map<string, ExistingNode>>;
}

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subjects"],
  properties: {
    subjects: {
      type: "array",
      minItems: 0,
      maxItems: MAX_SUBJECTS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["subject_name", "chapters"],
        properties: {
          subject_name: { type: "string", minLength: 1, maxLength: 255 },
          chapters: {
            type: "array",
            maxItems: SAFETY_MAX_CHAPTERS_PER_SUBJECT,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["chapter_name", "topics"],
              properties: {
                chapter_name: { type: "string", minLength: 1, maxLength: 255 },
                topics: {
                  type: "array",
                  maxItems: SAFETY_MAX_TOPICS_PER_CHAPTER,
                  items: { type: "string", minLength: 1, maxLength: 255 },
                },
              },
            },
          },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You are an expert academic curriculum designer and syllabus parser.

TASK
1. Read the complete syllabus document.
2. For each subject, build an internal summary of its scope, units, and key concepts.
3. Use that summary to GENERATE a clean Subject -> Chapter -> Topic hierarchy.
4. Return only the hierarchy as JSON. Do not return the summary or your reasoning.

STRUCTURE (NON-NEGOTIABLE)
- Every subject must have between ${MIN_CHAPTERS_PER_SUBJECT} and ${MAX_CHAPTERS_PER_SUBJECT} chapters.
- Every chapter must have between ${MIN_TOPICS_PER_CHAPTER} and ${MAX_TOPICS_PER_CHAPTER} topics.
- Every topic must be one short concept: 2-8 words, maximum ${MAX_TOPIC_CHARS} characters.
- Subject and chapter names must be maximum ${MAX_NAME_CHARS} characters.
- No numbering, no "Unit/Chapter/Module/Part" prefixes, no course codes.
- No duplicate names (case-insensitive) at any level.
- Never use a paragraph, learning outcome, textbook/reference, or assessment rule as a topic.
- Use the syllabus as the source of truth. You may split, merge, or reorganize its content to meet the structure.
- If the syllabus is sparse, fill gaps with standard, closely related curriculum concepts for that subject. Stay within the subject's scope.
- Include every new subject found in the document, up to ${MAX_SUBJECTS} subjects. Skip every subject listed in EXISTING_SUBJECTS.
- Treat abbreviations, punctuation, casing, and close variants of an existing subject as the same subject and skip it.
- Before returning, self-check the counts and lengths. Fix every violation before answering.

OUTPUT FORMAT
{"subjects":[{"subject_name":"...","chapters":[{"chapter_name":"...","topics":["...","..."]}]}]}

EXCEPTION
- If the document is not a syllabus, return {"subjects":[]}.
- If every subject in the document is already in EXISTING_SUBJECTS, return {"subjects":[]}. An empty array is valid in that case.`;

const PROMPT = `Summarize the syllabus internally, then generate the complete curriculum hierarchy.
Use the document as the source of truth. If it is sparse, fill gaps with standard, closely related concepts for each subject.
Return every new subject found in the document that is not listed in EXISTING_SUBJECTS. Follow the structure requirements exactly.`;

const stripJsonFences = (value: string): string => {
  const cleaned = value.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
};

const balancedObjects = (raw: string): string[] => {
  const blocks: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      if (depth === 0) start = index;
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        blocks.push(raw.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return blocks;
};

const parseGeneratedPayload = (raw: string): unknown => {
  const cleaned = stripJsonFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const salvage = balancedObjects(cleaned).filter(
      (block) => block.includes('"subject_name"') && block.includes('"chapters"')
    );
    if (salvage.length) {
      return { subjects: salvage.map((block) => JSON.parse(block) as unknown) };
    }
    throw error;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asText = (value: unknown): string | null => {
  if (typeof value === "string") return value.trim() || null;
  if (!isRecord(value)) return null;
  for (const key of [
    "topic_name",
    "chapter_name",
    "subject_name",
    "unit_name",
    "name",
    "title",
    "topic",
    "chapter",
    "subject",
    "unit",
  ]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const coerceChapter = (value: unknown): unknown => {
  const chapter = isRecord(value) ? value : {};
  const directTopics = asArray(chapter.topics ?? chapter.topic_names ?? chapter.subtopics).map(asText).filter(Boolean);
  const nested = asArray(chapter.chapters ?? chapter.subchapters ?? chapter.sections);
  const nestedTopics = nested.flatMap((child) => {
    const record = isRecord(child) ? child : {};
    const topics = asArray(record.topics ?? record.topic_names ?? record.subtopics).map(asText).filter(Boolean);
    if (topics.length) return topics;
    const name = asText(record);
    return name ? [name] : [];
  });
  return {
    chapter_name: asText(chapter.chapter_name ?? chapter.chapter ?? chapter.unit_name ?? chapter.name ?? chapter.title) ?? "",
    topics: [...directTopics, ...nestedTopics],
  };
};

const coerceSubject = (value: unknown): unknown => {
  const subject = isRecord(value) ? value : {};
  return {
    subject_name: asText(subject.subject_name ?? subject.subject ?? subject.name ?? subject.title) ?? "",
    chapters: asArray(subject.chapters ?? subject.units ?? subject.modules).map(coerceChapter),
  };
};

const coerceGeneratedPayload = (value: unknown): unknown => {
  if (Array.isArray(value)) return { subjects: value.map(coerceSubject) };
  if (!isRecord(value)) return value;
  if (Array.isArray(value.subjects)) return { subjects: value.subjects.map(coerceSubject) };
  if (value.subject_name || value.subject || value.name) return { subjects: [coerceSubject(value)] };
  return value;
};

const truncateName = (value: string, limit: number): string => {
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit);
  const boundary = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("-"));
  return (boundary >= Math.floor(limit * 0.7) ? cut.slice(0, boundary) : cut).trim();
};

export const cleanSyllabusName = (value: string, limit = MAX_NAME_CHARS): string => {
  let name = value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  name = name.replace(/^[\s"'“”‘’`]+|[\s"'“”‘’`]+$/g, "");
  name = name.replace(
    /^(?:chapter|unit|module|part|section|topic)\s*(?:no\.?)?\s*\d+\s*[:.\-–—)]*\s*/i,
    ""
  );
  name = name.replace(/^(?:chapter|unit|module|part|section|topic)\s*[:.\-–—]+\s*/i, "");
  name = name.replace(/^[A-Z]{2,6}[\s-]?\d{2,4}[A-Z]?\s*[:.\-–—]?\s+(?=\S)/, "");
  name = name.replace(/^\d+(?:\.\d+)*\s*[.)\-:]?\s+(?=\S)/, "");
  name = name.replace(/\s+/g, " ").trim();
  return truncateName(name.replace(/[;,]+$/, "").trim(), limit);
};

/**
 * A single long paragraph is not a topic. If the model returns a list in one
 * string, split it into separate topics before truncating.
 */
const splitTopicCandidates = (raw: string): string[] => {
  const normalized = cleanSyllabusName(raw, 255);
  if (normalized.length <= MAX_TOPIC_CHARS) return [normalized];
  const parts = normalized
    .split(/\s*(?:[;|]|\n)\s*|\s*,\s*/)
    .map((part) => cleanSyllabusName(part, MAX_TOPIC_CHARS))
    .filter(Boolean);
  if (parts.length > 1) return parts.slice(0, SAFETY_MAX_TOPICS_PER_CHAPTER);
  return [cleanSyllabusName(normalized, MAX_TOPIC_CHARS)];
};

const describeValidationFailure = (error: unknown): string => {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    if (!first) return "validation failed";
    return `${first.message}${first.path.length ? ` (${first.path.join(".")})` : ""}`;
  }
  return error instanceof Error ? error.message : "validation failed";
};

export const syllabusKey = (value: string): string =>
  cleanSyllabusName(value)
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s*([+#])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

export function cleanGeneratedSyllabus(value: unknown): CleanSyllabusSubject[] {
  const parsed = GeneratedSyllabusSchema.parse(coerceGeneratedPayload(value));
  const subjects = new Map<
    string,
    { subject_name: string; chapters: Map<string, { chapter_name: string; topics: Map<string, string> }> }
  >();

  for (const rawSubject of parsed.subjects) {
    const subjectName = cleanSyllabusName(rawSubject.subject_name, MAX_NAME_CHARS);
    const subjectKey = syllabusKey(subjectName);
    if (!subjectName || !subjectKey) continue;

    let subject = subjects.get(subjectKey);
    if (!subject) {
      subject = { subject_name: subjectName, chapters: new Map() };
      subjects.set(subjectKey, subject);
    }

    for (const rawChapter of rawSubject.chapters) {
      const chapterName = cleanSyllabusName(rawChapter.chapter_name, MAX_NAME_CHARS);
      const chapterKey = syllabusKey(chapterName);
      if (!chapterName || !chapterKey) continue;

      let chapter = subject.chapters.get(chapterKey);
      if (!chapter) {
        chapter = { chapter_name: chapterName, topics: new Map() };
        subject.chapters.set(chapterKey, chapter);
      }

      for (const rawTopic of rawChapter.topics) {
        for (const topicName of splitTopicCandidates(rawTopic)) {
          const topicKey = syllabusKey(topicName);
          if (!topicName || !topicKey) continue;
          if (!chapter.topics.has(topicKey)) chapter.topics.set(topicKey, topicName);
        }
      }
    }
  }

  const curriculum = [...subjects.values()].map((subject) => ({
    subject_name: subject.subject_name,
    chapters: [...subject.chapters.values()].map((chapter) => ({
      chapter_name: chapter.chapter_name,
      topics: [...chapter.topics.values()],
    })),
  }));

  if (!curriculum.length) {
    throw new Error("AI did not find a subject or chapter in this document.");
  }
  if (curriculum.length > MAX_SUBJECTS) {
    throw new Error(`The syllabus contains more than ${MAX_SUBJECTS} subjects. Split it and import again.`);
  }
  return curriculum;
}

export const auditCurriculum = (curriculum: CleanSyllabusSubject[]): string[] => {
  const violations: string[] = [];
  for (const subject of curriculum) {
    const chapterCount = subject.chapters.length;
    if (chapterCount < MIN_CHAPTERS_PER_SUBJECT || chapterCount > MAX_CHAPTERS_PER_SUBJECT) {
      violations.push(
        `"${subject.subject_name}" has ${chapterCount} chapters; required ${MIN_CHAPTERS_PER_SUBJECT}-${MAX_CHAPTERS_PER_SUBJECT}.`
      );
    }
    for (const chapter of subject.chapters) {
      const topicCount = chapter.topics.length;
      if (topicCount < MIN_TOPICS_PER_CHAPTER || topicCount > MAX_TOPICS_PER_CHAPTER) {
        violations.push(
          `"${subject.subject_name}" > "${chapter.chapter_name}" has ${topicCount} topics; required ${MIN_TOPICS_PER_CHAPTER}-${MAX_TOPICS_PER_CHAPTER}.`
        );
      }
    }
  }
  return violations;
};

const formatViolations = (violations: string[]): string => {
  const shown = violations.slice(0, 20);
  const lines = shown.map((violation) => `- ${violation}`).join("\n");
  return violations.length > shown.length
    ? `${lines}\n- ...and ${violations.length - shown.length} more.`
    : lines;
};

async function readExistingCurriculum(db: Queryable): Promise<ExistingCurriculum> {
  const subjectResult = await db.query(`SELECT id, subject_name FROM subjects ORDER BY id`);
  const chapterResult = await db.query(`SELECT id, subject_id, chapter_name FROM subject_chapters ORDER BY id`);
  const topicResult = await db.query(`SELECT id, chapter_id, topic_name FROM chapter_topics ORDER BY id`);

  const subjects = new Map<string, ExistingNode>();
  for (const row of subjectResult.rows as { id: number; subject_name: string }[]) {
    const key = syllabusKey(row.subject_name);
    if (key && !subjects.has(key)) subjects.set(key, { id: Number(row.id), name: row.subject_name });
  }

  const chapters = new Map<number, Map<string, ExistingNode>>();
  for (const row of chapterResult.rows as { id: number; subject_id: number; chapter_name: string }[]) {
    const subjectId = Number(row.subject_id);
    let map = chapters.get(subjectId);
    if (!map) {
      map = new Map();
      chapters.set(subjectId, map);
    }
    const key = syllabusKey(row.chapter_name);
    if (key && !map.has(key)) map.set(key, { id: Number(row.id), name: row.chapter_name });
  }

  const topics = new Map<number, Map<string, ExistingNode>>();
  for (const row of topicResult.rows as { id: number; chapter_id: number; topic_name: string }[]) {
    const chapterId = Number(row.chapter_id);
    let map = topics.get(chapterId);
    if (!map) {
      map = new Map();
      topics.set(chapterId, map);
    }
    const key = syllabusKey(row.topic_name);
    if (key && !map.has(key)) map.set(key, { id: Number(row.id), name: row.topic_name });
  }

  return { subjects, chapters, topics };
}

async function readPopulatedSubjectNames(db: Queryable): Promise<string[]> {
  const result = await db.query(`
    SELECT DISTINCT s.subject_name
    FROM subjects s
    JOIN subject_chapters c ON c.subject_id = s.id
    JOIN chapter_topics t ON t.chapter_id = c.id
    ORDER BY s.subject_name
  `);
  return (result.rows as { subject_name: string }[]).map((row) => row.subject_name);
}

function buildPreview(
  sourceFilename: string,
  curriculum: CleanSyllabusSubject[],
  existing: ExistingCurriculum
): { batchId: string; sourceFilename: string; subjects: SyllabusImportSubjectPreview[]; summary: SyllabusImportSummary } {
  const summary: SyllabusImportSummary = {
    subjects: { total: 0, existing: 0, new: 0 },
    chapters: { total: 0, existing: 0, new: 0 },
    topics: { total: 0, existing: 0, new: 0 },
    totalNew: 0,
    totalExisting: 0,
  };

  const subjects = curriculum.map((subject) => {
    const existingSubject = existing.subjects.get(syllabusKey(subject.subject_name)) ?? null;
    const chapterMap = existingSubject ? existing.chapters.get(existingSubject.id) : undefined;

    summary.subjects.total++;
    if (existingSubject) summary.subjects.existing++;
    else summary.subjects.new++;

    const chapters = subject.chapters.map((chapter) => {
      const existingChapter = chapterMap?.get(syllabusKey(chapter.chapter_name)) ?? null;
      const topicMap = existingChapter ? existing.topics.get(existingChapter.id) : undefined;

      summary.chapters.total++;
      if (existingChapter) summary.chapters.existing++;
      else summary.chapters.new++;

      const topics = chapter.topics.map((topic) => {
        const existingTopic = topicMap?.get(syllabusKey(topic)) ?? null;
        summary.topics.total++;
        if (existingTopic) summary.topics.existing++;
        else summary.topics.new++;
        return {
          name: topic,
          existing: Boolean(existingTopic),
          existingId: existingTopic?.id ?? null,
        };
      });

      return {
        name: chapter.chapter_name,
        existing: Boolean(existingChapter),
        existingId: existingChapter?.id ?? null,
        topics,
      };
    });

    return {
      name: subject.subject_name,
      existing: Boolean(existingSubject),
      existingId: existingSubject?.id ?? null,
      chapters,
    };
  });

  summary.totalNew = summary.subjects.new + summary.chapters.new + summary.topics.new;
  summary.totalExisting = summary.subjects.existing + summary.chapters.existing + summary.topics.existing;
  return { batchId: "", sourceFilename, subjects, summary };
}

export async function createSyllabusImportPreview(input: {
  userId: number;
  file: { filename: string; mimeType: string; buffer: Buffer };
}, onProgress?: (chars: number, tail: string, delta?: string) => void): Promise<SyllabusImportPreview> {
  const startedAt = Date.now();
  console.log("[syllabus-import] preview: start", {
    filename: input.file.filename,
    mimeType: input.file.mimeType,
    bytes: input.file.buffer?.length,
    userId: input.userId,
  });

  let curriculum: CleanSyllabusSubject[] | null = null;
  let finalGenerated: Awaited<ReturnType<typeof generateJsonFromDocument>> | null = null;
  let repairNotes: string | undefined;

  const populatedSubjects = await readPopulatedSubjectNames(pool);
  const existingSubjectKeys = new Set(populatedSubjects.map(syllabusKey));
  const existingSubjectsSection = populatedSubjects.length
    ? `\n\nEXISTING_SUBJECTS (ALREADY IN THE DATABASE, SKIP THEM):\n${JSON.stringify(populatedSubjects)}\n` +
      "Every subject in this array already has chapters and topics. If the document contains any of them, including abbreviations, punctuation, casing, or close variants, do not include that subject in your output. Return only new subjects. If every document subject is already present, return an empty subjects array."
    : "";
  const basePrompt = `${PROMPT}${existingSubjectsSection}`;
  console.log("[syllabus-import] preview: existing subjects", {
    populatedSubjectCount: populatedSubjects.length,
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const generated = await generateJsonFromDocument(
      {
        filename: input.file.filename,
        mimeType: input.file.mimeType,
        buffer: input.file.buffer,
        prompt: repairNotes ? `${basePrompt}\n\nREPAIR REQUIRED:\n${repairNotes}` : basePrompt,
        schemaName: "syllabus_hierarchy",
        schema: OUTPUT_SCHEMA,
        systemPrompt: SYSTEM_PROMPT,
        operation: "syllabus_import",
      },
      onProgress
    );
    finalGenerated = generated;

    try {
      const raw = (generated.content ?? "").trim();
      if (!raw) throw new Error("empty response from AI provider");
      curriculum = cleanGeneratedSyllabus(parseGeneratedPayload(raw));
      const beforeFilter = curriculum.length;
      curriculum = curriculum.filter((subject) => !existingSubjectKeys.has(syllabusKey(subject.subject_name)));
      if (curriculum.length !== beforeFilter) {
        console.log("[syllabus-import] preview: skipped existing subjects", {
          skipped: beforeFilter - curriculum.length,
        });
      }
      if (!curriculum.length && existingSubjectKeys.size === 0) {
        throw new Error("AI returned no subjects");
      }
    } catch (error) {
      const message = describeValidationFailure(error);
      console.error("[syllabus-import] preview: AI payload rejected", {
        attempt: attempt + 1,
        message,
        contentPreview: (generated.content ?? "").slice(0, 300),
      });
      if (attempt === 0) {
        repairNotes =
          `Your previous response was rejected: ${message}. ` +
          "Regenerate the complete hierarchy and return only valid JSON that meets every requirement.";
        continue;
      }
      throw new Error(`AI returned an invalid syllabus hierarchy: ${message}`);
    }

    const violations = auditCurriculum(curriculum);
    if (!violations.length) break;

    console.warn("[syllabus-import] preview: structure violations", {
      attempt: attempt + 1,
      violations,
    });
    if (attempt === 0) {
      repairNotes =
        `Your previous hierarchy did not meet the required structure:\n${formatViolations(violations)}\n` +
        "Regenerate the complete hierarchy from the document and fix every violation.";
      curriculum = null;
      continue;
    }
    throw new Error(`AI could not generate the required structure:\n${formatViolations(violations)}`);
  }

  if (!curriculum || !finalGenerated) {
    throw new Error("AI did not return a usable syllabus hierarchy.");
  }

  const existing = await readExistingCurriculum(pool);
  const preview = buildPreview(input.file.filename, curriculum, existing);

  const batchId = randomUUID();
  const subjectCount = curriculum.length;
  const chapterCount = curriculum.reduce((total, subject) => total + subject.chapters.length, 0);
  const topicCount = curriculum.reduce(
    (total, subject) => total + subject.chapters.reduce((inner, chapter) => inner + chapter.topics.length, 0),
    0
  );

  await pool.query(
    `INSERT INTO syllabus_import_batches
      (id, created_by, source_filename, payload, subject_count, chapter_count, topic_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      batchId,
      input.userId,
      input.file.filename,
      JSON.stringify({ subjects: curriculum }),
      subjectCount,
      chapterCount,
      topicCount,
    ]
  );

  console.log("[syllabus-import] preview: ready", {
    batchId,
    subjectCount,
    chapterCount,
    topicCount,
    newRecords: preview.summary.totalNew,
    existingRecords: preview.summary.totalExisting,
    elapsedMs: Date.now() - startedAt,
  });

  return {
    ...preview,
    batchId,
    usage: finalGenerated.usage,
    expiresInSeconds: 86_400,
  };
}

async function insertIgnoringUniqueViolation(
  client: PoolClient,
  sql: string,
  values: unknown[]
): Promise<{ id: number } | null> {
  try {
    const result = await client.query(sql, values);
    const row = result.rows[0] as { id?: number } | undefined;
    return row?.id == null ? null : { id: Number(row.id) };
  } catch (error) {
    const candidate = error as { code?: string; constraint?: string; detail?: string; message?: string };
    if (candidate?.code === "23505") {
      console.warn("[syllabus-import] insert conflict", {
        constraint: candidate.constraint,
        detail: candidate.detail,
        message: candidate.message,
      });
      return null;
    }
    throw error;
  }
}

async function insertOrReuseSubject(
  client: PoolClient,
  existing: ExistingCurriculum,
  name: string
): Promise<{ node: ExistingNode; created: boolean }> {
  const key = syllabusKey(name);
  const found = existing.subjects.get(key);
  if (found) return { node: found, created: false };

  const inserted = await insertIgnoringUniqueViolation(
    client,
    `INSERT INTO subjects (subject_name) VALUES ($1)
     ON CONFLICT (subject_name) DO NOTHING
     RETURNING id`,
    [name]
  );
  if (inserted) {
    const node = { id: inserted.id, name };
    existing.subjects.set(key, node);
    return { node, created: true };
  }

  const fallback = await client.query(
    `SELECT id, subject_name FROM subjects
     WHERE lower(btrim(subject_name)) = lower(btrim($1))
     ORDER BY id LIMIT 1`,
    [name]
  );
  const row = fallback.rows[0] as { id: number; subject_name: string } | undefined;
  if (!row) throw new Error(`Unable to create or find subject "${name}".`);
  const node = { id: Number(row.id), name: row.subject_name };
  existing.subjects.set(key, node);
  return { node, created: false };
}

async function insertOrReuseChapter(
  client: PoolClient,
  existing: ExistingCurriculum,
  subject: ExistingNode,
  name: string
): Promise<{ node: ExistingNode; created: boolean }> {
  let map = existing.chapters.get(subject.id);
  if (!map) {
    map = new Map();
    existing.chapters.set(subject.id, map);
  }
  const key = syllabusKey(name);
  const found = map.get(key);
  if (found) return { node: found, created: false };

  const inserted = await insertIgnoringUniqueViolation(
    client,
    `INSERT INTO subject_chapters (subject_id, chapter_name) VALUES ($1,$2)
     ON CONFLICT (subject_id, chapter_name) DO NOTHING
     RETURNING id`,
    [subject.id, name]
  );
  if (inserted) {
    const node = { id: inserted.id, name };
    map.set(key, node);
    return { node, created: true };
  }

  const fallback = await client.query(
    `SELECT id, chapter_name FROM subject_chapters
     WHERE subject_id = $1 AND lower(btrim(chapter_name)) = lower(btrim($2))
     ORDER BY id LIMIT 1`,
    [subject.id, name]
  );
  const row = fallback.rows[0] as { id: number; chapter_name: string } | undefined;
  if (!row) throw new Error(`Unable to create or find chapter "${name}".`);
  const node = { id: Number(row.id), name: row.chapter_name };
  map.set(key, node);
  return { node, created: false };
}

async function insertOrReuseTopic(
  client: PoolClient,
  existing: ExistingCurriculum,
  chapter: ExistingNode,
  name: string
): Promise<{ node: ExistingNode; created: boolean }> {
  let map = existing.topics.get(chapter.id);
  if (!map) {
    map = new Map();
    existing.topics.set(chapter.id, map);
  }
  const key = syllabusKey(name);
  const found = map.get(key);
  if (found) return { node: found, created: false };

  const inserted = await insertIgnoringUniqueViolation(
    client,
    `INSERT INTO chapter_topics (chapter_id, topic_name) VALUES ($1,$2)
     ON CONFLICT (chapter_id, topic_name) DO NOTHING
     RETURNING id`,
    [chapter.id, name]
  );
  if (inserted) {
    const node = { id: inserted.id, name };
    map.set(key, node);
    return { node, created: true };
  }

  const fallback = await client.query(
    `SELECT id, topic_name FROM chapter_topics
     WHERE chapter_id = $1 AND lower(btrim(topic_name)) = lower(btrim($2))
     ORDER BY id LIMIT 1`,
    [chapter.id, name]
  );
  const row = fallback.rows[0] as { id: number; topic_name: string } | undefined;
  if (!row) throw new Error(`Unable to create or find topic "${name}".`);
  const node = { id: Number(row.id), name: row.topic_name };
  map.set(key, node);
  return { node, created: false };
}

export async function commitSyllabusImport(input: {
  userId: number;
  batchId: string;
}): Promise<SyllabusImportCommitResult> {
  const startedAt = Date.now();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(${SYLLABUS_IMPORT_LOCK_KEY})`);

    const batchResult = await client.query(
      `SELECT * FROM syllabus_import_batches
       WHERE id = $1 AND created_by = $2 FOR UPDATE`,
      [input.batchId, input.userId]
    );
    const batch = batchResult.rows[0] as
      | { id: string; status: string; expires_at: string | Date; payload: unknown }
      | undefined;
    if (!batch) throw new Error("Syllabus preview was not found.");
    if (batch.status !== "pending") throw new Error(`This syllabus preview is already ${batch.status}.`);
    if (new Date(batch.expires_at).getTime() <= Date.now()) {
      await client.query(`UPDATE syllabus_import_batches SET status = 'expired' WHERE id = $1`, [input.batchId]);
      await client.query("COMMIT");
      throw new Error("This syllabus preview has expired. Generate a new preview.");
    }

    const curriculum = cleanGeneratedSyllabus(batch.payload);
    const existing = await readExistingCurriculum(client);

    let subjectsCreated = 0;
    let subjectsReused = 0;
    let chaptersCreated = 0;
    let chaptersReused = 0;
    let topicsCreated = 0;
    let topicsReused = 0;

    for (const subject of curriculum) {
      const subjectResult = await insertOrReuseSubject(client, existing, subject.subject_name);
      if (subjectResult.created) subjectsCreated++;
      else subjectsReused++;

      for (const chapter of subject.chapters) {
        const chapterResult = await insertOrReuseChapter(client, existing, subjectResult.node, chapter.chapter_name);
        if (chapterResult.created) chaptersCreated++;
        else chaptersReused++;

        for (const topic of chapter.topics) {
          const topicResult = await insertOrReuseTopic(client, existing, chapterResult.node, topic);
          if (topicResult.created) topicsCreated++;
          else topicsReused++;
        }
      }
    }

    const result: SyllabusImportCommitResult = {
      subjectsCreated,
      subjectsReused,
      chaptersCreated,
      chaptersReused,
      topicsCreated,
      topicsReused,
    };

    await client.query(
      `UPDATE syllabus_import_batches
       SET status = 'imported', inserted_counts = $2, imported_at = NOW()
       WHERE id = $1`,
      [input.batchId, JSON.stringify(result)]
    );
    await client.query("COMMIT");

    console.log("[syllabus-import] commit: success", {
      batchId: input.batchId,
      ...result,
      elapsedMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("[syllabus-import] commit: FAILED", {
      batchId: input.batchId,
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startedAt,
    });
    throw error;
  } finally {
    client.release();
  }
}
