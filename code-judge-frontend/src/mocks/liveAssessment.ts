/**
 * Live Assessment Room — Mock Data
 *
 * Frontend-only mock data for the Live Assessment Room. No backend calls.
 */

import type {
  LiveParticipant,
  ActivityEvent,
  LiveStats,
  LiveAssessmentRoomData,
  ParticipantStatus,
  ConnectionQuality,
} from "@/types/liveAssessment";

const EMOJI_AVATARS = [
  "😀", "😎", "🤓", "🧑‍💻", "👩‍💻", "🧑‍🎓", "👩‍🎓", "🧑‍🔬", "👨‍🔬",
  "🦸", "🧙", "🧚", "🤖", "🐱", "🦊", "🐼", "🦁", "🐯", "🐸", "🦉",
  "🦄", "🐙", "🦖", "🐳", "🌟", "🔥", "⚡", "🎯", "🚀", "🌈",
];

const USERNAMES = [
  "Rahul", "Priya", "Ananya", "Amit", "Vikas", "Sneha", "Karan", "Meera",
  "Arjun", "Divya", "Rohan", "Isha", "Nikhil", "Pooja", "Sahil", "Riya",
  "Aditya", "Tanvi", "Manish", "Kavya", "Yash", "Nisha", "Dev", "Aisha",
  "Kabir", "Zara", "Vivaan", "Myra", "Reyansh", "Anika", "Aryan", "Diya",
  "Dhruv", "Sara", "Vihaan", "Ira", "Arnav", "Kiara", "Advait", "Aadhya",
];

const TOTAL_QUESTIONS = 20;

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function makeParticipant(index: number): LiveParticipant {
  const username = pick(USERNAMES, index);
  const avatar = pick(EMOJI_AVATARS, index * 7 + 3);

  const r = (index * 13) % 100;
  let status: ParticipantStatus;
  if (r < 35) status = "submitted";
  else if (r < 80) status = "attempting";
  else if (r < 92) status = "idle";
  else status = "disconnected";

  const totalQuestions = TOTAL_QUESTIONS;
  let questionsAnswered: number;
  let progress: number;
  let currentQuestion: number;

  if (status === "submitted") {
    questionsAnswered = totalQuestions;
    progress = 100;
    currentQuestion = totalQuestions;
  } else if (status === "disconnected") {
    questionsAnswered = Math.floor((index * 3) % totalQuestions);
    progress = Math.round((questionsAnswered / totalQuestions) * 100);
    currentQuestion = Math.min(questionsAnswered + 1, totalQuestions);
  } else if (status === "idle") {
    questionsAnswered = Math.floor((index * 2) % Math.max(totalQuestions / 2, 1));
    progress = Math.round((questionsAnswered / totalQuestions) * 100);
    currentQuestion = Math.min(questionsAnswered + 1, totalQuestions);
  } else {
    questionsAnswered = Math.floor(((index * 5 + 2) % totalQuestions));
    progress = Math.round((questionsAnswered / totalQuestions) * 100);
    currentQuestion = Math.min(questionsAnswered + 1, totalQuestions);
  }

  const score =
    status === "submitted"
      ? Math.round(60 + ((index * 7) % 40))
      : status === "attempting"
      ? Math.round(((index * 11) % 55))
      : undefined;

  const timeSpent =
    status === "submitted"
      ? 600 + ((index * 37) % 900)
      : 120 + ((index * 29) % 700);

  const connections: ConnectionQuality[] = ["excellent", "good", "fair", "poor"];
  const connection = status === "disconnected" ? "poor" : pick(connections, index);

  const now = Date.now();
  const joinedAt = new Date(now - (60 + (index * 23) % 1200) * 1000).toISOString();
  const submittedAt =
    status === "submitted"
      ? new Date(now - ((index * 17) % 300) * 1000).toISOString()
      : undefined;

  return {
    id: `p_${index + 1}`,
    username,
    avatar,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
    status,
    progress,
    questionsAnswered,
    totalQuestions,
    currentQuestion,
    score,
    timeSpent,
    connection,
    joinedAt,
    submittedAt,
    positionSeed: ((index * 2654435761) % 1000) / 1000,
  };
}

