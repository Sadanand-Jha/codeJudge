"use client";

import { use } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  Clock,
  Users,
  Star,
  Verified,
  BarChart3,
  Target,
  Award,
  Flame,
  ThumbsUp,
  Share2,
  ExternalLink,
  CheckCircle,
  User,
} from "lucide-react";
import Link from "next/link";
import { mockQuizzes, mockQuizCreator } from "@/mocks/quizData";
import { getQuizCode, quizCodePath } from "@/services/quiz";

export default function QuizDetailsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const quizCode = getQuizCode(quizId);
  const quiz = mockQuizzes.find((q) => q.id === quizCode) || mockQuizzes[1];
  const settings = quiz.assessmentSettings || { attemptsAllowed: 3, passingScore: 40, timeLimit: 30, negativeMarking: false, practiceMode: false, enableCertificate: true, enableLeaderboard: true, enableDiscussion: true, enableBookmarks: true, lifelines: [] };

  const difficultyColor =
    quiz.difficulty === "Easy"
      ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20"
      : quiz.difficulty === "Medium"
      ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
      : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20";

  return (
    <div className="min-h-screen bg-[#09090B] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] overflow-hidden"
        >
          {quiz.coverImage && (
            <div className="h-48 w-full bg-cover bg-center" style={{ backgroundImage: `url('${quiz.coverImage}')` }} />
          )}
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
                <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                  <span>by {quiz.creatorName}</span>
                  <span>•</span>
                  <span>{quiz.tags.join(", ")}</span>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${difficultyColor}`}>
                {quiz.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-4">
              {quiz.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 bg-[#0B0D12] text-[11px] text-[#9CA3AF] rounded-full border border-white/[0.06]">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-[#9CA3AF]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{quiz.timeLimit} min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>{quiz.questions.length} questions</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  <span>{quiz.totalPoints} points</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{quiz.registeredCount} registered</span>
                </div>
              </div>
              <Link
                href={quizCodePath(quizCode, "register")}
                className="px-5 h-9 rounded-lg border border-[#EC4899]/30 bg-[#EC4899]/10 text-sm font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors flex items-center gap-1.5"
              >
                Register
              </Link>
            </div>
          </div>
        </motion.div>

        {/* About Quiz */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-white">About This Assessment</h2>
          <p className="text-sm text-[#9CA3AF]">{quiz.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-[#9CA3AF]">Passing Score</span>
              <p className="font-medium text-white">{quiz.passingScore ?? settings.passingScore}%</p>
            </div>
            <div>
              <span className="text-xs text-[#9CA3AF]">Attempts Allowed</span>
              <p className="font-medium text-white">{quiz.attemptsAllowed}</p>
            </div>
            <div>
              <span className="text-xs text-[#9CA3AF]">Negative Marking</span>
              <p className="font-medium text-white">{quiz.assessmentSettings?.negativeMarking ? "Yes" : "No"}</p>
            </div>
            <div>
              <span className="text-xs text-[#9CA3AF]">Languages</span>
              <p className="font-medium text-white">{quiz.languagesSupported?.join(", ") || "English"}</p>
            </div>
            <div>
              <span className="text-xs text-[#9CA3AF]">Certificate</span>
              <p className="font-medium text-white">{quiz.certificateEligible ? "Yes" : "No"}</p>
            </div>
            <div>
              <span className="text-xs text-[#9CA3AF]">Last Updated</span>
              <p className="font-medium text-white">{new Date(quiz.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {quiz.learningOutcomes && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#9CA3AF]">Learning Outcomes</label>
              <ul className="text-sm text-[#9CA3AF] space-y-1">
                {quiz.learningOutcomes.map((outcome, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[#22C55E]" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {quiz.prerequisites && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#9CA3AF]">Prerequisites</label>
              <ul className="text-sm text-[#9CA3AF] space-y-1">
                {quiz.prerequisites.map((pre, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-[#EC4899]" />
                    {pre}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Attempts", value: quiz.attempts.toString(), icon: BookOpen, color: "text-[#EC4899]" },
              { label: "Pass Rate", value: `${quiz.averageScore}%`, icon: Target, color: "text-[#22C55E]" },
              { label: "Avg. Score", value: `${quiz.averageScore}%`, icon: BarChart3, color: "text-[#EC4899]" },
              { label: "Bookmarks", value: "8", icon: ThumbsUp, color: "text-[#EF4444]" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
                <stat.icon className={`w-4 h-4 ${stat.color} mb-1`} />
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-[#9CA3AF]">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Creator Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">About the Creator</h2>
          <div className="flex items-center gap-4">
            <img src={mockQuizCreator.avatar} alt={mockQuizCreator.username} className="w-16 h-16 rounded-full border border-white/[0.08]" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">{mockQuizCreator.username}</h3>
                {mockQuizCreator.verified && <Verified className="w-4 h-4 text-[#EC4899]" />}
              </div>
              <p className="text-xs text-[#9CA3AF]">{mockQuizCreator.bio}</p>
              <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
                <span>{mockQuizCreator.college}</span>
                <span>•</span>
                <span>{mockQuizCreator.totalQuizzes} quizzes</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-[#F59E0B] fill-current" />
                  {mockQuizCreator.averageRating}
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="px-3 h-8 rounded-lg border border-white/[0.08] bg-[#0B0D12] text-xs font-medium text-white hover:border-white/[0.12]">
                Follow
              </button>
              <button className="px-3 h-8 rounded-lg border border-white/[0.08] bg-[#0B0D12] text-xs font-medium text-white hover:border-white/[0.12]">
                View Profile
              </button>
            </div>
          </div>
        </motion.div>

        {/* Registration CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center pt-4"
        >
          <Link
            href={quizCodePath(quizCode, "register")}
            className="inline-flex items-center justify-center gap-2 px-8 h-12 rounded-xl border border-[#EC4899]/30 bg-[#EC4899]/10 text-sm font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-all hover:shadow-[0_0_24px_rgba(124,58,237,0.2)]"
          >
            Register Now
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
