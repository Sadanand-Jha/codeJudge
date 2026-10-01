-- Render-ready question markup. Relational IDs remain dedicated columns for
-- filtering and joins; HTML is stored separately for polished presentation.
ALTER TABLE subjective_question_bank
ADD COLUMN IF NOT EXISTS question_html TEXT;

-- Safely backfill existing plain-text questions as escaped paragraphs.
UPDATE subjective_question_bank
SET question_html = '<p>' ||
    replace(
      replace(
        replace(
          replace(
            replace(question_text, '&', '&amp;'),
          '<', '&lt;'),
        '>', '&gt;'),
      '"', '&quot;'),
    '''', '&#39;') ||
    '</p>'
WHERE question_html IS NULL;

ALTER TABLE subjective_question_bank
ALTER COLUMN question_html SET NOT NULL;

ALTER TABLE subjective_question_bank
DROP CONSTRAINT IF EXISTS chk_subjective_bank_html_not_blank;

ALTER TABLE subjective_question_bank
ADD CONSTRAINT chk_subjective_bank_html_not_blank
CHECK (length(btrim(question_html)) > 0);
