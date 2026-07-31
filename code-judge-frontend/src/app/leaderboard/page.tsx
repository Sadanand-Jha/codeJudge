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
  Globe,
  Users,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  ChevronDown,
  Star,
  Flame,
  Code,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Crown,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

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
};

// ─────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────
interface User {
  id: string;
  name: string;
  avatar: string;
  country: string;
  countryFlag: string;
  rating: number;
  ratingChange: number;
  problemsSolved: number;
  contests: number;
  accuracy: number;
  streak: number;
  badges: string[];
  lastActive: string;
  percentile: number;
  contestHistory: number[];
  favoriteLanguage: string;
  achievements: string[];
  recentSubmissions: Array<{ problem: string; status: string; time: string }>;
}

const generateUsers = (count: number): User[] => {
  const countries = [
    { name: "USA", flag: "🇺🇸" },
    { name: "India", flag: "🇮🇳" },
    { name: "China", flag: "🇨🇳" },
    { name: "Russia", flag: "🇷🇺" },
    { name: "Japan", flag: "🇯🇵" },
    { name: "Germany", flag: "🇩🇪" },
    { name: "UK", flag: "🇬🇧" },
    { name: "Canada", flag: "🇨🇦" },
    { name: "France", flag: "🇫🇷" },
    { name: "Brazil", flag: "🇧🇷" },
    { name: "South Korea", flag: "🇰🇷" },
    { name: "Australia", flag: "🇦🇺" },
  ];

  const names = [
    "Sadanand Jha", "Maria Garcia", "Raj Patel", "Yuki Tanaka", "Ivan Petrov",
    "Emma Wilson", "Mohammed Ali", "Sophie Martin", "Lucas Silva", "Kim Min-jun",
    "Oliver Brown", "Anna Kowalski", "Swayam Swaraj", "Sarah Johnson", "Michael Lee",
    "Elena Popov", "James Smith", "Li Wei", "Aisha Mohammed", "Carlos Rodriguez",
    "Nina Ivanova", "Tom Anderson", "Priya Sharma", "Utsav Raj", "Fatima Hassan",
    "Ryan O'Brien", "Mei Lin", "Ahmed Ibrahim", "Julia Santos", "Park Ji-sung",
  ];

  const languages = ["Python", "C++", "Java", "JavaScript", "Go", "Rust"];
  const badgeIcons = ["🏆", "⚡", "🔥", "💎", "🌟", "🎯", "👑", "🏅"];
  const achievementNames = ["Grand Master", "Problem Solver", "Speed Demon", "Streak King", "Contest Winner"];

  return Array.from({ length: count }, (_, i) => {
    const country = countries[Math.floor(Math.random() * countries.length)];
    const rating = Math.max(800, 3500 - i * 12 + Math.floor(Math.random() * 50) - 25);
    const ratingChange = Math.floor(Math.random() * 100) - 30;

    return {
      id: `user-${i}`,
      name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ""),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
      country: country.name,
      countryFlag: country.flag,
      rating,
      ratingChange,
      problemsSolved: Math.floor(Math.random() * 1500) + 100,
      contests: Math.floor(Math.random() * 100) + 5,
      accuracy: Math.floor(Math.random() * 40) + 60,
      streak: Math.floor(Math.random() * 100) + 1,
      badges: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => badgeIcons[Math.floor(Math.random() * badgeIcons.length)]),
      lastActive: `${Math.floor(Math.random() * 24)}h ago`,
      percentile: Math.max(1, 100 - i * 2),
      contestHistory: Array.from({ length: 10 }, () => rating + Math.floor(Math.random() * 200) - 100),
      favoriteLanguage: languages[Math.floor(Math.random() * languages.length)],
      achievements: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => achievementNames[Math.floor(Math.random() * achievementNames.length)]),
      recentSubmissions: Array.from({ length: 5 }, () => ({
        problem: `Problem #${Math.floor(Math.random() * 1000)}`,
        status: Math.random() > 0.3 ? "Accepted" : "Wrong Answer",
        time: `${Math.floor(Math.random() * 24)}h ago`,
      })),
    };
  });
};

