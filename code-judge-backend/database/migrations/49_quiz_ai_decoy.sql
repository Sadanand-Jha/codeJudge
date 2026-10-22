-- 49_quiz_ai_decoy.sql
-- Per-attempt AI-assistant decoy map. Keys are quiz problem ids; values are
-- { optionId, label } for the wrong option selected as that attempt's decoy.
-- Keeping this on the attempt makes resume deterministic without exposing the
-- map to any student-facing payload.
ALTER TABLE quiz_attempt
  ADD COLUMN IF NOT EXISTS decoy_map JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN quiz_attempt.decoy_map IS
  'Per-attempt AI decoy choices: { "<problemId>": { "optionId": "<id>", "label": "A" } }';
