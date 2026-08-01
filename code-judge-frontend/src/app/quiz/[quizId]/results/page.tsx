"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, TrendingUp, Award, Target, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { mockQuizzes, mockQuizQuestions } from "@/mocks/quizData";

export default function QuizResultsPage({ params }: { params: { quizId: string } }) {
  const quiz = mockQuizzes.find((q) => q.id === params.quizId) || mockQuizzes[1];
  const questions = quiz.questions.length > 0 ? quiz.questions : mockQuizQuestions;

  // Mock result data
  const score = 42;
  const totalPoints = quiz.totalPoints;
  const percentage = Math.round((score / totalPoints) * 100);
  const rank = 15;
  const totalParticipants = 320;
  const timeTaken = "18:45";

  const correctCount = questions.filter((_, i) => [0, 1, 3].includes(i)).length;
  const incorrectCount = questions.length - correctCount;

  return (
    <div className="min-h-screen bg-[#09090B] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <Link href="/quiz" className="inline-flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-white mb-2">
                <ArrowLeft className="w-3 h-3" />
                Back to Quizzes
              </Link>
              <h1 className="text-2xl font-bold text-white">{quiz.title} - Results</h1>
              <p className="text-sm text-[#9CA3AF] mt-1">Completed on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{percentage}%</p>
              <p className="text-xs text-[#9CA3AF]">Overall Score</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-white/[0.08] bg-[#111827] p-4"
          >
            <Target className="w-5 h-5 text-[#7C3AED] mb-2" />
            <p className="text-2xl font-bold text-white">{score}/{totalPoints}</p>
            <p className="text-xs text-[#9CA3AF]">Total Score</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-white/[0.08] bg-[#111827] p-4"
          >
            <Award className="w-5 h-5 text-[#F59E0B] mb-2" />
            <p className="text-2xl font-bold text-white">#{rank}</p>
            <p className="text-xs text-[#9CA3AF]">Global Rank</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-white/[0.08] bg-[#111827] p-4"
          >
            <TrendingUp className="w-5 h-5 text-[#22C55E] mb-2" />
            <p className="text-2xl font-bold text-white">{totalParticipants}</p>
            <p className="text-xs text-[#9CA3AF]">Participants</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-white/[0.08] bg-[#111827] p-4"
          >
            <CheckCircle className="w-5 h-5 text-[#3B82F6] mb-2" />
            <p className="text-2xl font-bold text-white">{timeTaken}</p>
            <p className="text-xs text-[#9CA3AF]">Time Taken</p>
          </motion.div>
        </div>

        {/* Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Performance Summary</h2>
          <div className="space-y-3">
            {questions.map((q, index) => {
              const isCorrect = [0, 1, 3].includes(index);
              return (
                <div key={q.id} className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#0B0D12] p-3">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-[#22C55E] shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#EF4444] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">Q{index + 1}: {q.question}</p>
                    {!isCorrect && q.explanation && (
                      <p className="text-xs text-[#9CA3AF] mt-1">{q.explanation}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-white shrink-0">
                    {isCorrect ? `+${q.points}` : "0"}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Leaderboard</h2>
          <div className="space-y-2">
            {[
              { rank: 1, username: "tourist", score: 95, percentage: 95 },
              { rank: 2, username: "benq", score: 92, percentage: 92 },
              { rank: 3, username: "petr", score: 88, percentage: 88 },
              { rank: rank, username: "you", score, percentage },
            ].map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-3 rounded-lg p-3 ${
                  entry.username === "you" ? "bg-[#7C3AED]/10 border border-[#7C3AED]/20" : "bg-[#0B0D12]"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  entry.rank === 1 ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
                  entry.rank === 2 ? "bg-[#9CA3AF]/20 text-[#9CA3AF]" :
                  entry.rank === 3 ? "bg-[#EF4444]/20 text-[#EF4444]" :
                  "bg-white/[0.06] text-[#9CA3AF]"
                }`}>
                  {entry.rank}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{entry.username}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{entry.score} pts</p>
                  <p className="text-xs text-[#9CA3AF]">{entry.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href="/quiz" className="flex-1 h-10 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white hover:border-white/20 transition-colors text-center">
            Back to Dashboard
          </Link>
          <button className="flex-1 h-10 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-sm font-bold text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}