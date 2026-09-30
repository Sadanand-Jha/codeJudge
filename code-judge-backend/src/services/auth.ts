// Core authentication business logic. Email validation, OTP generation/verification
// with rate limiting, JWT session creation, bcrypt password hashing, and user
// registration flow.
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../config/redis.js';
import { UserService } from './database/user.database.js';
import { sendOtpEmail } from './email.js';
import generateOtp from './otpGenerator.js';
import { isPlatformOwner } from './platformSession.js';

const OTP_TTL_SECONDS = 5 * 60; // 5 minutes — OTP validity
const OTP_RESEND_COOLDOWN_SECONDS = 60; // 60 seconds — resend cooldown (must match frontend countdown)
const REGISTRATION_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const OTP_MAX_REQUESTS = 4; // Max OTP requests per email per 5-min window
const OTP_REQUEST_WINDOW_SECONDS = 2 * 60; // 2-minute window for rate limiting
const OTP_MAX_REQUESTS_2HR = 7; // Max OTP requests per email per 2 hours
const OTP_REQUEST_WINDOW_2HR_SECONDS = 2 * 60 * 60; // 2-hour window for rate limiting
const OTP_MAX_VERIFY_ATTEMPTS = 3; // Max OTP verification attempts before lockout
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

// --- IP-based rate limiting (email flood protection) ---
const IP_COOLDOWN_SECONDS = 60; // 60 seconds cooldown per IP
const IP_MAX_REQUESTS = 4; // Max OTP requests per IP per 5-min window (prevents email enumeration flood)
const IP_REQUEST_WINDOW_SECONDS = 5 * 60; // 5-minute window for IP rate limiting
const IP_MAX_REQUESTS_2HR = 10; // Max OTP requests per IP per 2 hours (prevents prolonged flood)
const IP_REQUEST_WINDOW_2HR_SECONDS = 2 * 60 * 60; // 2-hour window for IP rate limiting

const userService = new UserService();

