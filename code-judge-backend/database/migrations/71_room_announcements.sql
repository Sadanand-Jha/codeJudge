-- Room announcements written by the room owner. Students see these updates in
-- their room feed; announcements are kept in Postgres instead of browser
-- storage so every member receives the same list.

CREATE TABLE IF NOT EXISTS room_announcements (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES quiz_rooms (id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_room_announcements_room_created
  ON room_announcements (room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_announcements_author
  ON room_announcements (author_id);
