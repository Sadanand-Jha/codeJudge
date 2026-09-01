# ⚡ ByteClash Frontend

> AI-Powered Competitive Programming & Assessment Platform

ByteClash is a full-featured competitive programming platform with an integrated quiz/assessment system, real-time code editor, and AI-powered analytics — built for developers, students, and organizations.

---

## 🧠 About the Project

ByteClash Frontend is the client-side application for the ByteClash platform. It provides a modern, responsive interface for solving coding problems, taking quizzes, tracking progress, and competing with peers. The platform supports multiple visibility levels, lifelines, and assessment features for both individual and organizational use.

---

## ✨ Key Features

- 🧑‍💻 **Code Editor** — Monaco Editor with syntax highlighting, language autocomplete, and resizable panels
- 🧮 **Math Rendering** — KaTeX-powered math display for problem statements and editorial content
- 🎯 **Quiz Platform** — Universal assessment system with lifelines, scheduling, and leaderboards
- 🎭 **Avatar System** — 20 DiceBear avatars with instant preview and secure backend validation
- 🌗 **Dark Theme** — Glassmorphism UI with smooth animations and premium developer aesthetic
- 📊 **Mock-First Architecture** — Easy API swap with centralized `useProblemData` hook

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS with custom design tokens |
| **State** | Zustand (auth, theme, UI) |
| **Animations** | Framer Motion |
| **Code Editor** | Monaco Editor |
| **Layout** | React Resizable Panels |
| **Icons** | Lucide React |
| **Math** | KaTeX via MathRenderer |
| **Avatars** | DiceBear Adventurer Style |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (or yarn/pnpm)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/byteclash-frontend.git
cd byteclash-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript type check
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Optional: Additional environment variables
# NEXT_PUBLIC_APP_NAME=ByteClash
# NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (app)/                # Authenticated routes
│   │   ├── problems/
│   │   ├── dashboard/
│   │   ├── profile/
│   │   └── settings/
│   ├── (auth)/               # Public auth routes
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   └── api/                  # Route handlers
├── components/
│   ├── problem/              # Problem page components
│   ├── editor/               # Monaco editor wrapper
│   ├── ui/                   # Reusable UI primitives
│   ├── quiz/                 # Quiz creation components
│   └── guards/               # Auth route protection
├── mocks/                    # Mock data layer
├── store/                    # Zustand state management
├── services/                 # API service layer
├── lib/                      # Utilities & helpers
├── types/                    # TypeScript interfaces
└── config/                   # App configuration
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/user/profile` | Fetch basic user profile |
| `GET` | `/api/auth/me` | Fetch complete user info |
| `PATCH` | `/api/user/avatar` | Update user avatar |

### User Info Response (`/api/auth/me`)

Returns complete user data including:
- **Basic**: id, username, email, role
- **Profile**: firstName, lastName, mobile, avatarUrl, bio
- **Location**: country, state, college, company
- **Stats**: rating, maxRating
- **Status**: isVerified, isActive, lastLogin
- **Preferences**: theme, editor settings, animation speed, etc.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| `docs/frontend-auth-flow.md` | Auth flows, route protection, API endpoints |
| `docs/autocomplete-language-dropdown-flow.md` | Editor language autocomplete behavior |
| `docs/problem-page-flow.md` | Problem page architecture & backend integration |
| `docs/quiz-visibility-system.md` | Quiz visibility, access control, permissions |

---

## 🎯 Quiz & Assessment System

### Supported Subjects
- 📚 **Academics** — Math, Physics, OS, DBMS, Networks, AI, ML
- 💻 **Programming** — C, C++, Java, Python
- 🏆 **Competitive** — Codeforces, CodeChef, AtCoder
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

<p align="center">Built with ❤️ using Next.js 16 & TypeScript</p>
