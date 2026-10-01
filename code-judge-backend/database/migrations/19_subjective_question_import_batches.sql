-- Durable review batches for owner-only document → AI → question-bank imports.
-- Raw documents are never stored; only validated generated JSON is retained.
CREATE TABLE IF NOT EXISTS subjective_question_import_batches (
    id VARCHAR(64) PRIMARY KEY,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_id INTEGER REFERENCES subject_chapters(id) ON DELETE SET NULL,
    topic_id INTEGER REFERENCES chapter_topics(id) ON DELETE SET NULL,
    source_filename TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    questions JSONB NOT NULL,
    question_count INTEGER NOT NULL,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    imported_at TIMESTAMPTZ,

    CONSTRAINT chk_subjective_import_status
        CHECK (status IN ('pending', 'imported', 'failed', 'expired')),
    CONSTRAINT chk_subjective_import_question_count
        CHECK (question_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_subjective_import_created_by
ON subjective_question_import_batches(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subjective_import_status_expiry
ON subjective_question_import_batches(status, expires_at);
