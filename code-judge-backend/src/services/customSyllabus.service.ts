import type { PoolClient } from "pg";
import { pool } from "../config/database.ts";
import {
  assertTeacherOwnsSyllabus,
  normalizeSyllabusInput,
  syllabusInputSchema,
  SyllabusServiceError,
  type CleanChapterInput,
} from "./syllabusSchema.ts";

type Scope = "system" | "teacher";

export interface SyllabusMetadata {
  name: string;
  subject: string;
  board: string | null;
  classLevel: string | null;
  level: string | null;
  status: "draft" | "active";
}

export interface SyllabusSummary extends SyllabusMetadata {
  id: number;
  ownerTeacherId: number | null;
  scope: Scope;
  sourceFileRef: string | null;
  importJobId: string | null;
  chapterCount: number;
  topicCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyllabusTreeTopic {
  id: number;
  title: string;
  position: number;
}

export interface SyllabusTreeChapter {
  id: number;
  title: string;
  description: string | null;
  position: number;
  topics: SyllabusTreeTopic[];
}

export interface SyllabusTree extends SyllabusMetadata {
  id: number;
  ownerTeacherId: number | null;
  scope: Scope;
  sourceFileRef: string | null;
  importJobId: string | null;
  createdAt: string;
  updatedAt: string;
  chapters: SyllabusTreeChapter[];
}

export type SyllabusSearchType = "syllabus" | "chapter" | "topic";

export interface SyllabusSearchItem {
  type: SyllabusSearchType;
  id: number;
  scope: Scope;
  name: string;
  subject: string;
  syllabusId: number;
  syllabusName: string;
  chapterId: number | null;
  chapterName: string | null;
  owned: boolean;
}

const iso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const requiredIso = (value: Date | string): string => iso(value) ?? new Date(0).toISOString();

const isTeacherOwned = (value: unknown): boolean => Number(value) > 0;

const mapSummary = (row: Record<string, unknown>): SyllabusSummary => {
  const teacherOwned = isTeacherOwned(row.owned_by);
  return {
    id: Number(row.id),
    ownerTeacherId: teacherOwned ? Number(row.owned_by) : null,
    scope: teacherOwned ? "teacher" : "system",
    name: String(row.name ?? row.subject_name),
    subject: String(row.subject_name),
    board: row.board == null ? null : String(row.board),
    classLevel: row.class_level == null ? null : String(row.class_level),
    level: row.level == null ? null : String(row.level),
    status: row.status === "draft" ? "draft" : "active",
    sourceFileRef: row.source_file_ref == null ? null : String(row.source_file_ref),
    importJobId: row.import_job_id == null ? null : String(row.import_job_id),
    chapterCount: Number(row.chapter_count ?? 0),
    topicCount: Number(row.topic_count ?? 0),
    createdAt: requiredIso(row.created_at as Date | string),
    updatedAt: requiredIso(row.updated_at as Date | string),
  };
};

const ownershipRow = (row: Record<string, unknown>) => {
  const teacherOwned = isTeacherOwned(row.owned_by);
  return {
    id: Number(row.id),
    owner_teacher_id: teacherOwned ? Number(row.owned_by) : null,
    scope: (teacherOwned ? "teacher" : "system") as Scope,
    deleted_at: row.deleted_at as Date | null,
  };
};

const numericUserId = (userId: number | string): number => {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SyllabusServiceError(401, "A valid teacher session is required.", "INVALID_USER");
  }
  return id;
};

const mapDbConflict = (error: unknown): never => {
  if ((error as { code?: string })?.code === "23505") {
    throw new SyllabusServiceError(
      409,
      "You already have a syllabus with this name.",
      "SYLLABUS_NAME_CONFLICT"
    );
  }
  throw error;
};

