/**
 * Live Assessment Room — Types
 *
 * Frontend-only types used by the Live Assessment Room page, the student
 * waiting room, and their components. These describe the mock data shape
 * for participants, live activity events and aggregate statistics.
 */

export type ParticipantStatus =
  | "submitted"
  | "attempting"
  | "idle"
  | "disconnected";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor";

export interface LiveParticipant {
  id: string;
  username: string;
  /** Emoji or short label used as a lightweight avatar */
  avatar: string;
  /** Optional avatar image URL (e.g. DiceBear) */
  avatarUrl?: string;
  status: ParticipantStatus;
  /** 0–100 progress through the quiz */
  progress: number;
  /** Number of questions answered so far */
  questionsAnswered: number;
  /** Total questions in the quiz */
  totalQuestions: number;
  /** Current question number (1-indexed) */
  currentQuestion: number;
  /** Current score, if available */
  score?: number;
  /** Time spent so far in seconds */
  timeSpent: number;
  /** Connection quality */
  connection: ConnectionQuality;
  /** When the participant joined (ISO string) */
  joinedAt: string;
  /** When the participant submitted, if they have (ISO string) */
  submittedAt?: string;
  /** Stable pseudo-random position seed for crowd layout (0–1) */
  positionSeed: number;
}

export type ActivityEventType =
  | "joined"
  | "submitted"
  | "reached_question"
  | "disconnected"
  | "reconnected"
  | "started"
  | "paused"
  | "resumed";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  username: string;
  avatar: string;
  /** Human-readable message */
  message: string;
  /** Seconds ago (for relative time display) */
  secondsAgo: number;
  /** Optional extra detail, e.g. question number */
  detail?: string;
}

export interface LiveStats {
  studentsJoined: number;
  currentlyActive: number;
  submitted: number;
  averageProgress: number;
  averageScore: number;
  averageTime: number;
}

export type QuizRoomStatus = "waiting" | "live" | "paused" | "ended";

export interface LiveAssessmentRoomData {
  quizId: string;
  quizName: string;
  teacherName: string;
  subject: string;
  status: QuizRoomStatus;
  /** Elapsed seconds since the quiz went live */
  elapsedSeconds: number;
  /** Total duration in seconds (for progress) */
  totalDuration: number;
  /** Scheduled start time (ISO string) — used for the waiting-room countdown */
  scheduledStartAt?: string;
  participants: LiveParticipant[];
  activity: ActivityEvent[];
  stats: LiveStats;
}

/** Status metadata: color, ring color, label */
export const STATUS_META: Record<
  ParticipantStatus,
  { label: string; color: string; ring: string; dot: string; bg: string }
> = {
  submitted: {
    label: "Submitted",
    color: "#22C55E",
    ring: "#22C55E",
    dot: "#22C55E",
    bg: "rgba(34,197,94,0.10)",
  },
  attempting: {
    label: "Attempting",
    color: "#3B82F6",
    ring: "#3B82F6",
    dot: "#3B82F6",
    bg: "rgba(59,130,246,0.10)",
  },
  idle: {
    label: "Idle",
    color: "#9CA3AF",
    ring: "#9CA3AF",
    dot: "#9CA3AF",
    bg: "rgba(156,163,175,0.10)",
  },
  disconnected: {
    label: "Disconnected",
    color: "#EF4444",
    ring: "#EF4444",
    dot: "#EF4444",
    bg: "rgba(239,68,68,0.10)",
  },
};

export const CONNECTION_META: Record<
  ConnectionQuality,
  { label: string; color: string }
> = {
  excellent: { label: "Excellent", color: "#22C55E" },
  good: { label: "Good", color: "#3B82F6" },
  fair: { label: "Fair", color: "#F59E0B" },
  poor: { label: "Poor", color: "#EF4444" },
};
