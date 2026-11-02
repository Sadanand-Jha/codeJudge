-- OAuth signups get a provisional username/avatar from the provider profile.
-- They must still choose their role, username, and avatar once, immediately
-- after the first OAuth sign-in. Existing accounts (password or
-- already-onboarded OAuth users) are treated as completed by the default.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_onboarding_completed BOOLEAN NOT NULL DEFAULT TRUE;
