-- Referral codes are now applied at monthly plan checkout instead of sign-up.
-- The order snapshots the code/referrer so the paid order can be attributed
-- server-side, and the referrals table remains the one-time ledger.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS referral_referrer_user_id BIGINT
    REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_referral_code
  ON orders (referral_code)
  WHERE referral_code IS NOT NULL;

-- Only one pending checkout can hold a referral reservation per user. This
-- prevents two open checkouts from both promising the one-time bonus.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_pending_referral
  ON orders (user_id)
  WHERE referral_code IS NOT NULL AND status = 'pending';

-- Referral bonus credits stay spendable for six months.
UPDATE ai_credit_packs
SET validity_days = 180
WHERE code = 'referral_bonus';
