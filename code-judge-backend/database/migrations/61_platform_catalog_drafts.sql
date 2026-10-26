-- Platform catalog authoring: draft/publish overlays, plan discount badges and
-- editable pricing-page content. Live columns stay untouched until Publish, so
-- public catalog reads never expose an unpublished draft.

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS discount_badge VARCHAR(60),
  ADD COLUMN IF NOT EXISTS draft_payload JSONB,
  ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ;

ALTER TABLE ai_credit_packs
  ADD COLUMN IF NOT EXISTS draft_payload JSONB,
  ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS draft_payload JSONB,
  ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS pricing_page_content (
  key VARCHAR(80) PRIMARY KEY,
  value TEXT NOT NULL,
  draft_value TEXT,
  updated_by INTEGER REFERENCES users (id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pricing_page_content (key, value) VALUES
  ('plans_banner', 'Monthly plans'),
  ('plans_heading', 'Plans that grow with your quiz load'),
  ('plans_subheading', 'Start with a 7-day quiz-only trial. Move up when your quiz load grows. Every plan includes the full quiz builder, access codes and instant results. Paid plans also include monthly AI credits at the limited 2026 offer price.'),
  ('plans_gst_note', 'Prices include GST. Plan changes take effect from the next billing cycle.'),
  ('credits_heading', 'More AI. Same plan.'),
  ('credits_subheading', 'Basic and Pro already include monthly AI credits. When you need more, add a one-time pack — no separate AI subscription.')
ON CONFLICT (key) DO NOTHING;

DROP TRIGGER IF EXISTS trg_kolkata_touch_updated_at ON pricing_page_content;
CREATE TRIGGER trg_kolkata_touch_updated_at
  BEFORE UPDATE ON pricing_page_content
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();