async function resolveImportJobRef(
  client: PoolClient,
  teacherId: number,
  importJobId: string | null
): Promise<{ sourceFileRef: string | null; importJobId: string | null }> {
  if (!importJobId) return { sourceFileRef: null, importJobId: null };
  const result = await client.query(
    `SELECT file_ref
       FROM syllabus_import_jobs
      WHERE id = $1 AND teacher_id = $2 AND status = 'ready'
      LIMIT 1`,
    [importJobId, teacherId]
  );
  if (result.rows.length === 0) {
    throw new SyllabusServiceError(
      400,
      "The import job is not ready to save yet.",
      "IMPORT_JOB_NOT_READY"
    );
  }
  return { sourceFileRef: String(result.rows[0].file_ref), importJobId };
}

async function replaceSyllabusTree(
  client: PoolClient,
  subjectId: number,
  ownerId: number,
  chapters: CleanChapterInput[]
): Promise<void> {
  await client.query(`DELETE FROM subject_chapters WHERE subject_id = $1`, [subjectId]);
  if (chapters.length === 0) return;

  const titles = chapters.map((chapter) => chapter.title);
  const descriptions = chapters.map((chapter) => chapter.description);
  const positions = chapters.map((_, index) => index);

  const inserted = await client.query<{ id: number; position: number }>(
    `INSERT INTO subject_chapters (subject_id, chapter_name, description, position, owned_by)
     SELECT $1, input.title, input.description, input.position, $5
       FROM unnest($2::text[], $3::text[], $4::int[])
            AS input(title, description, position)
     RETURNING id, position`,
    [subjectId, titles, descriptions, positions, ownerId]
  );

  const idByPosition = new Map(
    inserted.rows.map((row) => [Number(row.position), Number(row.id)])
  );

  const topicChapterIds: number[] = [];
  const topicTitles: string[] = [];
  const topicPositions: number[] = [];
  chapters.forEach((chapter, chapterIndex) => {
    const chapterId = idByPosition.get(chapterIndex);
    if (!chapterId) return;
    chapter.topics.forEach((topic, topicIndex) => {
      topicChapterIds.push(chapterId);
      topicTitles.push(topic.title);
      topicPositions.push(topicIndex);
    });
  });

  if (topicTitles.length > 0) {
    await client.query(
      `INSERT INTO chapter_topics (chapter_id, topic_name, position, owned_by)
       SELECT input.chapter_id, input.title, input.position, $4
         FROM unnest($1::int[], $2::text[], $3::int[])
              AS input(chapter_id, title, position)`,
      [topicChapterIds, topicTitles, topicPositions, ownerId]
    );
  }
}