// --- Validation ---

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
function isValidPassword(password: string): boolean {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Generates a cryptographically secure 6-digit OTP
 */
function generateSixDigitOtp(): string {
  return generateOtp(6, true, false);
}

// --- OTP Cache Operations ---
// OTP data is stored as a Redis hash with the structure:
//   otp:<email> -> { otp: "123456", attempts_remaining: "3" }
// The hash has a TTL of 5 minutes.

/**
 * Stores OTP in Redis as a hash with remaining verify attempts (3)
 * The entire hash expires after OTP_TTL_SECONDS
 */
async function cacheOtp(email: string, otp: string): Promise<void> {
  const key = `otp:${email.toLowerCase()}`;
  await redisClient.hSet(key, 'otp', otp);
  await redisClient.hSet(key, 'attempts_remaining', String(OTP_MAX_VERIFY_ATTEMPTS));
  await redisClient.expire(key, OTP_TTL_SECONDS);
}

/**
 * Retrieves OTP from Redis hash
 */
async function getCachedOtp(email: string): Promise<string | null> {
  const key = `otp:${email.toLowerCase()}`;
  return await redisClient.hGet(key, 'otp');
}

/**
 * Gets the remaining verify attempts for an email
 */
async function getRemainingAttempts(email: string): Promise<number> {
  const key = `otp:${email.toLowerCase()}`;
  const attempts = await redisClient.hGet(key, 'attempts_remaining');
  return attempts ? parseInt(attempts, 10) : 0;
}

/**
 * Decrements the remaining verify attempts for an email.
 * Returns the new remaining count.
 */
async function decrementAttempts(email: string): Promise<number> {
  const key = `otp:${email.toLowerCase()}`;
  return await redisClient.hIncrBy(key, 'attempts_remaining', -1);
}

/**
 * Deletes OTP hash from Redis
 */
async function deleteCachedOtp(email: string): Promise<void> {
  const key = `otp:${email.toLowerCase()}`;
  await redisClient.del(key);
}

// --- Registration Token Cache Operations ---

/**
 * Stores registration token in Redis with 15-minute TTL
 */
async function cacheRegistrationToken(token: string, email: string): Promise<void> {
  const key = `reg_token:${token}`;
  await redisClient.setEx(key, REGISTRATION_TOKEN_TTL_SECONDS, email.toLowerCase());
}

/**
 * Retrieves email associated with a registration token
 */
async function getCachedRegistrationToken(token: string): Promise<string | null> {
  const key = `reg_token:${token}`;
  return await redisClient.get(key);
}

/**
 * Deletes registration token from Redis
 */
async function deleteCachedRegistrationToken(token: string): Promise<void> {
  const key = `reg_token:${token}`;
  await redisClient.del(key);
}

// --- Response Helpers ---

interface ServiceResponse {
  success: boolean;
  message: string;
  data?: any;
  statusCode?: number;
}

function successResponse(data: any, message: string = 'Success'): ServiceResponse {
  return { success: true, message, data };
}

function errorResponse(message: string, statusCode: number = 400): ServiceResponse {
  return { success: false, message, statusCode };
}

// --- Endpoint Handlers ---

/**
 * POST /api/auth/send-otp
 * Validates email, generates OTP, caches it, sends email asynchronously
 * Rate-limited: max 4 requests per 5 minutes per email, 7 per 2 hours
 * IP rate-limited: max 4 requests per 5 minutes per IP, 10 per 2 hours (prevents email flood via enumeration)
 * Resend cooldown: 60s per email (otp_cooldown:<email>) + 60s per IP (otp_cooldown_ip:<ip>) — synced with frontend
 * OTP validity: 5 minutes (OTP_TTL_SECONDS) — allows resending after cooldown by overwriting
 */
export async function sendOtp(email: string, clientIp?: string): Promise<ServiceResponse> {
  try {
    // 1. Validate email format
    if (!email || !isValidEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }

    const normalizedEmail = email.toLowerCase();

    // 2. Check if email already exists in database
    const existingUser = await userService.checkUserExistsByEmail(normalizedEmail);
    if (existingUser) {
      return errorResponse('Email already registered', 400);
    }

    // 2a. IP-based cooldown (60s) — prevents email flood via different emails from same IP
    const normalizedIp = clientIp ? clientIp.replace(/^::ffff:/, '').trim() : undefined;
    const ipCooldownKey = normalizedIp && normalizedIp !== 'unknown' ? `otp_cooldown_ip:${normalizedIp}` : null;
    const ipRateLimitKey = normalizedIp && normalizedIp !== 'unknown' ? `otp_requests_ip:${normalizedIp}` : null;
    const ipRateLimitKey2hr = normalizedIp && normalizedIp !== 'unknown' ? `otp_requests_ip_2hr:${normalizedIp}` : null;

    if (ipCooldownKey) {
      const ipCooldownExists = await redisClient.get(ipCooldownKey);
      if (ipCooldownExists) {
        return errorResponse(
          `Too many OTP requests from this network. Please wait ${IP_COOLDOWN_SECONDS} seconds before trying again.`,
          429
        );
      }
    }

    // 3. Check resend cooldown (60s) — must match frontend countdown
    const cooldownKey = `otp_cooldown:${normalizedEmail}`;
    const cooldownExists = await redisClient.get(cooldownKey);
    if (cooldownExists) {
      return errorResponse(
        `Please wait before requesting a new OTP. You can resend after ${OTP_RESEND_COOLDOWN_SECONDS} seconds.`,
        429
      );
    }

    // 3a. IP-based 2-hour rate limit: max 10 requests per 2 hours per IP
    if (ipRateLimitKey2hr) {
      const ipRequestCount2hr = await redisClient.incr(ipRateLimitKey2hr);
      if (ipRequestCount2hr === 1) {
        await redisClient.expire(ipRateLimitKey2hr, IP_REQUEST_WINDOW_2HR_SECONDS);
      }
      if (ipRequestCount2hr > IP_MAX_REQUESTS_2HR) {
        return errorResponse(
          `Too many OTP requests from this network. Maximum ${IP_MAX_REQUESTS_2HR} requests per 2 hours. Please try again later.`,
          429
        );
      }
    }

    // 3b. IP-based 5-minute rate limit: max 3 requests per 5 minutes per IP (after cooldown checks to avoid overcounting)
    if (ipRateLimitKey) {
      const ipRequestCount = await redisClient.incr(ipRateLimitKey);
      if (ipRequestCount === 1) {
        await redisClient.expire(ipRateLimitKey, IP_REQUEST_WINDOW_SECONDS);
      }
      if (ipRequestCount > IP_MAX_REQUESTS) {
        return errorResponse(
          `Too many OTP requests from this network. Maximum ${IP_MAX_REQUESTS} requests per 5 minutes. Please try again later.`,
          429
        );
      }
    }

    // 4. Atomic 2-hour rate limit check
    const rateLimitKey2hr = `otp_requests_2hr:${normalizedEmail}`;
    const requestCount2hr = await redisClient.incr(rateLimitKey2hr);
    
    // If it's the first request in the window, set the expiration
    if (requestCount2hr === 1) {
      await redisClient.expire(rateLimitKey2hr, OTP_REQUEST_WINDOW_2HR_SECONDS);
    }

    if (requestCount2hr > OTP_MAX_REQUESTS_2HR) {
      return errorResponse(
        `You have reached the maximum of ${OTP_MAX_REQUESTS_2HR} OTP requests within 2 hours. Please try again later.`,
        429
      );
    }

    // 5. Atomic 5-minute rate limit check
    const rateLimitKey = `otp_requests:${normalizedEmail}`;
    const requestCount = await redisClient.incr(rateLimitKey);
    
    if (requestCount === 1) {
      await redisClient.expire(rateLimitKey, OTP_REQUEST_WINDOW_SECONDS);
    }

    if (requestCount > OTP_MAX_REQUESTS) {
      return errorResponse(
        `You have reached the maximum of ${OTP_MAX_REQUESTS} OTP requests within 5 minutes. Please try again later.`,
        429
      );
    }

    // 6. Generate cryptographically secure 6-digit OTP
    const otp = generateSixDigitOtp();

    // 7. Store OTP in Redis with TTL (overwrites any existing OTP)
    await cacheOtp(normalizedEmail, otp);
    // 8. Set resend cooldown — frontend timer is synced to this TTL (60s)
    await redisClient.setEx(cooldownKey, OTP_RESEND_COOLDOWN_SECONDS, '1');
    // 8a. Set IP cooldown (60s) to prevent immediate flood from same IP
    if (ipCooldownKey) {
      await redisClient.setEx(ipCooldownKey, IP_COOLDOWN_SECONDS, '1');
    }

    // 9. Await provider acceptance. Fire-and-forget work is unsafe on Vercel:
    // the invocation may be frozen as soon as the response is returned.
    try {
      await sendOtpEmail({ to: normalizedEmail, otp });
    } catch (emailError) {
      // Do not leave a valid-but-undelivered code or cooldown behind. The user
      // can retry immediately once the provider recovers.
      await deleteCachedOtp(normalizedEmail);
      await redisClient.del(cooldownKey);
      if (ipCooldownKey) await redisClient.del(ipCooldownKey);
      throw emailError;
    }

    return successResponse({ email: normalizedEmail }, 'OTP sent successfully');
  } catch (error) {
    console.error('Error in sendOtp:', error);
    return errorResponse('Internal server error while sending OTP', 500);
  }
}
/**
 * POST /api/auth/verify-otp
 * Validates OTP, returns registration token on success
 * Rate-limited: max 3 failed attempts before the OTP is invalidated
 */
export async function verifyOtp(email: string, otp: string): Promise<ServiceResponse> {
  try {
    // 1. Validate inputs
    if (!email || !isValidEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return errorResponse('Invalid OTP format', 400);
    }

    const normalizedEmail = email.toLowerCase();

    // 2. Retrieve OTP from cache
    const cachedOtp = await getCachedOtp(normalizedEmail);

    // 3. Validate OTP existence
    if (!cachedOtp) {
      return errorResponse('OTP expired or never requested. Please request a new OTP.', 400);
    }

    // 4. Check remaining attempts
    const remaining = await getRemainingAttempts(normalizedEmail);

    if (remaining <= 0) {
      // No attempts left — delete OTP so user must request a new one
      await deleteCachedOtp(normalizedEmail);
      return errorResponse(
        'Too many failed OTP attempts. Please request a new OTP.',
        429
      );
    }

    // 5. Validate OTP match (Upstash may return number, so string-compare)
    if (String(cachedOtp).trim() !== String(otp).trim()) {
      // Wrong OTP — decrement remaining attempts
      const newRemaining = await decrementAttempts(normalizedEmail);

      if (newRemaining <= 0) {
        // No attempts left — delete OTP immediately so user must request a new one
        await deleteCachedOtp(normalizedEmail);
        return errorResponse(
          'Too many failed OTP attempts. Please request a new OTP.',
          429
        );
      }

      return errorResponse(
        `Invalid OTP. ${newRemaining} attempt(s) remaining.`,
        401
      );
    }

    // 6. OTP matched — delete OTP hash so it cannot be reused
    await deleteCachedOtp(normalizedEmail);

    // 7. Generate registration token
    const registrationToken = uuidv4();

    // 8. Store registration token in Redis with email
    await cacheRegistrationToken(registrationToken, normalizedEmail);

    return successResponse(
      { registration_token: registrationToken, email: normalizedEmail },
      'OTP verified successfully'
    );
  } catch (error) {
    console.error('Error in verifyOtp:', error);
    return errorResponse('Internal server error while verifying OTP', 500);
  }
}

/**
 * POST /api/auth/register
 * Finalizes user registration with validated token
 */
export async function register(email: string, password: string, registrationToken: string, username: string, avatarUrl: string): Promise<ServiceResponse> {
  try {
    // 1. Validate inputs
    if (!email || !isValidEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }
    if (!password || !isValidPassword(password)) {
      return errorResponse(
        'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special character',
        400
      );
    }

    if (!registrationToken) {
      return errorResponse('Registration token is required', 400);
    }

    const normalizedEmail = email.toLowerCase();

    // 2. Verify registration token exists in Redis
    const tokenEmail = await getCachedRegistrationToken(registrationToken);

    if (!tokenEmail) {
      return errorResponse('Registration token expired or invalid', 401);
    }

    // 3. Verify token email matches payload email
    if (tokenEmail !== normalizedEmail) {
      return errorResponse('Email mismatch: token does not match the provided email', 401);
    }

    // 4. Double-check user doesn't already exist (race condition guard)
    const existingUser = await userService.checkUserExistsByEmail(normalizedEmail);
    if (existingUser) {
      // Clean up token since it's now invalid
      await deleteCachedRegistrationToken(registrationToken);
      return errorResponse('Email already registered', 400);
    }

    // 5. Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // 6. Save user to database and get the created user record (includes id)
    const createdUser = await userService.createUser(normalizedEmail, hashedPassword, username, avatarUrl);

    // 7. Delete registration token from Redis
    await deleteCachedRegistrationToken(registrationToken);



    return successResponse(
      {
        user: {
          id: createdUser.id,
          email: normalizedEmail,
        },
      },
      'Registration successful'
    );
  } catch (error) {
    console.error('Error in register:', error);
    return errorResponse('Internal server error during registration', 500);
  }
}

// --- Owner Login OTP Cache Operations ---
// Isolated `ownerlogin:` namespace so owner sign-in attempts never interfere
// with registration or password-reset attempts. Only users with role_id = 2
// (admin/owner) may receive and redeem an owner login OTP.

async function cacheOwnerLoginOtp(email: string, otp: string): Promise<void> {
  const key = `ownerlogin_otp:${email.toLowerCase()}`;
  await redisClient.hSet(key, 'otp', otp);
  await redisClient.hSet(key, 'attempts_remaining', String(OTP_MAX_VERIFY_ATTEMPTS));
  await redisClient.expire(key, OTP_TTL_SECONDS);
}

async function getCachedOwnerLoginOtp(email: string): Promise<string | null> {
  const key = `ownerlogin_otp:${email.toLowerCase()}`;
  return await redisClient.hGet(key, 'otp');
}

async function getOwnerLoginRemainingAttempts(email: string): Promise<number> {
  const key = `ownerlogin_otp:${email.toLowerCase()}`;
  const attempts = await redisClient.hGet(key, 'attempts_remaining');
  return attempts ? parseInt(attempts, 10) : 0;
}

async function decrementOwnerLoginAttempts(email: string): Promise<number> {
  const key = `ownerlogin_otp:${email.toLowerCase()}`;
  return await redisClient.hIncrBy(key, 'attempts_remaining', -1);
}

async function deleteCachedOwnerLoginOtp(email: string): Promise<void> {
  const key = `ownerlogin_otp:${email.toLowerCase()}`;
  await redisClient.del(key);
}

function isOwnerRole(user: any): boolean {
  return user != null && isPlatformOwner(user.role_id, user.email);
}

/**
 * POST /api/auth/owner/send-otp
 * Sends a login OTP only if the email belongs to a role_id = 2 account.
 * Always returns a generic message so the endpoint cannot be used to
 * enumerate which emails hold owner access.
 */
export async function requestOwnerLoginOtp(email: string, clientIp?: string): Promise<ServiceResponse> {
  try {
    if (!email || !isValidEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }

    const normalizedEmail = email.toLowerCase();

    // IP-based cooldown (same shape as other OTP flows)
    const normalizedIp = clientIp ? clientIp.replace(/^::ffff:/, '').trim() : undefined;
    const ipCooldownKey = normalizedIp && normalizedIp !== 'unknown' ? `ownerlogin_cooldown_ip:${normalizedIp}` : null;
    const ipRateLimitKey = normalizedIp && normalizedIp !== 'unknown' ? `ownerlogin_requests_ip:${normalizedIp}` : null;
    const ipRateLimitKey2hr = normalizedIp && normalizedIp !== 'unknown' ? `ownerlogin_requests_ip_2hr:${normalizedIp}` : null;

    if (ipCooldownKey) {
      const ipCooldownExists = await redisClient.get(ipCooldownKey);
      if (ipCooldownExists) {
        return errorResponse(
          `Too many OTP requests from this network. Please wait ${IP_COOLDOWN_SECONDS} seconds before trying again.`,
          429
        );
      }
    }

    const cooldownKey = `ownerlogin_cooldown:${normalizedEmail}`;
    const cooldownExists = await redisClient.get(cooldownKey);
    if (cooldownExists) {
      return errorResponse(
        `Please wait before requesting a new OTP. You can resend after ${OTP_RESEND_COOLDOWN_SECONDS} seconds.`,
        429
      );
    }

    if (ipRateLimitKey2hr) {
      const n = await redisClient.incr(ipRateLimitKey2hr);
      if (n === 1) await redisClient.expire(ipRateLimitKey2hr, IP_REQUEST_WINDOW_2HR_SECONDS);
      if (n > IP_MAX_REQUESTS_2HR) {
        return errorResponse(`Too many OTP requests from this network. Please try again later.`, 429);
      }
    }

    if (ipRateLimitKey) {
      const n = await redisClient.incr(ipRateLimitKey);
      if (n === 1) await redisClient.expire(ipRateLimitKey, IP_REQUEST_WINDOW_SECONDS);
      if (n > IP_MAX_REQUESTS) {
        return errorResponse(`Too many OTP requests from this network. Please try again later.`, 429);
      }
    }

    const rateLimitKey2hr = `ownerlogin_requests_2hr:${normalizedEmail}`;
    const count2hr = await redisClient.incr(rateLimitKey2hr);
    if (count2hr === 1) await redisClient.expire(rateLimitKey2hr, OTP_REQUEST_WINDOW_2HR_SECONDS);
    if (count2hr > OTP_MAX_REQUESTS_2HR) {
      return errorResponse(`You have reached the maximum OTP requests. Please try again later.`, 429);
    }

    const rateLimitKey = `ownerlogin_requests:${normalizedEmail}`;
    const count = await redisClient.incr(rateLimitKey);
    if (count === 1) await redisClient.expire(rateLimitKey, OTP_REQUEST_WINDOW_SECONDS);
    if (count > OTP_MAX_REQUESTS) {
      return errorResponse(`You have reached the maximum OTP requests. Please try again later.`, 429);
    }

    // Only role_id = 2 accounts receive an OTP — but respond generically.
    // Both branches are logged (without the OTP value) so email delivery
    // to non-admins can be audited from server logs.
    const user = await userService.getUserByEmail(normalizedEmail);
    if (isOwnerRole(user)) {
      const otp = generateSixDigitOtp();
      await cacheOwnerLoginOtp(normalizedEmail, otp);
      console.log(`[owner-otp] code issued for admin ${normalizedEmail}`);
      // Still return the same generic response on delivery failure so this
      // endpoint cannot reveal whether an owner account exists.
      try {
        await sendOtpEmail({ to: normalizedEmail, otp });
      } catch (err: any) {
        await deleteCachedOwnerLoginOtp(normalizedEmail);
        console.error('Failed to send owner-login OTP email:', err.message || err);
      }
    } else {
      console.log(`[owner-otp] code suppressed for non-admin ${normalizedEmail}`);
    }

    await redisClient.setEx(cooldownKey, OTP_RESEND_COOLDOWN_SECONDS, '1');
    if (ipCooldownKey) {
      await redisClient.setEx(ipCooldownKey, IP_COOLDOWN_SECONDS, '1');
    }

    return successResponse({ email: normalizedEmail }, 'If an owner account exists for this email, an OTP has been sent.');
  } catch (error) {
    console.error('Error in requestOwnerLoginOtp:', error);
    return errorResponse('Internal server error while sending OTP', 500);
  }
}

/**
 * POST /api/auth/owner/verify-otp
 * Redeems an owner login OTP. Only succeeds for role_id = 2 accounts.
 * Returns the user id + email so the controller can mint a session.
 */
export async function verifyOwnerLoginOtp(email: string, otp: string): Promise<ServiceResponse> {
  try {
    // Redis/JSON may hand back a numeric OTP (leading zero dropped) — normalize.
    const code = String(otp ?? "").trim();
    if (!email || !isValidEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return errorResponse('Invalid OTP format', 400);
    }

    const normalizedEmail = email.toLowerCase();

    const cachedOtp = await getCachedOwnerLoginOtp(normalizedEmail);
    if (!cachedOtp) {
      return errorResponse('OTP expired or never requested. Please request a new OTP.', 400);
    }

    const remaining = await getOwnerLoginRemainingAttempts(normalizedEmail);
    if (remaining <= 0) {
      await deleteCachedOwnerLoginOtp(normalizedEmail);
      return errorResponse('Too many failed OTP attempts. Please request a new OTP.', 429);
    }

    if (String(cachedOtp).trim() !== code) {
      const newRemaining = await decrementOwnerLoginAttempts(normalizedEmail);
      if (newRemaining <= 0) {
        await deleteCachedOwnerLoginOtp(normalizedEmail);
        return errorResponse('Too many failed OTP attempts. Please request a new OTP.', 429);
      }
      return errorResponse(`Invalid OTP. ${newRemaining} attempt(s) remaining.`, 401);
    }

    await deleteCachedOwnerLoginOtp(normalizedEmail);

    const user = await userService.getUserByEmail(normalizedEmail);
    if (!isOwnerRole(user)) {
      // Do not reveal whether the account exists or its role.
      return errorResponse('Invalid email or OTP', 401);
    }

    return successResponse(
      { userId: String(user.id), email: normalizedEmail },
      'Owner OTP verified successfully'
    );
  } catch (error) {
    console.error('Error in verifyOwnerLoginOtp:', error);
    return errorResponse('Internal server error while verifying OTP', 500);
  }
}
// Same shape as registration OTPs but under an isolated `pwdreset:` namespace
// so reset attempts never interfere with registration attempts.

// --- Password Reset OTP Cache Operations ---
// Same shape as registration OTPs but under an isolated `pwdreset:` namespace
// so reset attempts never interfere with registration attempts.

async function cacheResetOtp(email: string, otp: string): Promise<void> {
  const key = `pwdreset_otp:${email.toLowerCase()}`;
  await redisClient.hSet(key, 'otp', otp);
  await redisClient.hSet(key, 'attempts_remaining', String(OTP_MAX_VERIFY_ATTEMPTS));
  await redisClient.expire(key, OTP_TTL_SECONDS);
}

async function getCachedResetOtp(email: string): Promise<string | null> {
  const key = `pwdreset_otp:${email.toLowerCase()}`;
  return await redisClient.hGet(key, 'otp');
}

async function getResetRemainingAttempts(email: string): Promise<number> {
  const key = `pwdreset_otp:${email.toLowerCase()}`;
  const attempts = await redisClient.hGet(key, 'attempts_remaining');
  return attempts ? parseInt(attempts, 10) : 0;
}

async function decrementResetAttempts(email: string): Promise<number> {
  const key = `pwdreset_otp:${email.toLowerCase()}`;
  return await redisClient.hIncrBy(key, 'attempts_remaining', -1);
}

async function deleteCachedResetOtp(email: string): Promise<void> {
  const key = `pwdreset_otp:${email.toLowerCase()}`;
  await redisClient.del(key);
}

async function cacheResetToken(token: string, email: string): Promise<void> {
  const key = `pwdreset_token:${token}`;
  await redisClient.setEx(key, REGISTRATION_TOKEN_TTL_SECONDS, email.toLowerCase());
}

async function getCachedResetToken(token: string): Promise<string | null> {
  const key = `pwdreset_token:${token}`;
  return await redisClient.get(key);
}

async function deleteCachedResetToken(token: string): Promise<void> {
  const key = `pwdreset_token:${token}`;
  await redisClient.del(key);
}

/**
 * POST /api/auth/forgot-password
 * Validates email, requires an existing account, generates OTP, caches it,
 * sends the OTP email. Mirrors send-otp rate limiting under isolated keys.
 */
export async function requestPasswordReset(email: string, clientIp?: string): Promise<ServiceResponse> {
  try {
    if (!email || !isValidEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }

    const normalizedEmail = email.toLowerCase();

    // Account must exist for a reset (opposite of registration).
    const existingUser = await userService.checkUserExistsByEmail(normalizedEmail);
    if (!existingUser) {
      return errorResponse('No account found with this email', 404);
    }

    const normalizedIp = clientIp ? clientIp.replace(/^::ffff:/, '').trim() : undefined;
    const ipCooldownKey = normalizedIp && normalizedIp !== 'unknown' ? `pwdreset_cooldown_ip:${normalizedIp}` : null;
    const ipRateLimitKey = normalizedIp && normalizedIp !== 'unknown' ? `pwdreset_requests_ip:${normalizedIp}` : null;
    const ipRateLimitKey2hr = normalizedIp && normalizedIp !== 'unknown' ? `pwdreset_requests_ip_2hr:${normalizedIp}` : null;

    if (ipCooldownKey) {
      const ipCooldownExists = await redisClient.get(ipCooldownKey);
      if (ipCooldownExists) {
        return errorResponse(
          `Too many OTP requests from this network. Please wait ${IP_COOLDOWN_SECONDS} seconds before trying again.`,
          429
        );
      }
    }

    const cooldownKey = `pwdreset_cooldown:${normalizedEmail}`;
    const cooldownExists = await redisClient.get(cooldownKey);
    if (cooldownExists) {
      return errorResponse(
        `Please wait before requesting a new OTP. You can resend after ${OTP_RESEND_COOLDOWN_SECONDS} seconds.`,
        429
      );
    }

    if (ipRateLimitKey2hr) {
      const ipRequestCount2hr = await redisClient.incr(ipRateLimitKey2hr);
      if (ipRequestCount2hr === 1) {
        await redisClient.expire(ipRateLimitKey2hr, IP_REQUEST_WINDOW_2HR_SECONDS);
      }
      if (ipRequestCount2hr > IP_MAX_REQUESTS_2HR) {
        return errorResponse(
          `Too many OTP requests from this network. Maximum ${IP_MAX_REQUESTS_2HR} requests per 2 hours. Please try again later.`,
          429
        );
      }
    }

    if (ipRateLimitKey) {
      const ipRequestCount = await redisClient.incr(ipRateLimitKey);
      if (ipRequestCount === 1) {
        await redisClient.expire(ipRateLimitKey, IP_REQUEST_WINDOW_SECONDS);
      }
      if (ipRequestCount > IP_MAX_REQUESTS) {
        return errorResponse(
          `Too many OTP requests from this network. Maximum ${IP_MAX_REQUESTS} requests per 5 minutes. Please try again later.`,
          429
        );
      }
    }

    const rateLimitKey2hr = `pwdreset_requests_2hr:${normalizedEmail}`;
    const requestCount2hr = await redisClient.incr(rateLimitKey2hr);
    if (requestCount2hr === 1) {
      await redisClient.expire(rateLimitKey2hr, OTP_REQUEST_WINDOW_2HR_SECONDS);
    }
    if (requestCount2hr > OTP_MAX_REQUESTS_2HR) {
      return errorResponse(
        `You have reached the maximum of ${OTP_MAX_REQUESTS_2HR} OTP requests within 2 hours. Please try again later.`,
        429
      );
    }

    const rateLimitKey = `pwdreset_requests:${normalizedEmail}`;
    const requestCount = await redisClient.incr(rateLimitKey);
    if (requestCount === 1) {
      await redisClient.expire(rateLimitKey, OTP_REQUEST_WINDOW_SECONDS);
    }
    if (requestCount > OTP_MAX_REQUESTS) {
      return errorResponse(
        `You have reached the maximum of ${OTP_MAX_REQUESTS} OTP requests within 5 minutes. Please try again later.`,
        429
      );
    }

    const otp = generateSixDigitOtp();
    await cacheResetOtp(normalizedEmail, otp);
    await redisClient.setEx(cooldownKey, OTP_RESEND_COOLDOWN_SECONDS, '1');
    if (ipCooldownKey) {
      await redisClient.setEx(ipCooldownKey, IP_COOLDOWN_SECONDS, '1');
    }

    // Wait for provider acceptance before reporting success. This keeps
    // serverless runtimes from freezing the delivery promise mid-flight.
    try {
      await sendOtpEmail({ to: normalizedEmail, otp });
    } catch (emailError) {
      await deleteCachedResetOtp(normalizedEmail);
      await redisClient.del(cooldownKey);
      if (ipCooldownKey) await redisClient.del(ipCooldownKey);
      throw emailError;
    }

    return successResponse({ email: normalizedEmail }, 'Password reset OTP sent successfully');
  } catch (error) {
    console.error('Error in requestPasswordReset:', error);
    return errorResponse('Internal server error while sending OTP', 500);
  }
}

/**
 * POST /api/auth/verify-reset-otp
 * Validates OTP, returns a single-use reset token on success.
 * Rate-limited: max 3 failed attempts before the OTP is invalidated.
 */
export async function verifyResetOtp(email: string, otp: string): Promise<ServiceResponse> {
  try {
    if (!email || !isValidEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return errorResponse('Invalid OTP format', 400);
    }

    const normalizedEmail = email.toLowerCase();

    const cachedOtp = await getCachedResetOtp(normalizedEmail);
    if (!cachedOtp) {
      return errorResponse('OTP expired or never requested. Please request a new OTP.', 400);
    }

    const remaining = await getResetRemainingAttempts(normalizedEmail);
    if (remaining <= 0) {
      await deleteCachedResetOtp(normalizedEmail);
      return errorResponse(
        'Too many failed OTP attempts. Please request a new OTP.',
        429
      );
    }

    if (String(cachedOtp).trim() !== String(otp).trim()) {
      const newRemaining = await decrementResetAttempts(normalizedEmail);
      if (newRemaining <= 0) {
        await deleteCachedResetOtp(normalizedEmail);
        return errorResponse(
          'Too many failed OTP attempts. Please request a new OTP.',
          429
        );
      }
      return errorResponse(
        `Invalid OTP. ${newRemaining} attempt(s) remaining.`,
        401
      );
    }

    await deleteCachedResetOtp(normalizedEmail);

    const resetToken = uuidv4();
    await cacheResetToken(resetToken, normalizedEmail);

    return successResponse(
      { reset_token: resetToken, email: normalizedEmail },
      'OTP verified successfully'
    );
  } catch (error) {
    console.error('Error in verifyResetOtp:', error);
    return errorResponse('Internal server error while verifying OTP', 500);
  }
}

/**
 * POST /api/auth/reset-password
 * Resets the password with a validated reset token. Token is single-use.
 */
export async function resetPassword(email: string, newPassword: string, resetToken: string): Promise<ServiceResponse> {
  try {
    if (!email || !isValidEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }
    if (!newPassword || !isValidPassword(newPassword)) {
      return errorResponse(
        'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special character',
        400
      );
    }
    if (!resetToken) {
      return errorResponse('Reset token is required', 400);
    }

    const normalizedEmail = email.toLowerCase();

    const tokenEmail = await getCachedResetToken(resetToken);
    if (!tokenEmail) {
      return errorResponse('Reset token expired or invalid', 401);
    }
    if (tokenEmail !== normalizedEmail) {
      return errorResponse('Email mismatch: token does not match the provided email', 401);
    }

    const existingUser = await userService.checkUserExistsByEmail(normalizedEmail);
    if (!existingUser) {
      await deleteCachedResetToken(resetToken);
      return errorResponse('No account found with this email', 404);
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    const updated = await userService.updatePasswordByEmail(normalizedEmail, hashedPassword);
    if (!updated) {
      await deleteCachedResetToken(resetToken);
      return errorResponse('No account found with this email', 404);
    }

    await deleteCachedResetToken(resetToken);

    return successResponse(
      { email: normalizedEmail },
      'Password reset successfully'
    );
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return errorResponse('Internal server error during password reset', 500);
  }
}
