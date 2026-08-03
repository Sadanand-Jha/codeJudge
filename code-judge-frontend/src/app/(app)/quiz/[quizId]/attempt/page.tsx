"use client";

import { useState, useMemo, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { mockQuizzes, mockQuizQuestions } from "@/mocks/quizData";
import { QuizQuestion } from "@/types/quiz";

import { getQuizCode } from "@/services/quiz";

export default function QuizAttemptPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const quizCode = getQuizCode(quizId);
  const quiz = mockQuizzes.find((q) => q.id === quizCode) || mockQuizzes[1];
  const questions = quiz.questions.length > 0 ? quiz.questions : mockQuizQuestions;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit ? quiz.timeLimit * 60 : 600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = (value: string | number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    let totalScore = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        totalScore += q.points;
      }
    });
    setScore(totalScore);
    setShowResults(true);
  };

  const progress = useMemo(() => {
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  }, [currentQuestionIndex, questions.length]);

  if (showResults) {
    const percentage = Math.round((score / quiz.totalPoints) * 100);
    return (
      <div className="min-h-screen bg-[#09090B] p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-8 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-[#22C55E]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Quiz Completed!</h1>
            <p className="text-sm text-[#9CA3AF] mb-6">Great effort! Here's how you did:</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4">
                <p className="text-3xl font-bold text-white">{score}/{quiz.totalPoints}</p>
                <p className="text-xs text-[#9CA3AF]">Total Score</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4">
                <p className="text-3xl font-bold text-white">{percentage}%</p>
                <p className="text-xs text-[#9CA3AF]">Accuracy</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {questions.map((q, index) => {
                const isCorrect = answers[q.id] === q.correctAnswer;
                return (
                  <div key={q.id} className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#0B0D12] p-3 text-left">
                    {isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">Q{index + 1}: {q.question}</p>
                      {!isCorrect && q.explanation && (
                        <p className="text-[10px] text-[#9CA3AF] mt-1">{q.explanation}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white shrink-0">{isCorrect ? `+${q.points}` : "0"}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button className="flex-1 h-10 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white hover:border-white/20 transition-colors">
                Review Answers
              </button>
              <button className="flex-1 h-10 rounded-xl border border-[#EC4899]/30 bg-[#EC4899]/10 text-sm font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors">
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.08] bg-[#0B0C0F]">
        <div className="flex items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-sm font-semibold text-white">{quiz.title}</h1>
            <p className="text-xs text-[#9CA3AF]">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-sm font-mono text-white">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 h-9 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 text-xs font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Submit
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-white/[0.06]">
          <motion.div
            className="h-full bg-[#EC4899]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#9CA3AF]">Q{currentQuestionIndex + 1}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EC4899]/10 text-[#EC4899]">
                    {currentQuestion.points} points
                  </span>
                </div>

                <h2 className="text-base font-semibold text-white">{currentQuestion.question}</h2>

                <div className="space-y-2">
                  {(currentQuestion.options || []).map((option, index) => {
                    const isSelected = answers[currentQuestion.id] === index;
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswer(index)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "border-[#EC4899] bg-[#EC4899]/10"
                            : "border-white/[0.08] bg-[#0B0D12] hover:border-white/[0.12]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-[#EC4899]" : "border-white/20"
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-[#EC4899]" />}
                          </div>
                          <span className="text-sm text-white">{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="shrink-0 border-t border-white/[0.08] bg-[#0B0C0F] px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-4 h-9 rounded-lg border border-white/[0.08] bg-white/5 text-xs font-medium text-white hover:border-white/[0.12] transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentQuestionIndex ? "bg-[#EC4899]" : "bg-white/10 hover:bg-white/20"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
            className="flex items-center gap-2 px-4 h-9 rounded-lg border border-white/[0.08] bg-white/5 text-xs font-medium text-white hover:border-white/[0.12] transition-colors disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}