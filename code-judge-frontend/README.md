# ⚡ ByteClash

> AI-Powered Competitive Programming & Assessment Platform

ByteClash is a full-stack competitive programming platform with an integrated quiz/assessment system, real-time code editor, AI-powered analytics, and multi-language code execution — built for developers, students, and organizations.

---

## 🧠 About the Project

ByteClash is a monorepo containing two applications:

- **Frontend** (`code-judge-frontend/`) — Next.js 16 client with Monaco editor, math rendering, quiz platform, and glassmorphism UI
- **Backend** (`code-judge-backend/`) — Express.js API with PostgreSQL, Redis, Judge0 code execution, AI hints, and OTP email auth

---

## ✨ Key Features

- 🧑‍💻 **Code Editor** — Monaco Editor with syntax highlighting, language autocomplete, and resizable panels
- 🧮 **Math Rendering** — KaTeX-powered math display for problem statements and editorial content
- 🎯 **Quiz Platform** — Universal assessment system with lifelines, scheduling, and leaderboards
- 🧑‍💻 **Code Execution** — Multi-language code execution via Judge0 CE (Python, JS, TS, Java, C++, C, Go, Rust)
- 🤖 **AI Hints** — OpenAI-powered hints for problem solving
- 📧 **OTP Email Auth** — Secure email OTP registration with Nodemailer
- 🎭 **Avatar System** — 20 DiceBear avatars with instant preview and secure backend validation
- 🌗 **Dark Theme** — Glassmorphism UI with smooth animations and premium developer aesthetic
- 🔄 **Real-time Caching** — Redis-based caching and session management

---

## 🛠 Tech Stack

| Layer | Frontend | Backend |
|-------|----------|---------|
| **Framework** | Next.js 16 (App Router, Turbopack) | Express.js |
| **Language** | TypeScript | TypeScript |
| **Runtime** | Node.js ≥ 18 | Node.js ≥ 18 |
| **Database** | — | PostgreSQL |
| **Cache** | — | Redis (ioredis) |
| **Auth** | JWT (Zustand) | JWT + bcrypt + OTP |
| **Styling** | Tailwind CSS | — |
| **State** | Zustand | — |
| **Animations** | Framer Motion | — |
| **Code Editor** | Monaco Editor | — |
| **Code Execution** | — | Judge0 CE API |
| **AI** | — | OpenAI API |
| **Email** | — | Nodemailer |
| **Icons** | Lucide React | — |
| **Math** | KaTeX | — |
| **Avatars** | DiceBear Adventurer | DiceBear Adventurer |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **PostgreSQL** ≥ 14
- **Redis** ≥ 6
- **Judge0 CE** instance (local or remote)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/byteclash.git
cd byteclash
```

### 2. Backend Setup

```bash
cd code-judge-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database, Redis, Judge0, and API keys

# Start development server
npm run dev
```

Backend runs at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd ../code-judge-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Start development server
npm run dev
```

Frontend runs at `http://localhost:3000`

### 4. Docker Setup (Optional)

```bash
cd code-judge-backend
docker-compose up -d
```

---

## ⚙️ Environment Variables

### Backend (`code-judge-backend/.env`)

```env
# Server
NODE_ENV=development
PORT=8000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/byteclash

# Redis
REDIS_URL=redis://localhost:6379

# Judge0 CE
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=your_judge0_api_key

# JWT Auth
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=10d

# AI Service
AI_API_KEY=your_openai_api_key

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Frontend (`code-judge-frontend/.env`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 📁 Project Structure

```
byteclash/
├── code-judge-frontend/          # Next.js 16 Frontend
│   ├── src/
│   │   ├── app/                  # App Router routes
│   │   │   ├── (app)/            # Authenticated routes
│   │   │   ├── (auth)/           # Public auth routes
│   │   │   └── api/              # Route handlers
│   │   ├── components/           # UI components
│   │   │   ├── problem/          # Problem page components
│   │   │   ├── editor/           # Monaco editor wrapper
│   │   │   ├── quiz/             # Quiz components
│   │   │   └── ui/               # Reusable primitives
│   │   ├── mocks/                # Mock data layer
│   │   ├── store/                # Zustand state
│   │   ├── services/             # API services
│   │   ├── lib/                  # Utilities
│   │   ├── types/                # TypeScript types
│   │   └── config/               # App config
│   └── package.json
│
├── code-judge-backend/           # Express.js Backend
│   ├── src/
│   │   ├── config/               # Configuration (env, db, redis, judge0)
│   │   ├── routes/               # Route definitions
│   │   ├── controllers/          # Request handlers
│   │   ├── services/             # Business logic
│   │   ├── middleware/           # Auth, validation, error handling
│   │   ├── models/               # Data models
│   │   ├── repositories/         # Data access layer
│   │   ├── ai/                   # AI service (OpenAI)
│   │   ├── utils/                # Utilities
│   │   └── types/                # TypeScript types
│   └── package.json
│
├── shared/                       # Shared constants (avatars)
└── docs/                         # Documentation
```

---

## 🔌 API Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/send-otp` | Send OTP to email |
| `POST` | `/api/auth/verify-otp` | Verify OTP and get token |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user |
| `POST` | `/api/auth/me` | Verify session & get user |
| `POST` | `/api/auth/logout` | Logout & revoke session |

