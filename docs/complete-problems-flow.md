# Complete Problems Flow — Frontend ↔ Backend

## Overview

When a user visits `/problems` or `/problems/[id]`, the request flows through:

```
Browser → Next.js Server (SSR) → Backend API → PostgreSQL
```

---

## FLOW 1: `/problems` — List All Problems

### Step-by-step trace

```
User visits /problems
    │
    ▼
[FRONTEND] code-judge-frontend/src/app/problems/page.tsx  (SERVER COMPONENT)
    │
    ├── Calls fetchProblems() from services/problems.ts
    │     │
    │     └── GET http://localhost:8000/api/problems
    │           (NEXT_PUBLIC_API_URL + "/problems")
    │
    ▼
[BACKEND]  code-judge-backend/src/server.ts
    │   Express app listens on port 8000
    │
    ▼
code-judge-backend/src/app.ts
    │   app.use("/api", apiRoutes)  →  routes/index.routes.ts
    │
    ▼
code-judge-backend/src/routes/index.routes.ts
    │   router.use("/problems", problemRoutes)
    │
    ▼
code-judge-backend/src/routes/problem.routes.ts
    │   router.get("/", getAllProblems)
    │
    ▼
code-judge-backend/src/controllers/problem.controller.ts
    │   getAllProblems(_req, res, next)
    │     │
    │     └── problemService.getAllProblems()
    │           │
    │           ▼
    │   code-judge-backend/src/services/problem.service.ts
    │       getAllProblems()
    │         │
    │         └── repository.getAllProblems()
    │               │
    │               ▼
    │   code-judge-backend/src/repositories/problem.repository.ts
    │       getAllProblems()
    │         │  SQL:
    │         │  SELECT p.id, p.problem_id, p.title, p.rating,
    │         │         p.time_limit_ms, p.memory_limit_mb,
    │         │         p.source, p.contest_id, p.problem_index,
    │         │         COALESCE(json_agg(t.name), '[]') AS tags
    │         │  FROM problems p
    │         │  LEFT JOIN problem_tags pt ON pt.problem_id = p.id
    │         │  LEFT JOIN tags t ON t.id = pt.tag_id
    │         │  GROUP BY p.id ORDER BY p.id ASC
    │         │
    │         └── result.rows → mapRowToListItem() → ProblemListItem[]
    │               │
    │               ▼
    │   Returns: ProblemListItem[] (typed via types/index.ts)
    │
    └── res.status(200).json({ success: true, data: problems })
    │
    ▼
Response JSON:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "problem_id": "4A",
      "title": "Watermelon",
      "rating": 800,
      "time_limit": "1000 ms",
      "time_limit_ms": 1000,
      "space_limit": "256 MB",
      "memory_limit_mb": 256,
      "tags": ["math"],
      "source": "Codeforces",
      "contest_id": "4",
      "problem_index": "A"
    },
    ...
  ]
}
    │
    ▼
[FRONTEND] services/problems.ts
    │   fetchProblems()
    │     │  fetch(`${API_BASE}/problems`)
    │     │  response.json() → ApiResponse<ProblemListItem[]>
    │     │  if (!json.success) throw Error
    │     │  return json.data   // ✅ unwraps the envelope
    │
    ▼
page.tsx receives ProblemListItem[]
    │
    └── <ProblemsList problems={problems} />
          │
          ▼
ProblemsList.tsx (CLIENT COMPONENT)
    │  props: ProblemListItem[]
    │
    ├── Renders breadcrumb, header, search input
    ├── Filters by title, problem_id, tags, source
    └── Renders table:
        ┌──────┬────────────────────┬────────┬──────────┬────────┬──────┐
        │  ID  │       Title        │ Rating │   Tags   │ Source │ View │
        ├──────┼────────────────────┼────────┼──────────┼────────┼──────┤
        │ 4A   │ 4A — Watermelon    │  800   │  math    │ CF     │ View │
        │ 71A  │ 71A — Way Too Long │  800   │ strings  │ CF     │ View │
        └──────┴────────────────────┴────────┴──────────┴────────┴──────┘
        │
        └── Each row links to /problems/{problem.problem_id}
```

### Files Involved (List All Problems)

