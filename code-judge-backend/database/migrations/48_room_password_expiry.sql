-- Room passwords can be time-limited. The room code itself never expires; only
-- the shared password stops working after `password_expires_at`.
--
-- NULL means the password does not expire. Rooms created before this migration
-- keep NULL so existing classes are not locked out.
ALTER TABLE quiz_rooms
  ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN quiz_rooms.password_expires_at IS
  'When the room password stops working. NULL = no expiry. Room codes do not expire.';
