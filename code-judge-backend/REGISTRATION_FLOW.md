# byteclash — Registration Flow Documentation

## Overview

The registration system uses a **3-step email-verification flow**:

1. **Send OTP** — User submits email, system sends a 6-digit OTP via email.
2. **Verify OTP** — User submits OTP, system returns a registration token.
3. **Register** — User submits email + password + registration token, system creates the account.

**Rate limiting is applied at multiple levels to prevent abuse:**

| Limit | Scope | Window | Max |
|-------|-------|--------|-----|
| OTP requests | per email | 5 minutes | 2 |
| OTP requests | per email | 2 hours | 3 |
| OTP verify attempts | per OTP | OTP lifetime | 3 |

---

## Step 1: Send OTP

### HTTP Request

```
POST /api/auth/send-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Response (Success — 200 OK)

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "email": "user@example.com"
  }
}
```

### Response (Rate Limited — 429 Too Many Requests)

```json
{
  "success": false,
  "message": "You have reached the maximum of 2 OTP requests within 5 minutes. Please try again later.",
  "statusCode": 429
}
```

```json
{
  "success": false,
  "message": "You have reached the maximum of 3 OTP requests within 2 hours. Please try again later.",
  "statusCode": 429
}
```

### Response (Existing OTP — 429 Too Many Requests)

```json
{
  "success": false,
  "message": "An OTP has already been sent to this email. Please wait for it to expire before requesting a new one.",
  "statusCode": 429
}
```

### Files & Functions Called

| File | Function | Role |
|------|----------|------|
| `src/routes/auth.routes.ts` (line 12) | `router.post('/send-otp', ...)` | Express route handler; extracts `email` from `req.body`, calls `sendOtp()` |
| `src/services/auth.ts` (line 126) | `sendOtp(email)` | **Core logic**: validates email format, checks DB for duplicate, checks existing OTP, rate limits, generates OTP, caches in Redis hash, fires email |
| `src/services/database/user.database.ts` (line 14) | `checkUserExistsByEmail(email)` | Checks if email already exists in database |
| `src/repositories/user.repository.ts` (line 15) | `checkUserExistsByEmail(email)` | Executes SQL query `SELECT 1 FROM users WHERE email = $1 LIMIT 1` |
| `src/services/auth.ts` (line 70) | `cacheOtp(email, otp)` | Stores OTP + `attempts_remaining: 3` in Redis hash with 5-minute TTL |
| `src/services/auth.ts` (line 44) | `generateSixDigitOtp()` | Generates a cryptographically secure 6-digit OTP |
| `src/services/otpGenerator.ts` (line 3) | `generateOtp(6, true, false)` | Uses `otp-generator` library to create OTP string |
| `src/services/auth.ts` (line 195) | `sendOtpEmail(email, otp).catch(...)` | Asynchronously sends OTP email (fire-and-forget) |
| `src/services/email.ts` (line 43) | `sendOtpEmail(email, otp)` | Composes HTML/text email and sends via nodemailer |
| `src/services/email.ts` (line 21) | `sendEmail(options)` | Low-level email sending via nodemailer transporter |
| `src/config/redis.ts` | `redisClient` | Redis connection used for caching OTP and rate limit counters |
| `src/config/env.ts` | Environment variables | SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS for email |

### Processing Steps

1. **Validate email format** — `isValidEmail(email)` (line 23 in `auth.ts`) checks regex pattern
2. **Normalize email** — Convert to lowercase
3. **Check duplicate** — `userService.checkUserExistsByEmail()` queries DB
4. **Check existing OTP** — If an unexpired OTP (`otp:<email>`) is still in Redis, reject with 429
5. **Check 2-hour rate limit** — Redis key `otp_requests_2hr:<email>`: reject if ≥ 3 (TTL: 2 hours)
6. **Check 5-minute rate limit** — Redis key `otp_requests:<email>`: reject if ≥ 2 (TTL: 5 minutes)
7. **Increment both rate limit counters** — Set TTL on first request, increment on subsequent
8. **Generate OTP** — `generateSixDigitOtp()` calls `generateOtp(6, true, false)` from `otpGenerator.ts`
9. **Cache OTP as Redis hash** — `cacheOtp()` stores `{ otp: "123456", attempts_remaining: "3" }` with key `otp:{email}`, TTL = 5 minutes
10. **Send email** — `sendOtpEmail()` called with `.catch()` to prevent blocking HTTP response

---

## Step 2: Verify OTP

### HTTP Request

```
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Response (Success — 200 OK)

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "registration_token": "uuid-here",
    "email": "user@example.com"
  }
}
```

### Response (Wrong OTP — 401 Unauthorized)

```json
{
  "success": false,
  "message": "Invalid OTP. 2 attempt(s) remaining.",
  "statusCode": 401
}
```

### Response (No Attempts Left — 429 Too Many Requests)

```json
{
  "success": false,
  "message": "Too many failed OTP attempts. Please request a new OTP.",
  "statusCode": 429
}
```

### Files & Functions Called

