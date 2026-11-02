# Google OAuth Login

This app supports **Authorization Code + PKCE** sign-in with Google.
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
keeping provider endpoints explicit and auditable.

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

