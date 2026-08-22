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