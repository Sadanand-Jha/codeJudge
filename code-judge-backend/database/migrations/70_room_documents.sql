-- Classroom documents shared by a room owner.
--
-- Files are uploaded directly from the browser to Cloudinary (raw resource
-- type) after the creator receives a short-lived signature. This table stores
-- the verified Cloudinary metadata so students can list and download the file
-- only while they are members of the room.

CREATE TABLE IF NOT EXISTS room_documents (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES quiz_rooms (id) ON DELETE CASCADE,
  uploaded_by INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 255),
  format VARCHAR(16) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  bytes BIGINT NOT NULL CHECK (bytes > 0),
  cloudinary_public_id VARCHAR(300) NOT NULL,
  cloudinary_version BIGINT NOT NULL,
  secure_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_room_documents_room_public_id UNIQUE (room_id, cloudinary_public_id)
);

CREATE INDEX IF NOT EXISTS idx_room_documents_room_created
  ON room_documents (room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_documents_uploaded_by
  ON room_documents (uploaded_by);
