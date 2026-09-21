import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import redisClient from "../config/redis.js";

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
    console.log("[AUTH] cookies:", Object.keys(req.cookies || {}));
    console.log("[AUTH] token present:", !!token);
    console.log("[AUTH] path:", req.method, req.originalUrl);

    if (!token) {
      console.log("[AUTH] NO TOKEN FOUND — 401");
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

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || "your-fallback-secret-key-change-in-production";
    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      email: string;
    };

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      statusCode: 401,
    });
  }
};