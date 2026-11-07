import { z } from "zod";

export const SYLLABUS_VARIANT_KEYS = ["balanced"] as const;
export type SyllabusVariantKey = (typeof SYLLABUS_VARIANT_KEYS)[number];

export class SyllabusServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, message: string, code = "SYLLABUS_ERROR") {
    super(message);
    this.name = "SyllabusServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const trimmedTitle = z.string().trim().min(1, "A title is required.").max(255);
const optionalDescription = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .nullable()
  .transform((value) => value || null);

const topicInput = z.union([
  z.string().trim().min(1).max(255),
  z.object({ title: trimmedTitle }),
]);

const chapterInput = z.object({
  id: z.number().int().positive().optional().nullable(),
  title: trimmedTitle,
  description: optionalDescription,
  topics: z.array(topicInput).max(500).default([]),
});

const metadataInput = z.object({
  name: trimmedTitle,
  subject: trimmedTitle,
  board: z.string().trim().max(120).optional().nullable(),
  classLevel: z.string().trim().max(120).optional().nullable(),
  level: z.string().trim().max(120).optional().nullable(),
  status: z.enum(["draft", "active"]).optional().default("active"),
});

export const syllabusInputSchema = metadataInput.extend({
  chapters: z.array(chapterInput).min(1, "Add at least one chapter.").max(200),
  importJobId: z.string().uuid().optional().nullable(),
});

export type SyllabusInput = z.infer<typeof syllabusInputSchema>;

export interface CleanTopicInput {
  title: string;
}

export interface CleanChapterInput {
  title: string;
  description: string | null;
  topics: CleanTopicInput[];
}

export interface CleanSyllabusInput {
  name: string;
  subject: string;
  board: string | null;
  classLevel: string | null;
  level: string | null;
  status: "draft" | "active";
  chapters: CleanChapterInput[];
  importJobId: string | null;
}

const topicTitle = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "title" in value) {
    return String((value as { title?: unknown }).title ?? "").trim();
  }
  return "";
};

const keyFor = (value: string): string => value.trim().toLocaleLowerCase();

/**
 * Deduplicates chapter/topic names case-insensitively. Duplicate chapters are
 * merged instead of rejected because a re-import or manual edit can easily
 * repeat a heading; merging keeps the saved tree deterministic.
 */
export function normalizeSyllabusInput(input: SyllabusInput): CleanSyllabusInput {
  const chapters = new Map<string, CleanChapterInput>();

  for (const chapter of input.chapters) {
    const title = chapter.title.trim();
    if (!title) continue;
    const key = keyFor(title);
    const existing = chapters.get(key);
    const topics = existing?.topics ?? [];
    const seenTopics = new Set(topics.map((topic) => keyFor(topic.title)));

    for (const rawTopic of chapter.topics ?? []) {
      const topic = topicTitle(rawTopic);
      if (!topic) continue;
      const topicKey = keyFor(topic);
      if (seenTopics.has(topicKey)) continue;
      seenTopics.add(topicKey);
      topics.push({ title: topic });
    }

    if (existing) {
      existing.topics = topics;
      if (!existing.description && chapter.description) {
        existing.description = chapter.description;
      }
    } else {
      chapters.set(key, {
        title,
        description: chapter.description ?? null,
        topics,
      });
    }
  }

  const cleanChapters = [...chapters.values()];
  if (cleanChapters.length === 0) {
    throw new SyllabusServiceError(400, "Add at least one chapter.", "INVALID_SYLLABUS");
  }

  return {
    name: input.name.trim(),
    subject: input.subject.trim(),
    board: input.board?.trim() || null,
    classLevel: input.classLevel?.trim() || null,
    level: input.level?.trim() || null,
    status: input.status ?? "active",
    chapters: cleanChapters,
    importJobId: input.importJobId ?? null,
  };
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const firstText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const firstArray = (...values: unknown[]): unknown[] => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
};

const optionalText = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const normalizeTopicPayload = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  const topic = asRecord(value);
  return topic ? firstText(topic.title, topic.name) : "";
};

