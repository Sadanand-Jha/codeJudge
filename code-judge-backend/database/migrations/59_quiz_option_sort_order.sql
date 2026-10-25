-- Keep quiz option IDs stable across edits and persist their display order.
-- Option IDs are referenced by student answers and attempt decoy maps, so
-- deleting/reinserting options on every save invalidates those references.
ALTER TABLE quiz_problem_options
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY problem_id ORDER BY id ASC) - 1 AS position
  FROM quiz_problem_options
)
UPDATE quiz_problem_options o
SET sort_order = ranked.position
FROM ranked
WHERE o.id = ranked.id
  AND o.sort_order IS NULL;

ALTER TABLE quiz_problem_options
  ALTER COLUMN sort_order SET DEFAULT 0;

UPDATE quiz_problem_options
SET sort_order = 0
WHERE sort_order IS NULL;

ALTER TABLE quiz_problem_options
  ALTER COLUMN sort_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_options_problem_sort
  ON quiz_problem_options(problem_id, sort_order, id);
