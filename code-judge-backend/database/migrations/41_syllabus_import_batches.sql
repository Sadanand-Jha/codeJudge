-- Durable review batches for owner-only syllabus → AI → curriculum imports.
-- Raw documents are never stored; only validated, cleaned hierarchy JSON is kept.
CREATE TABLE IF NOT EXISTS syllabus_import_batches (
    id VARCHAR(64) PRIMARY KEY,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    source_filename TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL,
    subject_count INTEGER NOT NULL DEFAULT 0,
    chapter_count INTEGER NOT NULL DEFAULT 0,
    topic_count INTEGER NOT NULL DEFAULT 0,
    inserted_counts JSONB,
    error_message TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    imported_at TIMESTAMPTZ,

    CONSTRAINT chk_syllabus_import_status
        CHECK (status IN ('pending', 'imported', 'failed', 'expired')),
    CONSTRAINT chk_syllabus_import_subject_count CHECK (subject_count >= 0),
    CONSTRAINT chk_syllabus_import_chapter_count CHECK (chapter_count >= 0),
    CONSTRAINT chk_syllabus_import_topic_count CHECK (topic_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_syllabus_import_created_by
ON syllabus_import_batches(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_syllabus_import_status_expiry
ON syllabus_import_batches(status, expires_at);

-- Case-insensitive curriculum identity. These are created only when the
-- existing data is already clean, so the migration is safe on older databases.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM subjects GROUP BY lower(btrim(subject_name)) HAVING count(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_name_ci
        ON subjects (lower(btrim(subject_name)));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM subject_chapters
        GROUP BY subject_id, lower(btrim(chapter_name)) HAVING count(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_subject_chapters_name_ci
        ON subject_chapters (subject_id, lower(btrim(chapter_name)));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM chapter_topics
        GROUP BY chapter_id, lower(btrim(topic_name)) HAVING count(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_chapter_topics_name_ci
        ON chapter_topics (chapter_id, lower(btrim(topic_name)));
    END IF;
END $$;
