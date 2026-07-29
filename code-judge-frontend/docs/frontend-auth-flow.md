# Frontend Authentication Flow

## Overview

The frontend uses a **3-step email verification registration** and **token-based session management**. All auth pages protect against already-authenticated users via `AuthGuard`.

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
- Backend creates user, returns `{ user, token }`
- On success:
  - Stores auth in `localStorage` and `useAuthStore`
  - Resets form
  - Redirects to `/login`
- Toast: `Account created successfully!`

### Resend OTP
- Available during verify step
- 60-second cooldown between requests
- Calls same endpoint as Step 1

---

## Login Flow (`/login`)

- Email/handle and password fields
- Simulated login (currently)
- On success: stores token/user in `localStorage` and `useAuthStore`
- Redirects to `/dashboard`

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
  token: string | null;
  user: { id: string; email: string; username?: string } | null;
  isAuthenticated: boolean;

  setAuth(token, user): void;   // persists to localStorage
  logout(): void;                // clears localStorage
}
```

**Persistence**: Token and user are stored in `localStorage` under keys `token` and `user`.

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

```
NEXT_PUBLIC_API_URL=http://10.107.212.98:8000/api
```

All auth requests use `fetch()` directly with this base URL.

---

## Files Involved

- `src/app/(auth)/register/page.tsx` — 3-step registration form with inline store
- `src/app/(auth)/login/page.tsx` — Login form (simulated)
- `src/app/(auth)/forgot-password/page.tsx` — Forgot password (simulated)
- `src/components/guards/AuthGuard.tsx` — Route guard for unauthenticated pages
- `src/store/authStore.ts` — Zustand auth state with localStorage
- `src/services/auth.ts` — Axios-based API helpers (legacy, register page uses fetch directly)