# Quiz System Documentation

## Overview

The Quiz System is a comprehensive assessment platform built with Next.js and TypeScript. It supports creating, managing, and attempting quizzes with a rich set of features including live assessment rooms, various question types, visibility controls, and detailed analytics.

---

## Features

### Core Features
- **Quiz Creation Studio**: Rich question builder with 20+ question types
- **Quiz Dashboard**: Comprehensive management interface for quiz creators
- **Quiz Attempt**: Student-facing quiz taking interface with timer and navigation
- **Live Assessment Room**: Real-time teacher monitoring with animated participant view
- **Waiting Room**: Pre-quiz lobby with countdown and system checks
- **Results & Analytics**: Detailed performance tracking and leaderboards
- **Visibility & Access Control**: Granular control over who can access quizzes

### Question Types
- **Basic**: Single Choice, Multiple Select, True/False
- **Text**: Short Answer, Paragraph, Fill in Blanks, Table Fill
- **Programming**: Code Output (future)
- **Math**: Math expressions, Graph-based, Formula-based
- **Interactive**: Matching, Ordering, Drag & Drop, Categorize, Hotspot
- **Media**: Image Label, Drawing, Video Response, Audio Response, Poll, Word Cloud

### Assessment Features
- Configurable time limits per question and overall quiz
- Negative marking support
- Question and option randomization
- Lifelines (50:50, Hint, Extra Time, Skip, Reveal Explanation, Formula Sheet)
- Practice mode
- Auto-submit on timeout
- Certificates for passing scores
- Leaderboards
- Discussion forums
- Bookmarks

---

## File Structure

```
src/
├── app/(app)/quiz/
│   ├── page.tsx                          # Quiz dashboard listing
│   ├── create/
│   │   └── page.tsx                      # Quiz creation studio
│   └── [quizId]/
│       ├── page.tsx                       # Quiz details page
│       ├── dashboard/
│       │   └── page.tsx                   # Quiz management dashboard
│       ├── register/
│       │   └── page.tsx                   # Registration page
│       ├── lobby/
│       │   └── page.tsx                   # Pre-quiz lobby with system check
│       ├── waiting/
│       │   └── page.tsx                   # Student waiting room
│       ├── attempt/
│       │   └── page.tsx                   # Quiz attempt interface
│       ├── live/
│       │   └── page.tsx                   # Live assessment room (teacher)
│       └── results/
│           └── page.tsx                   # Results and leaderboard
├── components/quiz/
│   ├── quizComponents.tsx                 # Reusable UI components
│   ├── QuizDashboard.tsx                  # Quiz management dashboard
│   ├── QuizSettings.tsx                   # Settings configuration
│   ├── QuestionBuilderStudio.tsx          # Full-screen question builder
│   ├── QuestionBuilder.tsx                # Question editing component
│   ├── QuestionEditor.tsx                 # Individual question editor
│   ├── QuestionNavigator.tsx              # Question navigation sidebar
│   ├── QuizStudio.tsx                     # Quiz preview/playback
│   ├── LivePreview.tsx                    # Live preview component
│   ├── AssessmentSettingsPanel.tsx        # Assessment configuration
│   ├── CollaboratorManager.tsx            # Collaborator management
│   ├── CollegeFilterPanel.tsx             # College-based filtering
│   ├── PermissionToggle.tsx               # Permission toggles
│   ├── SchedulingPanel.tsx                # Schedule configuration
│   ├── VisibilitySelector.tsx             # Visibility level selector
│   └── live/                              # Live assessment components
│       ├── LiveAssessmentRoom.tsx          # Teacher monitoring room
│       ├── HeaderControls.tsx              # Room header with controls
│       ├── AnimatedCrowd.tsx               # Animated participant avatars
│       ├── LiveStatsPanel.tsx              # Statistics sidebar
│       ├── ActivityFeed.tsx                # Real-time activity feed
│       ├── ParticipantsDrawer.tsx          # Participants list drawer
│       ├── CountdownCard.tsx               # Quiz start countdown
│       ├── MagicalBackground.tsx           # Animated background
│       ├── StudentAvatar.tsx               # Individual avatar component
│       ├── QuizLandingCards.tsx            # Landing page action cards
│       ├── JoinQuizModal.tsx               # Join quiz modal
│       └── WaitingRoomToast.tsx            # Waiting room notifications
├── types/
│   ├── quiz.ts                            # Core quiz TypeScript types
│   └── liveAssessment.ts                  # Live assessment types
├── lib/
│   └── liveAssessmentHelpers.ts            # Live assessment utilities
├── mocks/
│   ├── quizData.ts                        # Quiz mock data
│   └── liveAssessment.ts                  # Live assessment mock data
└── config/
    └── quizTheme.ts                        # Quiz theme configuration
```