| File | Function | Role |
|------|----------|------|
| `src/routes/auth.routes.ts` (line 37) | `router.post('/verify-otp', ...)` | Express route handler; extracts `email` and `otp` from body |
| `src/services/auth.ts` (line 208) | `verifyOtp(email, otp)` | **Core logic**: validates inputs, checks remaining attempts, retrieves cached OTP from hash, compares, decrements attempts or deletes OTP |
| `src/services/auth.ts` (line 80) | `getCachedOtp(email)` | Retrieves OTP from Redis hash field `otp:<email> → otp` |
| `src/services/auth.ts` (line 88) | `getRemainingAttempts(email)` | Reads `attempts_remaining` field from Redis hash |
| `src/services/auth.ts` (line 96) | `decrementAttempts(email)` | Decrements `attempts_remaining` via `HINCRBY` and returns new count |
| `src/services/auth.ts` (line 102) | `deleteCachedOtp(email)` | Deletes OTP hash from Redis after successful verification or when attempts exhausted |
| `src/services/auth.ts` (line 77) | `cacheRegistrationToken(token, email)` | Stores registration token in Redis with key `reg_token:{uuid}` |
| `src/config/redis.ts` | `redisClient` | Used for OTP hash and registration token operations |

### Processing Steps

1. **Validate inputs** — `isValidEmail(email)` and OTP format (6 digits) check patterns
2. **Normalize email** — Convert to lowercase
3. **Retrieve cached OTP** — `getCachedOtp()` fetches OTP from Redis hash field `otp:<email> → otp`
4. **Validate OTP existence** — If null, returns "OTP expired or never requested"
5. **Check remaining attempts** — `getRemainingAttempts()` reads `attempts_remaining` from hash
6. **If attempts ≤ 0** — Delete OTP hash, return "Too many failed OTP attempts. Please request a new OTP."
7. **Validate OTP match** — String comparison of cached OTP vs. provided OTP
8. **If wrong OTP** — `decrementAttempts()` uses `HINCRBY -1`, returns remaining count, e.g. "Invalid OTP. 2 attempt(s) remaining."
9. **If OTP matched** — Delete OTP hash to prevent reuse
10. **Generate registration token** — `uuidv4()` creates UUID v4 token
11. **Cache token** — `cacheRegistrationToken()` stores token → email mapping in Redis with 15-minute TTL

---

## Step 3: Register (Create Account)

### HTTP Request

```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "registration_token": "uuid-from-previous-step"
}
```

### Response (Success — 201 Created)

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "email": "user@example.com"
    },
    "session_token": "JWT_TOKEN_HERE"
  }
}
```

### Files & Functions Called

| File | Function | Role |
|------|----------|------|
| `src/routes/auth.routes.ts` (line 62) | `router.post('/register', ...)` | Express route handler; extracts `email`, `password`, `registration_token` |
| `src/services/auth.ts` (line 265) | `register(email, password, registrationToken)` | **Core logic**: validates inputs, verifies token, creates user, generates JWT |
| `src/services/auth.ts` (line 114) | `getCachedRegistrationToken(token)` | Retrieves email from Redis using token key `reg_token:{token}` |
| `src/services/database/user.database.ts` (line 14) | `checkUserExistsByEmail(email)` | Double-check email doesn't exist (race condition guard) |
| `src/repositories/user.repository.ts` (line 15) | `checkUserExistsByEmail(email)` | SQL query to check existing email |
| `src/services/auth.ts` (line 122) | `deleteCachedRegistrationToken(token)` | Deletes token after successful registration |
| `src/services/database/user.database.ts` (line 18) | `createUser(email, password)` | Creates new user record |
| `src/repositories/user.repository.ts` (line 23) | `createUser(email, password)` | Executes `INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *` |
| `src/config/redis.ts` | `redisClient` | Used to delete registration token |
| `src/services/auth.ts` (line 301) | `jwt.sign(...)` | Generates JWT session token for immediate login |

### Processing Steps

1. **Validate inputs** — `isValidEmail(email)`, `isValidPassword(password)`, check `registration_token` exists
2. **Normalize email** — Convert to lowercase
3. **Verify token** — `getCachedRegistrationToken()` retrieves email from Redis
4. **Validate token email** — Ensure token's email matches request email (tampering check)
5. **Race condition guard** — `userService.checkUserExistsByEmail()` ensures email still doesn't exist
6. **Hash password** — `bcrypt.hash(password, 10)` with salt rounds = 10
7. **Create user** — `userService.createUser()` inserts `(email, hashed_password)` into `users` table
8. **Delete token** — `deleteCachedRegistrationToken()` removes token from Redis
9. **Generate JWT** — `jwt.sign({ userId: email, email }, secret, { expiresIn })` creates session token
10. **Return response** — Returns user info and JWT for client-side storage

---

## Complete Call Chain Summary

### Registration Flow (3 API Endpoints)

```
Client Application
  │
  ▼
