# Problem Page Frontend Flow

## Overview

The problem page (`/problems/[problemId]`) is a fully client-rendered workspace combining problem metadata, a code editor, and rich tabbed content. It uses **React Resizable Panels** for layout, **Framer Motion** for transitions, and a centralized `useProblemData` hook for data.

---

## Page Architecture

```
ProblemClient (page.tsx)
├── Problem Header
│   ├── Title + Contest ID/Index
│   ├── Rating pill + Metadata pills
│   └── Run Code / Submit actions
├── Sticky Tab Navigation
│   └── Description | Examples | Constraints | Hints | Editorial | Solutions | Discussion | Submissions | AI Analysis
└── Resizable Workspace
    ├── Left Panel (Problem Content)
    │   ├── Description Tab
    │   ├── Examples Tab
    │   ├── Constraints Tab
    │   ├── Hints Tab
    │   ├── Editorial Tab
    │   ├── Solutions Tab
    │   ├── Discussion Tab
    │   ├── Submissions Tab
    │   └── AI Analysis Tab
    ├── Resizer
    └── Right Panel (Editor + Console)
        ├── Editor Toolbar (language, theme, font size)
        ├── Monaco Editor
        ├── Bottom Resizer
        └── Console Tabs
```

---

## Data Flow

### `useProblemData(problemId)`

Located in `src/mocks/useProblemData.ts`.

```typescript
const { data, loading, error } = useProblemData(problemId);
```

- Simulates a 350–500ms network delay
- Returns a `ProblemData` object containing:
  - `submissions` — 45 mock submissions
  - `discussions` — 18 mock discussion threads
  - `editorial` — structured editorial content
  - `solutions` — 5 accepted solutions in multiple languages
  - `aiAnalysis` — AI-generated problem analysis
  - `hints` — 5 progressive hints
  - `statistics` — acceptance rate, averages
  - `similarProblems` — 6 similar problems

**Backend integration**: Replace the body of `useProblemData` with real API calls. Components remain unchanged.

---

## Tab Navigation

### Structure

Tabs are defined in `ProblemClient.tsx`:

```typescript
const tabs = [
  { id: "description", label: "Description", icon: FileText },
  { id: "examples", label: "Examples", icon: Code2 },
  { id: "constraints", label: "Constraints", icon: Scale },
  { id: "hints", label: "Hints", icon: Lightbulb, badge: 3 },
  { id: "editorial", label: "Editorial", icon: BookOpen },
  { id: "solutions", label: "Solutions", icon: CheckCheck },
  { id: "discussion", label: "Discussion", icon: MessageSquare, badge: 18 },
  { id: "submissions", label: "Submissions", icon: History },
  { id: "ai-analysis", label: "AI Analysis", icon: Sparkles, isAi: true },
];
```

### Styling

- **Sticky** below header with `backdrop-blur-xl` and `bg-[#0B0D12]/80`
- **Active state**: background tint `#1F6FEB15`, colored icon/text, animated underline via `layoutId="activeTab"`
- **Hover**: entire tab gets lighter background (`#171A22`)
- **Icons**: Lucide icons, muted until active
- **Badges**: rounded-full for Hints (3) and Discussion (18)
- **AI Analysis**: gradient text `#7C3AED → #4F8CFF`, purple/blue glow on active
- **Responsive**: horizontal scroll on tablet/mobile, no wrapping

---

## Tab Content Rendering

### Direct Render (No Loading)

- `description` — renders problem statement + Examples panel inline
- `examples` — renders `ExamplesPanel` with sample test tabs
- `constraints` — renders input/output specs and constraints via `MathRenderer`

### Async Tabs (With Skeletons)

- `hints` — renders hint cards from `data.hints`
- `editorial` — renders editorial sections from `data.editorial`
- `solutions` — renders code blocks from `data.solutions`
- `discussion` — renders discussion threads from `data.discussions`
- `submissions` — filters `data.submissions` to current user only
- `ai-analysis` — renders AI analysis dashboard from `data.aiAnalysis`

### Skeleton States

While `loading === true`, show:
- `TabSkeleton` — placeholder tab bar
- `SubmissionRowSkeleton` — placeholder submission rows
- `DiscussionCardSkeleton` — placeholder discussion cards

---

## Current User Submissions

The Submissions tab filters to show only the logged-in user's submissions:

```typescript
const currentUser = useAuthStore((s) => s.user);
const userSubmissions = data.submissions.filter(sub => sub.user.id === currentUser?.id);
```

If `currentUser` is null, no submissions are shown.

---

## Resizable Panels

- **Left panel**: problem content, default size 48%, min 30%
- **Right panel**: editor + console, default size 52%, min 35%
- **Horizontal resizer**: purple glow on hover
- **Vertical resizer**: between editor and console

Layout preferences are persisted to `localStorage` under keys:
- `split-pane-left-width`
- `split-pane-console-height`

---

## Editor

- **Monaco Editor** wrapped in `MonacoEditorWrapper`
- **Language selector**: JavaScript, Python, Java, C++
- **Theme selector**: VS Dark, Monokai, GitHub Dark
- **Font size**: 12, 14, 16, 18
- **Toolbar**: Reset and Fullscreen buttons
- Default code template: C++ with fast I/O

---

## Examples Panel

- Renders `ExampleCard` components for input/output
- Supports multiple examples with tab selector
- Copy button for each code block
- Explanation section if available
- "Run Sample" button

---

## Math Rendering

`MathRenderer.tsx` handles:
- HTML sanitization
- KaTeX rendering for `$...$` and `$$...$$`
- Auto-wrapping `^` exponents: `10^9` → `10^{9}`
- Digit base support: `2^31`, `2^n`

---

## Rating Colors

Shared utility `getRatingHex(rating)` in `src/lib/helpers.ts`:

| Rating | Color |
|--------|-------|
| < 1200 | `#9CA3AF` (grey) |
| 1200+ | `#22C55E` (green) |
| 1400+ | `#F59E0B` (orange) |
| 1600+ | `#3B82F6` (blue) |
| 1900+ | `#7C3AED` (purple) |
| >= 2100 | `#F97316` (orange) |
| >= 2400 | `#EF4444` (red) |

Used by `RatingBadge.tsx` and `ProblemClient.tsx` to ensure consistent colors across the app.

---

## Backend Integration Checklist

- [ ] Replace `useProblemData` mock delay with real API calls
- [ ] Map backend response shape to `ProblemData` interface
- [ ] Add error handling for failed fetches
- [ ] Implement pagination/infinite scroll for submissions/discussions if needed
- [ ] Add optimistic updates for submissions
- [ ] Replace `useAuthStore` with real auth context if needed
- [ ] Add real-time updates for discussion replies