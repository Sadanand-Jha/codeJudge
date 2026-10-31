import type { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis.js";
import { SessionConfigurationError, verifySessionToken } from "../services/session.js";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies the session_token cookie, checks Redis blacklist, and attaches user to req
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.session_token || req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        statusCode: 401,
      });
      return;
    }

    // Check if token is blacklisted (logged out)
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
        statusCode: 401,
      });
      return;
    }

    // Verify JWT token (fail closed when JWT_SECRET is missing).
    const decoded = verifySessionToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof SessionConfigurationError) {
      console.error("Authentication is misconfigured:", error.message);
      res.status(500).json({
        success: false,
        message: "Authentication is temporarily unavailable",
        statusCode: 500,
      });
      return;
    }
    console.error("Authentication error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      statusCode: 401,
    });
  }
};