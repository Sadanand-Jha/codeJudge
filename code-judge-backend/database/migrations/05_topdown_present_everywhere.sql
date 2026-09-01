-- 05_topdown_present_everywhere.sql
-- Top-down present everywhere: default TRUE and fix existing rows
ALTER TABLE quiz_game_config ALTER COLUMN enabled SET DEFAULT TRUE;
UPDATE quiz_game_config SET enabled = TRUE WHERE enabled = FALSE;
