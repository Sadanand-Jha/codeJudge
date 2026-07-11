-- ============================================
-- Problems
-- ============================================

CREATE TABLE problems (
    id                  BIGSERIAL PRIMARY KEY,

    problem_id          VARCHAR(20) UNIQUE NOT NULL,      -- 4A, 1200C
    contest_id          INTEGER,
    problem_index       VARCHAR(10),                      -- A,B,C,D

    source              VARCHAR(50) NOT NULL DEFAULT 'Codeforces',

    title               TEXT NOT NULL,
    slug                TEXT UNIQUE,

    statement           TEXT NOT NULL,
    input_specification TEXT NOT NULL,
    output_specification TEXT NOT NULL,
    constraints         TEXT,
    notes               TEXT,

    time_limit_ms       INTEGER NOT NULL,
    memory_limit_mb     INTEGER NOT NULL,

    rating              INTEGER,

    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Tags
-- ============================================

CREATE TABLE tags (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE problem_tags (
    problem_id  BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    tag_id      BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

    PRIMARY KEY(problem_id, tag_id)
);

-- ============================================
-- Sample Testcases
-- ============================================

CREATE TABLE sample_testcases (
    id              BIGSERIAL PRIMARY KEY,

    problem_id      BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,

    testcase_order  INTEGER NOT NULL,

    input           TEXT NOT NULL,
    output          TEXT NOT NULL,
    explanation     TEXT
);

-- ============================================
-- Hidden Testcases
-- ============================================

CREATE TABLE hidden_testcases (
    id              BIGSERIAL PRIMARY KEY,

    problem_id      BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,

    testcase_order  INTEGER NOT NULL,

    input           TEXT NOT NULL,
    output          TEXT NOT NULL,

    weight          INTEGER DEFAULT 1,

    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Editorial
-- ============================================

CREATE TABLE editorials (
    id                  BIGSERIAL PRIMARY KEY,

    problem_id          BIGINT UNIQUE NOT NULL
                        REFERENCES problems(id)
                        ON DELETE CASCADE,

    editorial           TEXT,
    official_solution   TEXT,

    hint_1              TEXT,
    hint_2              TEXT,
    hint_3              TEXT
);

-- ============================================
-- Helpful Indexes
-- ============================================

CREATE INDEX idx_problem_rating
ON problems(rating);

CREATE INDEX idx_problem_contest
ON problems(contest_id);

CREATE INDEX idx_problem_source
ON problems(source);

CREATE INDEX idx_hidden_problem
ON hidden_testcases(problem_id);

CREATE INDEX idx_sample_problem
ON sample_testcases(problem_id);