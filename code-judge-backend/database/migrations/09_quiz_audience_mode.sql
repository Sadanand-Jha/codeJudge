-- Keep the active audience mode separate from saved room/invite selections.
ALTER TABLE quiz
  ADD COLUMN IF NOT EXISTS audience_mode VARCHAR(20) NOT NULL DEFAULT 'public';

UPDATE quiz q
SET audience_mode = 'classroom'
WHERE EXISTS (SELECT 1 FROM quiz_participants qp WHERE qp.quiz_id = q.id)
  AND q.audience_mode = 'public';

ALTER TABLE quiz DROP CONSTRAINT IF EXISTS quiz_audience_mode_check;
ALTER TABLE quiz ADD CONSTRAINT quiz_audience_mode_check
  CHECK (audience_mode IN ('public', 'private', 'classroom'));
