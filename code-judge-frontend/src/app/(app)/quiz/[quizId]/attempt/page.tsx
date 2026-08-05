"use client";

import { useState, useMemo, use, useEffect } from "react";
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
import { getQuizCode, startQuizAttempt, submitQuizAttempt } from "@/services/quiz";
import {
  saveQuizProgress,
  loadQuizProgress,
  clearQuizProgress,
  createDebouncedSave,
  initializeQuizProgress,
  updateResponse,
  getResponsesArray,
  hasUnsavedProgress,
  updateRemainingTime,
  QuizProgress,
} from "@/utils/quizProgressStorage";
import {
  disableTextSelection,
  enableTextSelection,
  disableCopy,
  disableContextMenu,
  disableDragStart,
  disableSelectStart,
  disableKeyboardShortcuts,
  disablePrint,
  handleVisibilityChange,
  injectWatermarkStyles,
  removeWatermarkStyles,
  createWatermarkElement,
  createTabSwitchOverlay,
} from "@/utils/quizAntiCopy";

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
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [quizProgress, setQuizProgress] = useState<QuizProgress | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  // Initialize quiz and load saved progress
  useEffect(() => {
    const initQuiz = async () => {
      // Try to load saved progress
      const savedProgress = loadQuizProgress(quizId);
      
      if (savedProgress && hasUnsavedProgress(quizId)) {
        // Resume from saved progress
        setQuizProgress(savedProgress);
        setAnswers(savedProgress.responses);
        setCurrentQuestionIndex(savedProgress.currentQuestion || 0);
        if (savedProgress.attemptId) setAttemptId(savedProgress.attemptId);
        if (savedProgress.remainingTime) setTimeLeft(savedProgress.remainingTime);
      } else {
        // Start new quiz
        try {
          const response = await startQuizAttempt(quizId);
          const newProgress = initializeQuizProgress(quizId, response.attempt.id);
          setQuizProgress(newProgress);
          setAttemptId(response.attempt.id);
          saveQuizProgress(newProgress);
        } catch (err) {
          console.error("Failed to start quiz:", err);
        }
      }
    };

    initQuiz();
    
    // Enable anti-copy protection
    disableTextSelection();
    injectWatermarkStyles();
    
    // Add event listeners
    document.addEventListener('copy', disableCopy);
    document.addEventListener('contextmenu', disableContextMenu);
    document.addEventListener('dragstart', disableDragStart);
    document.addEventListener('selectstart', disableSelectStart);
    document.addEventListener('keydown', disableKeyboardShortcuts);
    document.addEventListener('keydown', disablePrint);
    
    // Handle tab visibility
    const cleanupVisibility = handleVisibilityChange((isVisible) => {
      if (!isVisible && quizProgress) {
        // Tab became inactive - quiz is paused
        console.log('Tab became inactive');
      }
    });
    
    // Cleanup on unmount
    return () => {
      enableTextSelection();
      removeWatermarkStyles();
      document.removeEventListener('copy', disableCopy);
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('dragstart', disableDragStart);
      document.removeEventListener('selectstart', disableSelectStart);
      document.removeEventListener('keydown', disableKeyboardShortcuts);
      document.removeEventListener('keydown', disablePrint);
      cleanupVisibility();
    };
  }, [quizId, quizProgress]);

  // Debounced auto-save
  const debouncedSave = useMemo(() => createDebouncedSave(500), []);

  const handleAnswer = (value: string | number) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev, [currentQuestion.id]: value };
      
      // Update progress
      if (quizProgress) {
        const updatedProgress = updateResponse(quizProgress, currentQuestion.id, { option: value });
        setQuizProgress(updatedProgress);
        debouncedSave(updatedProgress);
      }
      
      return newAnswers;
    });
  };

  const handleSubmit = async () => {
    if (!quizProgress || !attemptId) return;
    
    setIsSubmitting(true);

    try {
      // Prepare batch responses
      const responses = getResponsesArray(quizProgress);
      
      // Submit to backend
      const result = await submitQuizAttempt(attemptId.toString(), responses);
      
      setScore(result.score);
      setShowResults(true);
      
      // Clear saved progress on successful submission
      clearQuizProgress(quizId);
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-submit on timer expiry
  useEffect(() => {
    if (timeLeft <= 0 && !showResults && attemptId) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        
        // Update remaining time in progress
        if (quizProgress) {
          const updatedProgress = updateRemainingTime(quizProgress, newTime);
          setQuizProgress(updatedProgress);
          saveQuizProgress(updatedProgress);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResults, attemptId, quizProgress]);

  const questionProgress = useMemo(() => {
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  }, [currentQuestionIndex, questions.length]);

  if (showResults) {
    const percentage = Math.round((score / quiz.totalPoints) * 100);
    return (
      <div className="min-h-screen bg-[#09090B] p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-5 sm:p-8 text-center"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-[#22C55E]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Quiz Completed!</h1>
            <p className="text-xs sm:text-sm text-[#9CA3AF] mb-4 sm:mb-6">Great effort! Here's how you did:</p>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3 sm:p-4">
                <p className="text-2xl sm:text-3xl font-bold text-white">{score}/{quiz.totalPoints}</p>
                <p className="text-[10px] sm:text-xs text-[#9CA3AF]">Total Score</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3 sm:p-4">
                <p className="text-2xl sm:text-3xl font-bold text-white">{percentage}%</p>
                <p className="text-[10px] sm:text-xs text-[#9CA3AF]">Accuracy</p>
              </div>
            </div>

            <div className="space-y-2 mb-4 sm:mb-6 max-h-64 overflow-y-auto">
              {questions.map((q, index) => {
                const isCorrect = answers[q.id] === q.correctAnswer;
                return (
                  <div key={q.id} className="flex items-start gap-2.5 sm:gap-3 rounded-lg border border-white/[0.08] bg-[#0B0D12] p-2.5 sm:p-3 text-left">
                    {isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">Q{index + 1}: {q.question}</p>
                      {!isCorrect && q.explanation && (
                        <p className="text-[10px] text-[#9CA3AF] mt-1 line-clamp-2">{q.explanation}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white shrink-0">{isCorrect ? `+${q.points}` : "0"}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button className="flex-1 h-11 sm:h-10 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white hover:border-white/20 transition-colors">
                Review Answers
              </button>
              <button className="flex-1 h-11 sm:h-10 rounded-xl border border-[#EC4899]/30 bg-[#EC4899]/10 text-sm font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors">
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Create watermark text
  const watermarkText = useMemo(() => {
    if (!quizProgress) return '';
    const username = 'Student';
    const rollNumber = 'R001';
    const timestamp = new Date().toLocaleString('en-IN');
    return `${username} | ${rollNumber} | ${quizCode} | ${timestamp}`;
  }, [quizProgress, quizCode]);

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.08] bg-[#0B0C0F]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{quiz.title}</h1>
            <p className="text-xs text-[#9CA3AF]">Q {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F59E0B]" />
              <span className="text-xs sm:text-sm font-mono text-white font-semibold">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-9 sm:h-9 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 text-xs font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-colors disabled:opacity-50"
            >
              <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{isSubmitting ? "Submitting..." : "Submit"}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-white/[0.06]">
          <motion.div
            className="h-full bg-[#EC4899]"
            animate={{ width: `${questionProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="quiz-watermark-container rounded-2xl border border-white/[0.08] bg-[#111827] p-4 sm:p-6"
          >
            {watermarkText && <div className="quiz-watermark" data-watermark={watermarkText}></div>}
            <div className="quiz-watermark-content">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#9CA3AF]">Q{currentQuestionIndex + 1}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EC4899]/10 text-[#EC4899]">
                  {currentQuestion.points} pts
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-semibold text-white leading-relaxed">{currentQuestion.question}</h2>

              <div className="space-y-2.5 sm:space-y-2">
                {(currentQuestion.options || []).map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === index;
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      className={`w-full text-left p-4 sm:p-4 rounded-xl border transition-all min-h-[56px] ${
                        isSelected
                          ? "border-[#EC4899] bg-[#EC4899]/10"
                          : "border-white/[0.08] bg-[#0B0D12] hover:border-white/[0.12] active:scale-[0.98]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-[#EC4899]" : "border-white/20"
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />}
                        </div>
                        <span className="text-sm sm:text-base text-white">{option}</span>
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
      <div className="shrink-0 border-t border-white/[0.08] bg-[#0B0C0F] px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-10 sm:h-9 rounded-lg border border-white/[0.08] bg-white/5 text-xs sm:text-xs font-medium text-white hover:border-white/[0.12] transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-1">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`h-2.5 w-2.5 sm:h-2 sm:w-2 rounded-full transition-all ${
                  index === currentQuestionIndex ? "bg-[#EC4899] scale-125" : "bg-white/10 hover:bg-white/20"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-10 sm:h-9 rounded-lg border border-white/[0.08] bg-white/5 text-xs sm:text-xs font-medium text-white hover:border-white/[0.12] transition-colors disabled:opacity-50"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}