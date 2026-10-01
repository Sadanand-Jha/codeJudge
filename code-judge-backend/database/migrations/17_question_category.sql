-- Canonical high-level categories used to classify questions.
CREATE TABLE IF NOT EXISTS question_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_question_category_name UNIQUE (name),
    CONSTRAINT chk_question_category_name_not_blank CHECK (btrim(name) <> '')
);

INSERT INTO question_category (name)
VALUES
    ('Theory'),
    ('Numerical')
ON CONFLICT (name) DO NOTHING;