export async function getTeacherSyllabi(
  userId: number | string,
  query = ""
): Promise<SyllabusSummary[]> {
  const teacherId = numericUserId(userId);
  const result = await pool.query(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM subject_chapters c WHERE c.subject_id = s.id) AS chapter_count,
            (SELECT COUNT(*)::int
               FROM chapter_topics t
               JOIN subject_chapters c ON c.id = t.chapter_id
              WHERE c.subject_id = s.id) AS topic_count
       FROM subjects s
      WHERE s.owned_by = $1
        AND s.deleted_at IS NULL
        AND ($2::text = '' OR s.name ILIKE '%' || $2 || '%' OR s.subject_name ILIKE '%' || $2 || '%')
      ORDER BY s.updated_at DESC, s.id DESC`,
    [teacherId, query.trim()]
  );
  return result.rows.map((row) => mapSummary(row));
}

export async function getSyllabusTree(
  syllabusId: number,
  userId: number | string | null
): Promise<SyllabusTree> {
  const id = Number(syllabusId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SyllabusServiceError(400, "Select a valid syllabus.", "INVALID_SYLLABUS");
  }
  const teacherId = userId == null ? null : numericUserId(userId);

  const syllabusResult = await pool.query(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM subject_chapters c WHERE c.subject_id = s.id) AS chapter_count,
            (SELECT COUNT(*)::int
               FROM chapter_topics t
               JOIN subject_chapters c ON c.id = t.chapter_id
              WHERE c.subject_id = s.id) AS topic_count
       FROM subjects s
      WHERE s.id = $1 AND s.deleted_at IS NULL`,
    [id]
  );
  const row = syllabusResult.rows[0];
  if (!row) {
    throw new SyllabusServiceError(404, "Syllabus not found.", "SYLLABUS_NOT_FOUND");
  }
  assertTeacherOwnsSyllabus(ownershipRow(row), teacherId ?? 0);

  const [chapterResult, topicResult] = await Promise.all([
    pool.query(
      `SELECT id, chapter_name AS title, description, position
         FROM subject_chapters
        WHERE subject_id = $1
        ORDER BY position, id`,
      [id]
    ),
    pool.query(
      `SELECT t.id, t.chapter_id, t.topic_name AS title, t.position
         FROM chapter_topics t
         JOIN subject_chapters c ON c.id = t.chapter_id
        WHERE c.subject_id = $1
        ORDER BY t.position, t.id`,
      [id]
    ),
  ]);

  const topicsByChapter = new Map<number, SyllabusTreeTopic[]>();
  for (const topic of topicResult.rows) {
    const chapterId = Number(topic.chapter_id);
    const list = topicsByChapter.get(chapterId) ?? [];
    list.push({
      id: Number(topic.id),
      title: String(topic.title),
      position: Number(topic.position),
    });
    topicsByChapter.set(chapterId, list);
  }

  const summary = mapSummary(row);
  return {
    id: summary.id,
    ownerTeacherId: summary.ownerTeacherId,
    scope: summary.scope,
    name: summary.name,
    subject: summary.subject,
    board: summary.board,
    classLevel: summary.classLevel,
    level: summary.level,
    status: summary.status,
    sourceFileRef: summary.sourceFileRef,
    importJobId: summary.importJobId,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    chapters: chapterResult.rows.map((chapter) => ({
      id: Number(chapter.id),
      title: String(chapter.title),
      description: chapter.description == null ? null : String(chapter.description),
      position: Number(chapter.position),
      topics: topicsByChapter.get(Number(chapter.id)) ?? [],
    })),
  };
}

export interface TeacherSubject {
  id: number;
  name: string;
  subject: string;
}

/**
 * Resolve a free-text subject name typed by a teacher into a teacher-owned
 * `subjects` row, creating it when it does not exist yet. This lets quizzes
 * keep a real `subject_id` even when the teacher has not imported a syllabus.
 */
export async function ensureTeacherSubject(
  userId: number | string,
  rawName: string
): Promise<TeacherSubject> {
  const teacherId = numericUserId(userId);
  const name = String(rawName ?? "").trim();
  if (!name) {
    throw new SyllabusServiceError(400, "Enter a subject name.", "INVALID_SUBJECT");
  }
  if (name.length > 255) {
    throw new SyllabusServiceError(
      400,
      "Subject name must be 255 characters or fewer.",
      "INVALID_SUBJECT"
    );
  }

  const findSubject = async (): Promise<TeacherSubject | null> => {
    const result = await pool.query(
      `SELECT id, name, subject_name
         FROM subjects
        WHERE owned_by = $1
          AND deleted_at IS NULL
          AND (lower(btrim(name)) = lower(btrim($2))
            OR lower(btrim(subject_name)) = lower(btrim($2)))
        ORDER BY id ASC
        LIMIT 1`,
      [teacherId, name]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      name: String(row.name ?? row.subject_name),
      subject: String(row.subject_name ?? row.name),
    };
  };

  const existing = await findSubject();
  if (existing) return existing;

  try {
    const created = await pool.query(
      `INSERT INTO subjects (subject_name, name, owned_by, status)
       VALUES ($1, $1, $2, 'active')
       RETURNING id, name, subject_name`,
      [name, teacherId]
    );
    const row = created.rows[0];
    return {
      id: Number(row.id),
      name: String(row.name ?? row.subject_name),
      subject: String(row.subject_name ?? row.name),
    };
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      const raced = await findSubject();
      if (raced) return raced;
    }
    throw error;
  }
}

