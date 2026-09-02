// Authentication controller. Handles OTP sending/verification, user registration,
// login (JWT + Redis session), logout, the /me endpoint, and username availability.
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import redisClient from "../config/redis.js";
import { sendOtp, verifyOtp, register } from "../services/auth.js";
import { UserService } from "../services/database/user.database.js";
import { userRepository } from "../repositories/user.repository.js";
import { authenticate } from "../middleware/auth.js";

const userService = new UserService();
const userRepo = new userRepository();

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

    const trimmed = username.trim();

    if (trimmed.length < 3 || trimmed.length > 20) {
      res.status(400).json({
        success: false,
        available: false,
        message: "Username must be 3-20 characters",
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      res.status(400).json({
        success: false,
        available: false,
        message: "Username can only contain letters, numbers, and underscores",
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

    const result = await sendOtp(email);

    if (!result.success) {
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
    const { email, password, registration_token, username } = req.body;

    if (!email || !password || !registration_token || !username) {
      res.status(400).json({
        success: false,
        message: "Email, password, username, and registration_token are required",
        statusCode: 400,
      });
      return;
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      res.status(400).json({
        success: false,
        message: "Username must be 3-20 characters",
        statusCode: 400,
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      res.status(400).json({
        success: false,
        message: "Username can only contain letters, numbers, and underscores",
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

    const result = await register(email, password, registration_token, trimmedUsername);

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
 * POST /api/auth/login
 * Body: { "email": "user@example.com", "password": "SecurePassword123" }
 * Sets session_token cookie on success
 */
export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
        statusCode: 400,
      });
      return;
    }

    const normalizedEmail = email.toLowerCase();

    // Get user by email
    const user = await userService.getUserByEmail(normalizedEmail);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
        statusCode: 401,
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
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
        email: normalizedEmail
      },
      jwtSecret,
      signOptions
    );

    console.log(sessionToken);

    // Set httpOnly, secure, sameSite: 'lax' cookie
    res.cookie("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
    });

    // Return the full merged profile so the frontend can persist it in zustand
    // and render it on every page without a follow-up /auth/me call.
    const mergedData = await buildUserProfile(String(user.id));

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: mergedData,
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
 * Build the comprehensive user object (profile + info merged) for a user id.
 * Shared by /auth/login and /auth/me so both return the same shape.
 */
const buildUserProfile = async (userId: string) => {
  // Fetch both profile and info data in parallel
  // userInfo now includes the avatar column from the users table
  const [userProfile, userInfo] = await Promise.all([
    userService.getUserProfileById(userId),
    userRepo.getUserInfo(userId)
  ]);

  if (!userProfile && !userInfo) {
    return null;
  }

  // Merge the data from both sources
  return {
    // From profile
    id: userProfile?.id || userInfo?.id,
    username: userProfile?.username || userInfo?.username,
    email: userProfile?.email || userInfo?.email,
    role: userProfile?.role_name || userInfo?.role_name || null,
    createdAt: userProfile?.createdat || userInfo?.created_at,
    updatedAt: userProfile?.updatedat || userInfo?.updated_at,

    // Additional fields from info
    firstName: userInfo?.first_name || null,
    lastName: userInfo?.last_name || null,
    displayName: userProfile?.display_name || userInfo?.display_name || null,
    mobile: userInfo?.mobile || null,
    avatarUrl: userProfile?.avatar_url || userInfo?.avatar_url || null,
    avatarIsMale: userProfile?.avatar_is_male ?? userInfo?.avatar_is_male ?? null,
    bio: userInfo?.bio || null,
    country: userInfo?.country || null,
    state: userInfo?.state || null,
    college: userInfo?.college || null,
    company: userInfo?.company || null,
    rating: userInfo?.rating || 0,
    maxRating: userInfo?.max_rating || 0,
    isVerified: userInfo?.is_verified || false,
    isActive: userInfo?.is_active ?? userProfile?.isactive ?? true,
    lastLogin: userInfo?.last_login || null,

    // Preferences from info
    preferences: userInfo?.preferences || {
      theme: "system",
      accentColor: "blue",
      compactMode: false,
      animationSpeed: "normal",
      preferredLanguage: "cpp",
      editorTheme: "one-dark",
      editorFontSize: 14,
      tabWidth: 4,
      wordWrap: false,
      autoSave: true,
      vimMode: false,
      emacsMode: false,
    },
  };
};

/**
 * POST /api/auth/me
 * Body: { "session_token": "<jwt>" }
 * Returns comprehensive user information merging profile and info data
 */
export const meController = async (req: Request, res: Response) => {
  try {
    const session_token = req.cookies?.session_token || req.body.session_token;

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
    const { session_token } = req.body;

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
    const token = req.cookies?.session_token;

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

    // Clear the httpOnly cookie by setting it to expire immediately
    res.clearCookie("session_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

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
