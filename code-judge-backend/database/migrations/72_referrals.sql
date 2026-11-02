-- Referral program: every account gets a shareable code, signups can attach
-- themselves to a referrer, and the referrer + referred user each receive
-- spendable AI credits after the referred user's first paid plan purchase.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);

UPDATE users
SET referral_code = COALESCE(
      NULLIF(
        LEFT(UPPER(REGEXP_REPLACE(COALESCE(username, ''), '[^A-Za-z0-9]', '', 'g')), 8),
        ''
      ),
      'QS'
    ) || '-' || id::text
WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_referral_code
  ON users (UPPER(referral_code))
  WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referrals (
  id                      BIGSERIAL PRIMARY KEY,
  referrer_user_id        BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  referred_user_id        BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code                    VARCHAR(20) NOT NULL,
  status                  VARCHAR(16) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'qualified', 'rejected')),
  reward_credits          INTEGER NOT NULL DEFAULT 50 CHECK (reward_credits > 0),
  signup_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  qualified_at            TIMESTAMPTZ,
  order_id                BIGINT REFERENCES orders (id) ON DELETE SET NULL,
  referrer_reward_order_id BIGINT REFERENCES orders (id) ON DELETE SET NULL,
  referred_reward_order_id BIGINT REFERENCES orders (id) ON DELETE SET NULL,
  referrer_rewarded_at    TIMESTAMPTZ,
  referred_rewarded_at    TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_referrals_referred_user UNIQUE (referred_user_id),
  CONSTRAINT chk_referrals_not_self CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_signup
  ON referrals (referrer_user_id, signup_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status
  ON referrals (referrer_user_id, status);

-- Referral credits are spendable through the existing orders-backed AI credit
-- ledger. A hidden zero-price pack gives each grant order a stable catalogue
-- reference without exposing it as a purchasable pack.
INSERT INTO ai_credit_packs
  (code, name, price_inr, credits, validity_days, description,
   is_popular, save_percent, is_active)
VALUES
  ('referral_bonus', 'Referral Bonus', 0, 50, 180,
   'Internal reward credits from the referral program.', FALSE, 0, FALSE)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    price_inr = EXCLUDED.price_inr,
    credits = EXCLUDED.credits,
    validity_days = EXCLUDED.validity_days,
    description = EXCLUDED.description,
    is_popular = FALSE,
    save_percent = 0,
    is_active = FALSE;

-- Belt-and-braces idempotency: a referral row can never award the same side
-- twice, even if qualification logic is replayed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_transactions_referral_reward
  ON credit_transactions (user_id, ref_id)
  WHERE reason IN ('referral_referrer_reward', 'referral_referred_reward');
