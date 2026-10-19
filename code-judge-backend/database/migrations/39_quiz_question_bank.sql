-- Single flat store for quiz questions generated for a quiz.
--
-- Unlike quiz_problems + quiz_problem_options, every question (statement,
-- type, options, correct answers, explanation, hint) lives in ONE row so the
-- full question can be read/written without joins. The shape is intentionally
-- type-agnostic: options/answers are JSONB arrays, which also covers
-- fill-in-the-blanks and multi-answer questions.
CREATE TABLE IF NOT EXISTS quiz_question_bank (
    id BIGSERIAL PRIMARY KEY,
    quiz_id INTEGER
        REFERENCES quiz(id) ON DELETE CASCADE,
    created_by INTEGER
        REFERENCES users(id) ON DELETE SET NULL,
    subject_id INTEGER NOT NULL
        REFERENCES subjects(id) ON DELETE RESTRICT,
    chapter_id INTEGER
        REFERENCES subject_chapters(id) ON DELETE SET NULL,
    topic_id INTEGER
        REFERENCES chapter_topics(id) ON DELETE SET NULL,
    question_type VARCHAR(32) NOT NULL DEFAULT 'single_choice',
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    explanation TEXT,
    hint TEXT,
    difficulty VARCHAR(16),
    source VARCHAR(32) NOT NULL DEFAULT 'ai_topic',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_quiz_question_bank_question_not_blank
        CHECK (btrim(question_text) <> ''),
    CONSTRAINT chk_quiz_question_bank_type_not_blank
        CHECK (btrim(question_type) <> ''),
    CONSTRAINT chk_quiz_question_bank_options_array
        CHECK (jsonb_typeof(options) = 'array'),
    CONSTRAINT chk_quiz_question_bank_answers_array
        CHECK (jsonb_typeof(answers) = 'array')
);

-- Chapter must belong to the subject, and a topic must belong to the selected
-- chapter. Mirrors the scope validation used by subjective_question_bank.
CREATE OR REPLACE FUNCTION validate_quiz_question_bank_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.chapter_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM subject_chapters sc
        WHERE sc.id = NEW.chapter_id
          AND sc.subject_id = NEW.subject_id
    ) THEN
        RAISE EXCEPTION 'Chapter % does not belong to subject %', NEW.chapter_id, NEW.subject_id
            USING ERRCODE = '23514';
    END IF;

    IF NEW.topic_id IS NOT NULL AND NEW.chapter_id IS NULL THEN
        RAISE EXCEPTION 'A chapter is required when topic % is selected', NEW.topic_id
            USING ERRCODE = '23514';
    END IF;

    IF NEW.topic_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM chapter_topics ct
        WHERE ct.id = NEW.topic_id
          AND ct.chapter_id = NEW.chapter_id
    ) THEN
        RAISE EXCEPTION 'Topic % does not belong to chapter %', NEW.topic_id, NEW.chapter_id
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_quiz_question_bank_scope
ON quiz_question_bank;

CREATE TRIGGER trg_validate_quiz_question_bank_scope
BEFORE INSERT OR UPDATE OF subject_id, chapter_id, topic_id
ON quiz_question_bank
FOR EACH ROW
EXECUTE FUNCTION validate_quiz_question_bank_scope();

CREATE INDEX IF NOT EXISTS idx_quiz_question_bank_quiz
ON quiz_question_bank(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_question_bank_subject
ON quiz_question_bank(subject_id);

CREATE INDEX IF NOT EXISTS idx_quiz_question_bank_chapter
ON quiz_question_bank(chapter_id);

CREATE INDEX IF NOT EXISTS idx_quiz_question_bank_topic
ON quiz_question_bank(topic_id);

CREATE INDEX IF NOT EXISTS idx_quiz_question_bank_created_at
ON quiz_question_bank(created_at DESC);