---

## Type Definitions

### Core Types (`src/types/quiz.ts`)

```typescript
// Quiz visibility levels
export type QuizVisibility =
  | "global"           // Anyone can discover/attempt
  | "college_only"     // Selected colleges
  | "company_only"     // Selected companies
  | "organization"     // Selected organizations/clubs
  | "classroom"        // Classroom members
  | "unlisted"         // Direct link only
  | "private"          // Creator + collaborators only
  | "invite_only"      // Invited users only
  | "contest_only";    // Contest participants

// Main quiz interface
export interface Quiz {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  visibility: QuizVisibility;
  visibilityConfig: QuizVisibilityConfig;
  questions: QuizQuestion[];
  totalPoints: number;
  timeLimit?: number; // minutes
  attemptsAllowed: number;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  status: "upcoming" | "active" | "completed" | "expired";
  createdAt: string;
  startTime?: string;
  endTime?: string;
  attempts: number;
  registeredCount: number;
  averageScore: number;
  assessmentSettings?: AssessmentSettings;
  coverImage?: string;
  passingScore?: number;
  learningOutcomes?: string[];
  prerequisites?: string[];
  languagesSupported?: string[];
  certificateEligible?: boolean;
}

// Question interface
export interface QuizQuestion {
  id: string;
  type: "single_choice" | "multiple_choice" | "true_false" | "text" | 
        "code_output" | "complexity" | "debugging" | "matching" | 
        "ordering" | "image_based";
  question: string;
  options?: string[];
  correctAnswer?: string | number | number[];
  explanation?: string;
  hint?: string;
  references?: string[];
  points: number;
  negativeMarks?: number;
  isBonus?: boolean;
  isMandatory?: boolean;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  estimatedTime?: number; // minutes
  topic?: string;
  subtopic?: string;
  tags: string[];
  randomizeOptions?: boolean;
  shuffleAnswers?: boolean;
  caseSensitive?: boolean;
  timeLimitPerQuestion?: number; // seconds
  codeLanguage?: string;
  matchingPairs?: Array<{ left: string; right: string }>;
  orderingItems?: string[];
}
```

### Studio Question Type (`src/types/quiz.ts`)

```typescript
// Extended question type for the quiz builder
export interface StudioQuestion {
  id: string;
  type: StudioQuestionType; // 20+ question types
  title: string;
  status: QuestionStatus; // "complete" | "incomplete"
  marks: number;
  negativeMarks: number;
  difficulty: StudioDifficulty;
  estimatedTime: number; // minutes
  tags: string[];
  topic?: string;
  subtopic?: string;
  visibility?: "visible" | "hidden";
  options: StudioOption[];
  correctAnswer: string | number | number[] | string[];
  explanation: string;
  hint?: string;
  references: StudioReference[];
  codeLanguage?: string;
  codeSnippet?: string;
  matchingPairs?: Array<{ id: string; left: string; right: string }>;
  orderingItems?: string[];
  randomizeOptions: boolean;
  caseSensitive: boolean;
  shuffleAnswers: boolean;
  timeLimitPerQuestion?: number; // seconds
  allowSkipping: boolean;
  isBonus: boolean;
  isMandatory: boolean;
  partialMarking: boolean;
  requireExplanation: boolean;
  images: Array<{ id: string; url: string; caption?: string }>;
  createdAt: string;
  updatedAt: string;
}
```

### Live Assessment Types (`src/types/liveAssessment.ts`)

