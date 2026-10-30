# QuizSupport Backend

A robust backend service for the QuizSupport platform, handling code execution, submissions, and problem management.

## Features

- **User Authentication & Authorization**: JWT-based auth with role-based access control
- **Problem Management**: Create, update, and manage programming problems with test cases
- **Code Execution**: Execute code in multiple languages via Judge0 integration
- **Submission System**: Track submissions, execution results, and statistics
- **AI Hints Integration**: AI-powered hints for problem solving
- **Real-time Updates**: Redis-based caching and job queuing

## Quiz Grading

See [QUIZ_GRADING_README.md](./QUIZ_GRADING_README.md) for the complete,
current description of how quiz attempts are graded, including scoring rules,
question-type behavior, recalculation, visibility, reports, and known gaps.

Related documentation:

- [QUIZ_MODULE_BACKEND.md](./QUIZ_MODULE_BACKEND.md) - quiz module/API overview
- [QUIZ_STUDENT_FLOW.md](./QUIZ_STUDENT_FLOW.md) - student attempt flow
- [QUIZ_CREATION_FLOW.md](./QUIZ_CREATION_FLOW.md) - creator flow
- [QUIZ_STUDENT_CALL_MAP.md](./QUIZ_STUDENT_CALL_MAP.md) - frontend/backend call map

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis (ioredis)
- **Code Execution**: Judge0 CE API
- **Authentication**: JWT with bcrypt

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6
- Judge0 CE instance (local or remote)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```
4. Update environment variables in `.env`

## Development

Start the development server:

```bash
npm run dev
```

The server will start at `http://localhost:8000`.

## Build

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

## Project Structure

```
code-judge-backend/
├── src/
│   ├── app.ts                  # Express app setup
│   ├── server.ts               # Server entry point
│   ├── config/                 # Configuration files
│   │   ├── env.ts
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── judge0.ts
│   ├── routes/                 # Route definitions
│   │   ├── run.routes.ts
│   │   ├── submit.routes.ts
│   │   ├── problem.routes.ts
│   │   └── auth.routes.ts
│   ├── controllers/            # Request handlers
│   │   ├── run.controller.ts
│   │   ├── submit.controller.ts
│   │   ├── problem.controller.ts
│   │   └── auth.controller.ts
│   ├── services/               # Business logic
│   │   ├── judge0.service.ts
│   │   ├── execution.service.ts
│   │   ├── submission.service.ts
│   │   ├── testcase.service.ts
│   │   └── ai.service.ts
│   ├── middleware/              # Custom middleware
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── validate.ts
│   ├── models/                  # Data models
│   ├── repositories/            # Data access layer
│   ├── utils/                   # Utility functions
│   │   ├── logger.ts
│   │   ├── response.ts
│   │   └── constants.ts
│   └── types/                   # TypeScript types
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/send-otp` - Send OTP to email for registration
- `POST /api/auth/verify-otp` - Verify OTP and get registration token
- `POST /api/auth/register` - Register new user with registration token
- `POST /api/auth/login` - Login user
- `POST /api/auth/me` - Verify session token and get user identity (requires session_token in cookie or body)
- `POST /api/auth/logout` - Logout user and revoke session

**Authentication Notes:**
- Login and Register set an httpOnly cookie named `session_token`
- The `/me` endpoint accepts `session_token` from either cookies or request body
- Protected routes use the `authenticate` middleware which validates the `session_token` cookie
- Session tokens are JWT-based with configurable expiry (default: 10 days)
- Logout blacklists the token in Redis for the remaining TTL

### User (v1)
- `GET /api/v1/user/profile` - Get user profile (protected)
- `GET /api/v1/user/info` - Get comprehensive user information including preferences (protected)
- `PATCH /api/v1/user/avatar` - Update user avatar (protected)
  - Body: `{ "avatarUrl": "/images/avatar-1.png" }`
  - Accepts predefined avatars: `/api/v1/avatars/1` through `/api/v1/avatars/21`
  - Accepts custom backend images: `/images/*`, `/uploads/*`
  - Custom avatars are automatically inserted into the avatar table

### Letterheads (Pro)
- `GET /api/v1/user/letterheads` - List the signed-in user's headers and usage (protected)
  - Basic users receive their saved headers with `locked: true`.