const deriveTopicsFromDescription = (description: string | null): string[] => {
  if (!description) return [];
  const cleaned = description
    .replace(/^(topics?|contents?|course content|syllabus)\s*[:\-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const fragments = cleaned
    .split(/[;,•\n]+/)
    .flatMap((part) => part.split(/\s+-\s+/))
    .flatMap((part) => part.split(/\.\s+/))
    .map((part) => part.replace(/^[\d).\s-]+/, "").replace(/[.;:]+$/, "").trim())
    .filter((part) => part.length >= 2 && part.length <= 120);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const fragment of fragments) {
    const key = keyFor(fragment);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(fragment);
    if (unique.length >= 50) break;
  }
  return unique.length > 0 ? unique : cleaned.length <= 120 ? [cleaned] : [];
};

const normalizeChapterPayload = (value: unknown): unknown => {
  const chapter = asRecord(value);
  if (!chapter) return value;
  const description = optionalText(chapter.description);
  const topics = firstArray(chapter.topics, chapter.subtopics, chapter.subTopics, chapter.contents)
    .map(normalizeTopicPayload)
    .filter(Boolean);
  return {
    ...chapter,
    title: firstText(chapter.title, chapter.name, chapter.unit, chapter.heading),
    description,
    topics: topics.length > 0 ? topics : deriveTopicsFromDescription(description),
  };
};

/**
 * Models occasionally ignore the requested schema when a provider rejects
 * strict structured output. Normalize the common alternate envelopes (course
 * lists, unit aliases, null metadata) before Zod validation. A multi-course
 * document is flattened into one hierarchy, with the course name prefixed to
 * each chapter so identical unit names from different courses do not merge.
 */
export function normalizeGeneratedPayload(value: unknown): unknown {
  const root = asRecord(value);
  if (!root) return value;

  const nested = asRecord(root.syllabus) ?? asRecord(root.data) ?? asRecord(root.result);
  const source =
    nested && firstArray(nested.chapters, nested.units, nested.courses).length > 0
      ? nested
      : root;
  const explicitCourses = firstArray(source.courses, root.courses);
  const singleCourse = asRecord(source.course) ?? asRecord(root.course);
  const courses = explicitCourses.length > 0 ? explicitCourses : singleCourse ? [singleCourse] : [];
  const courseNames: string[] = [];
  let chapters = firstArray(source.chapters, source.units, source.modules);

  if (chapters.length === 0) {
    const flattened: unknown[] = [];
    for (const rawCourse of courses) {
      const course = asRecord(rawCourse);
      if (!course) continue;
      const courseName = firstText(
        course.course_name,
        course.courseName,
        course.name,
        course.subject,
        course.title
      );
      if (courseName && !courseNames.includes(courseName)) courseNames.push(courseName);
      for (const rawChapter of firstArray(course.chapters, course.units, course.modules)) {
        const chapter = asRecord(rawChapter);
        if (!chapter) continue;
        const chapterTitle = firstText(chapter.title, chapter.name, chapter.unit, chapter.heading);
        if (!chapterTitle) continue;
        flattened.push({
          ...chapter,
          title:
            courses.length > 1 && courseName ? `${courseName}: ${chapterTitle}` : chapterTitle,
        });
      }
    }
    chapters = flattened;
  }

  const normalizedChapters = chapters
    .map(normalizeChapterPayload)
    .filter((chapter) => Boolean(firstText(asRecord(chapter)?.title)));

  const singleCourseMetadata = courses.length === 1 ? asRecord(courses[0]) : null;
  const singleCourseName = singleCourseMetadata
    ? firstText(
        singleCourseMetadata.course_name,
        singleCourseMetadata.courseName,
        singleCourseMetadata.name,
        singleCourseMetadata.subject,
        singleCourseMetadata.title
      )
    : "";

  return {
    name:
      firstText(source.name, root.name, source.course_name, source.courseName) ||
      singleCourseName,
    subject:
      firstText(
        source.subject,
        root.subject,
        source.subject_name,
        source.course_name,
        source.courseName,
        source.name,
        root.name
      ) || courseNames.join(", "),
    board: optionalText(source.board ?? root.board ?? singleCourseMetadata?.board),
    classLevel: optionalText(
      source.classLevel ?? root.classLevel ?? singleCourseMetadata?.classLevel
    ),
    level: optionalText(source.level ?? root.level ?? singleCourseMetadata?.level),
    chapters: normalizedChapters,
  };
}

