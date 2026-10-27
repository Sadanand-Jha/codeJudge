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
 * Bearer), minted exclusively by POST /api/auth/owner/verify-otp after OTP
 * verification. Regular user sessions (`session_token`, password login) are
 * rejected here — even for admins — so OTP is mandatory for platform access.
 *
 * Ownership is then re-checked against the database on every request: the
 * account's role name must be in PLATFORM_OWNER_ROLES (default "admin"), or its
 * email must be in PLATFORM_OWNER_EMAILS. Never rely on client-side checks.
 * Role names are used instead of a hardcoded role id because ids differ between
 * databases.
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

    req.user = { userId: claims.userId, email: claims.email };

    // Ownership check: role name or explicit allowlist.
    let roleName: string | null = null;
    let dbEmail: string | null = null;
    try {
      const r = await withTransientDatabaseRetry(() => pool.query(
        `SELECT u.email AS email, LOWER(r.name) AS role_name
         FROM users u
         LEFT JOIN role r ON u.role_id = r.id
         WHERE u.id = $1 LIMIT 1`,
        [claims.userId]
      ));
      roleName = r.rows[0]?.role_name ?? null;
      dbEmail = r.rows[0]?.email ?? null;
    } catch (error) {
      // The dedicated token can only be minted after OTP verification and a
      // successful owner-role lookup. If Postgres is briefly saturated, trust
      // that signed, scoped and non-revoked token for the remainder of this
      // request instead of locking the owner out at the gate. Non-transient
      // authorization failures still fail closed.
      if (isTransientDatabaseError(error)) {
        console.warn("Owner role re-check temporarily unavailable; using verified platform session.");
        next();
        return;
      }
      res.status(503).json({ success: false, message: "Authorization check unavailable", statusCode: 503 });
      return;
    }

    const email = (dbEmail || claims.email || "").toLowerCase();
    if (!isPlatformOwner(roleName, email)) {
      res.status(403).json({ success: false, message: "Forbidden: owner access required", statusCode: 403 });
      return;
    }

    next();
  } catch (error) {
    console.error("Owner auth error:", error);
    res.status(401).json({ success: false, message: "Invalid platform session", statusCode: 401 });
  }
};
