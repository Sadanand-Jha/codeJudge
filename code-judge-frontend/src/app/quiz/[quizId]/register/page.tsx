"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  Users,
  Check,
  X,
  Shield,
  Timer,
  RefreshCw,
  Shuffle,
  Award,
  MessageSquare,
  Bookmark,
  Trophy,
  FileText,
  Target,
  Eye,
  SkipForward,
  Lightbulb,
  Calendar,
  Star,
} from "lucide-react";
import Link from "next/link";
import { mockQuizzes, mockQuizCreator } from "@/mocks/quizData";
import { DEFAULT_ASSESSMENT_SETTINGS, LifelineConfig } from "@/types/quiz";

export default function QuizRegisterPage({ params }: { params: { quizId: string } }) {
  const quiz = mockQuizzes.find((q) => q.id === params.quizId) || mockQuizzes[1];
  const settings = quiz.assessmentSettings || DEFAULT_ASSESSMENT_SETTINGS;
  const [agreed, setAgreed] = useState(false);
  const [readRules, setReadRules] = useState(false);
  const [noTabSwitch, setNoTabSwitch] = useState(false);

  const canRegister = agreed && readRules;

  const enabledLifelines = settings.lifelines.filter((l) => l.enabled && l.maxUses > 0);

  return (
    <div className="min-h-screen bg-[#09090B] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/quiz/${quiz.id}`} className="text-[#9CA3AF] hover:text-white text-sm">
            ← Back to Quiz
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
              <p className="text-sm text-[#9CA3AF]">by {quiz.creatorName}</p>
              <p className="text-sm text-[#9CA3AF] max-w-xl">{quiz.description}</p>
            </div>
          </div>
        </motion.div>

        {/* Quiz Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6 space-y-6"
        >
          <h2 className="text-lg font-semibold text-white">Quiz Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <span className="text-xs text-[#9CA3AF]">Creator</span>
              <p className="font-medium text-white mt-1">{quiz.creatorName}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <span className="text-xs text-[#9CA3AF]">Duration</span>
              <p className="font-medium text-white mt-1">{quiz.timeLimit} minutes</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <span className="text-xs text-[#9CA3AF]">Questions</span>
              <p className="font-medium text-white mt-1">{quiz.questions.length}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <span className="text-xs text-[#9CA3AF]">Difficulty</span>
              <p className="font-medium text-white mt-1">{quiz.difficulty}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <span className="text-xs text-[#9CA3AF]">Passing %</span>
              <p className="font-medium text-white mt-1">{quiz.passingScore ?? settings.passingScore}%</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <span className="text-xs text-[#9CA3AF]">Attempts Allowed</span>
              <p className="font-medium text-white mt-1">{quiz.attemptsAllowed}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3 md:col-span-3">
              <span className="text-xs text-[#9CA3AF]">Negative Marking</span>
              <p className="font-medium text-white mt-1">
                {settings.negativeMarking ? `Yes (-${settings.negativeMarkValue} per wrong answer)` : "No"}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3 md:col-span-3">
              <span className="text-xs text-[#9CA3AF]">Question Types</span>
              <p className="font-medium text-white mt-1">
                Multiple Choice, True/False, Code Output, Text Answers
              </p>
            </div>
          </div>
        </motion.div>

        {/* Attempts Left */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-white">Allowed Attempts</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <span className="text-sm text-[#9CA3AF]">Attempts Allowed</span>
              <span className="font-medium text-white">{quiz.attemptsAllowed}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <span className="text-sm text-[#9CA3AF]">Attempts Used</span>
              <span className="font-medium text-[#F59E0B]">1</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
              <span className="text-sm text-[#9CA3AF]">Attempts Remaining</span>
              <span className="font-medium text-[#22C55E]">{quiz.attemptsAllowed - 1}</span>
            </div>
          </div>
        </motion.div>

        {/* Lifelines */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-white">Available Lifelines</h2>
          {enabledLifelines.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">No lifelines available for this assessment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {enabledLifelines.map((lifeline) => (
                <LifelineCard key={lifeline.type} config={lifeline} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Rules */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-white">Assessment Rules</h2>
          <div className="space-y-2 text-sm">
            <RuleItem icon={<Timer className="w-4 h-4 text-[#3B82F6]" />} text="The timer cannot be paused once started." />
            <RuleItem icon={<Shield className="w-4 h-4 text-[#3B82F6]" />} text="No tab switching is allowed (monitored)." />
            <RuleItem icon={<Calendar className="w-4 h-4 text-[#3B82F6]" />} text="The assessment will auto-submit when time runs out." />
            {settings.randomizeQuestions && (
              <RuleItem icon={<Shuffle className="w-4 h-4 text-[#3B82F6]" />} text="Questions are randomized for each attempt." />
            )}
            {settings.randomizeOptions && (
              <RuleItem icon={<Shuffle className="w-4 h-4 text-[#3B82F6]" />} text="Answer options are randomized." />
            )}
            {!settings.canRevisit && (
              <RuleItem icon={<X className="w-4 h-4 text-[#EF4444]" />} text="You cannot revisit questions once answered." />
            )}
          </div>
        </motion.div>

        {/* Confirmation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-white">Confirmation</h2>
          <div className="space-y-2">
            <label className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={readRules}
                onChange={(e) => setReadRules(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#09090B] accent-[#7C3AED] mt-0.5"
              />
              <span className="text-sm text-[#E5E7EB]">I have read all the instructions and rules above.</span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#09090B] accent-[#7C3AED] mt-0.5"
              />
              <span className="text-sm text-[#E5E7EB]">I agree to the assessment rules and understand the timer cannot be paused.</span>
            </label>
          </div>
        </motion.div>

        {/* Register Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <Link
            href={canRegister ? `/quiz/${quiz.id}/lobby` : "#"}
            className={`inline-flex items-center justify-center gap-2 px-8 h-12 rounded-xl border font-bold transition-all ${
              canRegister
                ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 hover:shadow-[0_0_24px_rgba(34,197,94,0.2)]"
                : "border-white/[0.08] bg-[#111827] text-[#9CA3AF] cursor-not-allowed"
            }`}
          >
            Register Now
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function RuleItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <span className="text-sm text-[#E5E7EB]">{text}</span>
    </div>
  );
}

function LifelineCard({ config }: { config: LifelineConfig }) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Lightbulb,
    Clock,
    SkipForward,
    Eye,
    Target,
    FileText,
  };
  const Icon = iconMap[config.icon] || Target;

  return (
    <motion.div
      className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#7C3AED]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{config.label}</h3>
            <span className="text-xs text-[#9CA3AF]">Uses: {config.maxUses}</span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1">{config.description}</p>
          {config.penalty && config.penalty > 0 && (
            <p className="text-xs text-[#EF4444] mt-1">Penalty: -{config.penalty}% per use</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
