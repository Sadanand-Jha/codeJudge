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

const OTP_TTL_SECONDS = 5 * 60; // 5 minutes — OTP validity
const OTP_RESEND_COOLDOWN_SECONDS = 60; // 60 seconds — resend cooldown (must match frontend countdown)
const REGISTRATION_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const OTP_MAX_REQUESTS = 2; // Max OTP requests per email per 5-min window
const OTP_REQUEST_WINDOW_SECONDS = 2 * 60; // 2-minute window for rate limiting
const OTP_MAX_REQUESTS_2HR = 3; // Max OTP requests per email per 2 hours
const OTP_REQUEST_WINDOW_2HR_SECONDS = 2 * 60 * 60; // 2-hour window for rate limiting
const OTP_MAX_VERIFY_ATTEMPTS = 3; // Max OTP verification attempts before lockout
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

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
 * Rate-limited: max 2 requests per 5 minutes per email, 3 per 2 hours
 * Resend cooldown: 60s (synced with frontend countdown) — enforced via otp_cooldown:<email>
 * OTP validity: 5 minutes (OTP_TTL_SECONDS) — allows resending after cooldown by overwriting
 */
export async function sendOtp(email: string): Promise<ServiceResponse> {
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

    // 3. Check resend cooldown (60s) — must match frontend countdown
    const cooldownKey = `otp_cooldown:${normalizedEmail}`;
    const cooldownExists = await redisClient.get(cooldownKey);
    if (cooldownExists) {
      return errorResponse(
        `Please wait before requesting a new OTP. You can resend after ${OTP_RESEND_COOLDOWN_SECONDS} seconds.`,
        429
      );
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

    // 9. Send email asynchronously (non-blocking)
    sendOtpEmail(normalizedEmail, otp).catch((err: any) => {
      console.error('Failed to send OTP email:', err);
    });

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
export async function register(email: string, password: string, registrationToken: string, username?: string): Promise<ServiceResponse> {
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
    const createdUser = await userService.createUser(normalizedEmail, hashedPassword, username);

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
