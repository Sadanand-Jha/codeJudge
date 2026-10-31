# Google and GitHub OAuth Login

This app supports **Authorization Code + PKCE** sign-in with Google and GitHub.
OAuth accounts use the existing `session_token` JWT cookie, so `/auth/me`,
role-based redirects, logout, and protected API routes work exactly as they do
for password login. Provider access tokens are never stored or returned to the
browser.

## Why `openid-client`

`openid-client` v6 (built on `oauth4webapi`) is used instead of hand-writing the
protocol plumbing. It provides PKCE S256 verifier/challenge generation, random
state, authorization URL construction, state validation during the token
exchange, redirect URI binding, typed provider errors, and response validation.
That removes the most security-sensitive code from this repository while still
keeping provider endpoints explicit and auditable. GitHub's token endpoint does
not speak OpenID Connect, so only the OAuth 2.0 parts of the client are used for
GitHub; Google uses the same client for the authorization-code flow.

## Architecture

```text
Browser
  -> GET /api/auth/oauth/google/start        (frontend origin; Next rewrites to backend)
  -> 302 accounts.google.com/o/oauth2/v2/auth
  -> GET /api/auth/oauth/google/callback     (frontend origin)
       -> backend validates state + PKCE, exchanges code, fetches profile
       -> backend sets httpOnly session_token cookie on the frontend origin
  -> 302 /login?oauth=success&next=...
  -> /auth/me hydrates the session, then redirects by role
```

The callback **must** use the public frontend origin, not the raw backend host.
Using the frontend origin keeps the session cookie first-party and SameSite=Lax
compatible. In local development that means `http://localhost:3000`, not
`http://localhost:8000`.

## Environment

Backend (`code-judge-backend/.env.example` is the full template):

```dotenv
FRONTEND_URL=http://localhost:3000
OAUTH_CALLBACK_BASE_URL=http://localhost:3000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

JWT_SECRET=replace-with-at-least-32-random-bytes
```

- `OAUTH_CALLBACK_BASE_URL` is optional and overrides `FRONTEND_URL` for OAuth
  redirects. Leave it blank to use `FRONTEND_URL`.
- `FRONTEND_URL` may contain a comma-separated list for CORS; the first entry is
  used for OAuth redirects.
- Use the canonical frontend host for OAuth, not a host that immediately
  redirects to another host. The session cookie is host-only: setting it on
  `quizsupport.com` then redirecting to `www.quizsupport.com` drops the cookie.
  If `FRONTEND_URL` contains both, either put `https://www.quizsupport.com`
  first or set `OAUTH_CALLBACK_BASE_URL=https://www.quizsupport.com`.
- Provider secrets belong only in the backend environment. Never prefix them
  with `NEXT_PUBLIC_`.
- `JWT_SECRET` is required for OAuth login; the OAuth session helper fails closed
  if it is missing.

## Provider console setup

### Google

1. Open Google Cloud Console -> **APIs & Services** -> **Credentials**.
2. Create an **OAuth client ID** of type **Web application**.
3. Under **Authorized redirect URIs** add:
   - Local: `http://localhost:3000/api/auth/oauth/google/callback`
   - Production: `https://www.quizsupport.com/api/auth/oauth/google/callback`
4. Under **Authorized JavaScript origins** add:
   - Local: `http://localhost:3000`
   - Production: `https://www.quizsupport.com`
5. Configure the OAuth consent screen and use scopes `openid`, `email`,
   `profile`. While the app is in testing, add test-user emails.
6. Copy the client ID/secret into the backend env.

### GitHub

1. Open GitHub -> **Settings** -> **Developer settings** -> **OAuth Apps**.
2. Create an OAuth App (use a separate app for local development).
3. Set **Authorization callback URL**:
   - Local app: `http://localhost:3000/api/auth/oauth/github/callback`
   - Production app: `https://www.quizsupport.com/api/auth/oauth/github/callback`
4. Copy the client ID and generate/copy a client secret into the backend env.
5. GitHub OAuth Apps accept only one callback URL, so keep local and production
   apps separate.

Scopes requested: Google `openid email profile`; GitHub `read:user user:email`.
GitHub's scope is the minimum practical equivalent needed to read the verified
email address.

