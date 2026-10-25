-- Public pricing catalog: presentation fields for the plan catalog, an MRP
-- column for strike-through pricing, and editable credit-pack metadata.
-- The Free plan stays in the catalog for entitlement resolution but is no
-- longer public; Basic is the only plan that exposes a 7-day trial.

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS cta VARCHAR(80),
  ADD COLUMN IF NOT EXISTS offer VARCHAR(160),
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE plan_prices
  ADD COLUMN IF NOT EXISTS mrp_amount INTEGER
    CHECK (mrp_amount IS NULL OR mrp_amount >= 0);

ALTER TABLE ai_credit_packs
  ADD COLUMN IF NOT EXISTS cta VARCHAR(80),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Hide the zero-priced plan from every public pricing surface.
UPDATE plans
SET is_public = FALSE, trial_days = 0
WHERE is_default_free = TRUE;

INSERT INTO plans
  (name, slug, description, tagline, cta, offer, featured, features,
   status, is_public, is_default_free, sort_order, trial_days)
VALUES
  (
    'Basic',
    'basic',
    'For regular quizzes and assessments.',
    'For regular quizzes and assessments.',
    'Choose Basic',
    'Limited 2026 offer price',
    TRUE,
    '["Up to 30 quiz creations","Up to 5 rooms","PDF and Word exports","Email results to creator","7-day free trial"]'::jsonb,
    'active',
    TRUE,
    FALSE,
    10,
    7
  ),
  (
    'Pro',
    'pro',
    'For creators who run quizzes every week.',
    'For creators who run quizzes every week.',
    'Choose Pro',
    'Limited 2026 offer price',
    FALSE,
    '["Up to 50 quiz creations","Up to 5 rooms","Everything in Basic","No watermark or custom watermark","Priority support"]'::jsonb,
    'active',
    TRUE,
    FALSE,
    20,
    0
  )
ON CONFLICT (slug) DO UPDATE SET
  tagline = COALESCE(plans.tagline, EXCLUDED.tagline),
  cta = COALESCE(plans.cta, EXCLUDED.cta),
  offer = COALESCE(plans.offer, EXCLUDED.offer),
  featured = plans.featured OR EXCLUDED.featured,
  features = CASE
    WHEN plans.features = '[]'::jsonb THEN EXCLUDED.features
    ELSE plans.features
  END,
  description = COALESCE(plans.description, EXCLUDED.description),
  status = 'active',
  is_public = TRUE;

UPDATE plans SET trial_days = 7 WHERE slug = 'basic';
UPDATE plans SET trial_days = 0 WHERE slug = 'pro';

DO $$
DECLARE
  plan_row RECORD;
BEGIN
  FOR plan_row IN
    SELECT id, slug,
           CASE slug WHEN 'basic' THEN 9900 ELSE 19900 END AS amount,
           CASE slug WHEN 'basic' THEN 14900 ELSE 24900 END AS mrp_amount
    FROM plans
    WHERE slug IN ('basic', 'pro')
  LOOP
    IF EXISTS (
      SELECT 1 FROM plan_prices
      WHERE plan_id = plan_row.id
        AND billing_period = 'monthly'
        AND is_active = TRUE
    ) THEN
      UPDATE plan_prices
      SET amount = plan_row.amount, mrp_amount = plan_row.mrp_amount
      WHERE plan_id = plan_row.id
        AND billing_period = 'monthly'
        AND is_active = TRUE;
    ELSE
      INSERT INTO plan_prices
        (plan_id, billing_period, amount, mrp_amount, currency, tax_inclusive, is_active)
      VALUES
        (plan_row.id, 'monthly', plan_row.amount, plan_row.mrp_amount, 'INR', TRUE, TRUE);
    END IF;
  END LOOP;
END $$;

INSERT INTO plan_entitlements (plan_id, key, value)
SELECT p.id, e.key, e.value::jsonb
FROM plans p
JOIN (VALUES
  ('basic', 'max_quizzes', '30'),
  ('basic', 'max_rooms', '5'),
  ('basic', 'ai_credits_per_month', '20'),
  ('basic', 'max_participants_per_quiz', '100'),
  ('basic', 'pdf_download', 'true'),
  ('basic', 'answer_key_pdf', 'true'),
  ('basic', 'custom_pdf_header', 'true'),
  ('basic', 'remove_branding', 'false'),
  ('basic', 'ai_features', 'true'),
  ('basic', 'storage_mb', '1024'),
  ('basic', 'team_members', '0'),
  ('pro', 'max_quizzes', '50'),
  ('pro', 'max_rooms', '5'),
  ('pro', 'ai_credits_per_month', '50'),
  ('pro', 'max_participants_per_quiz', '200'),
  ('pro', 'pdf_download', 'true'),
  ('pro', 'answer_key_pdf', 'true'),
  ('pro', 'custom_pdf_header', 'true'),
  ('pro', 'remove_branding', 'true'),
  ('pro', 'ai_features', 'true'),
  ('pro', 'storage_mb', '5120'),
  ('pro', 'team_members', '2')
) AS e(slug, key, value) ON e.slug = p.slug
ON CONFLICT (plan_id, key) DO NOTHING;

UPDATE ai_credit_packs
SET cta = COALESCE(
      cta,
      CASE code
        WHEN 'teacher' THEN 'Choose Teacher Pack'
        WHEN 'master' THEN 'Get Master Pack'
        ELSE 'Buy ' || name
      END
    ),
    sort_order = CASE code
      WHEN 'teacher' THEN 0
      WHEN 'master' THEN 1
      ELSE sort_order
    END;
