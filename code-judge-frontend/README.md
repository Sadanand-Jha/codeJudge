# ByteClash Frontend

AI-powered competitive programming platform built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, and **Zustand**.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design tokens
- **State**: Zustand for global auth/theme/UI state
- **Animations**: Framer Motion
- **Editor**: Monaco Editor
- **Layout**: React Resizable Panels
- **Icons**: Lucide React
- **Math**: KaTeX via MathRenderer

## Project Structure

```
src/
├── app/
│   ├── (app)/                    # Authenticated app routes
│   │   ├── problems/
│   │   │   └── [problemId]/
│   │   │       └── page.tsx
│   │   ├── dashboard/
│   │   ├── profile/
│   │   ├── settings/
│   │   └── layout.tsx
│   ├── (auth)/                   # Public auth routes
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── api/                      # Route handlers
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/
│   ├── problem/
│   │   ├── ProblemClient.tsx     # Main problem page orchestrator
│   │   ├── RatingBadge.tsx       # Color-coded rating pill
│   │   ├── MathRenderer.tsx      # KaTeX + HTML math renderer
│   │   ├── ProblemSkeleton.tsx   # Loading skeletons
│   │   ├── Examples.tsx
│   │   └── ...
│   ├── editor/
│   │   └── MonacoEditor.tsx      # Code editor wrapper
│   ├── ui/                       # Reusable UI primitives
│   ├── forms/
│   ├── layout/
│   └── guards/
│       └── AuthGuard.tsx         # Route protection
├── mocks/                        # Frontend-only mock data layer
│   ├── useProblemData.ts         # Central hook for problem data
│   ├── users.ts
│   ├── submissions.ts
│   ├── discussions.ts
│   ├── editorial.ts
│   ├── solutions.ts
│   ├── aiAnalysis.ts
│   ├── hints.ts
│   ├── statistics.ts
│   └── similarProblems.ts
├── store/                        # Zustand global state
│   ├── authStore.ts
│   ├── themeStore.ts
│   ├── toastStore.ts
│   └── userStore.ts
├── services/                     # API service layer
├── lib/                          # Utilities and helpers
│   ├── helpers.ts                # Shared helpers (e.g., rating colors)
│   └── axios.ts
├── types/                        # TypeScript interfaces
├── config/                       # App config (dicebear, theme, routes)
└── styles/
```

## Key Design Decisions

- **Mock-first**: All problem-page content is mocked in `src/mocks/`. Components consume a single `useProblemData` hook, so swapping to real APIs later only requires replacing the hook implementation.
- **Component-driven tabs**: Problem tabs use Lucide icons, animated underlines, and a sticky glassmorphic nav.
- **Shared rating colors**: `getRatingHex()` in `src/lib/helpers.ts` centralizes rating color logic for problem list, problem page, and rating badges.
- **Math rendering**: `MathRenderer.tsx` auto-wraps `^` exponents and sanitizes HTML before rendering with KaTeX.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# TypeScript check
npx tsc --noEmit

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Documentation

- `docs/frontend-auth-flow.md` — Registration, login, forgot-password flows, route protection, and API endpoints
- `docs/autocomplete-language-dropdown-flow.md` — Editor language autocomplete behavior
- `docs/problem-page-flow.md` — Problem page architecture, data flow, tabs, resizable panels, editor, math rendering, and backend integration checklist
- `docs/quiz-visibility-system.md` — Quiz visibility levels, access control, permissions, collaborators, scheduling, and backend integration

## Quiz & Assessment Platform

The platform includes a universal **Assessment & Quiz Platform** supporting quizzes on any subject — academics, placements, company assessments, certifications, and community challenges.

### User Flow
1. **Quiz Dashboard** (`/quiz`) — personalized landing with stats, upcoming assessments, daily challenge, performance overview, continue learning, and my quizzes
2. **Quiz Details** (`/quiz/[quizId]`) — cover image, creator info, description, learning outcomes, statistics, prerequisites, rewards
3. **Registration** (`/quiz/[quizId]/register`) — quiz summary, attempts remaining, lifelines, assessment rules, confirmation
4. **Lobby** (`/quiz/[quizId]/lobby`) — countdown, system check, ready button
5. **Attempt** (`/quiz/[quizId]/attempt`) — timer, progress, question navigation, answer selection
6. **Results** (`/quiz/[quizId]/results`) — score, rank, leaderboard, performance breakdown
7. **Creation** (`/quiz/create`) — multi-step wizard: basic info, visibility, questions, assessment settings, lifelines

### Supported Subjects
Academics (Math, Physics, OS, DBMS, Networks, AI, ML, etc.) · Programming Languages (C, C++, Java, Python, etc.) · Competitive Programming (Codeforces, CodeChef, AtCoder) · Placement Prep (Aptitude, Reasoning, Verbal) · Company Assessments (Google, Microsoft, Amazon) · Professional Certifications (AWS, Azure, Docker, etc.) · General Knowledge

### Visibility Levels
- **Global** — anyone can discover/attempt
- **College Only** — filter by college, department, year, section
- **Company Only** — filter by company, department, team, role
- **Organization/Club** — member-only access
- **Classroom/Batch** — enrolled students only
- **Unlisted** — link-only access
- **Private** — creator + collaborators only
- **Invite Only** — invited users by username/email
- **Contest Only** — registered participants only

### Assessment Features
- **Quiz Creation**: Question builder with multiple choice, true/false, code output, text answers — each with options, correct answer, points, and explanations
- **Assessment Settings**: passing score, attempts allowed, negative marking, randomize questions/options, time limits, question navigation, leaderboard, certificates, discussion, bookmarks, practice mode
- **Lifelines**: 50-50, Hint, Extra Time (+30s), Skip, Reveal Explanation, Formula Sheet — each individually configurable with max usage limits
- **Scheduling**: start/end times, registration deadline, attempt window
- **Access Restrictions**: verified email/college/company, invite code, password, min XP/rating
- **Discovery Permissions**: granular toggles for view, attempt, comment, discuss, share, rate, bookmark, clone, edit
- **Collaborators**: add/remove users with roles (owner, admin, editor, reviewer, moderator, viewer)
- **Statistics**: attempts, pass rate, average score, average time, bookmarks, likes, shares, rating, completion rate

### Architecture
- Types: `src/types/quiz.ts` — all quiz, attempt, result, lifeline, assessment settings interfaces
- Mock data: `src/mocks/quizData.ts` — quizzes, questions, attempts, results, creator info
- Visibility hook: `src/mocks/useQuizVisibility.ts`
- Creation components: `src/components/quiz/` (QuestionBuilder, VisibilitySelector, AssessmentSettingsPanel, etc.)
- Student components: `src/app/quiz/` (dashboard, details, register, lobby, attempt, results)
- Creation page: `src/app/quiz/create/page.tsx`
- Documentation: `docs/quiz-visibility-system.md`

## Design Language

- Dark theme with glassmorphism cards
- Rounded corners (`16px`)
- Inter font
- Soft shadows and premium developer aesthetic
- Smooth animations and hover effects
- Inspiration: GitHub, Linear, Vercel, LeetCode Premium, Notion