## Backend implementation

- `src/services/oauth.ts` — `openid-client` configuration, PKCE S256, state
  generation, authorization URL, token exchange, provider profile fetching.
- `src/controllers/oauth.controller.ts` — start/callback HTTP handlers, cookie
  binding, one-time Redis state, success/error redirects.
- `src/services/session.ts` — mints the existing `session_token` cookie and
  validates `next` paths.
- `src/services/oauthAccount.ts` — first-login creation and later-login updates.
- `src/repositories/oauth.repository.ts` — `users` lookup/insert/update and
  avatar upsert.
- `database/migrations/68_oauth_login.sql` — adds `oauth_provider` +
  `oauth_provider_user_id`, a partial unique index, and relaxes legacy NOT NULL
  location columns.
- `src/routes/auth.routes.ts` — `GET /oauth/:provider/start` and
  `GET /oauth/:provider/callback`.

Endpoints:

```text
GET /api/auth/oauth/google/start?next=/quiz
GET /api/auth/oauth/github/start?next=/quiz
GET /api/auth/oauth/google/callback
GET /api/auth/oauth/github/callback
POST /api/auth/logout        (existing; clears the same session cookie)
```

### State and PKCE

- A random state, PKCE verifier, sanitized `next`, and creation time are stored
  in Redis under `oauth:state:<provider>:<state>` for 10 minutes.
- The state is also written to an httpOnly, SameSite=Lax cookie scoped to
  `/api/auth/oauth`.
- The callback requires both values to match, atomically consumes the Redis
  record with `GETDEL`, clears the cookie, and rejects expired/replayed state.
- `openid-client` requires S256 PKCE and validates state during the token
  exchange as a second check.

### Account linking and users

- Provider identity is `(oauth_provider, oauth_provider_user_id)`. A partial
  unique index prevents one provider identity from owning two local rows.
- Existing provider identity -> update that user.
- Otherwise, a provider-verified email matching an existing user -> link that
  user.
- Otherwise create a student user with:
  - generated unique lowercase alphanumeric username,
  - bcrypt hash of random bytes (so password login fails cleanly),
  - provider avatar when the URL is HTTPS, otherwise `/api/v1/avatars/1`,
  - empty profile/location fields until the user fills them in.
- Google requires `email_verified=true`. GitHub selects the primary verified
  email from `/user/emails`; unverified-only accounts are rejected.

### Errors

The callback redirects to `/login?oauth_error=<code>`. The login page maps known
codes to friendly messages and always keeps `?next=` so the user can retry.
Unknown codes fall back to a generic message. Errors are also logged server-side
without tokens, authorization codes, or PKCE verifiers.

| Code | Meaning | Typical cause / action |
| --- | --- | --- |
| `access_denied` | User cancelled or the provider denied consent. | Expected; retry if desired. |
| `provider_error` | Provider returned an OAuth error or no code. | Retry; check provider status. |
| `invalid_state` | State cookie/Redis pair missing, mismatched, expired, or replayed. | Restart from `/login`; check Redis and clock. |
| `invalid_provider` | Path is not `google` or `github`. | Fix the start URL. |
| `provider_not_configured` | Client id/secret missing on the backend. | Fill backend env and restart. |
| `provider_unavailable` | DNS/timeout/5xx from the provider. | Retry later; check egress and provider status. |
| `token_exchange_failed` | Code exchange rejected (bad client secret, redirect mismatch, expired code). | Verify provider console values and callback URI. |
| `profile_fetch_failed` | Userinfo/GitHub API rejected or returned invalid JSON. | Check scopes and provider API availability. |
| `email_unavailable` | No usable email from the provider. | GitHub needs `user:email`; account needs a verified email. |
| `email_not_verified` | Provider reports the email as unverified. | Verify at the provider, then retry. |
| `account_error` | User create/link/update failed. | Check backend logs and database constraints. |
| `session_failed` | User was resolved but the session cookie could not be minted. | Check `JWT_SECRET`/session config. |
| `server_error` | Redis or another unexpected dependency failed. | Check Redis/backend logs. |

## Frontend implementation