export async function createTeacherSyllabus(
  userId: number | string,
  rawInput: unknown
): Promise<SyllabusTree> {
  const teacherId = numericUserId(userId);
  const parsed = syllabusInputSchema.parse(rawInput);
  const input = normalizeSyllabusInput(parsed);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const importRef = await resolveImportJobRef(client, teacherId, input.importJobId);
    const created = await client
      .query<{ id: number }>(
        `INSERT INTO subjects (
           subject_name, name, owned_by, board, class_level, level,
           source_file_ref, import_job_id, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          input.subject,
          input.name,
          teacherId,
          input.board,
          input.classLevel,
          input.level,
          importRef.sourceFileRef,
          importRef.importJobId,
          input.status,
        ]
      )
      .catch(mapDbConflict);
    const syllabusId = Number(created.rows[0].id);
    await replaceSyllabusTree(client, syllabusId, teacherId, input.chapters);
    await client.query("COMMIT");
    return getSyllabusTree(syllabusId, teacherId);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    return mapDbConflict(error);
  } finally {
    client.release();
  }
}

export async function updateTeacherSyllabus(
  userId: number | string,
  syllabusId: number,
  rawInput: unknown
): Promise<SyllabusTree> {
  const teacherId = numericUserId(userId);
  const parsed = syllabusInputSchema.parse(rawInput);
  const input = normalizeSyllabusInput(parsed);
  const id = Number(syllabusId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SyllabusServiceError(400, "Select a valid syllabus.", "INVALID_SYLLABUS");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT id, owned_by, deleted_at
         FROM subjects
        WHERE id = $1
        FOR UPDATE`,
      [id]
    );
    const row = existing.rows[0];
    assertTeacherOwnsSyllabus(row ? ownershipRow(row) : null, teacherId);

    const importRef = input.importJobId
      ? await resolveImportJobRef(client, teacherId, input.importJobId)
      : { sourceFileRef: null, importJobId: null };

    await client.query(
      `UPDATE subjects
          SET subject_name = $2,
              name = $3,
              board = $4,
              class_level = $5,
              level = $6,
              status = $7,
              source_file_ref = COALESCE($8, source_file_ref),
              import_job_id = COALESCE($9, import_job_id),
              updated_at = NOW()
        WHERE id = $1`,
      [
        id,
        input.subject,
        input.name,
        input.board,
        input.classLevel,
        input.level,
        input.status,
        importRef.sourceFileRef,
        importRef.importJobId,
      ]
    ).catch(mapDbConflict);

    await replaceSyllabusTree(client, id, teacherId, input.chapters);
    await client.query("COMMIT");
    return getSyllabusTree(id, teacherId);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    return mapDbConflict(error);
  } finally {
    client.release();
  }
}

export async function renameTeacherSyllabus(
  userId: number | string,
  syllabusId: number,
  name: string
): Promise<SyllabusTree> {
  const teacherId = numericUserId(userId);
  const nextName = String(name ?? "").trim();
  if (!nextName || nextName.length > 255) {
    throw new SyllabusServiceError(400, "Enter a syllabus name (255 characters max).", "INVALID_NAME");
  }
  const result = await pool.query(
    `UPDATE subjects
        SET name = $1, updated_at = NOW()
      WHERE id = $2
        AND owned_by = $3
        AND deleted_at IS NULL
      RETURNING id`,
    [nextName, syllabusId, teacherId]
  ).catch(mapDbConflict);
  if (result.rows.length === 0) {
    throw new SyllabusServiceError(404, "Syllabus not found.", "SYLLABUS_NOT_FOUND");
  }
  return getSyllabusTree(syllabusId, teacherId);
}

