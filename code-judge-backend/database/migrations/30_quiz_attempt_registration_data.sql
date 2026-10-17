-- Student-provided registration form values captured before an attempt
-- starts. Stored as a JSON object mapping creator-defined field names to the
-- student's answers, e.g. {"Roll Number": "21CS1043", "Branch": "CSE"}.
ALTER TABLE quiz_attempt
  ADD COLUMN IF NOT EXISTS registration_data JSONB;
