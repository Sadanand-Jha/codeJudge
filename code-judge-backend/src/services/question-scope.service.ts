/**
 * Curriculum scope helpers for AI question generation.
 *
 * Every AI-generated question must be tagged with the chapter and topic it
 * belongs to. These helpers load the subject's chapter/topic catalogue, render
 * it into a prompt block, and validate the ids the model returns.
 */
import { pool } from "../config/database.js";

export interface ScopeChapter {
  id: number;
  name: string;
}

export interface ScopeTopic {
  id: number;
  chapterId: number;
  name: string;
}

export interface QuestionScopeCatalog {
  subjectId: number;
  subjectName: string;
  chapters: ScopeChapter[];
  topics: ScopeTopic[];
}

export interface QuestionScopeFallback {
  chapterId?: number | null;
  topicId?: number | null;
}

export interface ResolvedQuestionScope {
  chapterId: number | null;
  topicId: number | null;
}

const positiveIds = (ids?: Array<number | null | undefined>): number[] => [
  ...new Set(
    (ids ?? [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0)
  ),
];

/**
 * Load the chapters/topics a generation request may use.
 *
 * When chapter/topic ids are supplied only that selection is returned;
 * otherwise the whole subject catalogue is returned. Topics are always
 * restricted to the selected chapters.
 */
export async function loadQuestionScope(params: {
  subjectId: number;
  chapterIds?: Array<number | null | undefined>;
  topicIds?: Array<number | null | undefined>;
}): Promise<QuestionScopeCatalog> {
  const subjectId = Number(params.subjectId);
  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    throw new Error("Select a subject.");
  }

  const selectedChapterIds = positiveIds(params.chapterIds);
  const selectedTopicIds = positiveIds(params.topicIds);
  if (selectedTopicIds.length > 0 && selectedChapterIds.length === 0) {
    throw new Error("Select at least one chapter before selecting topics.");
  }

  const [subjectResult, chapterResult, topicResult] = await Promise.all([
    pool.query(`SELECT subject_name FROM subjects WHERE id = $1`, [subjectId]),
    pool.query(
      `SELECT id, chapter_name, subject_id
         FROM subject_chapters
        WHERE subject_id = $1
        ORDER BY id`,
      [subjectId]
    ),
    pool.query(
      `SELECT ct.id, ct.chapter_id, ct.topic_name
         FROM chapter_topics ct
         JOIN subject_chapters sc ON sc.id = ct.chapter_id
        WHERE sc.subject_id = $1
        ORDER BY ct.id`,
      [subjectId]
    ),
  ]);

  const subjectName = subjectResult.rows[0]?.subject_name
    ? String(subjectResult.rows[0].subject_name)
    : "";
  if (!subjectName) throw new Error("Select a valid subject.");

  const allChapters: ScopeChapter[] = chapterResult.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.chapter_name),
  }));
  const allTopics: ScopeTopic[] = topicResult.rows.map((row) => ({
    id: Number(row.id),
    chapterId: Number(row.chapter_id),
    name: String(row.topic_name),
  }));

  const chapterIds = new Set(allChapters.map((chapter) => chapter.id));
  if (selectedChapterIds.some((id) => !chapterIds.has(id))) {
    throw new Error("Select valid chapters.");
  }

  const topicById = new Map(allTopics.map((topic) => [topic.id, topic]));
  if (selectedTopicIds.some((id) => !topicById.has(id))) {
    throw new Error("Select valid topics.");
  }

  if (selectedChapterIds.length > 0) {
    const selectedChapterSet = new Set(selectedChapterIds);
    for (const topicId of selectedTopicIds) {
      const topic = topicById.get(topicId);
      if (topic && !selectedChapterSet.has(topic.chapterId)) {
        throw new Error("Selected topics must belong to the selected chapters.");
      }
    }
  }

  const chapters = selectedChapterIds.length > 0
    ? allChapters.filter((chapter) => selectedChapterIds.includes(chapter.id))
    : allChapters;
  const chapterSet = new Set(chapters.map((chapter) => chapter.id));
  const topics = selectedTopicIds.length > 0
    ? allTopics.filter((topic) => selectedTopicIds.includes(topic.id))
    : allTopics.filter((topic) => chapterSet.has(topic.chapterId));

  return { subjectId, subjectName, chapters, topics };
}

