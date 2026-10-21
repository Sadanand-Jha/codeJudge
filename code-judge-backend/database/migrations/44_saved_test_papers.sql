-- Generated question papers saved by creator accounts.
--
-- Papers are stored as JSON because their section/group/question structure is
-- rendered directly by the frontend PDF exporter. The summary columns keep the
-- account listing fast without loading every full paper.
CREATE TABLE IF NOT EXISTS saved_test_papers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    draft_id VARCHAR(120) NOT NULL,
    title VARCHAR(200) NOT NULL,
    creation_type VARCHAR(40) NOT NULL DEFAULT 'test',
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
    sections_count INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    total_marks INTEGER NOT NULL DEFAULT 0,
    meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    paper_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_saved_test_papers_user_draft UNIQUE (user_id, draft_id),
    CONSTRAINT chk_saved_test_papers_title CHECK (btrim(title) <> ''),
    CONSTRAINT chk_saved_test_papers_subjects_array CHECK (jsonb_typeof(subjects) = 'array'),
    CONSTRAINT chk_saved_test_papers_meta_object CHECK (jsonb_typeof(meta_json) = 'object'),
    CONSTRAINT chk_saved_test_papers_paper_object CHECK (jsonb_typeof(paper_json) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_saved_test_papers_user_updated
ON saved_test_papers(user_id, updated_at DESC, id DESC);