export async function deleteTeacherSyllabus(
  userId: number | string,
  syllabusId: number
): Promise<void> {
  const teacherId = numericUserId(userId);
  const result = await pool.query(
    `UPDATE subjects
        SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1
        AND owned_by = $2
        AND deleted_at IS NULL
      RETURNING id`,
    [syllabusId, teacherId]
  );
  if (result.rows.length === 0) {
    throw new SyllabusServiceError(404, "Syllabus not found.", "SYLLABUS_NOT_FOUND");
  }
}

export async function searchSyllabusCatalog(
  userId: number | string,
  filters: {
    query?: string;
    type?: SyllabusSearchType | null;
    syllabusId?: number | null;
    chapterId?: number | null;
    limit?: number;
  } = {}
): Promise<SyllabusSearchItem[]> {
  const teacherId = numericUserId(userId);
  const query = (filters.query ?? "").trim();
  const type = filters.type ?? null;
  const syllabusId =
    filters.syllabusId != null && Number.isInteger(Number(filters.syllabusId))
      ? Number(filters.syllabusId)
      : null;
  const chapterId =
    filters.chapterId != null && Number.isInteger(Number(filters.chapterId))
      ? Number(filters.chapterId)
      : null;
  const limit = Math.min(Math.max(Number(filters.limit) || 80, 1), 150);

  const result = await pool.query(
    `WITH      accessible AS (
       SELECT s.id,
              'teacher'::text AS scope,
              s.name,
              s.subject_name AS subject
         FROM subjects s
        WHERE s.deleted_at IS NULL
          AND s.owned_by = $1
     ),
     items AS (
       SELECT 'syllabus'::text AS type,
              a.id,
              a.scope,
              a.name,
              a.subject,
              a.id AS syllabus_id,
              a.name AS syllabus_name,
              NULL::int AS chapter_id,
              NULL::text AS chapter_name
         FROM accessible a
        WHERE ($2::text IS NULL OR $2 = 'syllabus')
       UNION ALL
       SELECT 'chapter'::text,
              c.id,
              a.scope,
              c.chapter_name,
              a.subject,
              a.id,
              a.name,
              c.id,
              c.chapter_name
         FROM subject_chapters c
         JOIN accessible a ON a.id = c.subject_id
        WHERE ($2::text IS NULL OR $2 = 'chapter')
       UNION ALL
       SELECT 'topic'::text,
              t.id,
              a.scope,
              t.topic_name,
              a.subject,
              a.id,
              a.name,
              c.id,
              c.chapter_name
         FROM chapter_topics t
         JOIN subject_chapters c ON c.id = t.chapter_id
         JOIN accessible a ON a.id = c.subject_id
        WHERE ($2::text IS NULL OR $2 = 'topic')
     )
     SELECT *
       FROM items
      WHERE ($3::int IS NULL OR syllabus_id = $3)
        AND ($4::int IS NULL OR chapter_id = $4)
        AND (
          $5::text = ''
          OR name ILIKE '%' || $5 || '%'
          OR subject ILIKE '%' || $5 || '%'
          OR chapter_name ILIKE '%' || $5 || '%'
        )
      ORDER BY CASE scope WHEN 'teacher' THEN 0 ELSE 1 END,
               CASE type WHEN 'syllabus' THEN 0 WHEN 'chapter' THEN 1 ELSE 2 END,
               name
      LIMIT $6`,
    [teacherId, type, syllabusId, chapterId, query, limit]
  );

  return result.rows.map((row) => {
    const scope = row.scope as Scope;
    return {
      type: row.type as SyllabusSearchType,
      id: Number(row.id),
      scope,
      name: String(row.name),
      subject: String(row.subject),
      syllabusId: Number(row.syllabus_id),
      syllabusName: String(row.syllabus_name),
      chapterId: row.chapter_id == null ? null : Number(row.chapter_id),
      chapterName: row.chapter_name == null ? null : String(row.chapter_name),
      owned: scope === "teacher",
    };
  });
}

export async function getSyllabusInput(syllabusId: number, userId: number | string): Promise<SyllabusTree> {
  return getSyllabusTree(syllabusId, userId);
}
