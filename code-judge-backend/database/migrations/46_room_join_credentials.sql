-- Join-by-code-and-password support for classrooms.
--
-- The rooms domain table in this codebase is `quiz_rooms` (the REST layer calls
-- it "rooms"). This migration:
--   1. adds a bcrypt password hash to every room,
--   2. upgrades legacy room codes to the 6-character, unambiguous alphabet,
--   3. makes room_members ready for self-service joins (role + idempotency),
--   4. indexes room_code for lookups.
--
-- pgcrypto is used only inside this migration to generate cryptographically
-- secure codes/passwords and bcrypt hashes for rows that already exist.
-- Runtime hashing stays in bcryptjs (same $2a$ format).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE quiz_rooms
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

ALTER TABLE room_members
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student';

-- The original rooms migration declared `id INTEGER PRIMARY KEY` without a
-- sequence. Ensure inserts that omit id (all room/member writes) get one even
-- on databases created from those files verbatim, and resync any existing
-- sequence with the current maximum id.
DO $$
DECLARE
  seq_name TEXT;
  max_id BIGINT;
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['quiz_rooms', 'room_members'] LOOP
    SELECT pg_get_serial_sequence(table_name, 'id') INTO seq_name;
    IF seq_name IS NULL THEN
      seq_name := table_name || '_id_seq';
      EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', seq_name);
      EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(%L::regclass)', table_name, seq_name);
      EXECUTE format('ALTER SEQUENCE %I OWNED BY %I.id', seq_name, table_name);
    END IF;
    EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', table_name) INTO max_id;
    PERFORM setval(seq_name, GREATEST(max_id, 1), max_id > 0);
  END LOOP;
END $$;

-- The existing table already enforces uq_room_member; keep this guard for
-- databases created before that constraint was added.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_room_member'
  ) THEN
    ALTER TABLE room_members
      ADD CONSTRAINT uq_room_member UNIQUE (room_id, user_id);
  END IF;
END $$;

-- 6 characters from ABCDEFGHJKMNPQRSTUVWXYZ23456789 (31 symbols, no
-- 0/O/1/I/L). Bytes >= 248 are rejected so the modulo is unbiased.
-- gen_random_bytes() is pgcrypto's CSPRNG.
CREATE OR REPLACE FUNCTION quiz_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER := 0;
  b INTEGER;
BEGIN
  WHILE i < 6 LOOP
    b := get_byte(gen_random_bytes(1), 0);
    IF b < 248 THEN -- 8 * 31
      code := code || substr(alphabet, (b % 31) + 1, 1);
      i := i + 1;
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 8 lowercase alphanumeric characters for the password handed to the teacher.
CREATE OR REPLACE FUNCTION quiz_room_password()
RETURNS VARCHAR(8) AS $$
DECLARE
  alphabet CONSTANT TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  pwd TEXT := '';
  i INTEGER := 0;
  b INTEGER;
BEGIN
  WHILE i < 8 LOOP
    b := get_byte(gen_random_bytes(1), 0);
    IF b < 252 THEN -- 7 * 36
      pwd := pwd || substr(alphabet, (b % 36) + 1, 1);
      i := i + 1;
    END IF;
  END LOOP;
  RETURN pwd;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Backfill legacy room codes (the previous generator produced 8-char hex).
DO $$
DECLARE
  room RECORD;
  candidate VARCHAR(6);
  attempts INTEGER;
BEGIN
  FOR room IN
    SELECT id
    FROM quiz_rooms
    WHERE room_code IS NULL
       OR room_code !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'
  LOOP
    attempts := 0;
    LOOP
      candidate := quiz_room_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM quiz_rooms
        WHERE room_code = candidate AND id <> room.id
      );
      attempts := attempts + 1;
      IF attempts >= 100 THEN
        RAISE EXCEPTION 'Could not generate a unique room code for room %', room.id;
      END IF;
    END LOOP;
    UPDATE quiz_rooms SET room_code = candidate WHERE id = room.id;
  END LOOP;
END $$;

-- Give rooms created before this feature a random password. The plaintext is
-- deliberately not retained; the owning teacher can rotate it with
-- POST /api/rooms/:code/reset-password.
DO $$
DECLARE
  room RECORD;
BEGIN
  FOR room IN SELECT id FROM quiz_rooms WHERE password_hash IS NULL LOOP
    UPDATE quiz_rooms
    SET password_hash = crypt(quiz_room_password(), gen_salt('bf', 10))
    WHERE id = room.id;
  END LOOP;
END $$;

ALTER TABLE quiz_rooms ALTER COLUMN room_code TYPE VARCHAR(6);
ALTER TABLE quiz_rooms ALTER COLUMN room_code SET NOT NULL;
ALTER TABLE quiz_rooms ALTER COLUMN password_hash SET NOT NULL;

-- The original inline UNIQUE constraint already indexes room_code. Only add an
-- index when the table was created without one.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_attribute a
      ON a.attrelid = i.indrelid
     AND a.attnum = ANY (i.indkey)
    WHERE i.indrelid = 'quiz_rooms'::regclass
      AND i.indisunique
      AND a.attname = 'room_code'
  ) THEN
    CREATE UNIQUE INDEX uq_quiz_rooms_room_code ON quiz_rooms (room_code);
  END IF;
END $$;

DROP FUNCTION IF EXISTS quiz_room_code();
DROP FUNCTION IF EXISTS quiz_room_password();