- `POST /api/v1/user/letterheads` - Save verified Cloudinary upload metadata (protected)
  - Body: `{ "name": "...", "publicId": "...", "version": 123, "signature": "...", "headerConfig": { ... } }`
- `PATCH /api/v1/user/letterheads/:id` - Rename, adjust placement, or set default (protected)
- `DELETE /api/v1/user/letterheads/:id` - Delete the Cloudinary asset and saved record (protected)
- `POST /api/v1/user/uploads/cloudinary/signature` - Get short-lived direct-upload parameters (protected)

The browser uploads directly to Cloudinary with the signed parameters, then sends
the returned `publicId`, `version`, and response `signature` to the create
endpoint. The server verifies ownership, format, size, and the Cloudinary
response signature before saving. API aliases are available at
`/api/letterheads` and `/api/uploads/cloudinary/signature`.

- Maximum file size: 10 MB (`pdf`, `png`, `jpg`, `jpeg`).
- Maximum saved headers: 4 per user by default; override with
  `LETTERHEAD_MAX_PER_USER`.
- Enable **Allow delivery of PDF and ZIP files** in the Cloudinary security
  settings when PDF letterheads must be accepted.
- Apply the schema with `npm run migrate -- --only=66_letterheads.sql`.

### Paper Studio
- `POST /api/v1/user/document/export` - Export an editor document (protected)
  - Body: `{ "document": { "pages": [...] }, "format": "pdf|docx|html|png", "pageIndex": 0, "filename": "paper" }`
  - Rebuilds and validates the `QuizSupport` branding layer server-side
  - PDF/PNG/HTML use Playwright Chromium; DOCX includes the branding page footer

### Problems
- `GET /api/problems` - List all problems
- `GET /api/problems/:id` - Get problem by ID
- `POST /api/problems` - Create problem (instructor/admin)
- `PUT /api/problems/:id` - Update problem (instructor/admin)
- `DELETE /api/problems/:id` - Delete problem (admin)

### Submissions
- `POST /api/submit` - Submit code for evaluation
- `GET /api/submissions/:id` - Get submission details
- `GET /api/problems/:id/submissions` - Get problem submissions

### Run
- `POST /api/run` - Run code without submission

## Document Export Tests

```bash
npx playwright install chromium
npm run test:document-export
```

This acceptance test builds a two-page paper and checks HTML, PDF pagination,
PNG output, DOCX footer branding, and rejection of floating content inside the
protected branding safe zone.

## Letterhead Tests

```bash
npm run test:letterheads
```

This covers upload signature parameters, ownership and plan gating, header
configuration normalization, and PDF header placement math.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment (development/production) |
| `PORT` | Server port |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_POOL_URL` | Transaction-pooler connection string used by the API in serverless production (recommended; keep `DATABASE_URL` for migrations) |
| `REDIS_URL` | Self-hosted Redis connection string (for example `redis://127.0.0.1:6379` on the VPS); API and worker must use the same instance |
| `JUDGE0_API_URL` | Judge0 API URL |
| `JUDGE0_API_KEY` | Judge0 API key |
| `JWT_SECRET` | JWT secret key |
| `JWT_EXPIRY` | JWT expiry time |
| `PLATFORM_JWT_SECRET` | Optional separate 256-bit secret for owner-only platform sessions. When omitted, a domain-separated key is derived from `JWT_SECRET` |
| `PLATFORM_JWT_EXPIRY` | Platform session lifetime (defaults to `12h`) |
| `PLATFORM_OWNER_EMAILS` | Optional comma-separated owner email allowlist |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Nodemailer SMTP delivery configuration |
| `AI_API_KEY` | AI service API key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for direct letterhead uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key used to sign browser uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret; server-only, never sent to the browser |
| `LETTERHEAD_MAX_PER_USER` | Optional saved-header limit per user (defaults to `4`) |

### VPS Redis

Run Redis on the VPS with `docker compose up -d redis`, or install it as a
system service. Point both the API and worker at the same self-hosted instance:

```bash
REDIS_URL=redis://127.0.0.1:6379
```

Remove any Upstash connection string from the deployment environment. `npm
start` now starts the HTTP server and background workers; set
`DISABLE_BACKGROUND_WORKERS=1` only when running `npm run worker:prod`
separately.

## Supported Languages

- Python
- JavaScript
- TypeScript
- Java
- C++
- C
- Go
- Rust

## License

MIT
