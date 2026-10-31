// OAuth login endpoints. The browser starts at the frontend origin
// (/api/auth/oauth/:provider/start), is redirected to Google, and comes
// back to the frontend origin so the session cookie is set first-party.
import crypto from "node:crypto";
import type { Request, Response } from "express";
import redisClient from "../config/redis.js";
import {
  OAUTH_STATE_TTL_SECONDS,
  OAuthFlowError,
  createAuthorizationRequest,
  exchangeAuthorizationCode,
  fetchOAuthProfile,
  getOAuthAppOrigin,
  getOAuthCallbackUrl,
  isOAuthProvider,
  isProviderConfigured,
} from "../services/oauth.js";
import { upsertOAuthUser } from "../services/oauthAccount.js";
import { safeNextPath, setSessionCookie, cookieSameSite } from "../services/session.js";
import type { OAuthErrorCode, OAuthProvider, OAuthStateRecord } from "../types/oauth.js";

const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

// ============================================================================
// PRODUCTION OAUTH CHECKLIST (fix these if "oAuth kaam nahi kar raha hai"):
// 1. NODE_ENV=production (or VERCEL=1)  -> cookies get secure: true
// 2. FRONTEND_URL / OAUTH_CALLBACK_BASE_URL = public HTTPS frontend origin,
//    NOT http://localhost:3000 (Google redirect_uri must match exactly).
// 3. Register this exact callback in the provider console:
//    https://<FRONTEND_URL>/api/auth/oauth/google/callback   (include www)
// 4. Frontend and backend are cross-origin? -> SESSION_COOKIE_SAME_SITE=none
//    (cookieSameSite() above). Same-origin /api rewrite -> keep "lax".
// 5. Redis must be reachable: OAuth state is stored in Redis; if Redis is down
//    the callback fails with "server_error" (logged).
// ============================================================================

const stateCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: cookieSameSite(),
  path: "/api/auth/oauth",
  maxAge: OAUTH_STATE_TTL_SECONDS * 1000,
};

function stateCookieName(provider: OAuthProvider): string {
  return `oauth_state_${provider}`;
}

function stateKey(provider: OAuthProvider, state: string): string {
  return `oauth:state:${provider}:${state}`;
}

function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function clearStateCookie(res: Response, provider: OAuthProvider): void {
  res.clearCookie(stateCookieName(provider), {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite(),
    path: "/api/auth/oauth",
  });
}

function redirectToLogin(
  res: Response,
  params: { oauth?: "success"; oauth_error?: OAuthErrorCode; next?: string | null },
): void {
  const url = new URL("/login", getOAuthAppOrigin());
  if (params.oauth) url.searchParams.set("oauth", params.oauth);
  if (params.oauth_error) url.searchParams.set("oauth_error", params.oauth_error);
  const next = safeNextPath(params.next);
  if (next) url.searchParams.set("next", next);
  noStore(res);
  res.redirect(302, url.toString());
}

function isSafeState(value: unknown): value is string {
  return typeof value === "string" && value.length >= 16 && value.length <= 512 && /^[A-Za-z0-9_-]+$/.test(value);
}

function isRecord(value: unknown): value is OAuthStateRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<OAuthStateRecord>;
  return (
    isOAuthProvider(record.provider) &&
    typeof record.codeVerifier === "string" &&
    record.codeVerifier.length >= 32 &&
    record.codeVerifier.length <= 512 &&
    (record.next === null || typeof record.next === "string") &&
    typeof record.createdAt === "number"
  );
}

function statesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * GET /api/auth/oauth/:provider/start?next=/quiz
 * Creates state + PKCE, stores them server-side, and redirects to the provider.
 */
export async function startOAuthController(req: Request, res: Response): Promise<void> {
  const providerParam = req.params.provider;
  if (!isOAuthProvider(providerParam)) {
    redirectToLogin(res, { oauth_error: "invalid_provider" });
    return;
  }

  const provider = providerParam;
  const next = safeNextPath(req.query.next);

  if (!isProviderConfigured(provider)) {
    redirectToLogin(res, { oauth_error: "provider_not_configured", next });
    return;
  }

  try {
    const { authorizationUrl, state, codeVerifier } = await createAuthorizationRequest(provider);
    const record: OAuthStateRecord = {
      provider,
      codeVerifier,
      next,
      createdAt: Date.now(),
    };

    await redisClient.setEx(stateKey(provider, state), OAUTH_STATE_TTL_SECONDS, JSON.stringify(record));

    res.cookie(stateCookieName(provider), state, stateCookieOptions);
    noStore(res);
    res.redirect(302, authorizationUrl.toString());
  } catch (error) {
    console.error(`[oauth:${provider}] start failed`, error instanceof Error ? error.message : error);
    const code = error instanceof OAuthFlowError ? error.code : "server_error";
    redirectToLogin(res, { oauth_error: code, next });
  }
}

