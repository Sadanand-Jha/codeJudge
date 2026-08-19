/**
 * Tests module — shared types.
 *
 * These map 1:1 to the future backend API shape (GET /tests, GET /test-series,
 * POST /test-series, POST /test-attempts ...). Until the API ships, the UI
 * consumes the mock dataset in `mockData.ts`, so wiring the real endpoints
 * later only requires swapping the data source, never the components.
 */

import type { LucideIcon } from "lucide-react";

export type ExamId =
  | "dsa"
  | "jee"
  | "neet"
  | "ssc"
  | "upsc"
  | "banking"
  | "cuet"
  | "gate"
  | "cat"
  | "clat"
  | "defence"
  | "teaching"
  | "school"
  | "railway"
  | "ese"
  | "state-engg"
  | "boards"
  | "olympiads";

export type LanguageId = "english" | "hindi" | "hindi-english" | "tamil" | "telugu" | "bengali" | "marathi";

export type Difficulty = "easy" | "medium" | "hard" | "mixed";

export type TestType = "chapter" | "subject" | "mock" | "full" | "previous-year" | "mini";

export interface ExamMeta {
  id: ExamId;
  name: string;
  tagline: string;
  /** Short descriptor shown under the name on cards. */
  category: string;
  icon: LucideIcon;
  /** Tailwind gradient stops for the abstract thumbnail / category card. */
  gradient: string;
  /** Primary accent hex used for glows and inline SVG. */
  color: string;
  /** Accessible foreground used on the exam chip. */
  chipClass: string;
  examCount: number;
}

export interface Teacher {
  id: string;
  name: string;
  handle: string;
  role: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  seriesCount: number;
  studentCount: number;
  following: boolean;
  bio: string;
  /** Deterministic gradient seed for the avatar. */
  avatarGradient: string;
  badges?: string[];
  /** What they teach, e.g. ["Physics", "Mechanics"]. */
  subjects: string[];
}

export interface SeriesMeta {
  id: string;
  examId: ExamId;
  examName: string;
  title: string;
  description: string;
  teacher: Teacher;
  rating: number;
  ratingCount: number;
  studentCount: number;
  testCount: number;
  questionCount: number;
  chapterTests: number;
  fullMocks: number;
  language: LanguageId;
  difficulty: Difficulty;
  price: number;
  originalPrice: number;
  discountPercent: number;
  featured?: boolean;
  freeTrial?: boolean;
  /** Whether the series is platform-official or teacher-created. */
  source?: "platform" | "teacher";
  tags?: string[];
  /** ISO date of last update — used by the "Newest" sort. */
  publishedAt: string;
  subjects: string[];
  /** 0–100 progress when the current student has already started the series. */
  progress?: number;
}

/** Top-level hub categories — the five pillars of the Exam discovery grid. */
export type ExamCategoryId = "eng-med" | "govt" | "engg" | "school-acad" | "other";

export interface ExamCategoryStat {
  tests: number;
  series: number;
  free: number;
  paid: number;
  /** 0–100 relative popularity used for the density bar. */
  popularity: number;
  difficulty: Difficulty;
}

export interface ExamCategory {
  id: ExamCategoryId;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind gradient stops for the category icon tile. */
  gradient: string;
  color: string;
  /** Human-facing chips; each maps to an ExamMeta for icon + link. */
  chips: { label: string; examId: ExamId }[];
  stats: ExamCategoryStat;
}

export interface FreeTest {
  id: string;
  examId: ExamId;
  examName: string;
  title: string;
  subject: string;
  topic: string;
  questionCount: number;
  minutes: number;
  difficulty: Difficulty;
  startsWith: number;
  attempts: number;
}

/** Compact card used in the Explore rail — "what everyone is attempting right now". */
export interface TrendingTest {
  id: string;
  title: string;
  attempts: number;
  /** Human duration label, e.g. "2 hrs" or "90 min". */
  duration: string;
  free: boolean;
  examId: ExamId;
}

export interface ContinueTest {
  id: string;
  examName: string;
  title: string;
  percentComplete: number;
  questionsRemaining: number;
  totalQuestions: number;
  minutesLeft: number;
  section: string;
}

export interface RecommendedTest {
  id: string;
  examName: string;
  title: string;
  reason: string;
  reasonKind: "topic" | "exam" | "difficulty" | "trending";
  questionCount: number;
  minutes: number;
  difficulty: Difficulty;
  free: boolean;
}

export type QuestionKind = "mcq" | "numerical" | "multi";

export interface AttemptQuestion {
  id: string;
  index: number;
  section: string;
  kind: QuestionKind;
  text: string;
  options?: { id: string; label: string }[];
  marks: number;
  negativeMarks: number;
  solved?: boolean;
}

export interface TestSection {
  name: string;
  questions: AttemptQuestion[];
}

export interface SubjectPerformance {
  subject: string;
  percent: number;
  correct: number;
  total: number;
}

export interface QuestionAnalysisRow {
  id: string;
  number: number;
  section: string;
  topic: string;
  status: "correct" | "incorrect" | "skipped" | "review";
  marks: number;
  timeSec: number;
}

export interface TestResultData {
  attemptId: string;
  testTitle: string;
  examName: string;
  score: number;
  maxScore: number;
  percentile: number;
  rank: number;
  totalParticipants: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  skipped: number;
  timeTakenSec: number;
  totalTimeSec: number;
  subjects: SubjectPerformance[];
  strongAreas: string[];
  weakAreas: string[];
  analysis: QuestionAnalysisRow[];
  aiCoach: {
    summary: string;
    steps: { title: string; detail: string }[];
  };
}

export interface TestSeriesInput {
  title: string;
  description: string;
  examId: ExamId | "";
  subjects: string[];
  language: LanguageId;
  difficulty: Difficulty;
  thumbnail?: string;
  price: number;
  originalPrice: number;
  mode: "free" | "paid";
  tests: { id: string; name: string; type: TestType }[];
}

export interface TeacherSeriesStat {
  id: string;
  title: string;
  examName: string;
  price: number;
  students: number;
  revenue: number;
  rating: number;
  status: "published" | "draft";
  tests: number;
}

/* ============================================
   Contests preview (sibling product under the Tests hub)
   ============================================ */
export type ContestStatus = "live" | "upcoming" | "past";

export type ContestKind = "Weekly" | "Monthly" | "Special" | "College" | "Sponsored";

export interface ContestPreview {
  id: string;
  name: string;
  kind: ContestKind;
  status: ContestStatus;
  /** Human "Starts in …" label — kept static so the mock renders identically. */
  startLabel: string;
  /** Absolute ISO start — drives live/upcoming logic later. */
  startTime: string;
  durationMin: number;
  participants: number;
  prize?: string;
  registered: boolean;
}

/* ============================================
   Problems preview (sibling product under the Tests hub)
   ============================================ */
export interface ProblemTopic {
  name: string;
  count: number;
  difficulty: Difficulty;
}

export interface ProblemLanguage {
  name: string;
  count: number;
}

/* ============================================
   Performance section
   ============================================ */
export interface PerformanceStats {
  testsAttempted: number;
  problemsSolved: number;
  contestsParticipated: number;
  avgAccuracy: number;
  avgScore: number;
  currentStreak: number;
  bestRank: number;
  percentile: number;
}

export interface PerformancePoint {
  label: string;
  score: number;
  accuracy: number;
}

/* ============================================
   Categorized search
   ============================================ */
export type SearchResultKind = "test" | "series" | "problem" | "contest" | "teacher" | "exam";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
}
