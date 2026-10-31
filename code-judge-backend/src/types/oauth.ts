// Shared OAuth types. Only Google and GitHub are enabled; adding another
// provider means extending this union, the client config, and the login UI.
export type OAuthProvider = "google" | "github";

export interface OAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/** Short-lived server-side record used to validate the authorization callback. */
export interface OAuthStateRecord {
  provider: OAuthProvider;
  codeVerifier: string;
  next: string | null;
  createdAt: number;
}

export type OAuthErrorCode =
  | "access_denied"
  | "provider_error"
  | "invalid_state"
  | "invalid_provider"
  | "provider_not_configured"
  | "provider_unavailable"
  | "token_exchange_failed"
  | "profile_fetch_failed"
  | "email_unavailable"
  | "email_not_verified"
  | "account_error"
  | "session_failed"
  | "server_error";
