CREATE TABLE IF NOT EXISTS test_section_blueprints (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    sections_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    CONSTRAINT chk_section_blueprint_name CHECK (btrim(name) <> ''),
    CONSTRAINT chk_section_blueprint_sections_array CHECK (jsonb_typeof(sections_json) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_test_section_blueprints_user_updated
ON test_section_blueprints(user_id, updated_at DESC);
