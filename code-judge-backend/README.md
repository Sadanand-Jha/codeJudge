# CodeJudge Backend

A robust backend service for the CodeJudge platform, handling code execution, submissions, and problem management.

## Features

- **User Authentication & Authorization**: JWT-based auth with role-based access control
- **Problem Management**: Create, update, and manage programming problems with test cases
- **Code Execution**: Execute code in multiple languages via Judge0 integration
- **Submission System**: Track submissions, execution results, and statistics
- **AI Hints Integration**: AI-powered hints for problem solving
- **Real-time Updates**: Redis-based caching and job queuing

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
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

## Database Setup

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Open Prisma Studio to view data:

```bash
npm run prisma:studio
```

## Development

Start the development server:

```bash
npm run dev
```

The server will start at `http://localhost:3000`.

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
backend/
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
│   ├── prisma/                  # Prisma client
│   │   └── client.ts
│   ├── utils/                   # Utility functions
│   │   ├── logger.ts
│   │   ├── response.ts
│   │   └── constants.ts
│   └── types/                   # TypeScript types
│       └── index.ts
├── prisma/
│   └── schema.prisma            # Database schema
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

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

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment (development/production) |
| `PORT` | Server port |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JUDGE0_API_URL` | Judge0 API URL |
| `JUDGE0_API_KEY` | Judge0 API key |
| `JWT_SECRET` | JWT secret key |
| `JWT_EXPIRY` | JWT expiry time |
| `AI_API_KEY` | AI service API key |

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