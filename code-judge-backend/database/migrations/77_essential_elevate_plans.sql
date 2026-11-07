INSERT INTO plans (
  name, slug, description, tagline, cta, offer, featured, features,
  status, is_public, is_default_free, sort_order, trial_days
)
VALUES (
  'Essential',
  'free',
  'Free forever. Everything teachers need to get started.',
  'Everything teachers need to get started.',
  'Start free',
  NULL,
  FALSE,
  '["Import your own syllabus","Create quizzes and tests","Question bank and AI tools","Instant results and leaderboards","PDF and Word exports"]'::jsonb,
  'active',
  TRUE,
  TRUE,
  0,
  0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tagline = EXCLUDED.tagline,
  cta = EXCLUDED.cta,
  offer = EXCLUDED.offer,
  featured = EXCLUDED.featured,
  features = EXCLUDED.features,
  status = EXCLUDED.status,
  is_public = EXCLUDED.is_public,
  is_default_free = EXCLUDED.is_default_free,
  sort_order = EXCLUDED.sort_order,
  trial_days = EXCLUDED.trial_days,
  archived_at = NULL;

INSERT INTO plans (
  name, slug, description, tagline, cta, offer, featured, features,
  status, is_public, is_default_free, sort_order, trial_days
)
VALUES (
  'Elevate',
  'pro',
  'Everything teachers need to teach, assess and grow.',
  'Everything teachers need to teach, assess and grow.',
  'Choose Elevate',
  NULL,
  TRUE,
  '["All advanced features","Anti-cheat and exam security","Advanced analytics","Custom branding","Increased storage","Priority support"]'::jsonb,
  'active',
  TRUE,
  FALSE,
  10,
  0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tagline = EXCLUDED.tagline,
  cta = EXCLUDED.cta,
  offer = EXCLUDED.offer,
  featured = EXCLUDED.featured,
  features = EXCLUDED.features,
  status = EXCLUDED.status,
  is_public = EXCLUDED.is_public,
  is_default_free = EXCLUDED.is_default_free,
  sort_order = EXCLUDED.sort_order,
  trial_days = EXCLUDED.trial_days,
  archived_at = NULL;

UPDATE plans
SET is_public = FALSE,
    featured = FALSE,
    sort_order = 20
WHERE slug = 'basic';

DO $$
DECLARE
  free_id INTEGER;
  pro_id INTEGER;
BEGIN
  SELECT id INTO free_id FROM plans WHERE slug = 'free';

  UPDATE plan_prices
  SET amount = 0,
      mrp_amount = NULL,
      currency = 'INR',
      tax_inclusive = TRUE,
      is_active = TRUE,
      updated_at = CURRENT_TIMESTAMP
  WHERE plan_id = free_id
    AND billing_period = 'monthly'
    AND COALESCE(custom_days, 0) = 0
    AND is_active = TRUE;

  IF NOT FOUND THEN
    INSERT INTO plan_prices (
      plan_id, billing_period, custom_days, amount, mrp_amount, currency,
      tax_inclusive, is_active
    )
    VALUES (
      free_id, 'monthly', NULL, 0, NULL, 'INR', TRUE, TRUE
    );
  END IF;

  SELECT id INTO pro_id FROM plans WHERE slug = 'pro';

  UPDATE plan_prices
  SET amount = 19900,
      mrp_amount = NULL,
      currency = 'INR',
      tax_inclusive = TRUE,
      is_active = TRUE,
      updated_at = CURRENT_TIMESTAMP
  WHERE plan_id = pro_id
    AND billing_period = 'monthly'
    AND COALESCE(custom_days, 0) = 0
    AND is_active = TRUE;

  IF NOT FOUND THEN
    INSERT INTO plan_prices (
      plan_id, billing_period, custom_days, amount, mrp_amount, currency,
      tax_inclusive, is_active
    )
    VALUES (
      pro_id, 'monthly', NULL, 19900, NULL, 'INR', TRUE, TRUE
    );
  END IF;
END $$;

INSERT INTO plan_entitlements (plan_id, key, value)
SELECT p.id, e.key, e.value::jsonb
FROM plans p
JOIN (VALUES
  ('free', 'max_quizzes', '10'),
  ('free', 'max_questions_per_quiz', '30'),
  ('free', 'max_participants_per_quiz', '-1'),
  ('free', 'max_monthly_attempts', '-1'),
  ('free', 'max_rooms', '1'),
  ('free', 'ai_credits_per_month', '0'),
  ('free', 'pdf_download', 'true'),
  ('free', 'answer_key_pdf', 'true'),
  ('free', 'custom_pdf_header', 'true'),
  ('free', 'remove_branding', 'false'),
  ('free', 'ai_features', 'true'),
  ('free', 'storage_mb', '-1'),
  ('free', 'team_members', '0'),
  ('free', 'anti_cheat', 'false'),
  ('pro', 'max_quizzes', '50'),
  ('pro', 'max_questions_per_quiz', '100'),
  ('pro', 'max_participants_per_quiz', '200'),
  ('pro', 'max_monthly_attempts', '10000'),
  ('pro', 'max_rooms', '5'),
  ('pro', 'ai_credits_per_month', '100'),
  ('pro', 'pdf_download', 'true'),
  ('pro', 'answer_key_pdf', 'true'),
  ('pro', 'custom_pdf_header', 'true'),
  ('pro', 'remove_branding', 'true'),
  ('pro', 'ai_features', 'true'),
  ('pro', 'storage_mb', '5120'),
  ('pro', 'team_members', '2'),
  ('pro', 'anti_cheat', 'true')
) AS e(slug, key, value) ON e.slug = p.slug
ON CONFLICT (plan_id, key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;

UPDATE monthly_plans SET name = 'Essential' WHERE code = 'free';
UPDATE monthly_plans SET name = 'Elevate' WHERE code = 'pro';

UPDATE pricing_page_content
SET value = 'Essential is free forever. Elevate adds advanced tools, anti-cheat, analytics and monthly AI credits when you need more.'
WHERE key = 'plans_subheading';

UPDATE pricing_page_content
SET value = 'Essential is free forever. Elevate includes monthly AI credits; top up anytime with a one-time pack.'
WHERE key = 'plans_gst_note';