| Layer | File | Role |
|-------|------|------|
| Frontend Config | `.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:8000/api` |
| Frontend Types | `src/types/problem.ts` | Defines `ProblemListItem`, `ApiResponse<T>` |
| Frontend Service | `src/services/problems.ts` | `fetchProblems()` — calls API, unwraps response |
| Frontend Page | `src/app/problems/page.tsx` | Server component, fetches data, renders list or error |
| Frontend Client | `src/app/problems/ProblemsList.tsx` | Client component, renders searchable table |
| Frontend Component | `src/components/problem/RatingBadge.tsx` | Colored rating badge |
| Frontend Component | `src/components/problem/TagBadge.tsx` | Tag pill display |
| Backend Entry | `src/server.ts` | Starts server on port 8000 |
| Backend App | `src/app.ts` | Express app, mounts `/api` routes |
| Backend Routes | `src/routes/index.routes.ts` | Routes `/api/problems` → problem routes |
| Backend Routes | `src/routes/problem.routes.ts` | `GET /` → `getAllProblems` |
| Backend Controller | `src/controllers/problem.controller.ts` | `getAllProblems` — calls service, returns JSON |
| Backend Service | `src/services/problem.service.ts` | `getAllProblems()` — delegates to repository |
| Backend Repository | `src/repositories/problem.repository.ts` | SQL query + `mapRowToListItem()` |
| Backend Types | `src/types/index.ts` | `ProblemListItem`, `ApiSuccessResponse` |
| Backend DB | `database/migrations/01_problem_tables.sql` | Schema: `problems`, `tags`, `problem_tags` |

---

## FLOW 2: `/problems/[problemId]` — View Single Problem

### Step-by-step trace

