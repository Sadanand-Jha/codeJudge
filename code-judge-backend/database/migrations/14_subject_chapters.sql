CREATE TABLE IF NOT EXISTS subject_chapters (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL,
    chapter_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE subject_chapters DROP CONSTRAINT IF EXISTS fk_subject_chapters_subject;
ALTER TABLE subject_chapters
  ADD CONSTRAINT fk_subject_chapters_subject
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- prevent duplicate chapter names inside same subject
ALTER TABLE subject_chapters DROP CONSTRAINT IF EXISTS uq_subject_chapters_subject_name;
ALTER TABLE subject_chapters
  ADD CONSTRAINT uq_subject_chapters_subject_name UNIQUE (subject_id, chapter_name);

CREATE INDEX IF NOT EXISTS idx_subject_chapters_subject_id ON subject_chapters(subject_id);