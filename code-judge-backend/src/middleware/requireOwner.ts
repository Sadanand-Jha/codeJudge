import type { Request, Response, NextFunction } from "express";
import { pool, isTransientDatabaseError, withTransientDatabaseRetry } from "../config/database.js";
import {
  PLATFORM_COOKIE,
  isPlatformOwner,
  isPlatformTokenRevoked,
  verifyPlatformToken,
} from "../services/platformSession.js";

/**
 * Owner-only guard for the private /platform control center.
 *
 * Accepts ONLY the dedicated platform token (`platform_session` cookie or
 * Bearer), minted exclusively by POST /api/auth/owner/verify-otp after the
 * configured owner's password + OTP have both been verified. Regular user
 * sessions (`session_token`, password login) are rejected here — even for admins — so
 * the platform gate cannot be opened by a password or OTP alone.
 *
 * Ownership is then re-checked against the database on every request:
 * only the configured owner email is authorized, regardless of role.
 * Never rely on client-side checks alone.
 */

export const requireOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader("Cache-Control", "no-store, private");

    const token =
      req.cookies?.[PLATFORM_COOKIE] || req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      res.status(401).json({ success: false, message: "Platform authentication required", statusCode: 401 });
      return;
    }

    if (await isPlatformTokenRevoked(token)) {
      res.status(401).json({ success: false, message: "Platform session expired. Please sign in again.", statusCode: 401 });
      return;
    }

    const claims = verifyPlatformToken(token);
    if (!claims) {
      // Covers: wrong secret, expired, tampered, missing scope, regular
      // session_token presented here, and unconfigured platform secret.
      res.status(401).json({ success: false, message: "Invalid platform session", statusCode: 401 });
      return;
    }

    if (!isPlatformOwner(claims.email)) {
      res.status(403).json({ success: false, message: "Forbidden: owner access required", statusCode: 403 });
      return;
    }

    req.user = { userId: claims.userId, email: claims.email };

    let dbEmail: string | null = null;
    try {
      const r = await withTransientDatabaseRetry(() => pool.query(
        `SELECT u.email AS email
         FROM users u WHERE u.id = $1 LIMIT 1`,
        [claims.userId]
      ));
      dbEmail = r.rows[0]?.email ?? null;
    } catch (error) {
      // The token email is already restricted to the configured owner. During
      // a transient database outage, keep that verified owner session usable.
      if (isTransientDatabaseError(error)) {
        console.warn("Owner email re-check temporarily unavailable; using verified platform session.");
        next();
        return;
      }
      res.status(503).json({ success: false, message: "Authorization check unavailable", statusCode: 503 });
      return;
    }

    if (!isPlatformOwner(dbEmail)) {
      res.status(403).json({ success: false, message: "Forbidden: owner access required", statusCode: 403 });
      return;
    }

    next();
  } catch (error) {
    console.error("Owner auth error:", error);
    res.status(401).json({ success: false, message: "Invalid platform session", statusCode: 401 });
  }
};