```typescript
// Participant status in live room
export type ParticipantStatus =
  | "submitted"      // Completed quiz
  | "attempting"     // Currently answering
  | "idle"           // Inactive
  | "disconnected";  // Lost connection

// Connection quality
export type ConnectionQuality = "excellent" | "good" | "fair" | "poor";

// Live participant data
export interface LiveParticipant {
  id: string;
  username: string;
  avatar: string; // Emoji or short label
  avatarUrl?: string; // DiceBear URL
  status: ParticipantStatus;
  progress: number; // 0-100
  questionsAnswered: number;
  totalQuestions: number;
  currentQuestion: number;
  score?: number;
  timeSpent: number; // seconds
  connection: ConnectionQuality;
  joinedAt: string; // ISO string
  submittedAt?: string; // ISO string
  positionSeed: number; // 0-1 for crowd layout
}

// Live assessment room data
export interface LiveAssessmentRoomData {
  quizId: string;
  quizName: string;
  teacherName: string;
  subject: string;
  status: QuizRoomStatus; // "waiting" | "live" | "paused" | "ended"
  elapsedSeconds: number;
  totalDuration: number; // seconds
  scheduledStartAt?: string; // ISO string
  participants: LiveParticipant[];
  activity: ActivityEvent[];
  stats: LiveStats;
}
```

---

## Quiz Flow

### 1. Quiz Discovery (`/quiz`)

**File**: `src/app/(app)/quiz/page.tsx`

**Features**:
- Hero section with platform stats
- Category filters (Academics, Placements, Coding, Certifications, Organizations)
- Tab-based navigation (Upcoming, Active, Completed, My Quizzes, Bookmarks)
- Search functionality
- Grid/List view toggle
- Quick stats cards

**Key Components**:
- `QuizLandingCards`: Action cards for quick navigation
- `QuizCard`: Quiz card component
- `AssessmentCard`: Compact list view card

### 2. Quiz Details (`/quiz/[quizId]`)

**File**: `src/app/(app)/quiz/[quizId]/page.tsx`

**Features**:
- Quiz hero with cover image
- About section with learning outcomes and prerequisites
- Statistics (attempts, pass rate, avg score, bookmarks)
- Creator information
- Registration CTA

**Data Displayed**:
- Duration, questions count, total points
- Passing score, attempts allowed
- Negative marking info
- Languages supported
- Certificate eligibility

### 3. Registration (`/quiz/[quizId]/register`)

**File**: `src/app/(app)/quiz/[quizId]/register/page.tsx`

**Features**:
- Quiz summary card
- Attempts left display
- Available lifelines
- Assessment rules
- Student details form (name, roll number)
- Confirmation checkboxes

**Validation**:
- Name required
- Roll number required
- Rules confirmation required
- Agreement checkbox required

**On Success**: Redirects to `/quiz/[quizId]/lobby`

### 4. Lobby (`/quiz/[quizId]/lobby`)

**File**: `src/app/(app)/quiz/[quizId]/lobby/page.tsx`

**Features**:
- Countdown timer
- System checks:
  - Browser compatibility
  - Internet status
  - Tab switching detection
  - Fullscreen mode
- Quiz info display
- Enter assessment button

**On Countdown End**: Redirects to `/quiz/[quizId]/attempt`

### 5. Waiting Room (`/quiz/[quizId]/waiting`)

**File**: `src/app/(app)/quiz/[quizId]/waiting/page.tsx`

**Features**:
- Full-screen animated crowd background
- Real-time participant count
- Info cards (students, starts in, questions, type, max marks)
- Music and Chat buttons (placeholders)
- Register for quiz button
- Countdown to start
- Exit confirmation modal
- Participants drawer

**Real-time Updates**:
- Simulated participant additions
- Listens for quiz start flag via localStorage

### 6. Quiz Attempt (`/quiz/[quizId]/attempt`)

**File**: `src/app/(app)/quiz/[quizId]/attempt/page.tsx`

**Features**:
- Question navigation (previous/next, dot indicators)
- Timer with auto-submit
- Progress bar
- Answer selection
- Results screen with:
  - Total score and percentage
  - Question-by-question breakdown
  - Correct/incorrect indicators
  - Explanations for wrong answers

**Navigation**:
- Free navigation between questions
- Submit button in header
- Results view after submission

### 7. Live Assessment Room (`/quiz/[quizId]/live`)

**File**: `src/app/(app)/quiz/[quizId]/live/page.tsx`

**Purpose**: Teacher monitoring interface for live quizzes

**Features**:
- Start/Pause/End quiz controls
- Live timer
- Animated crowd of participants
- Real-time statistics:
  - Students joined
  - Currently active
  - Submitted count
  - Average progress
  - Average score
  - Average time