/** Render the catalogue as explicit id/name lines for an AI prompt. */
export function formatQuestionScope(catalog: QuestionScopeCatalog): string {
  const lines = [`Subject: ${catalog.subjectName} (subjectId=${catalog.subjectId})`];

  if (catalog.chapters.length > 0) {
    lines.push("Chapters (use chapterId exactly):");
    for (const chapter of catalog.chapters) {
      lines.push(`- chapterId=${chapter.id}: ${chapter.name}`);
    }
  }

  if (catalog.topics.length > 0) {
    lines.push("Topics (use topicId exactly; each topic belongs to the listed chapterId):");
    for (const topic of catalog.topics) {
      lines.push(`- topicId=${topic.id}: ${topic.name} (chapterId=${topic.chapterId})`);
    }
  }

  return lines.join("\n");
}

/** Tagging instructions appended to every generation prompt that has a scope. */
export function questionScopeTaggingRules(catalog: QuestionScopeCatalog): string {
  if (catalog.chapters.length === 0) return "";
  const topicRule = catalog.topics.length > 0
    ? `- "topicId" MUST be one of the topic ids listed above and MUST belong to the chosen "chapterId".`
    : `- Set "topicId" to null because no topics are available for this scope.`;
  return `SCOPE TAGGING (MANDATORY):
- Every generated question MUST include an integer "chapterId" and a "topicId".
- Choose them ONLY from the supplied chapter/topic catalogue. Never invent ids.
- Pick the single most relevant chapter and topic for each question; do not leave "chapterId" null when a chapter is available.
${topicRule}`;
}

const asId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normaliseName = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLocaleLowerCase() : "";

/**
 * Validate the model's chapter/topic assignment against the allowed catalogue.
 *
 * Invalid ids are discarded. When the model omits a value we fall back to the
 * request's single selected scope (or the only available chapter/topic).
 */
export function resolveQuestionScopeIds(
  raw: {
    chapterId?: unknown;
    topicId?: unknown;
    chapter?: unknown;
    topic?: unknown;
  },
  catalog: QuestionScopeCatalog,
  fallback?: QuestionScopeFallback
): ResolvedQuestionScope {
  const chapterIds = new Set(catalog.chapters.map((chapter) => chapter.id));
  const topicById = new Map(catalog.topics.map((topic) => [topic.id, topic]));

  let chapterId = asId(raw.chapterId);
  let topicId = asId(raw.topicId);

  if (chapterId != null && !chapterIds.has(chapterId)) chapterId = null;
  if (topicId != null) {
    const topic = topicById.get(topicId);
    if (topic) chapterId = topic.chapterId;
    else topicId = null;
  }

  if (chapterId == null && normaliseName(raw.chapter)) {
    const name = normaliseName(raw.chapter);
    const matches = catalog.chapters.filter(
      (chapter) => chapter.name.trim().toLocaleLowerCase() === name
    );
    if (matches.length === 1) chapterId = matches[0].id;
  }

  if (topicId == null && normaliseName(raw.topic)) {
    const name = normaliseName(raw.topic);
    const matches = catalog.topics.filter(
      (topic) =>
        topic.name.trim().toLocaleLowerCase() === name &&
        (chapterId == null || topic.chapterId === chapterId)
    );
    if (matches.length === 1) {
      topicId = matches[0].id;
      chapterId = matches[0].chapterId;
    }
  }

  const fallbackChapterId = asId(fallback?.chapterId);
  const fallbackTopicId = asId(fallback?.topicId);
  if (chapterId == null && fallbackChapterId != null && chapterIds.has(fallbackChapterId)) {
    chapterId = fallbackChapterId;
  }
  if (chapterId == null && catalog.chapters.length === 1) {
    chapterId = catalog.chapters[0].id;
  }

  if (
    topicId == null &&
    fallbackTopicId != null &&
    topicById.has(fallbackTopicId) &&
    (chapterId == null || topicById.get(fallbackTopicId)?.chapterId === chapterId)
  ) {
    topicId = fallbackTopicId;
    chapterId = topicById.get(fallbackTopicId)!.chapterId;
  }
  if (topicId == null && chapterId != null) {
    const chapterTopics = catalog.topics.filter((topic) => topic.chapterId === chapterId);
    if (chapterTopics.length === 1) topicId = chapterTopics[0].id;
  }
  if (topicId == null && chapterId == null && catalog.topics.length === 1) {
    topicId = catalog.topics[0].id;
    chapterId = catalog.topics[0].chapterId;
  }

  if (topicId != null) {
    const topic = topicById.get(topicId);
    if (!topic) topicId = null;
    else chapterId = topic.chapterId;
  }

  return { chapterId, topicId };
}
