-- 74_quiz_result_detail_visibility.sql
-- Per-attempt control for the question-by-question result review.
-- Marks, score and percentage remain visible to every student; this flag only
-- gates the detailed answer breakdown. Defaults to visible so existing
-- attempts keep their current behaviour until an owner hides them.
ALTER TABLE quiz_attempt
  ADD COLUMN IF NOT EXISTS result_details_visible BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN quiz_attempt.result_details_visible IS
  'When false, the student can see marks but not the per-question response breakdown.';