- Activity feed with events:
  - Joined
  - Submitted
  - Reached question
  - Disconnected/Reconnected
  - Started/Paused/Resumed
- Participants drawer with status indicators
- Connection quality indicators
- Refresh button

**Teacher Controls**:
- Start Quiz: Broadcasts start flag to waiting rooms
- Pause/Resume: Controls quiz state
- End: Terminates quiz
- Refresh: Manual data refresh

### 8. Results (`/quiz/[quizId]/results`)

**File**: `src/app/(app)/quiz/[quizId]/results/page.tsx`

**Features**:
- Overall score and percentage
- Stats grid:
  - Total score
  - Global rank
  - Total participants
  - Time taken
- Performance summary with all questions
- Leaderboard showing top performers
- Action buttons (Back to Dashboard, Try Again)

---

## Quiz Creation & Management

### Quiz Dashboard (`/quiz/[quizId]/dashboard`)

**File**: `src/app/(app)/quiz/[quizId]/dashboard/page.tsx`

**Main Component**: `QuizDashboard` (`src/components/quiz/QuizDashboard.tsx`)

**Tabs**:
- **Overview**: Quiz stats, quick actions, completion checklist, recent activity, question status
- **Questions**: Opens Question Builder Studio
- **Settings**: Opens Quiz Settings
- **Participants**: Placeholder (future)
- **Registrations**: Placeholder (future)
- **Leaderboard**: Placeholder (future)
- **Analytics**: Placeholder (future)
- **Discussion**: Placeholder (future)
- **Certificates**: Placeholder (future)
- **Announcements**: Placeholder (future)
- **Collaborators**: Placeholder (future)
- **Preview**: Quiz preview mode
- **Publish**: Publish checklist and action

### Quiz Creation Studio (`/quiz/create`)

**File**: `src/app/(app)/quiz/create/page.tsx`

**Features**:
- Top toolbar with:
  - Exit button
  - Quiz title display
  - Undo/Redo buttons
  - Save status indicator
  - Panel toggles (Navigator, Properties, Preview)
  - Settings button
  - Save Draft button
  - Publish button
- Question Navigator sidebar
- Question Editor main area
- Question type picker

**Question Editor Features**:
- Rich text toolbar (Bold, Italic, Lists, Images, Code, Links, Tables, Math)
- Image upload support
- Option management (add/remove/duplicate)
- Correct answer selection
- Points configuration
- Difficulty selection
- Time limit per question
- Validation with error messages

**Supported Question Types**:
```typescript
const QUESTION_TYPES = [
  { id: "single_choice", label: "Multiple Choice", category: "Basic" },
  { id: "multiple_choice", label: "Multiple Select", category: "Basic" },
  { id: "true_false", label: "True / False", category: "Basic" },
  { id: "text", label: "Short Answer", category: "Text" },
  { id: "paragraph", label: "Paragraph", category: "Text" },
  { id: "fill_blanks", label: "Fill in Blanks", category: "Text" },
  { id: "table_fill", label: "Table Fill", category: "Text" },
  { id: "code_output", label: "Programming", category: "Programming" },
  { id: "math", label: "Math", category: "Math" },
  { id: "graph", label: "Graph", category: "Math" },
  { id: "formula", label: "Formula", category: "Math" },
  { id: "matching", label: "Match", category: "Interactive" },
  { id: "ordering", label: "Reorder", category: "Interactive" },
  { id: "drag_drop", label: "Drag & Drop", category: "Interactive" },
  { id: "categorize", label: "Categorize", category: "Interactive" },
  { id: "hotspot", label: "Hotspot", category: "Interactive" },
  { id: "image_label", label: "Image Label", category: "Media" },
  { id: "drawing", label: "Drawing", category: "Media" },
  { id: "video_response", label: "Video Response", category: "Media" },
  { id: "audio_response", label: "Audio Response", category: "Media" },
  { id: "poll", label: "Poll", category: "Media" },
  { id: "word_cloud", label: "Word Cloud", category: "Media" },
];
```

**Auto-save**: Automatic save every 5 seconds when changes detected

**Validation**:
- Title required
- Minimum 2 options
- No empty options
- At least one correct answer
- Points must be > 0

---

## Quiz Visibility & Access Control

See [Quiz Visibility System Documentation](../docs/quiz-visibility-system.md) for detailed information.

