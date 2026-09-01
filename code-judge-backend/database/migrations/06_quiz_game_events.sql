-- 06_quiz_game_events.sql
-- Event tracking for game analytics (§28). Structured event types, not random strings.
-- Used for: 50-50, power-up, life, answer change, question viewed, etc.
-- All analytics that require event history will read from here; missing events => empty state (no mock).

CREATE TABLE IF NOT EXISTS quiz_game_events (
    id BIGSERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    attempt_id INTEGER,
    question_id INTEGER,
    event_type VARCHAR(40) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_qge_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE,
    CONSTRAINT fk_qge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_qge_attempt FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE SET NULL,
    CONSTRAINT fk_qge_question FOREIGN KEY (question_id) REFERENCES quiz_problems(id) ON DELETE SET NULL,
    CONSTRAINT chk_qge_event_type CHECK (event_type IN (
        'fifty_fifty','audience_poll','hint','skip','extra_time','double_points','freeze_timer','eliminate_one',
        'streak_bonus','speed_bonus','second_chance','decaying_points',
        'powerup_used','life_lost','life_gained','damage_taken','coin_collected',
        'question_viewed','question_answered','answer_changed','question_skipped','resawn','hint_viewed'
    ))
);

CREATE INDEX IF NOT EXISTS idx_qge_quiz ON quiz_game_events(quiz_id);
CREATE INDEX IF NOT EXISTS idx_qge_quiz_user ON quiz_game_events(quiz_id, user_id);
CREATE INDEX IF NOT EXISTS idx_qge_quiz_type ON quiz_game_events(quiz_id, event_type);
CREATE INDEX IF NOT EXISTS idx_qge_question ON quiz_game_events(question_id);
CREATE INDEX IF NOT EXISTS idx_qge_attempt ON quiz_game_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_qge_created_at ON quiz_game_events(created_at);

-- Helpful for per-question time analytics: ensure quiz_student_response has attempt linkage if missing
-- (we keep existing table but add indexes; attempt linkage via attempt_id optional for future)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_student_response' AND column_name='attempt_id') THEN
    ALTER TABLE quiz_student_response ADD COLUMN attempt_id INTEGER REFERENCES quiz_attempts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_qsr_attempt_id ON quiz_student_response(attempt_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_student_response' AND column_name='time_spent_ms') THEN
    ALTER TABLE quiz_student_response ADD COLUMN time_spent_ms INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_student_response' AND column_name='is_correct') THEN
    ALTER TABLE quiz_student_response ADD COLUMN is_correct BOOLEAN;
  END IF;
END $$;
