import type { NextFunction, Request, Response } from "express";
import { pool } from "../config/database.ts";

/**
 * AI usage is an account-level entitlement. This check runs after
 * authentication and queries the current database value on every request, so
 * disabling a user takes effect immediately even when they hold a valid JWT.
 */
export const requireActiveAiUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT isactive FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );
    if (result.rows[0]?.isactive !== true) {
      res.status(403).json({ success: false, message: "AI tools are available only to active accounts." });
      return;
    }
    next();
  } catch (error) {
    console.error("AI account access check failed:", error);
    res.status(503).json({ success: false, message: "AI access could not be verified. Please try again." });
  }
};
