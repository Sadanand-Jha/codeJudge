-- Creator-defined registration form field names (free-form labels).
-- Stored as a JSON array of strings, e.g. ["Name", "Roll Number", "Branch"].
-- NULL means the creator never configured the list (legacy quizzes);
-- '[]' means the creator explicitly removed all fields.
ALTER TABLE quiz
  ADD COLUMN IF NOT EXISTS registration_fields JSONB;
