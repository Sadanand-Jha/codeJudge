// Authentication controller. Handles OTP sending/verification, user registration,
// login (JWT + Redis session), logout, the /me endpoint, and username availability.
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import redisClient from "../config/redis.js";
import { sendOtp, verifyOtp, register, requestPasswordReset, verifyResetOtp, resetPassword, requestOwnerLoginOtp, verifyOwnerLoginOtp } from "../services/auth.js";
import { UserService } from "../services/database/user.database.js";
import { userRepository } from "../repositories/user.repository.js";
import { authenticate } from "../middleware/auth.js";
import { getClientIp } from "../utils/getClientIp.js";
import { PLATFORM_COOKIE, isPlatformAuthConfigured, mintPlatformToken, platformCookieMaxAgeMs, revokePlatformToken } from "../services/platformSession.js";
import { isDatabaseUnavailableError } from "../utils/databaseError.ts";

const userService = new UserService();
const userRepo = new userRepository();

// Vercel par hain YA NODE_ENV production hai -> secure: true ho jayega
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // Local host pe FALSE, Vercel pe automatic TRUE
  sameSite: "lax" as const,
  path: "/",
};

/**
 * GET /api/auth/check-username?username=xxx
 * Returns whether the username is available
 */
export const checkUsernameController = async (req: Request, res: Response) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== "string") {
      res.status(400).json({
        success: false,
        available: false,
        message: "Username is required",
      });
      return;
    }

    const trimmed = username.trim().toLowerCase();

    if (trimmed.length < 3 || trimmed.length > 20) {
      res.status(400).json({
        success: false,
        available: false,
        message: "Username must be 3-20 characters",
      });
      return;
    }

    if (!/^[a-z0-9]+$/.test(trimmed)) {
      res.status(400).json({
        success: false,
        available: false,
        message: "Username can only contain lowercase letters and numbers",
      });
      return;
    }

    const exists = await userService.checkUsernameExists(trimmed);

    res.status(200).json({
      success: true,
      available: !exists,
      message: exists ? "Username is already taken" : "Username is available",
    });
  } catch (error: any) {
    console.error("Error in checkUsernameController:", error);
    res.status(500).json({
      success: false,
      available: false,
      message: "Internal server error while checking username",
    });
  }
};

// ============================================
// Auth Controllers
// ============================================

/**
 * POST /api/auth/send-otp
 * Body: { "email": "user@example.com" }
 */
export const sendOtpController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
        statusCode: 400,
      });
      return;
    }

    const clientIp = getClientIp(req);
    const result = await sendOtp(email, clientIp);

    if (!result.success) {
      if (result.statusCode === 429) {
        res.setHeader("Retry-After", "60");
      }
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in sendOtpController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while sending OTP",
      statusCode: 500,
    });
  }
};

/**
 * POST /api/auth/verify-otp
 * Body: { "email": "user@example.com", "otp": "123456" }
 */
export const verifyOtpController = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required",
        statusCode: 400,
      });
      return;
    }

    const result = await verifyOtp(email, otp);

    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in verifyOtpController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while verifying OTP",
      statusCode: 500,
    });
  }
};

/**
 * POST /api/auth/register
 * Body: { "email": "user@example.com", "password": "SecurePassword123", "registration_token": "..." }
 * Sets httpOnly, secure, sameSite: 'strict' cookie named session_token on success
 */
export const registerController = async (req: Request, res: Response) => {
  try {
    const { email, password, registration_token, username, avatar_url } = req.body;

    if (!email || !password || !registration_token || !username || !avatar_url) {
      res.status(400).json({
        success: false,
        message: "Email, password, username, avatar, and registration_token are required",
        statusCode: 400,
      });
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      res.status(400).json({
        success: false,
        message: "Username must be 3-20 characters",
        statusCode: 400,
      });
      return;
    }

    if (!/^[a-z0-9]+$/.test(trimmedUsername)) {
      res.status(400).json({
        success: false,
        message: "Username can only contain lowercase letters and numbers",
        statusCode: 400,
      });
      return;
    }

    const usernameTaken = await userService.checkUsernameExists(trimmedUsername);
    if (usernameTaken) {
      res.status(400).json({
        success: false,
        message: "Username is already taken",
        statusCode: 400,
      });
      return;
    }

    const result = await register(email, password, registration_token, trimmedUsername, avatar_url);

    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    // Registration successful — do NOT set session_token cookie
    // User must log in separately with email and password
    const { session_token, ...responseData } = result.data;

    res.status(201).json({
      success: true,
      message: result.message,
      data: responseData,
    });
  } catch (error: any) {
    console.error("Error in registerController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during registration",
      statusCode: 500,
    });
  }
};

/**
 * POST /api/auth/forgot-password
 * Body: { "email": "user@example.com" }
 */
export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
        statusCode: 400,
      });
      return;
    }

    const clientIp = getClientIp(req);
    const result = await requestPasswordReset(email, clientIp);

    if (!result.success) {
      if (result.statusCode === 429) {
        res.setHeader("Retry-After", "60");
      }
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in forgotPasswordController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while sending OTP",
      statusCode: 500,
    });
  }
};