POST /api/auth/send-otp
  │  src/routes/auth.routes.ts → sendOtp()
  │  src/services/auth.ts → generateOtp(), cacheOtp() [Redis hash], sendOtpEmail()
  │  src/services/auth.ts → Rate limit checks: existing OTP, 5-min (max 2), 2-hr (max 3)
  │  src/services/database/user.database.ts → checkUserExistsByEmail()
  │  src/repositories/user.repository.ts → checkUserExistsByEmail()
  │  src/config/redis.ts → OTP hash + rate limit counter storage
  │  src/services/email.ts → sendOtpEmail() via SMTP
  │
  ▼
POST /api/auth/verify-otp
  │  src/routes/auth.routes.ts → verifyOtp()
  │  src/services/auth.ts → getCachedOtp(), getRemainingAttempts(), decrementAttempts()
  │  src/services/auth.ts → deleteCachedOtp(), cacheRegistrationToken()
  │  src/config/redis.ts → token storage
  │
  ▼
POST /api/auth/register
     src/routes/auth.routes.ts → register()
     src/services/auth.ts → getCachedRegistrationToken(), deleteCachedRegistrationToken(), bcrypt.hash(), jwt.sign()
     src/services/database/user.database.ts → checkUserExistsByEmail(), createUser()
     src/repositories/user.repository.ts → checkUserExistsByEmail(), createUser()
     src/config/redis.ts → token deletion
     └── Returns JWT session token
```

---

## Route Mounting

```
src/server.ts → imports app from src/app.ts
  src/app.ts → uses "/api" prefix (app.use("/api", apiRoutes))
    src/routes/index.routes.ts → mounts authRoutes (need to confirm mounting)
      src/routes/auth.routes.ts → /send-otp, /verify-otp, /register
```

---

## Key Validation Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `isValidEmail(email)` | `src/services/auth.ts:23` | Regex check: `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| `isValidPassword(password)` | `src/services/auth.ts:36` | Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char |
| OTP format check | `src/services/auth.ts:222` | Regex: `/^\d{6}$/` |

---

## Caching Strategy (Redis)

| Data | Key Pattern | Type | TTL | Expiry Behavior |
|------|-------------|------|-----|-----------------|
| OTP + attempts | `otp:{email}` | Hash `{ otp, attempts_remaining }` | 5 minutes | Auto-expires; both OTP and attempts cleaned up on success |
| OTP rate limit | `otp_requests:<email>` | String (counter) | 5 minutes | Auto-expires; tracks max 2 requests per 5 min |
| OTP rate limit (2hr) | `otp_requests_2hr:<email>` | String (counter) | 2 hours | Auto-expires; tracks max 3 requests per 2 hours |
| Registration Token | `reg_token:{uuid}` | String | 15 minutes | Auto-expires; deleted after registration/verification |

---

## Database Schema

**Table: `users`**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

*See: `database/migrations/03_user.sql`*

---

## Authentication & Security

- **OTP TTL**: 5 minutes (Redis auto-expiry)
- **Registration Token TTL**: 15 minutes (Redis auto-expiry)
- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT**: Used for immediate session after registration
- **OTP Reuse Prevention**: OTP deleted immediately after verification
- **Brute Force Protection**: Max 3 verify attempts per OTP (decremented via `HINCRBY`; OTP deleted when exhausted)
- **Rate Limiting**:
  - Max 2 OTP requests per email per 5 minutes
  - Max 3 OTP requests per email per 2 hours
  - Existing OTP blocks new requests until expiry
- **Race Condition Guard**: Email existence checked twice (before OTP send and at registration)
- **Email Normalization**: All emails lowercased for consistent storage

---

## Error Handling

Common error responses:

- `400 Bad Request` — Invalid email, password, or OTP format
- `400 Bad Request` — Email already registered
- `400 Bad Request` — OTP expired or never requested
- `401 Unauthorized` — Invalid OTP (with remaining attempts count)
- `401 Unauthorized` — Registration token expired/invalid or email mismatch
- `429 Too Many Requests` — Rate limited (existing OTP, 5-min limit, 2-hr limit, or verify attempts exhausted)
- `500 Internal Server Error` — Server/database/Redis failures

Errors are caught in `src/middleware/errorHandler.ts` and formatted consistently.

---

## Environment Variables Required

See `src/config/env.ts` and `src/config/redis.ts`:

```
# SMTP (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRY=7d

# Redis
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgres://user:password@localhost:5432/byteclash
```

---

## Notes

- **Fire-and-forget email**: `sendOtpEmail()` is called with `.catch()` to avoid blocking the HTTP response
- **Redis hash storage**: OTP and `attempts_remaining` stored together in a Redis hash; `hSet`, `hGet`, `hIncrBy` used for atomic operations
- **Existing OTP check**: If an unexpired OTP is cached, new OTP requests are rejected (prevents overwrite spam)
- **Rate limit counters**: Tracked independently via `otp_requests:<email>` (5-min) and `otp_requests_2hr:<email>` (2-hr) keys with corresponding TTLs
- **Attempts decrement**: Each wrong OTP entry decrements `attempts_remaining` via `HINCRBY -1`; when 0, OTP is deleted
- **Single-use OTP**: OTP hash is deleted from Redis after successful verification
- **Single-use token**: Registration token is deleted after successful account creation
- **Stateless verification**: No server-side session needed between steps; all state stored in Redis
