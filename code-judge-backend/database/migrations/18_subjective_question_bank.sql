-- Lookup table: difficulty labels must not be duplicated in question rows.
CREATE TABLE IF NOT EXISTS question_difficulty (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_question_difficulty_name UNIQUE (name),
    CONSTRAINT chk_question_difficulty_name_not_blank CHECK (btrim(name) <> '')
);

INSERT INTO question_difficulty (name)
VALUES
    ('Easy'),
    ('Medium'),
    ('Hard')
ON CONFLICT (name) DO NOTHING;

-- Subjective questions reference lookup IDs instead of storing category and
-- difficulty strings in every row.
CREATE TABLE IF NOT EXISTS subjective_question_bank (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL
        REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_id INTEGER
        REFERENCES subject_chapters(id) ON DELETE SET NULL,
    topic_id INTEGER
        REFERENCES chapter_topics(id) ON DELETE SET NULL,
    difficulty_id INTEGER NOT NULL
        REFERENCES question_difficulty(id) ON DELETE RESTRICT,
    category_id INTEGER NOT NULL
        REFERENCES question_category(id) ON DELETE RESTRICT,
    question_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_subjective_bank_question_not_blank
        CHECK (btrim(question_text) <> '')
);

-- A question's selected chapter must belong to its subject, and its selected
-- topic must belong to that chapter. A topic without a chapter is ambiguous
-- and is rejected.
CREATE OR REPLACE FUNCTION validate_subjective_bank_scope()
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

DROP TRIGGER IF EXISTS trg_validate_subjective_bank_scope
ON subjective_question_bank;

CREATE TRIGGER trg_validate_subjective_bank_scope
BEFORE INSERT OR UPDATE OF subject_id, chapter_id, topic_id
ON subjective_question_bank
FOR EACH ROW
EXECUTE FUNCTION validate_subjective_bank_scope();

CREATE INDEX IF NOT EXISTS idx_subj_bank_subject
ON subjective_question_bank(subject_id);

CREATE INDEX IF NOT EXISTS idx_subj_bank_chapter
ON subjective_question_bank(chapter_id);

CREATE INDEX IF NOT EXISTS idx_subj_bank_topic
ON subjective_question_bank(topic_id);

CREATE INDEX IF NOT EXISTS idx_subj_bank_difficulty_category
ON subjective_question_bank(difficulty_id, category_id);
