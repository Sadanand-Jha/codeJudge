-- ===== Monthly Plans =====
CREATE TABLE IF NOT EXISTS monthly_plans (
    id                   SERIAL PRIMARY KEY,
    code                 VARCHAR(20)  NOT NULL UNIQUE,   -- free, basic, pro
    name                 VARCHAR(50)  NOT NULL,
    price_inr            INT          NOT NULL DEFAULT 0, -- offer price
    mrp_inr              INT          NOT NULL DEFAULT 0, -- original price
    trial_days           INT          NOT NULL DEFAULT 0, -- free plan ke liye 7
    quizzes_per_month    INT          NOT NULL,
    members_per_room     INT          NOT NULL,
    ai_credits_per_month INT          NOT NULL DEFAULT 0,
    emails_per_day       INT          NOT NULL DEFAULT 0,
    analytics_level      VARCHAR(30)  NOT NULL,           -- basic_score / score_leaderboard
    custom_branding      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO monthly_plans
(code, name, price_inr, mrp_inr, trial_days, quizzes_per_month, members_per_room,
 ai_credits_per_month, emails_per_day, analytics_level, custom_branding)
VALUES
('free',  'Free',  0,   0,   7, 1,  20,  0,  0, 'basic_score',       FALSE),
('basic', 'Basic', 99,  149, 0, 20, 100, 20, 5, 'score_leaderboard', FALSE),
('pro',   'Pro',   199, 249, 0, 30, 200, 50, 5, 'score_leaderboard', TRUE)
ON CONFLICT (code) DO NOTHING;


-- ===== AI Credit Packs =====
CREATE TABLE IF NOT EXISTS ai_credit_packs (
    id            SERIAL PRIMARY KEY,
    code          VARCHAR(20)  NOT NULL UNIQUE,   -- teacher, master
    name          VARCHAR(50)  NOT NULL,
    price_inr     INT          NOT NULL,
    credits       INT          NOT NULL,
    validity_days INT          NOT NULL DEFAULT 180, -- 6 months
    description   VARCHAR(255),
    is_popular    BOOLEAN      NOT NULL DEFAULT FALSE,
    save_percent  INT          NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO ai_credit_packs
(code, name, price_inr, credits, validity_days, description, is_popular, save_percent)
VALUES
('teacher', 'Teacher Pack', 99,  50,  180,
 'For regular question-paper creation. Valid for 6 months.', TRUE, 0),
('master',  'Master Pack',  199, 125, 180,
 'For frequent paper generation and advanced AI workflows. Valid for 6 months.', FALSE, 20)
ON CONFLICT (code) DO NOTHING;