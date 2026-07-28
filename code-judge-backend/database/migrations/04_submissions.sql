-- ============================================
-- Submissions
-- ============================================

CREATE TABLE IF NOT EXISTS submissions (
    id              BIGINT PRIMARY KEY,
    problem_id      TEXT,
    contest_id      INTEGER,
    problem_index   TEXT,
    language        TEXT,
    verdict         TEXT,
    source_code     TEXT,
    is_downloaded   INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes for Submissions
-- ============================================

CREATE INDEX IF NOT EXISTS idx_submissions_problem_id
ON submissions(problem_id);

CREATE INDEX IF NOT EXISTS idx_submissions_verdict
ON submissions(verdict);

CREATE INDEX IF NOT EXISTS idx_submissions_created_at
ON submissions(created_at);