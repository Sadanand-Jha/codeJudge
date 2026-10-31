-- OAuth 2.0 / OpenID Connect login (Google + GitHub).
--
-- The provider subject ("sub" for Google, numeric id for GitHub) is the
-- stable identity. Never key users by email: provider emails can change.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_provider_user_id VARCHAR(255);

-- One provider identity can only belong to one local account. The partial
-- index keeps password-only users (both columns NULL) out of the constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_identity
  ON users (oauth_provider, oauth_provider_user_id)
  WHERE oauth_provider IS NOT NULL AND oauth_provider_user_id IS NOT NULL;

-- OAuth users have no country/state/college until they fill in their profile.
-- The existing registration path already inserts users without these values,
-- so make the legacy NOT NULL constraints match the actual behavior.
ALTER TABLE users ALTER COLUMN country_id DROP NOT NULL;
ALTER TABLE users ALTER COLUMN state_id DROP NOT NULL;
ALTER TABLE users ALTER COLUMN college_id DROP NOT NULL;