const allUsers = generateUsers(100);

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function RatingTrend({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="flex items-center gap-1 text-[#22C55E] text-[11px]">
        <TrendingUp className="h-3 w-3" /> +{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="flex items-center gap-1 text-[#EF4444] text-[11px]">
        <TrendingDown className="h-3 w-3" /> {change}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[#6B7280] text-[11px]">
      <Minus className="h-3 w-3" /> 0
    </span>
  );
}

function BadgeShine({ badge }: { badge: string }) {
  return (
    <motion.span
      className="inline-block text-[14px]"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
    >
      {badge}
    </motion.span>
  );
}

function PodiumSpot({ user, rank, delay }: { user: User; rank: number; delay: number }) {
  const colors = {
    1: { primary: COLORS.gold, secondary: "from-[#FFD700]/20 to-transparent", glow: "shadow-[0_0_40px_rgba(255,215,0,0.3)]" },
    2: { primary: COLORS.silver, secondary: "from-[#C0C0C0]/20 to-transparent", glow: "shadow-[0_0_40px_rgba(192,192,192,0.3)]" },
    3: { primary: COLORS.bronze, secondary: "from-[#CD7F32]/20 to-transparent", glow: "shadow-[0_0_40px_rgba(205,127,50,0.3)]" },
  };

  const heights = { 1: "h-48", 2: "h-36", 3: "h-28" };
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  const color = colors[rank as 1 | 2 | 3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="flex flex-col items-center"
    >
      <div className="relative mb-4">
        <motion.div
          className={`absolute inset-0 rounded-full blur-xl ${color.glow}`}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 bg-[#111827]" style={{ borderColor: color.primary }}>
          <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
        </div>
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full text-xl"
          style={{ backgroundColor: color.primary }}
        >
          {medals[rank as 1 | 2 | 3]}
        </div>
      </div>

      <div className="text-center">
        <div className="text-[13px] font-semibold text-white truncate max-w-[120px]">{user.name}</div>
        <div className="text-[11px] text-[#6B7280]">{user.countryFlag} {user.country}</div>
        <div className="mt-1 text-[16px] font-bold" style={{ color: color.primary }}>
          {user.rating}
        </div>
        <div className="text-[10px] text-[#6B7280]">{user.problemsSolved} solved</div>
      </div>

      <div className={`mt-4 w-32 ${heights[rank as 1 | 2 | 3]} rounded-t-lg bg-gradient-to-t ${color.secondary}`} style={{ backgroundColor: rank === 1 ? "#1a1a2e" : rank === 2 ? "#1a1a2e" : "#1a1a2e" }}>
        <div className="flex h-full flex-col items-center justify-end pb-3">
          <span className="text-[24px] font-bold text-white/20">{rank}</span>
        </div>
      </div>
    </motion.div>
  );
}

function PlayerCard({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-2xl rounded-2xl border bg-[#111827] p-6"
        style={{ borderColor: COLORS.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded p-1 text-[#6B7280] hover:bg-[#1F2937] hover:text-white">
          <ChevronDown className="h-5 w-5 rotate-180" />
        </button>

        <div className="flex items-start gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border-2" style={{ borderColor: COLORS.accent }}>
            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">{user.name}</h3>
              <span className="text-xl">{user.countryFlag}</span>
            </div>
            <div className="mt-1 text-[13px] text-[#9CA3AF]">{user.country}</div>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-[#FFD700]" />
                <span className="text-[14px] font-bold text-white">{user.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4 text-[#22C55E]" />
                <span className="text-[13px] text-[#9CA3AF]">{user.problemsSolved} solved</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-[#F59E0B]" />
                <span className="text-[13px] text-[#9CA3AF]">{user.streak} day streak</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
            <div className="text-[10px] text-[#6B7280]">Accuracy</div>
            <div className="mt-1 text-[18px] font-bold text-white">{user.accuracy}%</div>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
            <div className="text-[10px] text-[#6B7280]">Contests</div>
            <div className="mt-1 text-[18px] font-bold text-white">{user.contests}</div>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
            <div className="text-[10px] text-[#6B7280]">Percentile</div>
            <div className="mt-1 text-[18px] font-bold text-[#7C3AED]">Top {user.percentile}%</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Rating History</div>
          <div className="h-32 rounded-lg border p-3" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
            <div className="flex h-full items-end gap-1">
              {user.contestHistory.map((rating, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-[#7C3AED] to-[#3B82F6]"
                  initial={{ height: 0 }}
                  animate={{ height: `${((rating - 800) / 2700) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Badges & Achievements</div>
          <div className="flex flex-wrap gap-2">
            {user.badges.map((badge, i) => (
              <BadgeShine key={i} badge={badge} />
            ))}
            {user.achievements.map((achievement, i) => (
              <span key={i} className="rounded-full bg-[#7C3AED]/10 px-2 py-1 text-[10px] text-[#7C3AED]">
                {achievement}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Recent Submissions</div>
          <div className="space-y-2">
            {user.recentSubmissions.map((sub, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-2" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-2">
                  <Code className="h-3 w-3 text-[#6B7280]" />
                  <span className="text-[12px] text-white">{sub.problem}</span>
                </div>
                <span className={`text-[10px] ${sub.status === "Accepted" ? "text-[#22C55E]" : "text-[#EF4444]"}`}>{sub.status}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LeaderboardRow({ user, rank, onClick }: { user: User; rank: number; onClick: () => void }) {
  const getRankColor = (r: number) => {
    if (r === 1) return "text-[#FFD700]";
    if (r === 2) return "text-[#C0C0C0]";
    if (r === 3) return "text-[#CD7F32]";
    if (r <= 10) return "text-[#7C3AED]";
    return "text-[#6B7280]";
  };

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ backgroundColor: "rgba(124, 58, 237, 0.05)" }}
      className="cursor-pointer border-b transition-colors"
      style={{ borderColor: COLORS.border }}
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <span className={`text-[14px] font-bold ${getRankColor(rank)}`}>#{rank}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 overflow-hidden rounded-full">
            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-[13px] font-medium text-white">{user.name}</div>
            <div className="text-[10px] text-[#6B7280]">{user.countryFlag} {user.country}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-white">{user.rating}</span>
          <RatingTrend change={user.ratingChange} />
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-[13px] text-[#9CA3AF]">{user.problemsSolved}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[13px] text-[#9CA3AF]">{user.contests}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#23252F]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]"
              style={{ width: `${user.accuracy}%` }}
            />
          </div>
          <span className="text-[12px] text-[#9CA3AF]">{user.accuracy}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Flame className="h-3 w-3 text-[#F59E0B]" />
          <span className="text-[13px] text-[#9CA3AF]">{user.streak}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {user.badges.slice(0, 3).map((badge, i) => (
            <BadgeShine key={i} badge={badge} />
          ))}
          {user.badges.length > 3 && (
            <span className="text-[10px] text-[#6B7280]">+{user.badges.length - 3}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-[11px] text-[#6B7280]">{user.lastActive}</span>
      </td>
    </motion.tr>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function LeaderboardPage() {
  const [scope, setScope] = useState<"global" | "country" | "college" | "friends" | "company">("global");
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "all">("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [visibleCount, setVisibleCount] = useState(25);

  const filteredUsers = useMemo(() => {
    let users = [...allUsers];
    if (timeframe === "weekly") {
      users = users.sort((a, b) => b.ratingChange - a.ratingChange);
    }
    return users;
  }, [timeframe]);

  const topThree = filteredUsers.slice(0, 3);
  const restUsers = filteredUsers.slice(3, visibleCount);

  const currentUser = allUsers[Math.floor(Math.random() * allUsers.length)];

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setVisibleCount((prev) => Math.min(prev + 25, filteredUsers.length));
    }
  }, [filteredUsers.length]);

  const scopeOptions = [
    { value: "global", label: "Global", icon: Globe },
    { value: "country", label: "Country", icon: Users },
    { value: "college", label: "College", icon: Building2 },
    { value: "friends", label: "Friends", icon: Users },
    { value: "company", label: "Company", icon: Briefcase },
  ];

  const timeframeOptions = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "all", label: "All Time" },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
        {/* Header */}
        <div className="border-b" style={{ borderColor: COLORS.border }}>
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFD700] to-[#7C3AED]">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
                    <p className="text-[13px] text-[#9CA3AF]">Compete with the best programmers around the world.</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[10px] text-[#6B7280]">Your Rank</div>
                  <div className="text-[20px] font-bold text-[#7C3AED]">#{Math.floor(Math.random() * 100) + 1}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#6B7280]">Global Rating</div>
                  <div className="text-[20px] font-bold text-white">{currentUser.rating}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#6B7280]">Percentile</div>
                  <div className="text-[20px] font-bold text-[#22C55E]">Top {currentUser.percentile}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Top Three Podium */}
          <div className="mb-8">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Top Performers</div>
            <div className="flex items-end justify-center gap-8 py-8">
              <PodiumSpot user={topThree[1]} rank={2} delay={0.2} />
              <PodiumSpot user={topThree[0]} rank={1} delay={0.1} />
              <PodiumSpot user={topThree[2]} rank={3} delay={0.3} />
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              {scopeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setScope(option.value as typeof scope)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                      scope === option.value
                        ? "bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30"
                        : "text-[#6B7280] hover:text-white border border-transparent hover:border-[#23252F]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              {timeframeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeframe(option.value as typeof timeframe)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                    timeframe === option.value
                      ? "bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30"
                      : "text-[#6B7280] hover:text-white border border-transparent hover:border-[#23252F]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-6">
            {/* Main Table */}
            <div className="flex-1 rounded-xl border" style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}>
              <table className="w-full">
                <thead className="sticky top-0" style={{ backgroundColor: COLORS.surface }}>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Rank</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">User</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Rating</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Solved</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Contests</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Accuracy</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Streak</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Badges</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Active</th>
                  </tr>
                </thead>
                <tbody onScroll={handleScroll}>
                  <AnimatePresence>
                    {restUsers.map((user, index) => (
                      <LeaderboardRow
                        key={user.id}
                        user={user}
                        rank={index + 4}
                        onClick={() => setSelectedUser(user)}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {visibleCount < filteredUsers.length && (
                <div className="flex items-center justify-center py-4">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 25)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-colors"
                  >
                    Load More <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="w-80 space-y-4">
              {/* Your Stats */}
              <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}>
                <div className="mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-[#FFD700]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Your Progress</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9CA3AF]">Weekly Progress</span>
                      <span className="text-[#22C55E]">+45 rating</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#23252F]">
                      <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9CA3AF]">Problems This Week</span>
                      <span className="text-white">24/50</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#23252F]">
                      <div className="h-full w-[48%] rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Friends Ranking */}
              <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}>
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#7C3AED]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Friends</span>
                </div>
                <div className="space-y-3">
                  {allUsers.slice(0, 5).map((user, i) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-[#6B7280] w-5">{i + 1}</span>
                      <div className="h-7 w-7 overflow-hidden rounded-full">
                        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-[12px] text-white">{user.name}</div>
                        <div className="text-[10px] text-[#6B7280]">{user.rating}</div>
                      </div>
                      <RatingTrend change={user.ratingChange} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Contest */}
              <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}>
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#F59E0B]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Upcoming Contest</span>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-[#7C3AED]/10 to-[#3B82F6]/10 p-3">
                  <div className="text-[13px] font-semibold text-white">Weekly Challenge #42</div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                    <Clock className="h-3 w-3" />
                    Starts in 2h 34m
                  </div>
                  <button className="mt-2 w-full rounded-lg bg-[#7C3AED] py-1.5 text-[11px] font-semibold text-white hover:bg-[#7C3AED]/90 transition-colors">
                    Register Now
                  </button>
                </div>
              </div>

              {/* Top Rising Players */}
              <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}>
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#F59E0B]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Rising Stars</span>
                </div>
                <div className="space-y-3">
                  {filteredUsers
                    .sort((a, b) => b.ratingChange - a.ratingChange)
                    .slice(0, 5)
                    .map((user, i) => (
                      <div key={user.id} className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-[#6B7280] w-5">{i + 1}</span>
                        <div className="h-7 w-7 overflow-hidden rounded-full">
                          <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-[12px] text-white">{user.name}</div>
                          <div className="text-[10px] text-[#6B7280]">{user.countryFlag}</div>
                        </div>
                        <span className="text-[11px] font-bold text-[#22C55E]">+{user.ratingChange}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Today's Challenge */}
              <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}>
                <div className="mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#EF4444]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Daily Challenge</span>
                </div>
                <div className="rounded-lg border p-3" style={{ borderColor: COLORS.accent }}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]/20">
                      <Code className="h-4 w-4 text-[#7C3AED]" />
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-white">Two Sum Variants</div>
                      <div className="text-[10px] text-[#6B7280]">Hard · Array, Hash Table</div>
                    </div>
                  </div>
                  <button className="mt-2 w-full rounded-lg border py-1.5 text-[11px] font-medium text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-colors" style={{ borderColor: COLORS.accent }}>
                    Attempt Challenge
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player Card Modal */}
        <AnimatePresence>
          {selectedUser && <PlayerCard user={selectedUser} onClose={() => setSelectedUser(null)} />}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}