### Visibility Levels
1. **Global**: Anyone on platform
2. **College Only**: Specific colleges, departments, years, sections
3. **Company Only**: Specific companies, departments, teams, roles
4. **Organization**: Specific organizations/clubs
5. **Classroom**: Enrolled classroom members
6. **Unlisted**: Direct link only
7. **Private**: Creator + invited collaborators
8. **Invite Only**: Specific invited users
9. **Contest Only**: Contest participants

### Access Restrictions
- Verified email
- Verified college
- Verified company
- Invite code
- Password
- Minimum XP
- Minimum rating
- Prerequisite quiz
- Organization membership

### Discovery Permissions
- View
- Attempt
- Comment
- Discuss
- Share
- Rate
- Bookmark
- Clone
- Edit

---

## Assessment Settings

### Default Settings

```typescript
export const DEFAULT_ASSESSMENT_SETTINGS: AssessmentSettings = {
  attemptsAllowed: 3,
  passingScore: 40,
  negativeMarking: false,
  negativeMarkValue: 0,
  randomizeQuestions: false,
  randomizeOptions: false,
  timeLimit: 30, // minutes
  canRevisit: true,
  enableLeaderboard: true,
  enableCertificate: true,
  enableDiscussion: true,
  enableBookmarks: true,
  practiceMode: false,
  lifelines: [
    { type: "fifty_fifty", label: "50-50", description: "Removes two incorrect options", 
      icon: "Target", enabled: true, maxUses: 1 },
    { type: "hint", label: "Hint", description: "Shows a creator-provided hint", 
      icon: "Lightbulb", enabled: true, maxUses: 3 },
    { type: "extra_time", label: "+30s", description: "Adds extra time", 
      icon: "Clock", enabled: true, maxUses: 1 },
    { type: "skip", label: "Skip", description: "Skip without penalty", 
      icon: "SkipForward", enabled: false, maxUses: 0 },
    { type: "reveal_explanation", label: "Reveal Explanation", 
      description: "Shows explanation immediately (Practice Mode)", 
      icon: "Eye", enabled: false, maxUses: 0 },
    { type: "formula_sheet", label: "Formula Sheet", 
      description: "Opens reference notes", 
      icon: "FileText", enabled: false, maxUses: 0 },
  ],
};
```

### Lifeline Types
- **50:50**: Removes two incorrect options (max 1 use)
- **Hint**: Shows creator-provided hint (max 3 uses)
- **Extra Time**: Adds 30 seconds (max 1 use)
- **Skip**: Skip question without penalty
- **Reveal Explanation**: Show explanation immediately (Practice Mode only)
- **Formula Sheet**: Open reference notes

---

## Mock Data

### Quiz Data (`src/mocks/quizData.ts`)

**Mock Questions**:
- Binary search time complexity (multiple choice)
- LIFO data structure (multiple choice)
- Binary tree properties (true/false)
- Code output prediction (code_output)
- Short answer text (text)

**Mock Quizzes**:
All quiz data is currently commented out for development. Uncomment and modify for testing.

### Live Assessment Data (`src/mocks/liveAssessment.ts`)

**Mock Participants**: 36 participants with varied:
- Usernames (Indian names)
- Emoji avatars
- Status (submitted, attempting, idle, disconnected)
- Progress (0-100%)
- Questions answered
- Scores
- Time spent
- Connection quality

**Mock Activity**: 10 recent activity events showing:
- Submissions
- Question milestones
- Join/leave events
- Reconnections

---

## Helper Functions

### Live Assessment Helpers (`src/lib/liveAssessmentHelpers.ts`)

```typescript
// Format seconds as mm:ss or h:mm:ss
function formatDuration(totalSeconds: number): string

// Relative time like "12s ago", "3m ago"
function formatRelative(secondsAgo: number): string

// Generate scattered classroom positions for avatars
function scatteredPosition(
  seed: number,
  index: number,
  count: number
): { left: number; top: number; rotate: number; scale: number; z: number }

// Compute live stats from participant list
function computeStats(participants: LiveParticipant[]): LiveStats
```

---

## Styling & Theme

### Color Scheme
- **Primary Pink**: `#EC4899` (buttons, active states, accents)
- **Background**: `#09090B` (main), `#111827` (cards), `#0B0D12` (elevated)
- **Text**: White (`#FFFFFF`), Gray (`#9CA3AF`, `#71717A`)
- **Success**: `#22C55E`
- **Warning**: `#F59E0B`
- **Error**: `#EF4444`

