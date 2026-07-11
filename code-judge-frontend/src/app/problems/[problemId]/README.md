# Problem Details Page — Architecture Guide

## Overview

The Problem Details page renders a competitive programming problem with its statement, input/output specs, constraints, sample tests, and metadata. It follows a **70/30 layout** (main content + sticky sidebar) on desktop and stacks vertically on mobile.

---

## File Structure

```
src/
├── types/
│   └── problem.ts              # TypeScript interfaces
├── services/
│   └── problems.ts             # API data fetching
├── components/
│   └── problem/
│       ├── index.ts            # Barrel exports
│       ├── TagBadge.tsx        # Tag pill component
│       ├── RatingBadge.tsx     # Color-coded difficulty badge
│       ├── SectionTitle.tsx    # Section heading
│       ├── SafeHTML.tsx        # HTML renderer with prose styles
│       ├── ProblemHeader.tsx   # Title + metadata row
│       ├── ProblemInfoCard.tsx # Sidebar info card
│       ├── ProblemStatement.tsx# Statement + Input + Output + Constraints + Notes
│       ├── SampleTestCard.tsx  # Sample test with copy button
│       └── ProblemSkeleton.tsx # Loading skeleton
└── app/
    └── problems/
        └── [problemId]/
            ├── page.tsx        # Server component (entry point)
            ├── ProblemClient.tsx # Client component (layout + composition)
            └── README.md        # This document
```

---

## The `import ProblemClient from "./ProblemClient"` Pattern

In `page.tsx` (line 2), the client component is imported via a **co-located relative path**:

```typescript
import ProblemClient from "./ProblemClient";
```

This works because `ProblemClient.tsx` lives in the **same directory** as `page.tsx`:

```
src/app/problems/[problemId]/
├── page.tsx           # imports ProblemClient from ./ProblemClient
├── ProblemClient.tsx  # default export: the client component
└── README.md
```

**Why co-locate?**
- Next.js enforces that page files be named `page.tsx` inside route directories.
- The client component (`ProblemClient.tsx`) is route-specific logic — it has no reuse outside this problem route.
- Co-location avoids unnecessary nesting and keeps the route directory self-contained.
- `page.tsx` stays thin (server-only data fetching + error handling), while all interactive UI lives in `ProblemClient.tsx`.

---

## Data Flow

```
1. User navigates to /problems/[problemId]
         │
         ▼
2. page.tsx (Server Component)
   ├── Calls fetchProblem(problemId) from services/problems.ts
   ├── On success → renders <ProblemClient problem={data} />
   ├── On error   → renders "Problem not found" empty state
   └── Also generates <head> metadata via generateMetadata()
         │
         ▼
3. ProblemClient.tsx (Client Component)
   ├── Computes breadcrumb items
   ├── Renders layout grid:
   │   ├── Main (70%):  ProblemHeader → ProblemStatement → SampleTestCard[]
   │   └── Sidebar (30%): ProblemInfoCard + future feature placeholders
   └── Passes props down to each child component
```

---

## Component Responsibilities

### Server Layer (`page.tsx`)

- **Data fetching** — calls the API, handles loading/error states
- **Metadata** — generates `<title>` and `<meta description>` for SEO
- **Error boundary** — shows empty state with "Browse Problems" link if fetch fails
- **No interactivity** — pure server component, zero JS bundle

### Client Layer (`ProblemClient.tsx`)

- **Layout orchestration** — composes all child components into the 70/30 grid
- **Breadcrumb** — renders navigation with `ChevronRight` separators
- **Future feature slots** — disabled buttons for AI Coach, Submit, Run Code, Editorial, Discussion, etc.

### Reusable Components

| Component | Input | Output |
|---|---|---|
| `ProblemHeader` | title, contestId, problemIndex, rating, source, problemId | Large heading + metadata badges row |
| `ProblemStatement` | statement, input/output specs, constraints, notes | Rendered HTML sections with optional constraints card |
| `SampleTestCard` | sample (input, output, explanation), index | Code blocks with copy button |
| `ProblemInfoCard` | rating, time/memory limits, contest, source, problemId, tags | Sticky sidebar card with info rows + tag badges |
| `TagBadge` | tag string | Rounded pill with hover effect |
| `RatingBadge` | rating number | Color-coded badge (8 tiers: Newbie → LGM) |
| `SafeHTML` | html string, className | Renders HTML with Tailwind prose-invert |
| `SectionTitle` | children | Consistent h2 heading |
| `ProblemSkeleton` | none | Animated placeholder matching page layout |

---

## TypeScript Interfaces

```typescript
// src/types/problem.ts

interface SampleTest {
  input: string;
  output: string;
  explanation?: string | null;
}

interface Problem {
  id: string;
  problem_id: string;
  title: string;
  statement: string;
  input_specification: string;
  output_specification: string;
  constraints: string | null;
  notes: string | null;
  time_limit_ms: number;
  memory_limit_mb: number;
  rating: number | null;
  source: string | null;
  contest_id: string | null;
  problem_index: string | null;
  tags: string[];
  sample_tests: SampleTest[];
}
```

---

## Styling Approach

- **Tailwind CSS v4** — all styles via utility classes
- **Dark theme** — `zinc-900` backgrounds, `zinc-800` borders, `zinc-100` headings
- **Cards** — `rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm`
- **Typography** — `prose prose-invert` for HTML content
- **Animations** — `animate-pulse` for skeleton, `transition-colors duration-200` for hover effects
- **Responsive** — `lg:grid-cols-[1fr_320px]` for desktop, single column on mobile

---

## Future Extensibility

The page is designed so these features can be plugged in without restructuring:

| Feature | Location | Integration Point |
|---|---|---|
| AI Coach | Sidebar | Replace `FeatureButton("AI Coach")` with active component |
| Submit Solution | Sidebar | Replace `FeatureButton("Submit Solution")` |
| Run Code | Sidebar | Replace `FeatureButton("Run Code")` |
| Editorial | Sidebar tabs | Replace `TabItem("Editorial")` with link/route |
| Discussion | Sidebar tabs | Replace `TabItem("Discussion")` with link/route |
| Accepted Submissions | Sidebar tabs | Replace `TabItem("Accepted Submissions")` |
| Related Problems | Sidebar tabs | Replace `TabItem("Related Problems")` |

---

## Edge Cases Handled

- **Null rating** → shows "Unrated" badge
- **Null constraints** → hides the constraints section entirely
- **Null notes** → hides the notes section entirely
- **Empty sample_tests** → hides the Examples section
- **Null contest_id / problem_index** → title renders without prefix
- **Null source** → hides source badge
- **API failure** → shows "Problem not found" empty state with navigation link
- **Loading state** → animated skeleton matching the full page layout