CREATE TABLE quiz_rooms (
    id INTEGER PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    room_code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    visibility INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    CONSTRAINT fk_quiz_rooms_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id),

    CONSTRAINT fk_quiz_rooms_visibility
        FOREIGN KEY (visibility)
        REFERENCES quiz_visibility(id)
);

CREATE TABLE room_members (
    id INTEGER PRIMARY KEY,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status INTEGER NOT NULL,
    joined_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    CONSTRAINT fk_room_members_room
        FOREIGN KEY (room_id)
        REFERENCES quiz_rooms(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_room_members_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_room_members_status
        FOREIGN KEY (status)
        REFERENCES room_member_status(id),

    CONSTRAINT uq_room_member
        UNIQUE (room_id, user_id)
);

CREATE TABLE room_member_status (
    id INTEGER PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO room_member_status (id, name)
VALUES
    (1, 'ACTIVE'),
    (2, 'INACTIVE');