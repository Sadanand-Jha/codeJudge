"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  ChevronDown,
  Star,
  Flame,
  Target,
  Zap,
  Crown,
  Filter,
  Eye,
  EyeOff,
  Users,
  Clock,
  Timer,
  CheckCircle,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { getAvatarUrlById } from "@/config/dicebear";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
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
  timeTaken: number; // seconds
  submissionTime: string;
  status: "completed" | "timed_out" | "submitted_late" | "disconnected";
  isCurrentUser?: boolean;
}

// ─────────────────────────────────────────
// Design Tokens
// ─────────────────────────────────────────
const COLORS = {
  bg: "#09090B",
  panel: "#111827",
  surface: "#0F1115",
  border: "#23252F",
  borderHover: "#32364A",
  accent: "#7C3AED",
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
};

// ─────────────────────────────────────────
// Mock Data Generator
// ─────────────────────────────────────────
const generateMockLeaderboard = (quizId: string, currentUserId: string): QuizLeaderboardEntry[] => {
  const names = [
    "Sadanand Jha", "Maria Garcia", "Raj Patel", "Yuki Tanaka", "Ivan Petrov",
    "Emma Wilson", "Mohammed Ali", "Sophie Martin", "Lucas Silva", "Kim Min-jun",
    "Oliver Brown", "Anna Kowalski", "Swayam Swaraj", "Sarah Johnson", "Michael Lee",
    "Elena Popov", "James Smith", "Li Wei", "Aisha Mohammed", "Carlos Rodriguez",
    "Nina Ivanova", "Tom Anderson", "Priya Sharma", "Utsav Raj", "Fatima Hassan",
  ];

  const colleges = ["MIT", "Stanford", "IIT Delhi", "IIT Bombay", "Carnegie Mellon", "Harvard", "Berkeley", "Oxford"];

  const statuses: Array<"completed" | "timed_out" | "submitted_late" | "disconnected"> = ["completed", "completed", "completed", "timed_out", "submitted_late"];

  const totalMarks = 100;
  const quizEndTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

  return Array.from({ length: 50 }, (_, i) => {
    const marks = Math.max(0, totalMarks - i * 2.5 + Math.floor(Math.random() * 20) - 10);
    const percentage = Math.round((marks / totalMarks) * 100);
    const correctCount = Math.floor((percentage / 100) * 20);
    const wrongCount = Math.floor(Math.random() * (20 - correctCount));
    const skippedCount = 20 - correctCount - wrongCount;
    const timeTaken = 300 + Math.floor(Math.random() * 1500); // 5-30 minutes in seconds

    const submissionTime = new Date(quizEndTime.getTime() - Math.floor(Math.random() * 3600000));

    return {
      rank: i + 1,
      userId: `user-${i}`,
      username: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ""),
      avatar: getAvatarUrlById((i % 7) + 1),
      college: colleges[i % colleges.length],
      marks: Math.round(marks),
      totalMarks,
      percentage,
      correctCount,
      wrongCount,
      skippedCount,
      timeTaken,
      submissionTime: submissionTime.toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      isCurrentUser: `user-${i}` === currentUserId,
    };
  }).sort((a, b) => {
    if (b.marks !== a.marks) return b.marks - a.marks;
    return a.timeTaken - b.timeTaken;
  }).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const getRankConfig = (r: number) => {
    if (r === 1) return { label: "🥇", color: COLORS.gold, bg: "bg-[#FFD700]/20", textColor: "text-[#FFD700]" };
    if (r === 2) return { label: "🥈", color: COLORS.silver, bg: "bg-[#C0C0C0]/20", textColor: "text-[#C0C0C0]" };
    if (r === 3) return { label: "🥉", color: COLORS.bronze, bg: "bg-[#CD7F32]/20", textColor: "text-[#CD7F32]" };
    if (r <= 10) return { label: `#${r}`, color: COLORS.accent, bg: "bg-[#7C3AED]/20", textColor: "text-[#7C3AED]" };
    return { label: `#${r}`, color: COLORS.textMuted, bg: "bg-white/[0.06]", textColor: "text-[#6B7280]" };
  };

  const config = getRankConfig(rank);

  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${config.bg} ${config.textColor}`}>
      {config.label}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    completed: { label: "Completed", color: "text-[#22C55E]", bg: "bg-[#22C55E]/10" },
    timed_out: { label: "Timed Out", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
    submitted_late: { label: "Submitted Late", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
    disconnected: { label: "Disconnected", color: "text-[#6B7280]", bg: "bg-white/[0.06]" },
  };

  const config = configs[status] || configs.completed;

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="rounded-xl border border-border-hover bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] font-medium text-[#6B7280]">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────
export default function QuizLeaderboardPage() {
  const router = useRouter();
  const [quizId] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/\/quiz\/([^\/]+)\/leaderboard/);
      return match ? match[1] : "quiz_001";
    }
    return "quiz_001";
  });

  const [currentUserId] = useState("user-0"); // Mock current user
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"rank" | "marks" | "time" | "submission">("rank");
  const [visibleCount, setVisibleCount] = useState(25);
  const [hideNames, setHideNames] = useState(false);

  // Mock settings - in real app, fetch from quiz settings
  const leaderboardSettings = {
    showToParticipants: true,
    showTop10Only: false,
    showOnlyOwnRank: false,
    anonymousMode: false,
  };

  const allEntries = useMemo(() => generateMockLeaderboard(quizId, currentUserId), [quizId, currentUserId]);

  const filteredEntries = useMemo(() => {
    let entries = [...allEntries];

    // Search filter
    if (searchQuery) {
      entries = entries.filter(e =>
        e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.college?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // College filter
    if (selectedCollege !== "all") {
      entries = entries.filter(e => e.college === selectedCollege);
    }

    // Status filter
    if (selectedStatus !== "all") {
      entries = entries.filter(e => e.status === selectedStatus);
    }

    // Sorting
    entries.sort((a, b) => {
      switch (sortBy) {
        case "marks":
          return b.marks - a.marks || a.timeTaken - b.timeTaken;
        case "time":
          return a.timeTaken - b.timeTaken;
        case "submission":
          return new Date(b.submissionTime).getTime() - new Date(a.submissionTime).getTime();
        default:
          return a.rank - b.rank;
      }
    });

    return entries;
  }, [allEntries, searchQuery, selectedCollege, selectedStatus, sortBy]);

  const visibleEntries = useMemo(() => {
    if (leaderboardSettings.showTop10Only) {
      return filteredEntries.slice(0, 10);
    }
    return filteredEntries.slice(0, visibleCount);
  }, [filteredEntries, visibleCount, leaderboardSettings.showTop10Only]);

  // Statistics
  const stats = useMemo(() => {
    const entries = allEntries;
    const marks = entries.map(e => e.marks);
    const times = entries.map(e => e.timeTaken);

    return {
      participants: entries.length,
      highestScore: Math.max(...marks),
      averageScore: Math.round(marks.reduce((a, b) => a + b, 0) / marks.length),
      lowestScore: Math.min(...marks),
      avgCompletionTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      quizDuration: 1800, // 30 minutes in seconds
      completionRate: Math.round((entries.filter(e => e.status === "completed").length / entries.length) * 100),
    };
  }, [allEntries]);

  const colleges = useMemo(() => {
    const unique = new Set(allEntries.map(e => e.college).filter(Boolean));
    return Array.from(unique);
  }, [allEntries]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setVisibleCount((prev) => Math.min(prev + 25, filteredEntries.length));
    }
  }, [filteredEntries.length]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AppLayout>
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        {/* Header */}
        <div className="border-b" style={{ borderColor: COLORS.border }}>
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
                  >
                    <TrendingUp className="w-3 h-3 rotate-180" />
                    Back
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFD700] to-[#7C3AED]">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Quiz Leaderboard</h1>
                    <p className="text-[13px] text-muted-foreground">
                      {stats.participants} participants • Sorted by highest marks, then lowest time
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] text-[#6B7280]">Your Rank</div>
                  <div className="text-[20px] font-bold text-[#7C3AED]">
                    #{allEntries.find(e => e.isCurrentUser)?.rank || "N/A"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#6B7280]">Your Score</div>
                  <div className="text-[20px] font-bold text-white">
                    {allEntries.find(e => e.isCurrentUser)?.marks || 0}/{allEntries[0]?.totalMarks || 100}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Statistics Cards */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-white mb-4">Statistics Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatCard label="Participants" value={stats.participants} icon={Users} color="text-[#7C3AED]" />
              <StatCard label="Highest Score" value={stats.highestScore} icon={Trophy} color="text-[#FFD700]" />
              <StatCard label="Average Score" value={stats.averageScore} icon={Target} color="text-[#EC4899]" />
              <StatCard label="Lowest Score" value={stats.lowestScore} icon={TrendingDown} color="text-[#EF4444]" />
              <StatCard label="Avg Time" value={`${Math.floor(stats.avgCompletionTime / 60)}m`} icon={Clock} color="text-[#22C55E]" />
              <StatCard label="Duration" value={`${Math.floor(stats.quizDuration / 60)}m`} icon={Timer} color="text-[#F59E0B]" />
              <StatCard label="Completion" value={`${stats.completionRate}%`} icon={CheckCircle} color="text-[#3B82F6]" />
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-3 rounded-lg border border-border-hover bg-card text-xs text-white placeholder-[#6B7280] focus:border-[#7C3AED] focus:outline-none w-64"
                />
              </div>

              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                className="h-8 px-3 rounded-lg border border-border-hover bg-card text-xs text-white focus:border-[#7C3AED] focus:outline-none"
              >
                <option value="all">All Colleges</option>
                {colleges.map(college => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 px-3 rounded-lg border border-border-hover bg-card text-xs text-white focus:border-[#7C3AED] focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="timed_out">Timed Out</option>
                <option value="submitted_late">Submitted Late</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8 px-3 rounded-lg border border-border-hover bg-card text-xs text-white focus:border-[#7C3AED] focus:outline-none"
              >
                <option value="rank">Sort by Rank</option>
                <option value="marks">Sort by Marks</option>
                <option value="time">Sort by Time</option>
                <option value="submission">Sort by Submission</option>
              </select>

              <button
                onClick={() => setHideNames(!hideNames)}
                className="h-8 px-3 rounded-lg border border-border-hover bg-card text-xs text-white hover:border-[#7C3AED] transition-colors flex items-center gap-1.5"
                title={hideNames ? "Show Names" : "Hide Names"}
              >
                {hideNames ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {hideNames ? "Show Names" : "Hide Names"}
              </button>
            </div>
          </div>

          {/* Leaderboard: Cards on mobile, Table on desktop */}
          <div className="rounded-xl border border-border-hover bg-card overflow-hidden">
            {/* Mobile Card List */}
            <div className="md:hidden space-y-3 p-3 sm:p-4">
              <AnimatePresence>
                {visibleEntries.map((entry, index) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`rounded-xl border p-4 ${
                      entry.isCurrentUser
                        ? "border-[#7C3AED]/30 bg-[#7C3AED]/5"
                        : "border-border-hover bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <RankBadge rank={entry.rank} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-8 w-8 rounded-full overflow-hidden shrink-0">
                            <img src={entry.avatar} alt={entry.username} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {hideNames ? "Anonymous" : entry.username}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {hideNames ? "Hidden" : entry.college || "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={entry.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="rounded-lg border border-border bg-white/[0.03] px-3 py-2">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Score</div>
                        <div className="text-sm font-bold text-white">{entry.marks}/{entry.totalMarks}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-white/[0.03] px-3 py-2">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Accuracy</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]" style={{ width: `${entry.percentage}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-white">{entry.percentage}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="text-[#22C55E]">✓</span> {entry.correctCount}
                      </span>
                      <span className="text-white/20">|</span>
                      <span className="flex items-center gap-1">
                        <span className="text-[#EF4444]">✗</span> {entry.wrongCount}
                      </span>
                      <span className="text-white/20">|</span>
                      <span className="flex items-center gap-1">
                        <span className="text-[#F59E0B]">○</span> {entry.skippedCount}
                      </span>
                      <span className="text-white/20">|</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(entry.timeTaken)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0" style={{ backgroundColor: COLORS.surface }}>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Rank</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Student</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">College</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Marks</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">%</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Correct</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Wrong</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Skipped</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Time</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Submitted</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {visibleEntries.map((entry, index) => (
                      <motion.tr
                        key={entry.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`border-b transition-colors cursor-pointer ${
                          entry.isCurrentUser
                            ? "bg-[#7C3AED]/10 border-l-2 border-l-[#7C3AED]"
                            : "border-white/[0.04] hover:bg-white/[0.02]"
                        }`}
                        style={{ borderColor: COLORS.border }}
                        onClick={() => {
                          if (entry.isCurrentUser) {
                            router.push(`/quiz/${quizId}/results/current`);
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <RankBadge rank={entry.rank} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full overflow-hidden">
                              <img src={entry.avatar} alt={entry.username} className="h-full w-full object-cover" />
                            </div>
                            <div>
                              <div className="text-[13px] font-medium text-white">
                                {hideNames ? "Anonymous" : entry.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] text-muted-foreground">{hideNames ? "Hidden" : entry.college || "N/A"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[14px] font-bold text-white">{entry.marks}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[#23252F]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]"
                                style={{ width: `${entry.percentage}%` }}
                              />
                            </div>
                            <span className="text-[12px] text-muted-foreground">{entry.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-[#22C55E] font-medium">{entry.correctCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-[#EF4444] font-medium">{entry.wrongCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-[#F59E0B] font-medium">{entry.skippedCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-muted-foreground">{formatTime(entry.timeTaken)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-[#6B7280]">
                            {new Date(entry.submissionTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={entry.status} />
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {visibleCount < filteredEntries.length && !leaderboardSettings.showTop10Only && (
              <div className="flex items-center justify-center py-4 border-t border-border">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 25)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-colors"
                >
                  Load More <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