/**
 * POST /api/auth/verify-reset-otp
 * Body: { "email": "user@example.com", "otp": "123456" }
 */
export const verifyResetOtpController = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required",
        statusCode: 400,
      });
      return;
    }

    const result = await verifyResetOtp(email, otp);

    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in verifyResetOtpController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while verifying OTP",
      statusCode: 500,
    });
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { "email": "user@example.com", "password": "NewSecurePassword123", "reset_token": "..." }
 */
export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { email, password, reset_token } = req.body;

    if (!email || !password || !reset_token) {
      res.status(400).json({
        success: false,
        message: "Email, password, and reset_token are required",
        statusCode: 400,
      });
      return;
    }

    const result = await resetPassword(email, password, reset_token);

    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in resetPasswordController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during password reset",
      statusCode: 500,
    });
  }
};

/**
 * POST /api/auth/login
 * Body: { "identifier": "user@example.com or username", "password": "SecurePassword123" }
 * Sets session_token cookie on success
 */
export const loginController = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({
        success: false,
        message: "Email or username and password are required",
        statusCode: 400,
      });
      return;
    }

    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = await userService.getUserByIdentifier(normalizedIdentifier);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email/username or password",
        statusCode: 401,
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email/username or password",
        statusCode: 401,
      });
      return;
    }

    // Generate JWT session token
    const jwtSecret = process.env.JWT_SECRET || "your-fallback-secret-key-change-in-production";
    const jwtExpiry = process.env.JWT_EXPIRY || "10d";
    const signOptions: SignOptions = { expiresIn: jwtExpiry as SignOptions['expiresIn'] };
    const sessionToken = jwt.sign(
      {
        userId: String(user.id),
        email: user.email
      },
      jwtSecret,
      signOptions
    );

    // 1. LOGIN TIME
    res.cookie("session_token", sessionToken, {
      ...cookieOptions,
      maxAge: 10 * 24 * 60 * 60 * 1000,
    });

    // Record login time for activity analytics (best-effort, never fails login)
    try {
      await userRepo.updateLastLogin(String(user.id));
    } catch {
      // ignore
    }

    // Return the full merged profile so the frontend can persist it in zustand
    // and render it on every page without a follow-up /auth/me call.
    // Also return token as fallback for Authorization header when cookies are
    // not sent (e.g. direct cross-origin call without proxy).
    const mergedData = await buildUserProfile(String(user.id));

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: mergedData,
        token: sessionToken,
      },
    });
  } catch (error: any) {
    console.error("Error in loginController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during login",
      statusCode: 500,
    });
  }
};

/**
 * POST /api/auth/owner/send-otp
 * Body: { "email": "owner@example.com" }
 * Sends a one-time login code only to role_id = 2 (owner/admin) accounts.
 * Always responds generically so owner emails cannot be enumerated.
 * This is the ONLY login path for the private /platform control center —
 * password login is never accepted there (see requireOwner + frontend gate).
 */
export const ownerSendOtpController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
        statusCode: 400,
      });
      return;
    }

    // Do not send a code that the server cannot exchange for a platform
    // session. This also gives operators an immediate configuration signal.
    if (!isPlatformAuthConfigured()) {
      res.status(503).json({
        success: false,
        message: "Platform authentication is not configured",
        statusCode: 503,
      });
      return;
    }

    const clientIp = getClientIp(req);
    const result = await requestOwnerLoginOtp(email, clientIp);

    if (!result.success) {
      if (result.statusCode === 429) {
        res.setHeader("Retry-After", "60");
      }
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in ownerSendOtpController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while sending OTP",
      statusCode: 500,
    });
  }
};

/**
 * POST /api/auth/owner/verify-otp
 * Body: { "email": "owner@example.com", "otp": "123456" }
 * Redeems the owner login OTP and mints a DEDICATED platform token
 * (platform_session cookie + JWT scoped to "platform", signed with
 * the isolated platform signing key). No regular user session is created —
 * password-login sessions can never access /platform. Rejects non-owner
 * accounts even with a valid OTP.
 */
export const ownerVerifyOtpController = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required",
        statusCode: 400,
      });
      return;
    }

    // Fail before redeeming the single-use OTP. Previously an unconfigured
    // signing secret was detected only after verifyOwnerLoginOtp had deleted
    // the valid code, forcing the owner to request another OTP.
    if (!isPlatformAuthConfigured()) {
      res.status(503).json({
        success: false,
        message: "Platform authentication is not configured",
        statusCode: 503,
      });
      return;
    }

    const result = await verifyOwnerLoginOtp(email, otp);

    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    const ownerId = String(result.data.userId);
    const normalizedEmail = String(result.data.email);

    const platformToken = mintPlatformToken(ownerId, normalizedEmail);
    if (!platformToken) {
      res.status(503).json({
        success: false,
        message: "Platform authentication is not configured",
        statusCode: 503,
      });
      return;
    }

    res.cookie(PLATFORM_COOKIE, platformToken, {
      ...cookieOptions,
      maxAge: platformCookieMaxAgeMs(),
    });

    try {
      await userRepo.updateLastLogin(ownerId);
    } catch {
      // ignore
    }

    const mergedData = await buildUserProfile(ownerId);

    res.status(200).json({
      success: true,
      message: "Owner login successful",
      data: {
        user: mergedData,
      },
    });
  } catch (error: any) {
    console.error("Error in ownerVerifyOtpController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during owner login",
      statusCode: 500,
    });
  }
};