```
User visits /problems/4A
    │
    ▼
[FRONTEND] code-judge-frontend/src/app/problems/[problemId]/page.tsx  (SERVER COMPONENT)
    │
    ├── params → { problemId: "4A" }
    ├── Calls fetchProblem("4A") from services/problems.ts
    │     │
    │     └── GET http://localhost:8000/api/problems/4A
    │
    ▼
[BACKEND]  Routes through same Express pipeline...
    │
code-judge-backend/src/routes/problem.routes.ts
    │   router.get("/:problemId", getProblemByProblemId)
    │
    ▼
code-judge-backend/src/controllers/problem.controller.ts
    │   getProblemByProblemId(req, res, next)
    │     │
    │     ├── validates problemId is non-empty string
    │     └── problemService.getProblemByProblemId("4A")
    │           │
    │           ▼
    │   code-judge-backend/src/services/problem.service.ts
    │       getProblemByProblemId("4A")
    │         │
    │         ├── repository.getProblemByProblemId("4A")
    │         │     │
    │         │     ▼
    │         │   code-judge-backend/src/repositories/problem.repository.ts
    │         │       getProblemByProblemId("4A")
    │         │         │  SQL:
    │         │         │  SELECT p.id, p.problem_id, p.title, p.rating,
    │         │         │         p.time_limit_ms, p.memory_limit_mb,
    │         │         │         p.statement, p.input_specification,
    │         │         │         p.output_specification, p.constraints,
    │         │         │         p.notes, p.source, p.contest_id,
    │         │         │         p.problem_index,
    │         │         │         COALESCE(json_agg(DISTINCT tags), '[]') AS tags_raw,
    │         │         │         COALESCE(json_agg(DISTINCT sample_testcases), '[]') AS sample_testcases
    │         │         │  FROM problems p
    │         │         │  LEFT JOIN problem_tags ON ...
    │         │         │  LEFT JOIN sample_testcases ON ...
    │         │         │  WHERE p.problem_id = '4A'
    │         │         │
    │         │         ├── not found? return null
    │         │         └── found? → mapRowToDetail() → ProblemDetail
    │         │
    │         └── if null, throws NotFoundError("Problem with ID '4A' not found")
    │               │
    │               └── Caught by controller → res.status(404).json({ success: false, message: ... })
    │
    └── res.status(200).json({ success: true, data: problem })
    │
    ▼
Response JSON:
{
  "success": true,
  "data": {
    "id": 1,
    "problem_id": "4A",
    "title": "Watermelon",
    "rating": 800,
    "time_limit": "1000 ms",
    "time_limit_ms": 1000,
    "space_limit": "256 MB",
    "memory_limit_mb": 256,
    "statement": "<p>One hot summer day...</p>",
    "input_specification": "<p>The first line...</p>",
    "output_specification": "<p>Print...</p>",
    "constraints": "<p>1 ≤ w ≤ 100</p>",
    "notes": null,
    "source": "Codeforces",
    "contest_id": "4",
    "problem_index": "A",
    "tags": ["math", "brute force"],
    "sample_tests": [
      { "input": "8", "output": "YES", "explanation": "8 can be split..." },
      { "input": "5", "output": "NO",  "explanation": null }
    ]
  }
}
    │
    ▼
[FRONTEND] services/problems.ts
    │   fetchProblem("4A")
    │     │  fetch(`${API_BASE}/problems/4A`)
    │     │  response.json() → ApiResponse<Problem>
    │     │  if (!json.success) throw Error
    │     │  return json.data   // ✅ unwraps the envelope
    │
    ▼
page.tsx receives Problem object
    │
    ├── generateMetadata() → sets page title & description from problem
    └── <ProblemClient problem={problem} />
          │
          ▼
ProblemClient.tsx (CLIENT COMPONENT)
    │  props: Problem
    │
    ├── Renders breadcrumb: Problems > 4A
    │
    ├── MAIN CONTENT (left column):
    │   │
    │   ├── <ProblemHeader
    │   │     title={problem.title}
    │   │     contestId={problem.contest_id}      // "4"
    │   │     problemIndex={problem.problem_index} // "A"
    │   │     rating={problem.rating}              // 800
    │   │     source={problem.source}              // "Codeforces"
    │   │     problemId={problem.problem_id}       // "4A"
    │   │   />
    │   │   └── Renders: "4A — Watermelon" + rating badge + source + ID
    │   │
    │   ├── <ProblemStatement
    │   │     statement={problem.statement}                  // HTML
    │   │     inputSpecification={problem.input_specification} // HTML
    │   │     outputSpecification={problem.output_specification} // HTML
    │   │     constraints={problem.constraints}              // HTML | null
    │   │     notes={problem.notes}                          // HTML | null
    │   │   />
    │   │   └── <SafeHTML html={...} /> for each section
    │   │       └── dangerouslySetInnerHTML with prose styling
    │   │
    │   └── if sample_tests.length > 0:
    │         <SectionTitle>Examples</SectionTitle>
    │         {sample_tests.map((sample, i) =>
    │           <SampleTestCard sample={sample} index={i} />
    │         )}
    │         └── Shows Input / Output code blocks with copy button
    │             If explanation exists, shows it too
    │
    └── SIDEBAR (right column):
        │
        └── <ProblemInfoCard
              rating={problem.rating}                    // 800
              timeLimitMs={problem.time_limit_ms}        // 1000
              memoryLimitMb={problem.memory_limit_mb}    // 256
              contestId={problem.contest_id}             // "4"
              source={problem.source}                    // "Codeforces"
              problemId={problem.problem_id}             // "4A"
              tags={problem.tags}                        // ["math", "brute force"]
            />
            ├── InfoRow: Rating → RatingBadge (800 · Pupil)
            ├── InfoRow: Time Limit → formatTime(1000) = "1.0 s"
            ├── InfoRow: Memory Limit → formatMemory(256) = "256 MB"
            ├── InfoRow: Contest → "4"
            ├── InfoRow: Source → "Codeforces"
            ├── InfoRow: Problem ID → "4A" (mono)
            └── Tags section: TagBadge for each tag

### Error handling
- If fetchProblem throws → shows "Problem not found" with link back to /problems
- If 404 from backend → caught by controller, returns { success: false, message }
- If service throws NotFoundError → controller returns 404 JSON
```

### Files Involved (View Single Problem)

