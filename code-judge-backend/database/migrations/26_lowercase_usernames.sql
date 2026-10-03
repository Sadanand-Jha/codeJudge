-- Usernames are canonical lowercase identifiers throughout ByteClash.
-- Stop before changing data if legacy rows would collapse to the same value;
-- those accounts must be resolved deliberately rather than silently merged.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    GROUP BY LOWER(BTRIM(username))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalize usernames: case-insensitive duplicates exist';
  END IF;
END $$;

UPDATE users
SET username = LOWER(BTRIM(username))
WHERE username IS DISTINCT FROM LOWER(BTRIM(username));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower_unique
  ON users (LOWER(username));

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_username_lowercase;

ALTER TABLE users
  ADD CONSTRAINT users_username_lowercase
  CHECK (username = LOWER(BTRIM(username))) NOT VALID;

ALTER TABLE users
  VALIDATE CONSTRAINT users_username_lowercase;
