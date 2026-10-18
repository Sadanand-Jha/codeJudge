-- quiz_participants.source provenance values used by the app:
--   1 = self-registered, 2 = invited, 4 = added via room selection.
-- Migration 12 constrained source to (1, 2), which made saving
-- room-sourced participants fail with a check-constraint violation.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_participant_source') THEN
    ALTER TABLE quiz_participants DROP CONSTRAINT chk_quiz_participant_source;
  END IF;
  ALTER TABLE quiz_participants ADD CONSTRAINT chk_quiz_participant_source
    CHECK (source IS NULL OR source IN (1, 2, 4));
END $$;
