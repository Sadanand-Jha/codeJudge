-- Pro plan: ₹199/month with 100 monthly AI credits and the Pro-only custom
-- letterhead header. `pro` is the slug both the API and UI use for
-- custom-header access, so the plan must exist, be public and be active.

INSERT INTO plans (
  name, slug, description, tagline, cta, offer, featured, features,
  status, is_public, is_default_free, sort_order, trial_days
)
VALUES (
  'Pro',
  'pro',
  'For creators who run quizzes every week.',
  'For high-volume creators and coaching teams.',
  'Choose Pro',
  'Limited 2026 offer price',
  FALSE,
  '["Up to 50 quiz creations","Up to 5 rooms","100 AI credits every month","Custom PDF header","Priority support"]'::jsonb,
  'active',
  TRUE,
  FALSE,
  20,
  0
)
ON CONFLICT (slug) DO UPDATE SET
  status = 'active',
  is_public = TRUE,
  is_default_free = FALSE,
  trial_days = 0,
  archived_at = NULL;

-- Amounts are stored in paise. Reuse the existing monthly price row so any
-- subscription references stay valid.
DO $$
DECLARE
  pro_id INTEGER;
BEGIN
  SELECT id INTO pro_id FROM plans WHERE slug = 'pro';

  UPDATE plan_prices
  SET amount = 19900,
      mrp_amount = 24900,
      currency = 'INR',
      tax_inclusive = TRUE,
      is_active = TRUE,
      updated_at = CURRENT_TIMESTAMP
  WHERE plan_id = pro_id
    AND billing_period = 'monthly'
    AND COALESCE(custom_days, 0) = 0;

  IF NOT FOUND THEN
    INSERT INTO plan_prices (
      plan_id, billing_period, custom_days, amount, mrp_amount, currency,
      tax_inclusive, is_active
    )
    VALUES (
      pro_id, 'monthly', NULL, 19900, 24900, 'INR', TRUE, TRUE
    );
  END IF;
END $$;

INSERT INTO plan_entitlements (plan_id, key, value)
SELECT p.id, e.key, e.value::jsonb
FROM plans p
CROSS JOIN (VALUES
  ('ai_credits_per_month', '100'),
  ('custom_pdf_header', 'true')
) AS e(key, value)
WHERE p.slug = 'pro'
ON CONFLICT (plan_id, key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;

-- The legacy monthly_plans catalog still backs older order/limit checks.
INSERT INTO monthly_plans (
  code, name, price_inr, mrp_inr, trial_days, quizzes_per_month,
  members_per_room, ai_credits_per_month, emails_per_day, analytics_level,
  custom_branding, is_active, rooms_limit, remove_watermark, tier_rank,
  validity_days
)
VALUES (
  'pro', 'Pro', 199, 249, 0, 50, 200, 100, 5, 'score_leaderboard',
  TRUE, TRUE, 5, TRUE, 2, 30
)
ON CONFLICT (code) DO UPDATE SET
  price_inr = EXCLUDED.price_inr,
  mrp_inr = EXCLUDED.mrp_inr,
  ai_credits_per_month = EXCLUDED.ai_credits_per_month,
  custom_branding = TRUE,
  remove_watermark = TRUE,
  is_active = TRUE,
  rooms_limit = GREATEST(monthly_plans.rooms_limit, EXCLUDED.rooms_limit),
  tier_rank = GREATEST(monthly_plans.tier_rank, EXCLUDED.tier_rank),
  validity_days = GREATEST(monthly_plans.validity_days, EXCLUDED.validity_days);
