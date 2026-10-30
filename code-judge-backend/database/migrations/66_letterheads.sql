-- Pro-only custom letterheads for exported question papers.
-- Binary files live in Cloudinary; this table stores verified asset metadata and
-- the A4 placement configuration used by both the preview and PDF renderer.

CREATE TABLE IF NOT EXISTS letterhead_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  cloudinary_public_id VARCHAR(300) NOT NULL,
  cloudinary_version BIGINT NOT NULL,
  original_format VARCHAR(8) NOT NULL
    CHECK (original_format IN ('pdf', 'png', 'jpg', 'jpeg')),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  bytes BIGINT NOT NULL CHECK (bytes > 0),
  secure_url TEXT NOT NULL,
  png_url TEXT NOT NULL,
  header_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_letterhead_templates_user_public_id UNIQUE (user_id, cloudinary_public_id)
);

-- A user can have at most one default letterhead. Concurrent PATCH requests
-- are serialised in the service, but this index is the final safety net.
CREATE UNIQUE INDEX IF NOT EXISTS uq_letterhead_templates_default_user
  ON letterhead_templates (user_id)
  WHERE is_default;

CREATE INDEX IF NOT EXISTS idx_letterhead_templates_user_created
  ON letterhead_templates (user_id, created_at DESC);
