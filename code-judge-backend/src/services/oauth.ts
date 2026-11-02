// OAuth 2.0 / OpenID Connect protocol plumbing. We use openid-client (built on
// oauth4webapi) instead of hand-writing the token exchange: it creates the
// PKCE S256 challenge, builds authorization URLs, validates state, sends the
// code exchange, and validates provider responses.
import * as oidc from "openid-client";
import type { OAuthProfile, OAuthProvider } from "../types/oauth.ts";

const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const PROVIDER_TIMEOUT_MS = 8_000;

export class OAuthFlowError extends Error {
  constructor(
    public readonly code:
      | "access_denied"
      | "provider_error"
      | "provider_not_configured"
      | "provider_unavailable"
      | "token_exchange_failed"
      | "profile_fetch_failed"
      | "email_unavailable"
      | "email_not_verified",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "OAuthFlowError";
  }
}

interface ProviderSettings {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  configured: boolean;
}

// Static metadata avoids a discovery request on every login and keeps the
// provider console URLs explicit. These endpoints are stable public APIs.
const GOOGLE_SERVER: oidc.ServerMetadata = {
  issuer: "https://accounts.google.com",
  authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  token_endpoint: "https://oauth2.googleapis.com/token",
  userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
  jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code"],
  token_endpoint_auth_methods_supported: ["client_secret_post"],
  code_challenge_methods_supported: ["S256"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["RS256"],
};

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return value === "google";
}

function firstOrigin(value: string | undefined): string {
  return (value || "http://localhost:3000")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)[0]
    .replace(/\/+$/, "");
}

/** Public frontend origin. OAuth must land on this origin, not the API host. */
export function getOAuthAppOrigin(): string {
  return firstOrigin(process.env.OAUTH_CALLBACK_BASE_URL || process.env.FRONTEND_URL);
}

export function getOAuthCallbackUrl(provider: OAuthProvider): string {
  return `${getOAuthAppOrigin()}/api/auth/oauth/${provider}/callback`;
}

function getProviderSettings(provider: OAuthProvider): ProviderSettings {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";

  return {
    provider,
    clientId,
    clientSecret,
    redirectUri: getOAuthCallbackUrl(provider),
    configured: Boolean(clientId && clientSecret),
  };
}

function getConfiguration(settings: ProviderSettings): oidc.Configuration {
  return new oidc.Configuration(
    GOOGLE_SERVER,
    settings.clientId,
    {
      client_secret: settings.clientSecret,
      redirect_uris: [settings.redirectUri],
    },
    oidc.ClientSecretPost(settings.clientSecret),
  );
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  const settings = getProviderSettings(provider);
  return settings.configured;
}

/** Generate state + PKCE and return the provider authorization URL. */
export async function createAuthorizationRequest(provider: OAuthProvider): Promise<{
  authorizationUrl: URL;
  state: string;
  codeVerifier: string;
}> {
  const settings = getProviderSettings(provider);
  if (!settings.configured) {
    throw new OAuthFlowError("provider_not_configured", `${provider} OAuth is not configured`);
  }

  const config = getConfiguration(settings);
  const state = oidc.randomState();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const authorizationUrl = oidc.buildAuthorizationUrl(config, {
    redirect_uri: settings.redirectUri,
    scope: provider === "google" ? "openid email profile" : "read:user user:email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...(provider === "google" ? { prompt: "select_account" } : {}),
  });

  return { authorizationUrl, state, codeVerifier };
}

/**
 * Exchange an authorization code for an access token. openid-client validates
 * the state, PKCE, redirect_uri, issuer metadata, and token response.
 */
export async function exchangeAuthorizationCode(
  provider: OAuthProvider,
  callbackUrl: URL,
  codeVerifier: string,
  expectedState: string,
): Promise<string> {
  const settings = getProviderSettings(provider);
  if (!settings.configured) {
    throw new OAuthFlowError("provider_not_configured", `${provider} OAuth is not configured`);
  }

  try {
    const config = getConfiguration(settings);
    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState,
    });
    if (!tokens.access_token) {
      throw new OAuthFlowError("token_exchange_failed", "Provider returned no access token");
    }
    return tokens.access_token;
  } catch (error) {
    if (error instanceof OAuthFlowError) throw error;
    if (error instanceof oidc.AuthorizationResponseError) {
      throw new OAuthFlowError(
        error.error === "access_denied" ? "access_denied" : "provider_error",
        `Authorization response error: ${error.error}`,
        { cause: error },
      );
    }
    if (error instanceof oidc.ResponseBodyError) {
      const code = error.status >= 500 ? "provider_unavailable" : "token_exchange_failed";
      throw new OAuthFlowError(code, `Token endpoint error: ${error.error}`, { cause: error });
    }
    if (error instanceof TypeError) {
      throw new OAuthFlowError("provider_unavailable", "Could not reach the token endpoint", { cause: error });
    }
    throw new OAuthFlowError("token_exchange_failed", "Token exchange failed", { cause: error });
  }
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  } catch (error) {
    throw new OAuthFlowError("provider_unavailable", `Could not reach ${new URL(url).host}`, { cause: error });
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new OAuthFlowError("provider_unavailable", `${new URL(url).host} returned ${response.status}`);
    }
    throw new OAuthFlowError("profile_fetch_failed", `${new URL(url).host} rejected the profile request`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new OAuthFlowError("profile_fetch_failed", `Invalid profile response from ${new URL(url).host}`, {
      cause: error,
    });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeAvatarUrl(value: unknown): string | null {
  const raw = asString(value);
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function splitName(name: string): { firstName: string | null; lastName: string | null } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const payload = asRecord(
    await fetchJson("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    }),
  );

  const sub = asString(payload.sub);
  const email = asString(payload.email)?.toLowerCase() || null;
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";

  if (!sub) throw new OAuthFlowError("profile_fetch_failed", "Google profile has no subject");
  if (!email) throw new OAuthFlowError("email_unavailable", "Google profile has no email");
  if (!emailVerified) throw new OAuthFlowError("email_not_verified", "Google email is not verified");

  const name = asString(payload.name) || [asString(payload.given_name), asString(payload.family_name)].filter(Boolean).join(" ") || email;
  const fallbackName = splitName(name);

  return {
    provider: "google",
    providerUserId: sub,
    email,
    emailVerified: true,
    name,
    avatarUrl: normalizeAvatarUrl(payload.picture),
    firstName: asString(payload.given_name) || fallbackName.firstName,
    lastName: asString(payload.family_name) || fallbackName.lastName,
  };
}

/** Fetch only the profile fields the app needs; tokens are never persisted. */
export async function fetchOAuthProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
  return fetchGoogleProfile(accessToken);
}

export { OAUTH_STATE_TTL_SECONDS };