/**
 * GET /api/auth/oauth/:provider/callback
 * Validates browser-bound state, exchanges the code, upserts the user, sets the
 * existing session_token cookie, and returns to the login page.
 */
export async function oauthCallbackController(req: Request, res: Response): Promise<void> {
  const providerParam = req.params.provider;
  if (!isOAuthProvider(providerParam)) {
    redirectToLogin(res, { oauth_error: "invalid_provider" });
    return;
  }

  const provider = providerParam;
  const queryState = req.query.state;
  const cookieState = req.cookies?.[stateCookieName(provider)];
  let next: string | null = null;

  noStore(res);

  if (!isSafeState(queryState) || typeof cookieState !== "string" || !statesMatch(queryState, cookieState)) {
    clearStateCookie(res, provider);
    redirectToLogin(res, { oauth_error: "invalid_state" });
    return;
  }

  // Consume the state exactly once. Deleting even on provider errors prevents
  // replay and makes accidental double-submits fail closed.
  let rawRecord: string | null = null;
  try {
    rawRecord = await redisClient.getDel(stateKey(provider, queryState));
  } catch (error) {
    console.error(`[oauth:${provider}] state store unavailable`, error instanceof Error ? error.message : error);
    clearStateCookie(res, provider);
    redirectToLogin(res, { oauth_error: "server_error" });
    return;
  }

  clearStateCookie(res, provider);

  if (!rawRecord) {
    redirectToLogin(res, { oauth_error: "invalid_state" });
    return;
  }

  let record: OAuthStateRecord;
  try {
    const parsed: unknown = JSON.parse(rawRecord);
    if (!isRecord(parsed) || parsed.provider !== provider) {
      redirectToLogin(res, { oauth_error: "invalid_state" });
      return;
    }
    if (Date.now() - parsed.createdAt > OAUTH_STATE_TTL_SECONDS * 1000) {
      redirectToLogin(res, { oauth_error: "invalid_state" });
      return;
    }
    record = parsed;
  } catch {
    redirectToLogin(res, { oauth_error: "invalid_state" });
    return;
  }

  next = safeNextPath(record.next);

  const providerError = typeof req.query.error === "string" ? req.query.error : null;
  if (providerError) {
    redirectToLogin(res, {
      oauth_error: providerError === "access_denied" ? "access_denied" : "provider_error",
      next,
    });
    return;
  }

  const code = req.query.code;
  if (typeof code !== "string" || !code || code.length > 4096) {
    redirectToLogin(res, { oauth_error: "provider_error", next });
    return;
  }

  try {
    // authorizationCodeGrant derives redirect_uri from this URL and validates
    // the state again against expectedState.
    const callbackUrl = new URL(getOAuthCallbackUrl(provider));
    callbackUrl.search = new URL(req.originalUrl, "http://localhost").search;

    const accessToken = await exchangeAuthorizationCode(
      provider,
      callbackUrl,
      record.codeVerifier,
      queryState,
    );
    const profile = await fetchOAuthProfile(provider, accessToken);
    const user = await upsertOAuthUser(profile);

    try {
      setSessionCookie(res, user.id, user.email);
    } catch (sessionError) {
      console.error(
        `[oauth:${provider}] session_failed`,
        sessionError instanceof Error ? sessionError.message : sessionError,
      );
      redirectToLogin(res, { oauth_error: "session_failed", next });
      return;
    }

    redirectToLogin(res, { oauth: "success", next });
  } catch (error) {
    if (error instanceof OAuthFlowError) {
      console.error(`[oauth:${provider}] ${error.code}`, error.message);
      redirectToLogin(res, { oauth_error: error.code, next });
      return;
    }

    console.error(`[oauth:${provider}] callback failed`, error instanceof Error ? error.message : error);
    redirectToLogin(res, { oauth_error: "account_error", next });
  }
}
