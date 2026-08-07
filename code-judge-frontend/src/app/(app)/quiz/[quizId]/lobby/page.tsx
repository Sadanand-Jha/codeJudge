"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { BookOpen, Clock, Users, Shield, Wifi, Monitor } from "lucide-react";
import Link from "next/link";
import { mockQuizzes } from "@/mocks/quizData";

import { getQuizCode } from "@/services/quiz";

export default function QuizLobbyPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const quizCode = getQuizCode(quizId);
  const quiz = mockQuizzes.find((q) => q.id === quizCode) || mockQuizzes[1];
  const [countdown, setCountdown] = useState(10);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setChecking(true);
    const timer = setTimeout(() => setChecking(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Link href={`/quiz/${quizCode}`} className="text-muted-foreground hover:text-white text-sm">
          ← Back to Quiz
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border-hover bg-card p-8 text-center space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-xl bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-[#EC4899]" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">Assessment Lobby</p>
          </div>

          {/* Countdown */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Starting in</p>
            <p className="text-5xl font-bold text-white">{countdown}s</p>
          </div>

          {/* System Check */}
          <div className="space-y-3 pt-4">
            <h2 className="text-sm font-semibold text-white">System Check</h2>
            <div className="space-y-2">
              {[
                { label: "Browser Compatibility", icon: Monitor, ok: checking ? null : true },
                { label: "Internet Status", icon: Wifi, ok: checking ? null : true },
                { label: "Tab Switching Detection", icon: Shield, ok: checking ? null : true },
                { label: "Fullscreen Mode", icon: Monitor, ok: checking ? null : true },
              ].map((check) => (
                <div key={check.label} className="flex items-center justify-between rounded-xl border border-border-hover bg-[#0B0D12] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <check.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-[#E5E7EB]">{check.label}</span>
                  </div>
                  {check.ok === null ? (
                    <div className="w-4 h-4 rounded-full bg-[#F59E0B] animate-pulse" />
                  ) : check.ok ? (
                    <div className="w-4 h-4 rounded-full bg-[#22C55E]" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-[#EF4444]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 space-y-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{quiz.timeLimit} min</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>{quiz.questions.length} questions</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{quiz.registeredCount} registered</span>
              </div>
            </div>
          </div>

          <Link
            href={`/quiz/${quizCode}/attempt`}
            className="w-full h-10 rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 text-sm font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-colors flex items-center justify-center"
          >
            Enter Assessment
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
