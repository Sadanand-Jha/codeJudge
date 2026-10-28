-- Track whether the encrypted quiz copy still matches the current questions.
--
-- Any write to quiz_problems or quiz_problem_options marks the encrypted copy
-- stale. The next explicit save in Quiz Studio then re-encrypts the quiz and
-- downloads a fresh key PDF. Saving the encrypted payload clears the flag; the
-- studio acknowledges its own plaintext sync so a normal save does not leave
-- the freshly uploaded copy marked stale.

ALTER TABLE quiz_secure_payloads
  ADD COLUMN IF NOT EXISTS stale BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stale_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION mark_secure_quiz_payload_stale_for_problem()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE quiz_secure_payloads
       SET stale = TRUE, stale_at = NOW()
     WHERE quiz_id = OLD.quiz_id
       AND stale = FALSE;
    RETURN OLD;
  END IF;

  UPDATE quiz_secure_payloads
     SET stale = TRUE, stale_at = NOW()
   WHERE quiz_id = NEW.quiz_id
     AND stale = FALSE;

  IF TG_OP = 'UPDATE' AND OLD.quiz_id IS DISTINCT FROM NEW.quiz_id THEN
    UPDATE quiz_secure_payloads
       SET stale = TRUE, stale_at = NOW()
     WHERE quiz_id = OLD.quiz_id
       AND stale = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quiz_problems_secure_stale ON quiz_problems;
CREATE TRIGGER trg_quiz_problems_secure_stale
  AFTER INSERT OR UPDATE OR DELETE ON quiz_problems
  FOR EACH ROW
  EXECUTE FUNCTION mark_secure_quiz_payload_stale_for_problem();

CREATE OR REPLACE FUNCTION mark_secure_quiz_payload_stale_for_option()
RETURNS TRIGGER AS $$
DECLARE
  target_quiz_id INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT quiz_id INTO target_quiz_id
      FROM quiz_problems
     WHERE id = OLD.problem_id;

    UPDATE quiz_secure_payloads
       SET stale = TRUE, stale_at = NOW()
     WHERE quiz_id = target_quiz_id
       AND stale = FALSE;

    RETURN OLD;
  END IF;

  SELECT quiz_id INTO target_quiz_id
    FROM quiz_problems
   WHERE id = NEW.problem_id;

  UPDATE quiz_secure_payloads
     SET stale = TRUE, stale_at = NOW()
   WHERE quiz_id = target_quiz_id
     AND stale = FALSE;

  IF TG_OP = 'UPDATE' AND OLD.problem_id IS DISTINCT FROM NEW.problem_id THEN
    SELECT quiz_id INTO target_quiz_id
      FROM quiz_problems
     WHERE id = OLD.problem_id;

    UPDATE quiz_secure_payloads
       SET stale = TRUE, stale_at = NOW()
     WHERE quiz_id = target_quiz_id
       AND stale = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quiz_problem_options_secure_stale ON quiz_problem_options;
CREATE TRIGGER trg_quiz_problem_options_secure_stale
  AFTER INSERT OR UPDATE OR DELETE ON quiz_problem_options
  FOR EACH ROW
  EXECUTE FUNCTION mark_secure_quiz_payload_stale_for_option();