/**
 * POST /api/auth/owner/logout
 * Revokes the platform token (Redis blacklist) and clears the
 * platform_session cookie. Regular user sessions are untouched.
 */
export const ownerLogoutController = async (req: Request, res: Response) => {
  try {
    const token =
      req.cookies?.[PLATFORM_COOKIE] || req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (token) {
      await revokePlatformToken(token);
    }
    res.clearCookie(PLATFORM_COOKIE, cookieOptions);
    res.status(200).json({ success: true, message: "Platform session revoked" });
  } catch (error: any) {
    console.error("Error in ownerLogoutController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during platform logout",
      statusCode: 500,
    });
  }
};

/**
 * Build the comprehensive user object (profile + info merged) for a user id.
 * Shared by /auth/login and /auth/me so both return the same shape.
 */
const buildUserProfile = async (userId: string) => {
  // getUserInfo already returns the complete normalized profile (identity,
  // role, avatar, location and preferences). The old Promise.all issued a
  // second redundant query on every login and /auth/me request, doubling
  // connection pressure during page hydration.
  return userRepo.getUserInfo(userId);
};

/**
 * POST /api/auth/me
 * Body: { "session_token": "<jwt>" }
 * Returns comprehensive user information merging profile and info data
 */
export const meController = async (req: Request, res: Response) => {
  try {
    const session_token =
      req.cookies?.session_token ||
      req.body.session_token ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!session_token) {
      res.status(200).json({
        success: false,
        message: "Session ended",
        statusCode: 200,
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${session_token}`);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
        statusCode: 401,
      });
      return;
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || "your-fallback-secret-key-change-in-production";
    const decoded = jwt.verify(session_token, jwtSecret) as {
      userId: string;
      email: string;
    };

    const mergedData = await buildUserProfile(decoded.userId);

    if (!mergedData) {
      res.status(401).json({
        success: false,
        message: "User not found",
        statusCode: 401,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Authenticated",
      data: {
        user: mergedData,
      },
    });
  } catch (error: any) {
    console.error("Error in meController:", error);
    if (isDatabaseUnavailableError(error)) {
      res.status(503).json({
        success: false,
        message: "Authentication service is temporarily busy. Please retry.",
        statusCode: 503,
      });
      return;
    }
    res.status(401).json({
      success: false,
      message: "Invalid or expired session_token",
      statusCode: 401,
    });
  }
};

/**
 * POST /api/auth/profile
 * Body: { "session_token": "<jwt>" }
 * Verifies the session_token and returns the user's identity
 */
export const getProfileController = async (req: Request, res: Response) => {
  try {
    const session_token =
      req.body.session_token ||
      req.cookies?.session_token ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!session_token) {
      res.status(200).json({
        success: false,
        message: "Session ended",
        statusCode: 200,
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${session_token}`);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
        statusCode: 401,
      });
      return;
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || "your-fallback-secret-key-change-in-production";
    const decoded = jwt.verify(session_token, jwtSecret) as {
      userId: string;
      email: string;
    };

    // Return user identity from token
    res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: {
        userId: decoded.userId,
        email: decoded.email,
      },
    });
  } catch (error: any) {
    console.error("Error in getProfileController:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired session_token",
      statusCode: 401,
    });
  }
};

/**
 * POST /api/auth/logout
 * Clears the session_token cookie and revokes the JWT token by blacklisting it in Redis
 */
export const logoutController = async (req: Request, res: Response) => {
  try {
    const token =
      req.cookies?.session_token ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
      req.body?.session_token;

    if (token) {
      try {
        // Decode token to get expiry (without verifying, just to determine TTL)
        const decoded: any = jwt.decode(token);
        if (decoded && decoded.exp) {
          const now = Math.floor(Date.now() / 1000);
          const ttl = decoded.exp - now;

          // Blacklist the token in Redis for the remaining TTL
          if (ttl > 0) {
            await redisClient.setEx(`blacklist:${token}`, ttl, "revoked");
          }
        }
      } catch (err) {
        // If we can't decode the token, just proceed with clearing the cookie
        console.error("Failed to decode token for blacklisting:", err);
      }
    }

    // 2. LOGOUT TIME (Must match cookieOptions exactly)
    res.clearCookie("session_token", cookieOptions);

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error: any) {
    console.error("Error in logoutController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during logout",
      statusCode: 500,
    });
  }
};