### Gradients
```typescript
export const pinkGradient = "from-[#EC4899] to-[#BE185D]";
```

### Component Styling
- **Cards**: `rounded-2xl border border-white/[0.08] bg-[#111827]`
- **Buttons**: `rounded-xl` with gradient or solid backgrounds
- **Inputs**: `rounded-xl border border-white/[0.06] bg-[#09090B]`
- **Animations**: Framer Motion for smooth transitions

---

## State Management

### Quiz State
- Local state in each component
- Mock data from `src/mocks/quizData.ts`
- No global state management currently

### Live Assessment State
- Local state with simulated real-time updates
- localStorage for cross-tab communication (quiz start flag)
- Auto-refresh intervals for participant updates

---

## Key User Flows

### Student Flow
1. Browse quizzes at `/quiz`
2. View quiz details at `/quiz/[quizId]`
3. Register at `/quiz/[quizId]/register`
4. Wait in lobby at `/quiz/[quizId]/lobby`
5. Join waiting room at `/quiz/[quizId]/waiting`
6. Attempt quiz at `/quiz/[quizId]/attempt`
7. View results at `/quiz/[quizId]/results`

### Teacher/Creator Flow
1. Create quiz at `/quiz/create`
2. Manage quiz at `/quiz/[quizId]/dashboard`
3. Start live session at `/quiz/[quizId]/live`
4. Monitor participants in real-time
5. End quiz and view results

---

## Backend Integration Requirements

### To Be Implemented
- [ ] API endpoints for quiz CRUD operations
- [ ] Authentication and authorization
- [ ] Quiz visibility filtering
- [ ] Real-time updates (WebSocket/SSE)
- [ ] Submission handling and scoring
- [ ] Leaderboard calculations
- [ ] Certificate generation
- [ ] Analytics data collection
- [ ] Discussion/comment system
- [ ] Notification system

### Database Schema (Proposed)
```sql
-- Quizzes
quizzes: id, title, description, creator_id, visibility, settings, created_at

-- Questions
questions: id, quiz_id, type, title, options, correct_answer, points, ...

-- Attempts
attempts: id, quiz_id, user_id, started_at, completed_at, score, ...

-- Responses
responses: id, attempt_id, question_id, answer, is_correct, points_earned

-- Registrations
registrations: id, quiz_id, user_id, registered_at, attempts_used

-- Participants (live)
participants: id, quiz_id, user_id, status, progress, score, connection
```

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Tab switching detection
- Fullscreen mode support
- LocalStorage for state persistence

---

## Performance Considerations

- Image lazy loading
- Virtual scrolling for question lists (future)
- Optimized re-renders with React.memo
- Debounced search inputs
- Auto-save with debouncing

---

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels (to be added)
- Color contrast compliance
- Focus indicators

---

## Testing

### Manual Testing Checklist
- [ ] Quiz creation flow
- [ ] Question builder functionality
- [ ] Quiz attempt flow
- [ ] Timer functionality
- [ ] Auto-submit on timeout
- [ ] Lifeline usage
- [ ] Results calculation
- [ ] Live room simulation
- [ ] Responsive design (mobile, tablet, desktop)

---

## Future Enhancements

1. **Question Types**:
   - Code editor with syntax highlighting
   - File upload for assignments
   - Whiteboard/drawing canvas
   - Audio/video recording
   - LaTeX rendering for math

2. **Features**:
   - AI-powered question generation
   - Plagiarism detection
   - Proctoring with webcam
   - Screen recording
   - Team-based quizzes
   - Gamification (points, badges, levels)

3. **Analytics**:
   - Detailed performance analytics
   - Learning path recommendations
   - Difficulty adjustment
   - Question quality metrics

4. **Integration**:
   - LMS integration (Moodle, Canvas)
   - SSO (Google, Microsoft, GitHub)
   - Payment gateway for paid quizzes
   - Email/SMS notifications
   - Calendar integration

---

## Contributing

When contributing to the quiz system:
1. Follow the existing file structure
2. Use TypeScript for all new code
3. Follow the established naming conventions
4. Add mock data for testing
5. Update this documentation for new features

---

## License

Part of the CodeJudge platform. See main repository for license information.