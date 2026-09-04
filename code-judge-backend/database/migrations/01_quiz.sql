CREATE TABLE if not exists exam_categories (
    id INT PRIMARY KEY,
    exam_cat VARCHAR(255) NOT NULL
);

CREATE TABLE quiz_status (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO quiz_status (id, name, description)
VALUES

    (2, 'SCHEDULED', 'Quiz is published and scheduled to start at a future time'),
    (3, 'LIVE', 'Quiz is currently active and accepting attempts'),
    (4, 'ENDED', 'Quiz has reached its end time'),



ALTER TABLE quiz
ADD COLUMN quiz_status INTEGER;

ALTER TABLE quiz
ADD CONSTRAINT fk_quiz_status
FOREIGN KEY (quiz_status)
REFERENCES quiz_status(id);

ALTER TABLE quiz
ALTER COLUMN quiz_status SET NOT NULL;


CREATE TABLE quiz_participant_status (
    id INTEGER PRIMARY KEY,
    status VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO quiz_participant_status (id, status)
VALUES
    (1, 'allowed'),
    (2, 'not_allowed');

CREATE TABLE quiz_participants (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

    quiz_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,

    status INTEGER NOT NULL,

    rollno VARCHAR(100),

    registered_at TIMESTAMP,
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quiz_participant_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES quiz(id),

    CONSTRAINT fk_quiz_participant_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_quiz_participant_status
        FOREIGN KEY (status)
        REFERENCES quiz_participant_status(id),

    CONSTRAINT uq_quiz_participant_quiz_user
        UNIQUE (quiz_id, user_id)
);


alter table quiz_problem_options
add column matching_target varchar(250)

CREATE TABLE game_mechanics (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,

    description TEXT,

    icon VARCHAR(100),

    mechanic_type VARCHAR(50) NOT NULL,

    default_quantity INTEGER NOT NULL DEFAULT 1,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quiz_game_mechanics (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    quiz_id INTEGER NOT NULL,
    mechanic_id INTEGER NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    quantity INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quiz_game_mechanics_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES quiz(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_quiz_game_mechanics_mechanic
        FOREIGN KEY (mechanic_id)
        REFERENCES game_mechanics(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_quiz_game_mechanic
        UNIQUE (quiz_id, mechanic_id),

    CONSTRAINT chk_quantity
        CHECK (quantity >= 0)
);

INSERT INTO game_mechanics
    (name, code, description, icon, mechanic_type, default_quantity)
VALUES
(
    '50-50',
    'FIFTY_FIFTY',
    'Eliminate two incorrect options',
    'fifty-fifty',
    'LIFELINE',
    2
),
(
    'Extra Time',
    'EXTRA_TIME',
    'Add 5 additional minutes to the quiz',
    'clock-plus',
    'TIME',
    1
),
(
    'Hint',
    'HINT',
    'Get a smart hint for the current question',
    'lightbulb',
    'LIFELINE',
    2
),
(
    'Skip Question',
    'SKIP_QUESTION',
    'Skip the current question and come back later',
    'skip-forward',
    'NAVIGATION',
    2
),
(
    'Shield',
    'SHIELD',
    'Protect the next answer from negative marking',
    'shield',
    'PROTECTION',
    1
),
(
    'Double Score',
    'DOUBLE_SCORE',
    'The next correct answer awards 2x points',
    'zap',
    'SCORE',
    1
),
(
    'Extra Life',
    'EXTRA_LIFE',
    'Get one additional life',
    'heart',
    'LIFE',
    1
);

CREATE TABLE quiz_attempt (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    quiz_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,

    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,

    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_user_quiz_attempt
        UNIQUE (user_id, quiz_id),

    CONSTRAINT fk_attempt_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES quiz(id)
        ON DELETE CASCADE
);

CREATE TABLE quiz_student_response (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    attempt_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,

    -- Generic answer storage for different question types
    answer JSONB,

    -- Evaluation
    is_attempted BOOLEAN NOT NULL DEFAULT FALSE,

    -- Time tracking
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_response_attempt
        FOREIGN KEY (attempt_id)
        REFERENCES quiz_attempt(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_response_problem
        FOREIGN KEY (problem_id)
        REFERENCES quiz_problems(id)
        ON DELETE RESTRICT,

    -- One response for a problem within one attempt
    CONSTRAINT uq_attempt_problem
        UNIQUE (attempt_id, problem_id)
);

CREATE TABLE quiz_student_response_mechanics (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    mechanic_id INTEGER NOT NULL,

    usage_count INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_response_mechanics_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_response_mechanics_problem
        FOREIGN KEY (problem_id)
        REFERENCES quiz_problems(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_response_mechanics_mechanic
        FOREIGN KEY (mechanic_id)
        REFERENCES game_mechanics(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_usage_count
        CHECK (usage_count >= 0),

    CONSTRAINT uq_user_problem_mechanic
        UNIQUE (user_id, problem_id, mechanic_id)
);

INSERT INTO public.game_mechanics
    (name, code, description, icon, mechanic_type, default_quantity, enabled)
VALUES
    ('Audience Poll', 'AUDIENCE_POLL',
     'Let students see how other participants answered.',
     'users', 'LIFELINE', 1, TRUE),

    ('Eliminate 1', 'ELIMINATE_ONE',
     'Remove one incorrect option.',
     'minus-circle', 'LIFELINE', 1, TRUE),

    ('Freeze Time', 'FREEZE_TIME',
     'Pause the countdown temporarily while the student thinks.',
     'snowflake', 'POWER_UP', 1, TRUE),

    ('Streak Bonus', 'STREAK_BONUS',
     'Bonus points for consecutive correct answers.',
     'flame', 'POWER_UP', 1, TRUE),

    ('Speed Bonus', 'SPEED_BONUS',
     'Extra points for fast correct answers.',
     'gauge', 'POWER_UP', 1, TRUE),

    ('Second Chance', 'SECOND_CHANCE',
     'Allow a retry after a wrong answer.',
     'rotate-ccw', 'POWER_UP', 1, TRUE),

    ('Decaying Points', 'DECAYING_POINTS',
     'Points on each question decrease over time — answer fast for maximum marks.',
     'timer-off', 'POWER_UP', 1, TRUE);