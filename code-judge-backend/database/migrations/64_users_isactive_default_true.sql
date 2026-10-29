-- New accounts are active by default. AI features check this flag on every
-- request, so a freshly registered user must not be treated as inactive just
-- because the insert omitted the column.
ALTER TABLE users ALTER COLUMN isactive SET DEFAULT TRUE;
