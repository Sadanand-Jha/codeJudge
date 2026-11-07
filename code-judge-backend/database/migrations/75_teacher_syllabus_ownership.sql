-- 75_teacher_syllabus_ownership.sql
-- Teacher-owned syllabi live in the existing curriculum tables:
--   subjects          -> one row per syllabus (owned_by = 0 system, else user)
--   subject_chapters  -> chapters
--   chapter_topics    -> topics
--
-- Production never had separate syllabi/chapters/topics tables, so this
-- migration only adds the ownership/metadata columns and the import-job table.

DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm could not be created; syllabus search will use ILIKE only';
  END;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Async syllabus import jobs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS syllabus_import_jobs (
  id                UUID PRIMARY KEY,
  teacher_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  file_ref          VARCHAR(255) NOT NULL,
  mime_type         VARCHAR(160) NOT NULL,
  bytes             BIGINT NOT NULL,
  source_text       TEXT,
  stream_text       TEXT,
  status            VARCHAR(16) NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  progress          SMALLINT NOT NULL DEFAULT 0
                    CHECK (progress >= 0 AND progress <= 100),
  credits_used      INTEGER NOT NULL DEFAULT 0,
  variants_json     JSONB,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE syllabus_import_jobs
  ADD COLUMN IF NOT EXISTS source_text TEXT,
  ADD COLUMN IF NOT EXISTS stream_text TEXT;

CREATE INDEX IF NOT EXISTS idx_syllabus_import_jobs_owner
  ON syllabus_import_jobs (teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_syllabus_import_jobs_status
  ON syllabus_import_jobs (status);

-- ---------------------------------------------------------------------------
-- 2. Subjects: syllabus metadata + ownership.
-- ---------------------------------------------------------------------------
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS owned_by INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS board VARCHAR(120),
  ADD COLUMN IF NOT EXISTS class_level VARCHAR(120),
  ADD COLUMN IF NOT EXISTS level VARCHAR(120),
  ADD COLUMN IF NOT EXISTS source_file_ref VARCHAR(255),
  ADD COLUMN IF NOT EXISTS import_job_id UUID,
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE subjects SET name = subject_name WHERE name IS NULL;
ALTER TABLE subjects ALTER COLUMN name SET NOT NULL;

ALTER TABLE subjects DROP CONSTRAINT IF EXISTS chk_subjects_status;
ALTER TABLE subjects
  ADD CONSTRAINT chk_subjects_status CHECK (status IN ('draft', 'active'));

ALTER TABLE subjects DROP CONSTRAINT IF EXISTS fk_subjects_import_job;
ALTER TABLE subjects
  ADD CONSTRAINT fk_subjects_import_job
  FOREIGN KEY (import_job_id) REFERENCES syllabus_import_jobs(id) ON DELETE SET NULL;

-- Subject names used to be globally unique. System and teacher-owned rows now
-- share the table, so uniqueness is scoped to the owner instead.
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_subject_name_key;
DROP INDEX IF EXISTS uq_subjects_name_ci;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM subjects
     WHERE owned_by = 0 AND deleted_at IS NULL
     GROUP BY lower(btrim(name))
    HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_system_name_ci
      ON subjects (lower(btrim(name)))
      WHERE owned_by = 0 AND deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM subjects
     WHERE owned_by <> 0 AND deleted_at IS NULL
     GROUP BY owned_by, lower(btrim(name))
    HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_owner_name_ci
      ON subjects (owned_by, lower(btrim(name)))
      WHERE owned_by <> 0 AND deleted_at IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Chapters: description / position / ownership.
-- ---------------------------------------------------------------------------
ALTER TABLE subject_chapters
  ADD COLUMN IF NOT EXISTS description VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS owned_by INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'subject_chapters'
       AND column_name = 'position'
  ) THEN
    ALTER TABLE subject_chapters ADD COLUMN position INTEGER;

    WITH ranked AS (
      SELECT id, row_number() OVER (PARTITION BY subject_id ORDER BY id) - 1 AS pos
      FROM subject_chapters
    )
    UPDATE subject_chapters sc
       SET position = ranked.pos
      FROM ranked
     WHERE sc.id = ranked.id;

    ALTER TABLE subject_chapters ALTER COLUMN position SET DEFAULT 0;
    ALTER TABLE subject_chapters ALTER COLUMN position SET NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Topics: position / ownership.
-- ---------------------------------------------------------------------------
ALTER TABLE chapter_topics
  ADD COLUMN IF NOT EXISTS owned_by INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'chapter_topics'
       AND column_name = 'position'
  ) THEN
    ALTER TABLE chapter_topics ADD COLUMN position INTEGER;

    WITH ranked AS (
      SELECT id, row_number() OVER (PARTITION BY chapter_id ORDER BY id) - 1 AS pos
      FROM chapter_topics
    )
    UPDATE chapter_topics ct
       SET position = ranked.pos
      FROM ranked
     WHERE ct.id = ranked.id;

    ALTER TABLE chapter_topics ALTER COLUMN position SET DEFAULT 0;
    ALTER TABLE chapter_topics ALTER COLUMN position SET NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Indexes and updated-at trigger.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subjects_owned_by
  ON subjects (owned_by, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_owner_scope
  ON subjects (owned_by, deleted_at);

CREATE INDEX IF NOT EXISTS idx_subject_chapters_position
  ON subject_chapters (subject_id, position, id);

CREATE INDEX IF NOT EXISTS idx_chapter_topics_position
  ON chapter_topics (chapter_id, position, id);

DROP TRIGGER IF EXISTS trg_kolkata_touch_updated_at ON subjects;
CREATE TRIGGER trg_kolkata_touch_updated_at
BEFORE UPDATE ON subjects
FOR EACH ROW EXECUTE FUNCTION touch_updated_at_kolkata();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_subjects_name_trgm
      ON subjects USING GIN (name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_subjects_subject_trgm
      ON subjects USING GIN (subject_name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_subject_chapters_name_trgm
      ON subject_chapters USING GIN (chapter_name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_chapter_topics_name_trgm
      ON chapter_topics USING GIN (topic_name gin_trgm_ops);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Retire system-owned subjects.
-- ---------------------------------------------------------------------------
-- Teachers must import their own syllabi. Soft-delete the shared system
-- catalog so existing quizzes and question-bank rows keep their references.
UPDATE subjects
   SET deleted_at = NOW()
 WHERE owned_by = 0
   AND deleted_at IS NULL;
