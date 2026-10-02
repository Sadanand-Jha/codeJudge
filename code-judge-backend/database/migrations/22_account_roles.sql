-- Explicit account personas selected during public onboarding.
-- Existing `user` and `admin` roles remain untouched for backwards compatibility.
INSERT INTO role (name, created_at, updated_at) VALUES
  ('student', NOW(), NOW()),
  ('teacher', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