export const mockParticipants: LiveParticipant[] = Array.from(
  { length: 36 },
  (_, i) => makeParticipant(i)
);

export const mockActivity: ActivityEvent[] = [
  { id: "a1", type: "submitted", username: "Ananya", avatar: "🧑‍🎓", message: "Ananya submitted the assessment", secondsAgo: 12, detail: "Score: 87%" },
  { id: "a2", type: "reached_question", username: "Amit", avatar: "🧑‍💻", message: "Amit reached Question 12", secondsAgo: 28, detail: "Q12" },
  { id: "a3", type: "reconnected", username: "Vikas", avatar: "🦊", message: "Vikas reconnected", secondsAgo: 45 },
  { id: "a4", type: "joined", username: "Rahul", avatar: "😀", message: "Rahul joined the room", secondsAgo: 63 },
  { id: "a5", type: "disconnected", username: "Priya", avatar: "👩‍💻", message: "Priya disconnected", secondsAgo: 90 },
  { id: "a6", type: "submitted", username: "Sneha", avatar: "🧚", message: "Sneha submitted the assessment", secondsAgo: 120, detail: "Score: 92%" },
  { id: "a7", type: "reached_question", username: "Karan", avatar: "🦁", message: "Karan reached Question 18", secondsAgo: 150, detail: "Q18" },
  { id: "a8", type: "joined", username: "Meera", avatar: "🦄", message: "Meera joined the room", secondsAgo: 180 },
  { id: "a9", type: "joined", username: "Arjun", avatar: "🦸", message: "Arjun joined the room", secondsAgo: 210 },
  { id: "a10", type: "submitted", username: "Divya", avatar: "🌟", message: "Divya submitted the assessment", secondsAgo: 240, detail: "Score: 78%" },
];

export const mockLiveStats: LiveStats = {
  studentsJoined: mockParticipants.length,
  currentlyActive: mockParticipants.filter((p) => p.status === "attempting").length,
  submitted: mockParticipants.filter((p) => p.status === "submitted").length,
  averageProgress: Math.round(mockParticipants.reduce((s, p) => s + p.progress, 0) / mockParticipants.length),
  averageScore: Math.round(
    mockParticipants.filter((p) => p.score !== undefined).reduce((s, p) => s + (p.score || 0), 0) /
      Math.max(mockParticipants.filter((p) => p.score !== undefined).length, 1)
  ),
  averageTime: Math.round(mockParticipants.reduce((s, p) => s + p.timeSpent, 0) / mockParticipants.length),
};

export const mockLiveAssessmentRoom: LiveAssessmentRoomData = {
  quizId: "quiz_002",
  quizName: "Physics - Mechanics & Thermodynamics",
  teacherName: "Dr. Priya Sharma",
  subject: "Physics",
  status: "waiting",
  elapsedSeconds: 0,
  totalDuration: 30 * 60,
  participants: mockParticipants,
  activity: mockActivity,
  stats: mockLiveStats,
};

export const mockEmptyLiveAssessmentRoom: LiveAssessmentRoomData = {
  quizId: "quiz_004",
  quizName: "Data Structures - Arrays & Linked Lists",
  teacherName: "Prof. Amit Verma",
  subject: "Computer Science",
  status: "waiting",
  elapsedSeconds: 0,
  totalDuration: 15 * 60,
  participants: [],
  activity: [
    { id: "e1", type: "started", username: "You", avatar: "🧑‍🏫", message: "You started the live assessment", secondsAgo: 45 },
  ],
  stats: { studentsJoined: 0, currentlyActive: 0, submitted: 0, averageProgress: 0, averageScore: 0, averageTime: 0 },
};
