CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY,

    -- Appearance
    theme VARCHAR(20) DEFAULT 'system',
    accent_color VARCHAR(20) DEFAULT 'blue',
    compact_mode BOOLEAN DEFAULT FALSE,
    animation_speed VARCHAR(20) DEFAULT 'normal',

    -- Editor
    preferred_language VARCHAR(50) DEFAULT 'cpp',
    editor_theme VARCHAR(50) DEFAULT 'one-dark',
    editor_font_size SMALLINT DEFAULT 14,
    tab_width SMALLINT DEFAULT 4,
    word_wrap BOOLEAN DEFAULT FALSE,
    auto_save BOOLEAN DEFAULT TRUE,
    vim_mode BOOLEAN DEFAULT FALSE,
    emacs_mode BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_user_preferences_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();