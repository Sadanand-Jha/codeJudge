-- Marks are no longer part of the quiz flow. The legacy check constraint
-- continued to reject quiz saves, so remove it.
ALTER TABLE quiz DROP CONSTRAINT IF EXISTS chk_quiz_marks;
