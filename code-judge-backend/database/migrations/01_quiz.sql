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
    (1, 'DRAFT', 'Quiz is being created or edited and is not yet published'),
    (2, 'SCHEDULED', 'Quiz is published and scheduled to start at a future time'),
    (3, 'LIVE', 'Quiz is currently active and accepting attempts'),
    (4, 'ENDED', 'Quiz has reached its end time'),
    (5, 'CLOSED', 'Quiz has been manually closed by the creator');


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