/**
 * Unit tests for OAuth PKCE/state helpers, safe redirects, and sessions.
 *
 * Run: npm run test:oauth
 * No database or network required.
 */
import { strict as assert } from "node:assert";
import {
  OAuthFlowError,
  createAuthorizationRequest,
  getOAuthCallbackUrl,
} from "../services/oauth.ts";
import {
  SessionConfigurationError,
  createSessionToken,
  safeNextPath,
  verifySessionToken,
} from "../services/session.ts";

let passed = 0;
const test = async (name: string, fn: () => Promise<void> | void) => {
  await fn();
  passed++;
  console.log(`✓ ${name}`);
};

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
}

async function main() {
  process.env.FRONTEND_URL = "http://localhost:3000";
  process.env.OAUTH_CALLBACK_BASE_URL = "";
  process.env.GOOGLE_CLIENT_ID = "google-client";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";
  process.env.GITHUB_CLIENT_ID = "github-client";
  process.env.GITHUB_CLIENT_SECRET = "github-secret";
  process.env.JWT_SECRET = "test-secret-with-more-than-32-characters";

  await test("Google authorization URL has S256 PKCE, state, scopes, and callback", async () => {
    const { authorizationUrl, state, codeVerifier } = await createAuthorizationRequest("google");
    assert.equal(authorizationUrl.origin, "https://accounts.google.com");
    assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
    assert.ok((authorizationUrl.searchParams.get("code_challenge") || "").length >= 43);
    assert.equal(authorizationUrl.searchParams.get("state"), state);
    assert.equal(authorizationUrl.searchParams.get("scope"), "openid email profile");
    assert.equal(
      authorizationUrl.searchParams.get("redirect_uri"),
      "http://localhost:3000/api/auth/oauth/google/callback",
    );
    assert.ok(state.length >= 16);
    assert.ok(codeVerifier.length >= 43);
  });

  await test("GitHub authorization URL has S256 PKCE and minimum scopes", async () => {
    const { authorizationUrl, state } = await createAuthorizationRequest("github");
    assert.equal(authorizationUrl.origin, "https://github.com");
    assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
    assert.equal(authorizationUrl.searchParams.get("state"), state);
    assert.equal(authorizationUrl.searchParams.get("scope"), "read:user user:email");
    assert.equal(
      authorizationUrl.searchParams.get("redirect_uri"),
      "http://localhost:3000/api/auth/oauth/github/callback",
    );
  });

  await test("callback base URL can be overridden independently of FRONTEND_URL", () => {
    process.env.OAUTH_CALLBACK_BASE_URL = "https://www.quizsupport.com";
    assert.equal(
      getOAuthCallbackUrl("google"),
      "https://www.quizsupport.com/api/auth/oauth/google/callback",
    );
    process.env.OAUTH_CALLBACK_BASE_URL = "";
  });

  await test("unconfigured providers fail closed", async () => {
    process.env.GOOGLE_CLIENT_SECRET = "";
    await assert.rejects(
      () => createAuthorizationRequest("google"),
      (error: unknown) =>
        error instanceof OAuthFlowError && error.code === "provider_not_configured",
    );
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
  });

  await test("safeNextPath accepts same-origin paths and rejects redirects/auth loops", () => {
    assert.equal(safeNextPath("/quiz?tab=1"), "/quiz?tab=1");
    assert.equal(safeNextPath("/creator/quizzes"), "/creator/quizzes");
    assert.equal(safeNextPath("https://evil.example"), null);
    assert.equal(safeNextPath("//evil.example"), null);
    assert.equal(safeNextPath("/\\evil.example"), null);
    assert.equal(safeNextPath("/login"), null);
    assert.equal(safeNextPath("/login?next=/quiz"), null);
    assert.equal(safeNextPath("/quiz\nSet-Cookie: x"), null);
    assert.equal(safeNextPath(42), null);
  });

  await test("session JWT round-trips and is bound to HS256 claims", () => {
    const token = createSessionToken("42", "student@example.com");
    const claims = verifySessionToken(token);
    assert.equal(claims.userId, "42");
    assert.equal(claims.email, "student@example.com");
    assert.ok(claims.exp && claims.exp > Math.floor(Date.now() / 1000));
    assert.throws(() => verifySessionToken(`${token}x`));
  });

  await test("session helpers fail closed without JWT_SECRET", () => {
    const token = createSessionToken("42", "student@example.com");
    delete process.env.JWT_SECRET;
    assert.throws(() => createSessionToken("42", "student@example.com"), SessionConfigurationError);
    assert.throws(() => verifySessionToken(token), SessionConfigurationError);
  });

  restoreEnv();
  console.log(`\n${passed} OAuth/session tests passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