| Layer | File | Role |
|-------|------|------|
| Frontend Config | `.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:8000/api` |
| Frontend Types | `src/types/problem.ts` | Defines `Problem`, `SampleTest`, `ProblemPageProps` |
| Frontend Service | `src/services/problems.ts` | `fetchProblem(id)` — calls API, unwraps response |
| Frontend Page | `src/app/problems/[problemId]/page.tsx` | Server component, SEO meta, renders Client or error |
| Frontend Client | `src/app/problems/[problemId]/ProblemClient.tsx` | Client component, layout with main + sidebar |
| Frontend Component | `src/components/problem/ProblemHeader.tsx` | Title + badges |
| Frontend Component | `src/components/problem/ProblemStatement.tsx` | Renders HTML sections |
| Frontend Component | `src/components/problem/SafeHTML.tsx` | dangerouslySetInnerHTML with prose |
| Frontend Component | `src/components/problem/SampleTestCard.tsx` | Input/Output/Explanation with copy |
| Frontend Component | `src/components/problem/ProblemInfoCard.tsx` | Sidebar card with info rows |
| Frontend Component | `src/components/problem/SectionTitle.tsx` | Section heading |
| Frontend Component | `src/components/problem/RatingBadge.tsx` | Colored rating |
| Frontend Component | `src/components/problem/TagBadge.tsx` | Tag display |
| Frontend Component | `src/components/problem/ProblemSkeleton.tsx` | Loading skeleton |
| Backend Routes | `src/routes/problem.routes.ts` | `GET /:problemId` → `getProblemByProblemId` |
| Backend Controller | `src/controllers/problem.controller.ts` | Validates, handles 404, returns JSON |
| Backend Service | `src/services/problem.service.ts` | Delegates to repository, throws NotFoundError |
| Backend Repository | `src/repositories/problem.repository.ts` | SQL query + `mapRowToDetail()` |
| Backend Types | `src/types/index.ts` | `ProblemDetail`, `SampleTestcase`, `NotFoundError` |

---

## Data Flow Diagram

```
                      ┌──────────────────────┐
                      │   PostgreSQL DB       │
                      │  (problems, tags,     │
                      │   problem_tags,       │
                      │   sample_testcases)   │
                      └──────────┬───────────┘
                                 │ SQL query
                                 ▼
┌──────────────────────────────────────────────────────┐
│           BACKEND (Express on :8000)                  │
│                                                       │
│  problem.repository.ts  ←  problem.service.ts        │
│  (SQL + mapRowTo*)           (business logic)        │
│        │                            │                │
│        └──────────┬─────────────────┘                │
│                   ▼                                  │
│         problem.controller.ts                        │
│         { success: true, data: ... }                 │
│                   │                                  │
│         routes/problem.routes.ts                     │
│         GET /api/problems                            │
│         GET /api/problems/:problemId                 │
│                   │                                  │
│         routes/index.routes.ts ─── app.ts ─── server│
└───────────────────┬──────────────────────────────────┘
                    │ HTTP JSON response
                    ▼
┌──────────────────────────────────────────────────────┐
│           FRONTEND (Next.js on :3000)                 │
│                                                       │
│  services/problems.ts                                 │
│  (fetch → unwrap { success, data })                   │
│         │                                             │
│         ▼                                             │
│  SSR Pages:                                           │
│  /problems/page.tsx                                   │
│    → ProblemsList.tsx (client)                        │
│    → RatingBadge, TagBadge                            │
│                                                       │
│  /problems/[problemId]/page.tsx                       │
│    → ProblemClient.tsx (client)                       │
│      → ProblemHeader                                  │
│      → ProblemStatement → SafeHTML                    │
│      → SampleTestCard                                 │
│      → ProblemInfoCard                                │
│        → RatingBadge, TagBadge                        │
└──────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

1. **Server-side rendering (SSR)** — Both list and detail pages fetch data server-side using `async` server components. This means the API call happens on the server, not the browser. SEO works out of the box.

2. **Response envelope** — Backend wraps all responses in `{ success: boolean, data: T }`. Frontend service layer unwraps it so components get clean typed data.

3. **Raw number fields** — Backend sends both formatted strings (`time_limit: "1000 ms"`) and raw numbers (`time_limit_ms: 1000`). This lets the `ProblemInfoCard` component do its own formatting via `formatTime()` and `formatMemory()`.

4. **HTML in problem content** — Statement, input/output spec, constraints, and notes are HTML strings stored in the DB. Frontend renders them via `SafeHTML` (dangerouslySetInnerHTML with Tailwind prose styling).

5. **No auth for problems** — The problems routes are public (no middleware). Auth-protected routes go through `/api/v1/user/...`.