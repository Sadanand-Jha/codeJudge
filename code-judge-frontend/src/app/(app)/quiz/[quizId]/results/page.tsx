"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, TrendingUp, Award, Target, ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { mockQuizzes, mockQuizQuestions } from "@/mocks/quizData";

import { getQuizCode } from "@/services/quiz";

export default function QuizResultsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const quizCode = getQuizCode(quizId);
  const quiz = mockQuizzes.find((q) => q.id === quizCode) || mockQuizzes[1];
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

  // Mock leaderboard settings - in real app, fetch from quiz settings
  const leaderboardEnabled = true; // quiz.assessmentSettings?.enableLeaderboard ?? true
  const isAdmin = false; // Mock - check user role
  const isCreator = false; // Mock - check if user is quiz creator

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border-hover bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <Link href="/quiz" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white mb-2">
                <ArrowLeft className="w-3 h-3" />
                Back to Quizzes
              </Link>
              <h1 className="text-2xl font-bold text-white">{quiz.title} - Results</h1>
              <p className="text-sm text-muted-foreground mt-1">Completed on {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{percentage}%</p>
              <p className="text-xs text-muted-foreground">Overall Score</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border-hover bg-card p-4"
          >
            <Target className="w-5 h-5 text-[#EC4899] mb-2" />
            <p className="text-2xl font-bold text-white">{score}/{totalPoints}</p>
            <p className="text-xs text-muted-foreground">Total Score</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border-hover bg-card p-4"
          >
            <Award className="w-5 h-5 text-[#F59E0B] mb-2" />
            <p className="text-2xl font-bold text-white">#{rank}</p>
            <p className="text-xs text-muted-foreground">Global Rank</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border-hover bg-card p-4"
          >
            <TrendingUp className="w-5 h-5 text-[#22C55E] mb-2" />
            <p className="text-2xl font-bold text-white">{totalParticipants}</p>
            <p className="text-xs text-muted-foreground">Participants</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-border-hover bg-card p-4"
          >
            <CheckCircle className="w-5 h-5 text-[#EC4899] mb-2" />
            <p className="text-2xl font-bold text-white">{timeTaken}</p>
            <p className="text-xs text-muted-foreground">Time Taken</p>
          </motion.div>
        </div>

        {/* Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-border-hover bg-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Performance Summary</h2>
          <div className="space-y-3">
            {questions.map((q, index) => {
              const isCorrect = [0, 1, 3].includes(index);
              return (
                <div key={q.id} className="flex items-center gap-3 rounded-lg border border-border-hover bg-[#0B0D12] p-3">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-[#22C55E] shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#EF4444] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">Q{index + 1}: {q.question}</p>
                    {!isCorrect && q.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
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

        {/* Leaderboard Section */}
        {(leaderboardEnabled || isAdmin || isCreator) ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl border border-border-hover bg-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
              {!leaderboardEnabled && (isAdmin || isCreator) && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
                  Creator View
                </span>
              )}
            </div>

            {leaderboardEnabled ? (
              <>
                <div className="space-y-2 mb-4">
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
                        entry.rank === 2 ? "bg-[#9CA3AF]/20 text-muted-foreground" :
                        entry.rank === 3 ? "bg-[#EF4444]/20 text-[#EF4444]" :
                        "bg-white/[0.06] text-muted-foreground"
                      }`}>
                        {entry.rank}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{entry.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{entry.score} pts</p>
                        <p className="text-xs text-muted-foreground">{entry.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/quiz/${quizCode}/leaderboard`}
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-sm font-bold text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-colors"
                >
                  <Trophy className="w-4 h-4" />
                  View Full Leaderboard
                </Link>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#6B7280]/10 mb-3">
                  <Trophy className="w-6 h-6 text-[#6B7280]" />
                </div>
                <p className="text-sm font-medium text-white mb-1">Leaderboard Disabled</p>
                <p className="text-xs text-muted-foreground">The quiz creator has disabled leaderboard visibility for participants.</p>
              </div>
            )}
          </motion.div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href="/quiz" className="flex-1 h-10 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white hover:border-white/20 transition-colors text-center">
            Back to Dashboard
          </Link>
          <button className="flex-1 h-10 rounded-xl border border-[#EC4899]/30 bg-[#EC4899]/10 text-sm font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}