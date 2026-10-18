-- Guarantee that no two quizzes ever share the same code.
-- Re-keys legacy duplicates first (oldest row keeps the code) so the
-- constraint/index creation cannot fail on databases that predate it.

UPDATE quiz q
SET code = upper(
  translate(
    substr(md5(random()::text || clock_timestamp()::text || q.id::text), 1, 16),
    '0123456789',
    'QWERTYUIOP'
  )
)
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY code ORDER BY id) AS rn
  FROM quiz
) d
WHERE q.id = d.id AND d.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_quiz_code')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_quiz_code') THEN
    ALTER TABLE quiz ADD CONSTRAINT uq_quiz_code UNIQUE (code);
  END IF;
END $$;
