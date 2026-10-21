-- The curriculum tables were originally seeded with explicit IDs, which can
-- leave the SERIAL sequences behind the current MAX(id). Syllabus ingestion
-- creates new subjects/chapters/topics, so move each sequence forward once.
SELECT setval(
    pg_get_serial_sequence('subjects', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM subjects), 0) + 1, 1),
    false
);

SELECT setval(
    pg_get_serial_sequence('subject_chapters', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM subject_chapters), 0) + 1, 1),
    false
);

SELECT setval(
    pg_get_serial_sequence('chapter_topics', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM chapter_topics), 0) + 1, 1),
    false
);
