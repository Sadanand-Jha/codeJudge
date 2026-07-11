-- ============================================
-- Additional indexes for Problem APIs
-- ============================================

-- Already exists from 01_problem_tables.sql (index on rating)
-- CREATE INDEX idx_problem_rating ON problems(rating);

-- Index on problem_id for fast lookups by problem_id string
CREATE INDEX IF NOT EXISTS idx_problem_problem_id
ON problems(problem_id);

-- Composite index on problem_tags for fast JOINs
CREATE INDEX IF NOT EXISTS idx_problem_tags_problem_id
ON problem_tags(problem_id);

CREATE INDEX IF NOT EXISTS idx_problem_tags_tag_id
ON problem_tags(tag_id);

-- Index on sample_testcases.problem_id for fast JOINs
CREATE INDEX IF NOT EXISTS idx_sample_testcases_problem_id
ON sample_testcases(problem_id);