-- ============================================
-- Users
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    AdminId         VARCHAR(50) UNIQUE NOT NULL,
    Username        VARCHAR(255) NOT NULL,
    Email           VARCHAR(255) UNIQUE NOT NULL,
    Password        VARCHAR(255),
    Role            VARCHAR(50) DEFAULT 'admin',
    IsActive        BOOLEAN DEFAULT TRUE,
    LastLogin       TIMESTAMP,
    CreatedAt       TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt       TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
);

-- ============================================
-- OTP
-- ============================================

CREATE TABLE IF NOT EXISTS otp (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(255) NOT NULL,
    otp             INTEGER, 
    created_at      TIMESTAMP,
    attempt         INTEGER,
    verifyattempt   INTEGER
);