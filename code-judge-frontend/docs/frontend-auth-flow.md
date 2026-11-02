# Frontend Authentication Flow

## Overview

The frontend uses a **3-step email verification registration** and **cookie-based session management**. The signed JWT lives only in the backend-issued httpOnly `session_token` cookie; no session token is written to `localStorage`. Auth pages redirect already-authenticated users away via `AuthGuard` / the login page redirect effect.

---

## Registration Flow (`/register`)

### Step 1: Email (`step = "email"`)
- User enters email address
- Client validates email format
- Calls `POST /api/auth/send-otp` with `{ email }`
- On success: transitions to **verify step**, starts 60s resend countdown
- Toast: `✅ OTP sent successfully to {email}`

### Step 2: Verify OTP (`step = "verify"`)
- User enters 6-digit OTP
- Client validates OTP format (must be 6 digits)
- Calls `POST /api/auth/verify-otp` with `{ email, otp }`
- Backend returns `{ registration_token, email }`
- On success: stores `registration_token` in component state, transitions to **password step**
- Toast: `OTP verified successfully!`

### Step 3: Password (`step = "register"`)
- User creates password with live requirement checklist:
  - At least 8 characters
  - One uppercase letter
  - One lowercase letter
  - One number
  - One special character (`!@#$%^&*()_+-=[]{};':"\|,.<>/?`)
- User confirms password
- Client validates password strength and match
- Calls `POST /api/auth/register` with `{ email, password, registration_token }`
- Backend creates the user and returns `{ user }`; registration does **not** start a session
- On success:
  - Resets the form
  - Redirects to `/login` so the user signs in normally
- Toast: `Account created successfully!`

### Resend OTP
- Available during verify step
- 60-second cooldown between requests (synced with backend `OTP_RESEND_COOLDOWN_SECONDS=60` via `otp_cooldown:{email}` Redis key; OTP itself valid 5 minutes)
- Calls same endpoint as Step 1
- Frontend timer `RESEND_COOLDOWN_SECONDS=60` in `RegistrationForm.tsx` must match backend

---

## Login Flow (`/login`)

- Email/username + password, or Google/GitHub OAuth
- Password login: `POST /api/auth/login` sets the httpOnly `session_token` cookie
- OAuth: Authorization Code + PKCE via `/api/auth/oauth/:provider/start`; the
  backend callback sets the same httpOnly session cookie. OAuth access/refresh
  tokens are never stored in the browser. See `docs/oauth-login.md`.
- On success: stores the user profile in `localStorage`/`useAuthStore` (the
  session itself lives only in the httpOnly cookie)
- Redirects to `?next=` when present, otherwise `/creator` for teachers or
  `/quiz` for students

---

## Forgot Password Flow (`/forgot-password`)

- Email input
- Simulated password reset
- On success: shows confirmation message

---

## Auth State Management

### `useAuthStore` (Zustand)

```typescript
interface AuthState {
  token: string | null;          // in-memory sentinel ("session"), not a JWT
  user: UserProfile | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;

  setAuth(token, user): void;    // ignores token; session is the cookie
  fetchMe(): Promise<UserProfile | null>;
  logout(): void;
  hydrate(): Promise<void>;
}
```

**Persistence**: Only `{ user, isAuthenticated }` is persisted in
`localStorage`. The session itself is restored by calling `/auth/me` with the
httpOnly cookie. Legacy `quizsupport_token` / `quizsupport_user` values and any
persisted `token` field are removed during rehydration.

---

## Route Protection

### `AuthGuard` Component

```typescript
<AuthGuard>
  {children}
</AuthGuard>
```

- Checks `useAuthStore.isAuthenticated`
- If `true`: redirects to `/dashboard`
- Used on: `/login`, `/register`, `/forgot-password`

**Note**: Registration page also has inline redirect check for authenticated users.

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/send-otp` | POST | Send OTP to email |
| `/api/auth/verify-otp` | POST | Verify OTP, get registration token |
| `/api/auth/register` | POST | Create account with token |
| `/api/auth/check-username` | GET | Check username availability |
| `/api/auth/set-username` | POST | Set username after registration |

---

## Environment Variables

Cookie auth requires requests to go through the **frontend origin**. Prefer the
relative `/api` base, which `next.config.ts` rewrites to `BACKEND_URL`:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
# Leave NEXT_PUBLIC_BACKEND_URL unset (or set it to the same origin) so axios
# uses /api. An absolute API host breaks the host-only session cookie.
```

See `.env.example` in the frontend and `docs/oauth-login.md`.

---

## Files Involved

- `src/app/(auth)/register/page.tsx` — registration route wrapper
- `src/components/forms/RegistrationForm.tsx` — 3-step OTP + password form
- `src/app/(auth)/login/page.tsx` — password + OAuth login and error messages
- `src/app/(auth)/forgot-password/page.tsx` — password reset flow
- `src/components/guards/AuthGuard.tsx` — redirects already-authenticated users
- `src/store/authStore.ts` — cookie-backed Zustand auth state; hydrates via `/auth/me`
- `src/lib/axios.ts` — `withCredentials` API client (no bearer token)
- `src/lib/authHeaders.ts` — native `fetch` auth headers (cookie-only; returns `{}`)
- `src/services/auth.ts` — auth API helpers
- `src/components/auth/OAuthButtons.tsx` — Google/GitHub start buttons
- `docs/oauth-login.md` — OAuth setup, architecture, and security notes