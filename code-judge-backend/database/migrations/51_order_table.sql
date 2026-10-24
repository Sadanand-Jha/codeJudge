CREATE TABLE IF NOT EXISTS orders (
    id                  BIGSERIAL PRIMARY KEY,
    order_no            VARCHAR(30)  NOT NULL UNIQUE,      -- jaise QS-20261024-0001
    user_id             BIGINT       NOT NULL,             -- users(id) se link karna ho toh FK laga lena

    order_type          VARCHAR(20)  NOT NULL
                        CHECK (order_type IN ('plan', 'credit_pack')),
    plan_id             INT REFERENCES monthly_plans(id),
    pack_id             INT REFERENCES ai_credit_packs(id),

    -- price snapshot
    amount_inr          INT          NOT NULL,             -- jo user ne actually pay kiya
    mrp_inr             INT          NOT NULL DEFAULT 0,
    discount_inr        INT          NOT NULL DEFAULT 0,
    currency            VARCHAR(3)   NOT NULL DEFAULT 'INR',

    -- payment
    status              VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
    payment_method      VARCHAR(20),                       -- upi / card / netbanking
    gateway             VARCHAR(30),                       -- razorpay / cashfree etc.
    gateway_order_id    VARCHAR(100),
    gateway_payment_id  VARCHAR(100),
    paid_at             TIMESTAMP,

    -- validity / expiry
    validity_days       INT          NOT NULL,             -- plan: 30, pack: 180
    starts_at           TIMESTAMP,                         -- payment success par set hoga
    expires_at          TIMESTAMP,                         -- starts_at + validity_days

    -- credits (sirf credit_pack ya plan ke monthly credits ke liye)
    credits_total       INT          NOT NULL DEFAULT 0,
    credits_used        INT          NOT NULL DEFAULT 0,
    credits_remaining   INT GENERATED ALWAYS AS (credits_total - credits_used) STORED,

    -- renewal / cancel
    is_active           BOOLEAN      NOT NULL DEFAULT FALSE,
    cancelled_at        TIMESTAMP,
    refunded_at         TIMESTAMP,
    notes               VARCHAR(255),

    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- plan order me plan_id, pack order me pack_id, dono kabhi saath nahi
    CONSTRAINT chk_order_item CHECK (
        (order_type = 'plan'        AND plan_id IS NOT NULL AND pack_id IS NULL) OR
        (order_type = 'credit_pack' AND pack_id IS NOT NULL AND plan_id IS NULL)
    ),
    CONSTRAINT chk_credits CHECK (credits_used >= 0 AND credits_used <= credits_total)
);

CREATE INDEX IF NOT EXISTS idx_orders_user         ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at   ON orders (expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_gateway_ord  ON orders (gateway_order_id);