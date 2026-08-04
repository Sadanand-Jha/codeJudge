# Quiz Leaderboard System

## Overview

The Quiz Leaderboard system extends the existing quiz module with a configurable leaderboard feature. It reuses the Contest Leaderboard design and adapts it for quiz-specific data.

## Features

### 1. Leaderboard Settings

**Location:** Quiz Settings → Behaviour → Leaderboard Settings

**Main Setting:**
- **Show Leaderboard to Participants** (Default: Enabled)
  - If enabled, students can view the quiz leaderboard after completing the quiz
  - If disabled, only quiz creators and administrators can view leaderboard standings

**Additional Settings** (visible when "Show Leaderboard to Participants" is enabled):
- Show only Top 10
- Show only student's own rank
- Hide participant names (anonymous leaderboard)
- Show leaderboard only after quiz ends
- Show live leaderboard during quiz
- Show leaderboard after all participants have submitted
- Real-time Ranking Updates

### 2. Leaderboard Page

**Route:** `/quiz/[quizId]/leaderboard`

**Features:**
- Reuses Contest Leaderboard design language
- Statistics header with summary cards
- Search and filters (student name, college, status, score range)
- Sort options (Rank, Marks, Time, Submission Time)
- Responsive table with all required columns
- Rank badges (🥇 Gold, 🥈 Silver, 🥉 Bronze, Top 10 highlighted)
- Current user row highlighted with accent color
- Hide names toggle for anonymous mode

**Columns:**
1. Rank (with badges)
2. Student (avatar + name)
3. College
4. Marks
5. Percentage (with progress bar)
6. Correct
7. Wrong
8. Skipped
9. Time Taken
10. Submission Time
11. Status

**Status Values:**
- Completed
- Timed Out
- Submitted Late
- Disconnected (future)

### 3. Leaderboard Access Logic

**Access Rules:**
- If Leaderboard is **Enabled** and **Show to Participants** is checked:
  - Students can view leaderboard after submitting quiz
  - View Score, View Analytics, View Leaderboard buttons shown
  
- If Disabled or Show to Participants is unchecked:
  - Students cannot access leaderboard
  - Message: "The quiz creator has disabled leaderboard visibility for participants."
  
- Admins and quiz creators always have full access

**Timing Conditions:**
- `showLiveDuringQuiz`: Visible during active quiz
- `showAfterQuizEnds`: Visible after quiz ends
- `showAfterAllSubmitted`: Visible only after all participants submit

### 4. Result Summary Integration

**Location:** `/quiz/[quizId]/results`

**Changes:**
- Added leaderboard section showing top entries
- "View Full Leaderboard" button links to `/quiz/[quizId]/leaderboard`
- If leaderboard disabled for participants, shows disabled state with message
- Creators/admins see "Creator View" badge

## File Structure

```
src/
├── types/
│   └── quiz.ts                          # Updated QuizLeaderboardSettings interface
├── components/
│   └── quiz/
│       └── QuizSettings.tsx             # Updated leaderboard settings UI
├── app/
│   └── (app)/
│       └── quiz/
│           └── [quizId]/
│               ├── leaderboard/
│               │   └── page.tsx         # New leaderboard page
│               └── results/
│                   └── page.tsx         # Updated with leaderboard section
├── hooks/
│   └── useLeaderboardAccess.ts          # New access control hook
├── services/
│   └── quiz.ts                          # New API functions
└── mocks/
    └── quizData.ts                      # Mock data for leaderboard
```

## API Endpoints

### Get Leaderboard
```
GET /api/v1/user/quiz/:quizId/leaderboard
Query Params: userId (optional)
Response: QuizLeaderboardResponse
```

### Get Leaderboard Settings
```
GET /api/v1/user/quiz/:quizId/leaderboard/settings
Response: QuizLeaderboardSettings
```

### Update Leaderboard Settings
```
PATCH /api/v1/user/quiz/:quizId/leaderboard/settings
Body: Partial<QuizLeaderboardSettings>
Response: QuizLeaderboardSettings
```

## Data Structures

### QuizLeaderboardSettings
```typescript
interface QuizLeaderboardSettings {
  enabled: boolean;
  showToParticipants: boolean;
  showTop10Only: boolean;
  showOnlyOwnRank: boolean;
  anonymousMode: boolean;
  hideUntilEnd: boolean;
  showAfterQuizEnds: boolean;
  showLiveDuringQuiz: boolean;
  showAfterAllSubmitted: boolean;
  realtimeRanking: boolean;
}
```

### QuizLeaderboardEntry
```typescript
interface QuizLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  college?: string;
  marks: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTaken: number;
  submissionTime: string;
  status: "completed" | "timed_out" | "submitted_late" | "disconnected";
}
```

## Sorting Logic

The leaderboard is sorted by:
1. **Primary:** Highest Marks (DESC)
2. **Secondary:** Lowest Time Taken (ASC)

If two students have equal marks, the one with lower completion time ranks higher.

**Note:** Sorting is performed by the backend. The frontend should not perform ranking calculations manually.

## Usage

### Using the Access Hook

```typescript
import { useLeaderboardAccess, LeaderboardAccessGate } from "@/hooks/useLeaderboardAccess";

function MyComponent({ quiz }) {
  const { canView, reason, isCreatorOrAdmin } = useLeaderboardAccess({
    quizCreatorId: quiz.creatorId,
    leaderboardSettings: quiz.leaderboardSettings,
    quizStatus: quiz.status,
    hasAllParticipantsSubmitted: false,
  });

  if (!canView) {
    return <div>Leaderboard unavailable: {reason}</div>;
  }

  return <LeaderboardTable />;
}
```

### Using the Gate Component

```typescript
import { LeaderboardAccessGate } from "@/hooks/useLeaderboardAccess";

function QuizPage({ quiz }) {
  return (
    <LeaderboardAccessGate
      quizCreatorId={quiz.creatorId}
      leaderboardSettings={quiz.leaderboardSettings}
      quizStatus={quiz.status}
      fallback={<CustomFallback />}
    >
      <LeaderboardTable />
    </LeaderboardAccessGate>
  );
}
```

## Future Enhancements

- [ ] Backend integration with actual API endpoints
- [ ] Real-time leaderboard updates via WebSocket
- [ ] Export leaderboard to CSV/PDF
- [ ] Detailed analytics per student
- [ ] Filter by question performance
- [ ] Comparison view with average/top performer
- [ ] Achievement badges on leaderboard
- [ ] Print-friendly leaderboard view

## Design Consistency

The quiz leaderboard maintains visual consistency with the contest leaderboard:
- Same color scheme and design tokens
- Same table styling and hover effects
- Same rank badges and podium design
- Same filter and pagination patterns
- Same responsive breakpoints

Only the data columns and content are adapted for quiz-specific metrics.