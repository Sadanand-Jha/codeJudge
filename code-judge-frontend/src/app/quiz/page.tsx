"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Flame,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Users,
  Star,
  Award,
  Zap,
  Play,
  ChevronRight,
  Bookmark,
  BarChart3,
  Gift,
  Plus,
} from "lucide-react";
import { mockQuizzes, mockAttempts } from "@/mocks/quizData";

export default function QuizDashboardPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "active" | "completed" | "my-quizzes">("upcoming");

  const upcomingQuizzes = mockQuizzes.filter((q) => q.status === "upcoming");
  const activeQuizzes = mockQuizzes.filter((q) => q.status === "active");
  const completedQuizzes = mockQuizzes.filter((q) => q.status === "completed");

  const stats = [
    { label: "Quizzes Attempted", value: "24", icon: BookOpen, color: "text-[#7C3AED]" },
    { label: "Average Accuracy", value: "78%", icon: Target, color: "text-[#22C55E]" },
    { label: "Current Streak", value: "12 Days", icon: Flame, color: "text-[#F59E0B]" },
    { label: "XP Earned", value: "18,450", icon: Zap, color: "text-[#3B82F6]" },
    { label: "Quizzes Created", value: "3", icon: Award, color: "text-[#7C3AED]" },
    { label: "Badges Earned", value: "12", icon: Trophy, color: "text-[#F59E0B]" },
    { label: "Global Rank", value: "#421", icon: Trophy, color: "text-[#EC4899]" },
    { label: "Bookmarked", value: "8", icon: Bookmark, color: "text-[#EF4444]" },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111827] to-[#0B0D12] p-8"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-8 h-8 text-[#7C3AED]" />
                Assessment & Quiz Platform
              </h1>
              <p className="text-sm text-[#9CA3AF] max-w-2xl">
                Discover, create, and participate in quizzes across academics, placements, technical subjects, company assessments, certifications, and community challenges.
              </p>
              <div className="flex items-center gap-6 pt-2">
                {["Learn", "Assess", "Compete", "Improve"].map((tag, i) => (
                  <span key={tag} className="text-xs font-medium text-white bg-[#7C3AED]/10 px-3 py-1 rounded-full border border-[#7C3AED]/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#3B82F6]/20 border border-white/[0.08] flex items-center justify-center">
                <BookOpen className="w-20 h-20 text-[#7C3AED]/40" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl border border-white/[0.08] bg-[#111827] p-3 hover:border-white/[0.12] transition-colors"
            >
              <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-[#9CA3AF]">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 border-b border-white/[0.08]">
            {(["upcoming", "active", "completed", "my-quizzes"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "text-white border-b-2 border-[#7C3AED]"
                    : "text-[#9CA3Af] hover:text-white"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace("-", " ")}
              </button>
            ))}
          </div>
          <Link
            href="/quiz/create"
            className="flex items-center gap-1.5 px-4 h-8 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-xs font-bold text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Quiz
          </Link>
        </div>

        {/* Upcoming Assessments */}
        {activeTab === "upcoming" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Upcoming Assessments</h2>
              <button className="text-xs text-[#7C3AED] hover:text-[#8B5AF0]">View all →</button>
            </div>
            <div className="space-y-3">
              {upcomingQuizzes.map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-xl border border-white/[0.08] bg-[#111827] p-4 hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-white">{quiz.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                        <span>by {quiz.creatorName}</span>
                        <span>•</span>
                        <span>{quiz.tags[0] || "General"}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      quiz.difficulty === "Easy" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                      quiz.difficulty === "Medium" ? "bg-[#F59E0B]/10 text-[#F59E0B]" :
                      "bg-[#EF4444]/10 text-[#EF4444]"
                    }`}>
                      {quiz.difficulty}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-3 text-xs text-[#9CA3AF]">
                    <div>
                      <span className="font-medium">Visibility</span>
                      <p className="mt-1">{quiz.visibility.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
                    </div>
                    <div>
                      <span className="font-medium">Date</span>
                      <p className="mt-1">{new Date(quiz.startTime || "").toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Duration</span>
                      <p className="mt-1">{quiz.timeLimit} minutes</p>
                    </div>
                    <div>
                      <span className="font-medium">Registered</span>
                      <p className="mt-1">{quiz.registeredCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4 text-xs text-[#9CA3AF]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Starts in 2 hours</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>1h 45m left to register</span>
                      </div>
                    </div>
                    <button className="px-4 h-8 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-xs font-semibold text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-colors">
                      Register
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Active Quizzes */}
        {activeTab === "active" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Active Assessments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeQuizzes.map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-xl border border-[#22C55E]/20 bg-[#111827] p-4"
                >
                  <h3 className="text-sm font-semibold text-white">{quiz.title}</h3>
                  <p className="text-xs text-[#9CA3AF] mt-1">by {quiz.creatorName}</p>
                  <div className="mt-3 space-y-1 text-xs text-[#9CA3AF]">
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{quiz.timeLimit}m</span></div>
                    <div className="flex items-center gap-1"><Users className="w-3 h-3" /><span>{quiz.registeredCount} Registered</span></div>
                  </div>
                  <button className="w-full h-8 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 text-xs font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-colors flex items-center justify-center gap-1 mt-3">
                    <Play className="w-3 h-3" />Start Quiz
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recently Attempted */}
        {activeTab === "completed" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Recently Attempted</h2>
            <div className="space-y-3">
              {mockAttempts.map((attempt, index) => (
                <motion.div
                  key={attempt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-xl border border-white/[0.08] bg-[#111827] p-4 hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">{attempt.quizTitle}</h3>
                      <p className="text-xs text-[#9CA3AF] mt-1">
                        {new Date(attempt.startedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{attempt.percentage}%</p>
                        <p className="text-[10px] text-[#9CA3AF]">{attempt.score}/{attempt.totalPoints} pts</p>
                      </div>
                      <button className="p-1.5 rounded-lg border border-white/[0.08] text-[#9CA3AF] hover:text-white hover:border-white/[0.12] transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* My Quizzes */}
        {activeTab === "my-quizzes" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">My Quizzes</h2>
              <button className="h-8 px-4 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-xs font-semibold text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-colors">
                + Create New
              </button>
            </div>
            <div className="space-y-3">
              {mockQuizzes.slice(0, 3).map((quiz, index) => (
                <div key={quiz.id} className="rounded-xl border border-white/[0.08] bg-[#111827] p-4">
                  <h3 className="text-sm font-semibold text-white">{quiz.title}</h3>
                  <p className="text-xs text-[#9CA3AF] mt-1">{quiz.questions.length} questions</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      quiz.status === "active" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                      quiz.status === "upcoming" ? "bg-[#F59E0B]/10 text-[#F59E0B]" :
                      "bg-[#9CA3AF]/10 text-[#9CA3AF]"
                    }`}>
                      {quiz.status}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">{quiz.attempts} attempts</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Continue Learning */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-3">Continue Learning</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Binary Search Mastery</h3>
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-2">
                  <span>Progress: 3/5</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full w-3/5 bg-[#7C3AED] rounded-full" />
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-[#9CA3AF]">
                  <span>2 questions remaining</span>
                  <span>Time left: 12m</span>
                </div>
                <button className="w-full h-8 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-xs font-semibold text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-colors mt-2">
                  Resume
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Today's Challenge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-[#F59E0B]/20 bg-gradient-to-br from-[#111827] to-[#0B0D12] p-6"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Today's Challenge</h2>
              <p className="text-xs text-[#9CA3AF]">Complete today's quiz to earn rewards</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-xs font-semibold text-white">+100 XP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-xs font-semibold text-white">+50 Coins</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-xs font-semibold text-white">Daily Streak</span>
                </div>
              </div>
            </div>
            <button className="h-9 px-5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-xs font-bold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" />
              Start Challenge
            </button>
          </div>
        </motion.div>

        {/* Performance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">My Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <BarChart3 className="w-4 h-4 text-[#3B82F6] mb-1" />
              <p className="text-xs text-[#9CA3AF]">Weekly Accuracy</p>
              <p className="text-lg font-bold text-white">82%</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <BookOpen className="w-4 h-4 text-[#7C3AED] mb-1" />
              <p className="text-xs text-[#9CA3AF]">Questions Attempted</p>
              <p className="text-lg font-bold text-white">156</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <Target className="w-4 h-4 text-[#22C55E] mb-1" />
              <p className="text-xs text-[#9CA3AF]">Avg. Score</p>
              <p className="text-lg font-bold text-white">76%</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <TrendingUp className="w-4 h-4 text-[#F59E0B] mb-1" />
              <p className="text-xs text-[#9CA3AF]">Top Subject</p>
              <p className="text-lg font-bold text-white">Database Systems</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
