-- 04_quiz_game_config.sql
-- Prisma model: QuizGameConfig (1:1 with Quiz) — idempotent ensures table exists regardless of 01_quiz.sql ordering
CREATE TABLE IF NOT EXISTS quiz_game_config (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id INTEGER NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    movement_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    movement_speed INTEGER NOT NULL DEFAULT 5,
    lives INTEGER NOT NULL DEFAULT 3,
    points_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    powerups_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    respawn_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    damage_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quiz_game_config_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE,
    CONSTRAINT check_movement_speed CHECK (movement_speed > 0),
    CONSTRAINT check_lives CHECK (lives >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_game_config_quiz_id ON quiz_game_config(quiz_id);
