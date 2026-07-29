import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import redisClient from "../config/redis.js";
import { sendOtp, verifyOtp, register } from "../services/auth.js";
import { UserService } from "../services/database/user.database.js";
import { authenticate } from "../middleware/auth.js";

const userService = new UserService();

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
    const { email, password, registration_token } = req.body;

    if (!email || !password || !registration_token) {
      res.status(400).json({
        success: false,
        message: "Email, password, and registration_token are required",
        statusCode: 400,
      });
      return;
    }

    const result = await register(email, password, registration_token);

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
    const jwtExpiry = process.env.JWT_EXPIRY || "7d";
    const signOptions: SignOptions = { expiresIn: jwtExpiry as SignOptions['expiresIn'] };
    const sessionToken = jwt.sign(
      {
        userId: String(user.id),
        adminId: user.adminid,
        email: normalizedEmail
      },
      jwtSecret,
      signOptions
    );

    console.log(sessionToken);

    // Set httpOnly, secure, sameSite: 'strict' cookie
    res.cookie("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          adminId: user.adminid,
          email: normalizedEmail,
        },
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
 * POST /api/auth/me
 * Body: { "session_token": "<jwt>" }
 * Verifies the session_token and returns the user's identity
 */
export const meController = async (req: Request, res: Response) => {
  try {
    const { session_token } = req.body;

    if (!session_token) {
      res.status(400).json({
        success: false,
        message: "session_token is required",
        statusCode: 400,
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
      adminId: string;
      email: string;
    };

    // Fetch user by email to get username
    const user = await userService.getUserByEmail(decoded.email);

    if (!user) {
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
        user: {
          id: decoded.userId,
          adminId: decoded.adminId,
          email: decoded.email,
          username: user.Username,
        },
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
      res.status(400).json({
        success: false,
        message: "session_token is required",
        statusCode: 400,
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
      adminId: string;
      email: string;
    };

    // Return user identity from token
    res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: {
        userId: decoded.userId,
        adminId: decoded.adminId,
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