export const generatedSyllabusSchema = z.object({
  name: z.string().trim().max(255).nullish().transform((value) => value ?? ""),
  subject: z.string().trim().max(255).nullish().transform((value) => value ?? ""),
  board: z.string().trim().max(120).optional().nullable(),
  classLevel: z.string().trim().max(120).optional().nullable(),
  level: z.string().trim().max(120).optional().nullable(),
  chapters: z
    .array(
      z.object({
        title: trimmedTitle,
        description: optionalDescription,
        topics: z.array(topicInput).max(500).default([]),
      })
    )
    .max(200)
    .default([]),
});

export type GeneratedSyllabus = z.infer<typeof generatedSyllabusSchema>;

export const generatedVariantsSchema = z.object({
  balanced: z.array(generatedSyllabusSchema),
});

export type GeneratedSyllabusVariants = z.infer<typeof generatedVariantsSchema>;

const COURSE_PREFIX = /^(.+?):\s+(.+)$/;
const NUMBERED_PREFIX = /^(unit|chapter|module|part|section)\b/i;

/**
 * Multi-course documents are generated as one tree with course names prefixed
 * onto each chapter (for example "Artificial Intelligence: Introduction").
 * Split those prefixed chapters back into one syllabus per course so each can
 * be saved as its own card. Documents without a consistent course prefix stay
 * as a single syllabus.
 */
export function splitGeneratedSyllabus(value: GeneratedSyllabus): GeneratedSyllabus[] {
  const groups = new Map<
    string,
    { title: string; chapters: GeneratedSyllabus["chapters"] }
  >();

  for (const chapter of value.chapters) {
    const match = COURSE_PREFIX.exec(chapter.title.trim());
    if (!match) return [value];
    const prefix = match[1].trim();
    const chapterTitle = match[2].trim();
    if (!prefix || !chapterTitle || NUMBERED_PREFIX.test(prefix)) return [value];
    const key = keyFor(prefix);
    const group = groups.get(key) ?? { title: prefix, chapters: [] };
    group.chapters.push({ ...chapter, title: chapterTitle });
    groups.set(key, group);
  }

  if (groups.size < 2) return [value];

  return [...groups.values()].map((group) => ({
    name: group.title,
    subject: group.title,
    board: value.board,
    classLevel: value.classLevel,
    level: value.level,
    chapters: group.chapters,
  }));
}

export const generatedSyllabusListSchema = z.object({
  syllabi: z.array(generatedSyllabusSchema).min(1).max(50),
});

export type GeneratedSyllabusList = z.infer<typeof generatedSyllabusListSchema>;

/**
 * Normalize the alternate top-level shapes models return for a multi-syllabus
 * request. Each course becomes a separate syllabus entry instead of being
 * flattened into one tree.
 */
export function normalizeGeneratedSyllabiPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return { syllabi: value.map((item) => normalizeGeneratedPayload(item)) };
  }
  const root = asRecord(value);
  if (!root) return value;
  const nested = asRecord(root.syllabus) ?? asRecord(root.data) ?? asRecord(root.result);
  const explicit = firstArray(
    root.syllabi,
    root.syllabusList,
    root.syllabus_list,
    nested?.syllabi,
    nested?.syllabusList,
    nested?.syllabus_list
  );
  if (explicit.length > 0) {
    return { syllabi: explicit.map((item) => normalizeGeneratedPayload(item)) };
  }
  const courses = firstArray(root.courses, nested?.courses);
  if (courses.length > 0) {
    return {
      syllabi: courses.map((rawCourse) => {
        const course = asRecord(rawCourse);
        if (!course) return normalizeGeneratedPayload(rawCourse);
        const courseSource = asRecord(course.syllabus) ?? course;
        return normalizeGeneratedPayload({
          ...courseSource,
          name: firstText(
            courseSource.name,
            courseSource.course_name,
            courseSource.courseName,
            courseSource.title
          ),
          subject: firstText(
            courseSource.subject,
            courseSource.subject_name,
            courseSource.course_name,
            courseSource.courseName,
            courseSource.name,
            courseSource.title
          ),
          chapters: firstArray(courseSource.chapters, courseSource.units, courseSource.modules),
        });
      }),
    };
  }
  const single = nested ?? root;
  if (firstArray(single.chapters, single.units, single.modules).length > 0) {
    return { syllabi: [normalizeGeneratedPayload(single)] };
  }
  return { syllabi: [] };
}

export function mergeGeneratedSyllabusList(
  chunks: GeneratedSyllabus[][]
): GeneratedSyllabus[] {
  const groups = new Map<string, GeneratedSyllabus[]>();
  for (const list of chunks) {
    for (const syllabus of list) {
      const key = keyFor(syllabus.subject || syllabus.name || "syllabus");
      const group = groups.get(key) ?? [];
      group.push(syllabus);
      groups.set(key, group);
    }
  }
  return [...groups.values()].map((group) => mergeGeneratedChunks(group));
}

export function mergeGeneratedChunks(
  chunks: GeneratedSyllabus[]
): GeneratedSyllabus {
  const chapters = new Map<
    string,
    { title: string; description: string | null; topics: Map<string, string> }
  >();
  let name = "";
  let subject = "";
  let board: string | null = null;
  let classLevel: string | null = null;
  let level: string | null = null;

  for (const chunk of chunks) {
    if (!name && chunk.name?.trim()) name = chunk.name.trim();
    if (!subject && chunk.subject?.trim()) subject = chunk.subject.trim();
    board = board ?? chunk.board ?? null;
    classLevel = classLevel ?? chunk.classLevel ?? null;
    level = level ?? chunk.level ?? null;

    for (const chapter of chunk.chapters ?? []) {
      const title = chapter.title.trim();
      if (!title) continue;
      const key = keyFor(title);
      const existing = chapters.get(key) ?? {
        title,
        description: chapter.description ?? null,
        topics: new Map<string, string>(),
      };
      if (!existing.description && chapter.description) {
        existing.description = chapter.description;
      }
      for (const rawTopic of chapter.topics ?? []) {
        const topic = topicTitle(rawTopic);
        if (!topic) continue;
        existing.topics.set(keyFor(topic), topic);
      }
      chapters.set(key, existing);
    }
  }

  return {
    name,
    subject,
    board,
    classLevel,
    level,
    chapters: [...chapters.values()]
      .map((chapter) => ({
        title: chapter.title,
        description: chapter.description,
        topics: [...chapter.topics.values()].map((title) => ({ title })),
      }))
      .filter((chapter) => chapter.topics.length > 0),
  };
}

export function hasGeneratedContent(value: GeneratedSyllabus): boolean {
  return value.chapters.some((chapter) => chapter.topics.length > 0);
}

export interface SyllabusOwnershipRow {
  id: number;
  owner_teacher_id: number | null;
  scope: "system" | "teacher";
  deleted_at: Date | string | null;
}

export function assertTeacherOwnsSyllabus(
  row: SyllabusOwnershipRow | null | undefined,
  userId: number
): void {
  if (!row || row.deleted_at || row.scope === "system") {
    throw new SyllabusServiceError(404, "Syllabus not found.", "SYLLABUS_NOT_FOUND");
  }
  if (Number(row.owner_teacher_id) !== Number(userId)) {
    throw new SyllabusServiceError(404, "Syllabus not found.", "SYLLABUS_NOT_FOUND");
  }
}
