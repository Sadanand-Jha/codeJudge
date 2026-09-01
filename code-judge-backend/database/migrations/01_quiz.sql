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

CREATE TABLE quiz_game_config (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    quiz_id INTEGER NOT NULL UNIQUE,

    -- Game enabled — default TRUE so top-down is present everywhere
    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- Player movement
    movement_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    movement_speed INTEGER NOT NULL DEFAULT 5,

    -- Player mechanics
    lives INTEGER NOT NULL DEFAULT 3,
    points_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    powerups_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    -- Gameplay
    respawn_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    damage_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quiz_game_config_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES quiz(id)
        ON DELETE CASCADE,

    CONSTRAINT check_movement_speed
        CHECK (movement_speed > 0),

    CONSTRAINT check_lives
        CHECK (lives >= 0)
);