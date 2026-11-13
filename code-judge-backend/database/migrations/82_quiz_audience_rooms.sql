-- Room-based quiz audiences.
-- The creator selects rooms, not individual students. Every active member of a
-- selected room may attempt the quiz, including students who join the room
-- after the quiz was saved. This replaces the old snapshot into
-- quiz_participants as the source of truth for room access.
CREATE TABLE IF NOT EXISTS quiz_audience_rooms (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quiz_audience_rooms_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES quiz(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_quiz_audience_rooms_room
        FOREIGN KEY (room_id)
        REFERENCES quiz_rooms(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_quiz_audience_room
        UNIQUE (quiz_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_audience_rooms_quiz_id
    ON quiz_audience_rooms(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_audience_rooms_room_id
    ON quiz_audience_rooms(room_id);