### User

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/user/profile` | Get user profile |
| `GET` | `/api/v1/user/info` | Get full user info + preferences |
| `PATCH` | `/api/v1/user/avatar` | Update user avatar |

### Problems

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/problems` | List all problems |
| `GET` | `/api/problems/:id` | Get problem by ID |
| `POST` | `/api/problems` | Create problem (instructor/admin) |
| `PUT` | `/api/problems/:id` | Update problem (instructor/admin) |
| `DELETE` | `/api/problems/:id` | Delete problem (admin) |

### Submissions & Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/run` | Run code without submission |
| `POST` | `/api/submit` | Submit code for evaluation |
| `GET` | `/api/submissions/:id` | Get submission details |
| `GET` | `/api/problems/:id/submissions` | Get problem submissions |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| `docs/frontend-auth-flow.md` | Auth flows, route protection, API endpoints |
| `docs/autocomplete-language-dropdown-flow.md` | Editor language autocomplete |
| `docs/problem-page-flow.md` | Problem page architecture & backend integration |
| `docs/quiz-visibility-system.md` | Quiz visibility, access control, permissions |
| `docs/complete-problems-flow.md` | Complete problems flow documentation |
| `code-judge-backend/QUIZ_CREATION_FLOW.md` | Quiz creation backend flow |
| `code-judge-backend/REGISTRATION_FLOW.md` | User registration flow |
| `code-judge-backend/QUIZ_MODULE_BACKEND.md` | Quiz module backend docs |
| `code-judge-backend/AI_FILE_GENERATION_FLOW.md` | AI file generation flow |

---

## 🎯 Quiz & Assessment System

### Supported Subjects
- 📚 **Academics** — Math, Physics, OS, DBMS, Networks, AI, ML
- 💻 **Programming** — C, C++, Java, Python
- 📝 **Placement** — Aptitude, Reasoning, Verbal
- 🏢 **Company** — Google, Microsoft, Amazon
- 📜 **Certifications** — AWS, Azure, Docker

### Visibility Levels
| Level | Access |
|-------|--------|
| Global | Anyone can discover/attempt |
| College Only | Filter by college, department, year |
| Company Only | Filter by company, department, team |
| Private | Creator + collaborators only |
| Invite Only | Invited users by username/email |
| Contest Only | Registered participants |

### Assessment Features
- 🧩 **Lifelines** — 50-50, Hint, Extra Time, Skip, Reveal, Formula Sheet
- 📊 **Statistics** — Attempts, pass rate, avg score, completion rate
- 🤝 **Collaborators** — Roles: owner, admin, editor, reviewer, moderator, viewer
- ⏱️ **Scheduling** — Start/end times, registration deadline, attempt window

---

## 🧑‍💻 Supported Languages (Code Execution)

| Language | Runtime |
|----------|---------|
| Python | Python 3.x |
| JavaScript | Node.js |
| TypeScript | ts-node |
| Java | JDK 17 |
| C++ | GCC |
| C | GCC |
| Go | Go 1.x |
| Rust | Rust |

---

## 🎨 Design Language

- 🌑 Dark theme with glassmorphism cards
- 📐 Rounded corners (`16px`)
- 🔤 Inter font family
- ✨ Soft shadows & premium developer aesthetic
- 🎬 Smooth animations & hover effects

**Inspired by**: GitHub, Linear, Vercel, LeetCode Premium, Notion

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Your Name**

- GitHub: [@your-username](https://github.com/your-username)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/your-profile)
- Email: your.email@example.com

---

<p align="center">Built with ❤️ using Next.js 16, Express.js, PostgreSQL & TypeScript</p>