- `src/components/auth/OAuthButtons.tsx` renders Google/GitHub buttons and
  navigates to the start endpoint with the current safe `next` path.
- `src/app/(auth)/login/page.tsx` reads `oauth` / `oauth_error` with
  `useSearchParams`, displays the friendly error, removes the one-time query
  parameter, and relies on the existing hydrate/redirect effect. It is wrapped
  in `Suspense` because `useSearchParams` opts the subtree out of static
  prerendering.
- `src/lib/axios.ts` sends `withCredentials: true` and attaches **no**
  Authorization header. Session auth is cookie-only.
- `src/lib/authHeaders.ts` returns an empty header object for native `fetch`;
  the browser sends the httpOnly session cookie automatically.
- `src/store/authStore.ts` persists only `{ user, isAuthenticated }`, restores
  the session through `/auth/me`, uses the in-memory sentinel `"session"` for
  `token`, and purges legacy `quizsupport_token` / `quizsupport_user` values and
  any persisted JWT during rehydration.
- `src/app/layout.tsx` no longer migrates the legacy `token` key; it removes it.
- `proxy.ts` adds a fast redirect for signed-out visitors to `/quiz`, `/profile`,
  `/settings`, and `/creator`. This is only a UX gate; the backend
  `authenticate` middleware remains the security boundary.

## Full implementation file map

Backend (`code-judge-backend`):

- `src/services/oauth.ts` — provider metadata, configuration, PKCE/state
  helpers, authorization URL, token exchange, profile normalization.
- `src/controllers/oauth.controller.ts` — `/start` + `/callback`, state cookie,
  Redis one-time state, safe redirects, session issuance, error mapping.
- `src/services/oauthAccount.ts` — verified-email account linking, first-login
  creation, username generation, profile updates.
- `src/repositories/oauth.repository.ts` — provider identity/email lookup,
  user update, avatar upsert.
- `src/services/session.ts` — `JWT_SECRET` fail-closed verification, HS256
  session minting, cookie set/clear, `safeNextPath`.
- `src/middleware/auth.ts` — cookie-based authentication for protected APIs.
- `src/controllers/auth.controller.ts` — password login, `/auth/me`, logout;
  all use the same session helpers and never return a browser session token.
- `src/controllers/ai.controller.ts` — verifies the session cookie via the same
  helper.
- `src/routes/auth.routes.ts` — OAuth start/callback route registration.
- `src/types/oauth.ts` — provider/profile/state/error types.
- `src/__tests__/oauth.test.ts` — offline tests for PKCE URLs, provider config,
  safe redirects, and fail-closed session helpers (`npm run test:oauth`).
- `database/migrations/68_oauth_login.sql` — provider columns, partial unique
  identity index, nullable legacy profile fields.
- `.env.example` — provider/session environment template.

Frontend (`code-judge-frontend`):

- `src/components/auth/OAuthButtons.tsx` — provider buttons.
- `src/app/(auth)/login/page.tsx` — OAuth result handling + password login.
- `src/store/authStore.ts` — cookie-backed session/profile state.
- `src/lib/axios.ts` — credentialed API client (no bearer header).
- `src/lib/authHeaders.ts` — empty native-fetch auth headers.
- `src/app/layout.tsx` — legacy storage cleanup.
- `proxy.ts` — signed-out UX redirects.
- `next.config.ts` — same-origin `/api` rewrite.
- `.env.example` — frontend origin/API-base template.
- `docs/frontend-auth-flow.md` — auth flow overview.

## Setup and verification

1. Configure both provider consoles using the exact redirect URIs above.
2. Add the backend env values and run migrations:
   ```bash
   cd code-judge-backend
   npm run migration:dry
   npm run migrate
   ```
3. Run the offline OAuth/session checks:
   ```bash
   cd code-judge-backend
   npm run test:oauth
   ```
4. Start the backend (`npm run dev:server` or `npm run dev`) and frontend
   (`npm run dev` in `code-judge-frontend`).
5. Open `http://localhost:3000/login`.

### Manual test checklist

