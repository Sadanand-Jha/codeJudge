-- Independent Tables
CREATE TABLE IF NOT EXISTS tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schema_migration (
    id SERIAL PRIMARY KEY,
    filename VARCHAR NOT NULL,
    applied_at TIMESTAMP,
    checksum TEXT NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS avatar (
    id SERIAL PRIMARY KEY,
    is_male BOOLEAN DEFAULT true,
    url VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Ensure avatar.url has unique constraint for ON CONFLICT safety
-- Using CREATE UNIQUE INDEX IF NOT EXISTS for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_avatar_url ON avatar(url);

CREATE TABLE IF NOT EXISTS country (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Ensure role.name has unique constraint for ON CONFLICT safety
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_name ON role(name);

CREATE TABLE IF NOT EXISTS contest (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    starttime TIMESTAMP,
    duration INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS p_language (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Ensure p_language.name has unique constraint for ON CONFLICT safety
CREATE UNIQUE INDEX IF NOT EXISTS idx_p_language_name ON p_language(name);

CREATE TABLE IF NOT EXISTS quiz_problem_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Ensure quiz_problem_type.name has unique constraint for ON CONFLICT safety
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_problem_type_name ON quiz_problem_type(name);

-- Dependent Tables
CREATE TABLE IF NOT EXISTS state (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    country_id INTEGER NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS college (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    state_id INTEGER NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS problems (
    id BIGSERIAL PRIMARY KEY,
    problem_id VARCHAR NOT NULL UNIQUE, 
    contest_id INTEGER,
    problem_index VARCHAR,
    source VARCHAR NOT NULL,
    title TEXT NOT NULL,
    slug TEXT,
    statement TEXT NOT NULL,
    input_specification TEXT NOT NULL,
    output_specification TEXT NOT NULL,
    constraints TEXT,
    notes TEXT,
    time_limit_ms INTEGER NOT NULL,
    memory_limit_mb INTEGER NOT NULL,
    rating INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS editorials (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL,
    editorial TEXT,
    official_solution TEXT,
    hint_1 TEXT,
    hint_2 TEXT,
    hint_3 TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hidden_testcases (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL,
    testcase_order INTEGER NOT NULL,
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    weight INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sample_testcases (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT NOT NULL,
    testcase_order INTEGER NOT NULL,
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS problem_tags (
    problem_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (problem_id, tag_id)
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    adminid VARCHAR NOT NULL,
    username VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    password VARCHAR,
    role_id INTEGER NOT NULL,
    isactive BOOLEAN,
    lastlogin TIMESTAMP,
    createdat TIMESTAMP,
    updatedat TIMESTAMP,
    first_name VARCHAR,
    last_name VARCHAR,
    mobile VARCHAR,
    avatar_id INTEGER NOT NULL,
    bio TEXT,
    country_id INTEGER NOT NULL,
    state_id INTEGER NOT NULL,
    college_id BIGINT NOT NULL,
    company_id BIGINT,
    rating INTEGER,
    max_rating INTEGER,
    is_verified BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    theme VARCHAR,
    accent_color VARCHAR,
    compact_mode BOOLEAN,
    animation_speed VARCHAR,
    preferred_language INTEGER,
    editor_theme VARCHAR,
    editor_font_size SMALLINT,
    tab_width SMALLINT,
    word_wrap BOOLEAN,
    auto_save BOOLEAN,
    vim_mode BOOLEAN,
    emacs_mode BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
    id BIGSERIAL PRIMARY KEY,
    problem_id VARCHAR NOT NULL, 
    contest_id INTEGER NOT NULL,
    problem_index TEXT,
    language INTEGER NOT NULL, 
    verdict TEXT,
    source_code TEXT,
    is_downloaded INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    code VARCHAR NOT NULL,
    createdby INTEGER NOT NULL,
    starttime TIMESTAMP,
    endtime TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_problems (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL,
    problem_statement VARCHAR,
    problem_description VARCHAR,
    quiz_problem_type INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_problem_options (
    id SERIAL PRIMARY KEY,
    problem_id INTEGER,
    option_statement VARCHAR,
    option_description VARCHAR,
    iscorrect BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_registration (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    quiz_id INTEGER NOT NULL,
    is_registered BOOLEAN DEFAULT false,
    rollno VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contest_registeration (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    is_registered BOOLEAN,
    rated BOOLEAN,
    createdat TIMESTAMP,
    updatedat TIMESTAMP
);


-- Problems & Testcases
ALTER TABLE editorials DROP CONSTRAINT IF EXISTS fk_editorials_problem;
ALTER TABLE editorials ADD CONSTRAINT fk_editorials_problem FOREIGN KEY (problem_id) REFERENCES problems(id);

ALTER TABLE hidden_testcases DROP CONSTRAINT IF EXISTS fk_hidden_testcases_problem;
ALTER TABLE hidden_testcases ADD CONSTRAINT fk_hidden_testcases_problem FOREIGN KEY (problem_id) REFERENCES problems(id);

ALTER TABLE sample_testcases DROP CONSTRAINT IF EXISTS fk_sample_testcases_problem;
ALTER TABLE sample_testcases ADD CONSTRAINT fk_sample_testcases_problem FOREIGN KEY (problem_id) REFERENCES problems(id);

-- Problem Tags (Many-to-Many)
ALTER TABLE problem_tags DROP CONSTRAINT IF EXISTS fk_problem_tags_problem;
ALTER TABLE problem_tags ADD CONSTRAINT fk_problem_tags_problem FOREIGN KEY (problem_id) REFERENCES problems(id);

ALTER TABLE problem_tags DROP CONSTRAINT IF EXISTS fk_problem_tags_tag;
ALTER TABLE problem_tags ADD CONSTRAINT fk_problem_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id);

-- Users & Preferences
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS fk_user_preferences_user;
ALTER TABLE user_preferences ADD CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Location & College
ALTER TABLE state DROP CONSTRAINT IF EXISTS fk_state_country;
ALTER TABLE state ADD CONSTRAINT fk_state_country FOREIGN KEY (country_id) REFERENCES country(id);

ALTER TABLE college DROP CONSTRAINT IF EXISTS fk_college_state;
ALTER TABLE college ADD CONSTRAINT fk_college_state FOREIGN KEY (state_id) REFERENCES state(id);

-- User Relations
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_avatar;
ALTER TABLE users ADD CONSTRAINT fk_users_avatar FOREIGN KEY (avatar_id) REFERENCES avatar(id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_country;
ALTER TABLE users ADD CONSTRAINT fk_users_country FOREIGN KEY (country_id) REFERENCES country(id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_state;
ALTER TABLE users ADD CONSTRAINT fk_users_state FOREIGN KEY (state_id) REFERENCES state(id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_college;
ALTER TABLE users ADD CONSTRAINT fk_users_college FOREIGN KEY (college_id) REFERENCES college(id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_role;
ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES role(id);

-- Submissions
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS fk_submissions_problem;
ALTER TABLE submissions ADD CONSTRAINT fk_submissions_problem FOREIGN KEY (problem_id) REFERENCES problems(problem_id);

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS fk_submissions_contest;
ALTER TABLE submissions ADD CONSTRAINT fk_submissions_contest FOREIGN KEY (contest_id) REFERENCES contest(id);

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS fk_submissions_language;
ALTER TABLE submissions ADD CONSTRAINT fk_submissions_language FOREIGN KEY (language) REFERENCES p_language(id);

-- Quiz System
ALTER TABLE quiz DROP CONSTRAINT IF EXISTS fk_quiz_createdby;
ALTER TABLE quiz ADD CONSTRAINT fk_quiz_createdby FOREIGN KEY (createdby) REFERENCES users(id);

ALTER TABLE quiz_problems DROP CONSTRAINT IF EXISTS fk_quiz_problems_quiz;
ALTER TABLE quiz_problems ADD CONSTRAINT fk_quiz_problems_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id);

ALTER TABLE quiz_problems DROP CONSTRAINT IF EXISTS fk_quiz_problems_type;
ALTER TABLE quiz_problems ADD CONSTRAINT fk_quiz_problems_type FOREIGN KEY (quiz_problem_type) REFERENCES quiz_problem_type(id);

ALTER TABLE quiz_problem_options DROP CONSTRAINT IF EXISTS fk_quiz_options_problem;
ALTER TABLE quiz_problem_options ADD CONSTRAINT fk_quiz_options_problem FOREIGN KEY (problem_id) REFERENCES quiz_problems(id);

-- Registrations
ALTER TABLE quiz_registration DROP CONSTRAINT IF EXISTS fk_quiz_reg_quiz;
ALTER TABLE quiz_registration ADD CONSTRAINT fk_quiz_reg_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id);

ALTER TABLE quiz_registration DROP CONSTRAINT IF EXISTS fk_quiz_reg_user;
ALTER TABLE quiz_registration ADD CONSTRAINT fk_quiz_reg_user FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE contest_registeration DROP CONSTRAINT IF EXISTS fk_contest_reg_user;
ALTER TABLE contest_registeration ADD CONSTRAINT fk_contest_reg_user FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS fk_preferred_language_preferences_user;
ALTER TABLE user_preferences ADD CONSTRAINT fk_preferred_language_preferences_user FOREIGN KEY (preferred_language) REFERENCES p_language(id);

-- ==========================================
-- Seed Data
-- ==========================================

-- Insert default roles
INSERT INTO role (name, created_at, updated_at) VALUES
  ('user', NOW(), NOW()),
  ('admin', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert programming languages (from frontend constants)
INSERT INTO p_language (name, created_at, updated_at) VALUES
  ('Assembly', NOW(), NOW()),
  ('Bash', NOW(), NOW()),
  ('Basic', NOW(), NOW()),
  ('C (Clang)', NOW(), NOW()),
  ('C++ (Clang)', NOW(), NOW()),
  ('C (GCC 7.4)', NOW(), NOW()),
  ('C++ (GCC 7.4)', NOW(), NOW()),
  ('C (GCC 8.3)', NOW(), NOW()),
  ('C++ (GCC 8.3)', NOW(), NOW()),
  ('C (GCC 9.2)', NOW(), NOW()),
  ('C++ (GCC 9.2)', NOW(), NOW()),
  ('Clojure', NOW(), NOW()),
  ('C#', NOW(), NOW()),
  ('COBOL', NOW(), NOW()),
  ('Common Lisp', NOW(), NOW()),
  ('D', NOW(), NOW()),
  ('Elixir', NOW(), NOW()),
  ('Erlang', NOW(), NOW()),
  ('Executable', NOW(), NOW()),
  ('F#', NOW(), NOW()),
  ('Fortran', NOW(), NOW()),
  ('Go', NOW(), NOW()),
  ('Groovy', NOW(), NOW()),
  ('Haskell', NOW(), NOW()),
  ('Java', NOW(), NOW()),
  ('JavaScript', NOW(), NOW()),
  ('Kotlin', NOW(), NOW()),
  ('Lua', NOW(), NOW()),
  ('Multi-file', NOW(), NOW()),
  ('Objective-C', NOW(), NOW()),
  ('OCaml', NOW(), NOW()),
  ('Octave', NOW(), NOW()),
  ('Pascal', NOW(), NOW()),
  ('Perl', NOW(), NOW()),
  ('PHP', NOW(), NOW()),
  ('Plain Text', NOW(), NOW()),
  ('Prolog', NOW(), NOW()),
  ('Python 2', NOW(), NOW()),
  ('Python 3', NOW(), NOW()),
  ('R', NOW(), NOW()),
  ('Ruby', NOW(), NOW()),
  ('Rust', NOW(), NOW()),
  ('Scala', NOW(), NOW()),
  ('SQL', NOW(), NOW()),
  ('Swift', NOW(), NOW()),
  ('TypeScript', NOW(), NOW()),
  ('Visual Basic', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert quiz problem types (from frontend QUESTION_TYPE_META)
INSERT INTO quiz_problem_type (name, created_at, updated_at) VALUES
  ('single_choice', NOW(), NOW()),
  ('multiple_choice', NOW(), NOW()),
  ('true_false', NOW(), NOW()),
  ('text', NOW(), NOW()),
  ('paragraph', NOW(), NOW()),
  ('fill_blanks', NOW(), NOW()),
  ('table_fill', NOW(), NOW()),
  ('code_output', NOW(), NOW()),
  ('math', NOW(), NOW()),
  ('graph', NOW(), NOW()),
  ('formula', NOW(), NOW()),
  ('matching', NOW(), NOW()),
  ('ordering', NOW(), NOW()),
  ('drag_drop', NOW(), NOW()),
  ('categorize', NOW(), NOW()),
  ('hotspot', NOW(), NOW()),
  ('image_label', NOW(), NOW()),
  ('drawing', NOW(), NOW()),
  ('video_response', NOW(), NOW()),
  ('audio_response', NOW(), NOW()),
  ('poll', NOW(), NOW()),
  ('word_cloud', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert predefined avatars (from shared/constants/avatars.ts)
-- 21 local avatars sliced from avatars.png (7 columns x 3 rows)
INSERT INTO avatar (is_male, url, created_at, updated_at) VALUES
  (true, '/api/v1/avatars/1', NOW(), NOW()),
  (true, '/api/v1/avatars/2', NOW(), NOW()),
  (true, '/api/v1/avatars/3', NOW(), NOW()),
  (true, '/api/v1/avatars/4', NOW(), NOW()),
  (true, '/api/v1/avatars/5', NOW(), NOW()),
  (true, '/api/v1/avatars/6', NOW(), NOW()),
  (true, '/api/v1/avatars/7', NOW(), NOW()),
  (true, '/api/v1/avatars/8', NOW(), NOW()),
  (true, '/api/v1/avatars/9', NOW(), NOW()),
  (true, '/api/v1/avatars/10', NOW(), NOW()),
  (true, '/api/v1/avatars/11', NOW(), NOW()),
  (true, '/api/v1/avatars/12', NOW(), NOW()),
  (false, '/api/v1/avatars/13', NOW(), NOW()),
  (false, '/api/v1/avatars/14', NOW(), NOW()),
  (false, '/api/v1/avatars/15', NOW(), NOW()),
  (false, '/api/v1/avatars/16', NOW(), NOW()),
  (false, '/api/v1/avatars/17', NOW(), NOW()),
  (false, '/api/v1/avatars/18', NOW(), NOW()),
  (false, '/api/v1/avatars/19', NOW(), NOW()),
  (false, '/api/v1/avatars/20', NOW(), NOW()),
  (false, '/api/v1/avatars/21', NOW(), NOW())
ON CONFLICT (url) DO NOTHING;


-- ==========================================
-- Foreign Key Indexes 
-- (Crucial for fast JOINs and relation lookups)
-- ==========================================

-- Problems & Testcases
CREATE INDEX IF NOT EXISTS idx_editorials_problem_id ON editorials(problem_id);
CREATE INDEX IF NOT EXISTS idx_hidden_testcases_problem_id ON hidden_testcases(problem_id);
CREATE INDEX IF NOT EXISTS idx_sample_testcases_problem_id ON sample_testcases(problem_id);

-- Problem Tags 
-- (Note: problem_id is covered by the primary key, but we need one for tag_id for reverse lookups)
CREATE INDEX IF NOT EXISTS idx_problem_tags_tag_id ON problem_tags(tag_id);

-- Submissions
CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_contest_id ON submissions(contest_id);
CREATE INDEX IF NOT EXISTS idx_submissions_language ON submissions(language);

-- Quiz System
CREATE INDEX IF NOT EXISTS idx_quiz_problems_quiz_id ON quiz_problems(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_problem_options_problem_id ON quiz_problem_options(problem_id);
CREATE INDEX IF NOT EXISTS idx_quiz_registration_quiz_id ON quiz_registration(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_registration_user_id ON quiz_registration(user_id);

-- User Relations
CREATE INDEX IF NOT EXISTS idx_users_country_id ON users(country_id);
CREATE INDEX IF NOT EXISTS idx_users_state_id ON users(state_id);
CREATE INDEX IF NOT EXISTS idx_users_college_id ON users(college_id);
CREATE INDEX IF NOT EXISTS idx_contest_registeration_user_id ON contest_registeration(user_id);

-- ==========================================
-- Lookup / Search Indexes
-- (Speeds up WHERE clauses and logins)
-- ==========================================

-- Frequently searched user credentials
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Used for URL routing
CREATE INDEX IF NOT EXISTS idx_problems_slug ON problems(slug);
CREATE INDEX IF NOT EXISTS idx_quiz_code ON quiz(code);


-- ==========================================
-- Missing Quiz Dependent Tables
-- ==========================================

CREATE TABLE IF NOT EXISTS quiz_difficulty (
    id SERIAL PRIMARY KEY,
    heading VARCHAR
);

CREATE TABLE IF NOT EXISTS quiz_visibility (
    id SERIAL PRIMARY KEY,
    heading VARCHAR,
    description VARCHAR
);

CREATE TABLE IF NOT EXISTS quiz_student_response (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    problem_id INTEGER,
    option CHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    quiz_id INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    rank INTEGER,
    status VARCHAR NOT NULL DEFAULT 'in_progress',
    completed_at TIMESTAMP,
    time_taken INTEGER,
    total_questions INTEGER,
    correct_answers INTEGER DEFAULT 0,
    wrong_answers INTEGER DEFAULT 0,
    skipped_questions INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);

ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS fk_quiz_attempts_user;
ALTER TABLE quiz_attempts ADD CONSTRAINT fk_quiz_attempts_user FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS fk_quiz_attempts_quiz;
ALTER TABLE quiz_attempts ADD CONSTRAINT fk_quiz_attempts_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id);

-- ==========================================
-- Missing Columns for Existing Tables
-- ==========================================

-- Append missing columns to `quiz` table
ALTER TABLE quiz 
ADD COLUMN IF NOT EXISTS visibility INTEGER,
ADD COLUMN IF NOT EXISTS total_marks INTEGER,
ADD COLUMN IF NOT EXISTS passing_marks INTEGER,
ADD COLUMN IF NOT EXISTS difficulty INTEGER,
ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN,
ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN,
ADD COLUMN IF NOT EXISTS Show_Results_Immediately BOOLEAN,
ADD COLUMN IF NOT EXISTS negative_marking BOOLEAN,
ADD COLUMN IF NOT EXISTS leaderboard BOOLEAN,
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'draft';

-- Append missing columns to `quiz_problems` table
ALTER TABLE quiz_problems 
ADD COLUMN IF NOT EXISTS question_number INTEGER,
ADD COLUMN IF NOT EXISTS explaination VARCHAR,
ADD COLUMN IF NOT EXISTS hint VARCHAR,
ADD COLUMN IF NOT EXISTS difficulty INTEGER,
ADD COLUMN IF NOT EXISTS reference_notes VARCHAR,
ADD COLUMN IF NOT EXISTS internal_comments VARCHAR;

-- ==========================================
-- Missing Foreign Key Relations
-- ==========================================

-- Quiz relations
ALTER TABLE quiz DROP CONSTRAINT IF EXISTS fk_quiz_visibility;
ALTER TABLE quiz ADD CONSTRAINT fk_quiz_visibility FOREIGN KEY (visibility) REFERENCES quiz_visibility(id);

ALTER TABLE quiz DROP CONSTRAINT IF EXISTS fk_quiz_difficulty;
ALTER TABLE quiz ADD CONSTRAINT fk_quiz_difficulty FOREIGN KEY (difficulty) REFERENCES quiz_difficulty(id);

-- Quiz Problems relations
ALTER TABLE quiz_problems DROP CONSTRAINT IF EXISTS fk_quiz_problems_difficulty;
ALTER TABLE quiz_problems ADD CONSTRAINT fk_quiz_problems_difficulty FOREIGN KEY (difficulty) REFERENCES quiz_difficulty(id);

-- Quiz Student Response relations
-- Note: Assuming user_id refers to the users table based on standard conventions, 
-- though the link origin is slightly off-screen in the diagram, it's standard architecture.
ALTER TABLE quiz_student_response DROP CONSTRAINT IF EXISTS fk_qsr_user;
ALTER TABLE quiz_student_response ADD CONSTRAINT fk_qsr_user FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE quiz_student_response DROP CONSTRAINT IF EXISTS fk_qsr_problem;
ALTER TABLE quiz_student_response ADD CONSTRAINT fk_qsr_problem FOREIGN KEY (problem_id) REFERENCES quiz_problems(id);

-- ==========================================
-- Missing Indexes for New Relations
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_quiz_visibility_id ON quiz(visibility);
CREATE INDEX IF NOT EXISTS idx_quiz_difficulty_id ON quiz(difficulty);
CREATE INDEX IF NOT EXISTS idx_quiz_problems_difficulty_id ON quiz_problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_qsr_user_id ON quiz_student_response(user_id);
CREATE INDEX IF NOT EXISTS idx_qsr_problem_id ON quiz_student_response(problem_id);


alter table users
add column display_name varchar