- Google button redirects to Google with `code_challenge_method=S256`.
- GitHub button redirects to GitHub with a PKCE challenge.
- New Google account creates exactly one user and lands on `/quiz` (or `next`).
- New GitHub account creates exactly one user and lands on `/quiz` (or `next`).
- Existing provider account logs into the same user id; no duplicate row.
- Existing password account with the same verified email is linked, not duplicated.
- Re-login after logout works; `/auth/me` returns the user.
- Cancelling at the provider shows the `access_denied` message.
- Replaying the callback URL fails with `invalid_state`.
- Removing the state cookie or its Redis key fails with `invalid_state`.
- State expires after 10 minutes.
- Unverified GitHub email / Google `email_verified=false` is rejected.
- Missing client id/secret shows `provider_not_configured`, not a crash.
- Provider timeout/5xx shows a friendly retry message.
- `next=/creator/quizzes` is honored for a teacher; external `next` values are
  ignored.
- Signed-out `/quiz`, `/profile`, `/settings`, `/creator` visits redirect to
  `/login?next=...`.
- Signed-in users can reach those pages; direct API calls without a cookie
  return 401.
- Username collisions on first login still create the account with a suffix.
- Two simultaneous first logins for the same provider identity create one row.
- Session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production, and no
  OAuth access/refresh token appears in localStorage, URLs, or logs.
- Google/GitHub buttons and errors work at mobile and desktop widths.

### Production checklist

- Register the exact production callback URLs, including `www`.
- Set `FRONTEND_URL` and, if needed, `OAUTH_CALLBACK_BASE_URL` to the public
  frontend origin.
- Ensure `NODE_ENV=production` (or Vercel) so cookies are `Secure`.
- Keep provider secrets out of git and the frontend bundle.
- Add the preview deployment callback URL to the provider if previews need OAuth.
- Confirm `BACKEND_URL` in the frontend points to the API host used by the
  `/api` rewrite.
- Review provider console settings whenever the domain changes.

## Security notes

- Authorization Code + PKCE S256 only; no implicit flow. GitHub only supports
  PKCE S256, which is what this implementation requests.
- State is browser-bound, expiring, single-use, and checked twice (cookie/Redis
  before the exchange, then again by `openid-client`).
- Only same-origin `next` paths are accepted, preventing open redirects.
- Provider access/refresh tokens are server-side only and are never logged,
  persisted, or put in localStorage. The browser only receives the app's own
  httpOnly session cookie.
- Account linking requires a provider-verified email. Do not relax this check
  without an explicit confirmation flow; verified-email linking can otherwise
  merge the wrong account.
- Session and state cookies are httpOnly and SameSite=Lax; production cookies
  are Secure.
- The proxy guard is not a security boundary. Every protected API route must
  continue to use the backend `authenticate` middleware.
- Logout reuses the existing endpoint, which blacklists the JWT in Redis and
  clears the same cookie.

### Pitfalls and known limitations

- **Cross-origin API base breaks login.** The session cookie is host-only and
  set on the public frontend origin. If the browser calls
  `https://api.example.com` directly while the cookie was set on
  `https://www.example.com`, protected requests will look signed out. Keep the
  API base relative (`/api` + `BACKEND_URL` rewrite) or serve the API on the
  same host. Different subdomains are not enough for a host-only cookie.
- **Email uniqueness is enforced in application code, not by a unique index on
  `lower(email)`.** Two simultaneous first logins for the same email through
  different providers can theoretically insert duplicates. Add a unique
  functional index and handle its conflict if this matters for your data.
- **Account linking overwrites provider columns.** Signing in with a different
  provider using the same verified email links that user and updates
  `oauth_provider` / `oauth_provider_user_id`; the previous provider identity no
  longer resolves. Add explicit multi-provider identities if users need both.
- **Deactivated users are not blocked by OAuth login.** The OAuth path mirrors
  the existing password behavior; add an `is_active` check in
  `upsertOAuthUser` if deactivation must prevent sign-in.
- **Preview deployments** need their own callback URL in each provider console,
  or OAuth will fail with a redirect-URI mismatch.
- **Provider downtime** surfaces as `provider_unavailable`; there is no local
  password fallback for OAuth-only accounts beyond the normal login form.
- **`JWT_SECRET` rotation** invalidates all sessions, including OAuth sessions.
  This is expected; set a stable, high-entropy secret.
