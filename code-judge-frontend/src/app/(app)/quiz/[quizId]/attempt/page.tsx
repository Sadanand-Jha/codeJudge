"use client";

import { useState, useMemo, use, useEffect, useRef } from "react";
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
  HelpCircle,
} from "lucide-react";
import { mockQuizzes, mockQuizQuestions } from "@/mocks/quizData";
import { QuizQuestion } from "@/types/quiz";
import { getQuizCode } from "@/services/quiz";
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
} from "@/utils/quizAntiCopy";
import { useQuizRegistrationStore } from "@/store/quizRegistrationStore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function QuizAttemptPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const quizCode = getQuizCode(quizId);
  const quiz = mockQuizzes.find((q) => q.id === quizCode) || mockQuizzes[1];
  const questions = quiz.questions.length > 0 ? quiz.questions : mockQuizQuestions;

  const { getRegistration, startAttempt, submitAttempt, isSubmitted } = useQuizRegistrationStore();
  const registration = getRegistration(quizCode);
  const alreadySubmitted = isSubmitted(quizCode);

  // If already submitted, redirect to results
  useEffect(() => {
    if (alreadySubmitted) {
      router.replace(`/quiz/${quizCode}/results`);
    }
  }, [alreadySubmitted, quizCode, router]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit ? quiz.timeLimit * 60 : 600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [quizProgress, setQuizProgress] = useState<QuizProgress | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const quizProgressRef = useRef<QuizProgress | null>(null);
  const timeLeftRef = useRef(quiz.timeLimit ? quiz.timeLimit * 60 : 600);
  const attemptStartedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);

  // Initialize quiz and load saved progress (once per quiz)
  useEffect(() => {
    const initQuiz = async () => {
      const savedProgress = loadQuizProgress(quizId);

      if (savedProgress && hasUnsavedProgress(quizId)) {
        setQuizProgress(savedProgress);
        setAnswers(savedProgress.responses);
        setCurrentQuestionIndex(savedProgress.currentQuestion || 0);
        if (savedProgress.attemptId) setAttemptId(savedProgress.attemptId);
        if (savedProgress.remainingTime) {
          setTimeLeft(savedProgress.remainingTime);
          timeLeftRef.current = savedProgress.remainingTime;
        }
      } else if (!attemptStartedRef.current) {
        attemptStartedRef.current = true;
        // Mock attempt creation
        const mockAttemptId = Date.now();
        const newProgress = initializeQuizProgress(quizId, mockAttemptId);
        setQuizProgress(newProgress);
        setAttemptId(mockAttemptId);
        saveQuizProgress(newProgress);
        // Update registration store
        startAttempt(quizCode, mockAttemptId);
      }
    };

    initQuiz();

    // Anti-copy protection
    disableTextSelection();
    injectWatermarkStyles();

    document.addEventListener('copy', disableCopy);
    document.addEventListener('contextmenu', disableContextMenu);
    document.addEventListener('dragstart', disableDragStart);
    document.addEventListener('selectstart', disableSelectStart);
    document.addEventListener('keydown', disableKeyboardShortcuts);
    document.addEventListener('keydown', disablePrint);

    const cleanupVisibility = handleVisibilityChange((isVisible) => {
      if (!isVisible && quizProgressRef.current) {
        console.log('Tab became inactive');
      }
    });

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
  }, [quizId, quizCode]);

  const debouncedSave = useMemo(() => createDebouncedSave(500), []);

  const handleAnswer = (value: string | number) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev, [currentQuestion.id]: value };
      if (quizProgress) {
        const updatedProgress = updateResponse(quizProgress, currentQuestion.id, { option: value });
        setQuizProgress(updatedProgress);
        debouncedSave(updatedProgress);
      }
      return newAnswers;
    });
  };

  const computeScore = () => {
    let total = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) total += q.points || 1;
    });
    return total;
  };

  const handleSubmitClick = () => {
    setShowSubmitModal(true);
  };

  const confirmSubmit = async () => {
    if (!quizProgress || !attemptId) return;
    setShowSubmitModal(false);
    setIsSubmitting(true);

    try {
      // Mock submission: calculate score locally
      const responses = getResponsesArray(quizProgress);
      const finalScore = computeScore();
      setScore(finalScore);
      setShowResults(true);
      // Persist submission in registration store
      submitAttempt(quizCode, finalScore, quiz.totalPoints);
      clearQuizProgress(quizId);
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (showResults) return;

    const timer = setInterval(() => {
      const newTime = timeLeftRef.current - 1;
      timeLeftRef.current = newTime;

      const progress = quizProgressRef.current;
      if (progress) {
        const updatedProgress = updateRemainingTime(progress, newTime);
        setQuizProgress(updatedProgress);
        saveQuizProgress(updatedProgress);
      }

      setTimeLeft(newTime);

      if (newTime <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 1000);

    timerRef.current = timer;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [showResults, attemptId]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft <= 0 && !showResults && attemptId && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      confirmSubmit();
    }
  }, [timeLeft, showResults, attemptId]);

  useEffect(() => { quizProgressRef.current = quizProgress; }, [quizProgress]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const questionProgress = useMemo(() => ((currentQuestionIndex + 1) / questions.length) * 100, [currentQuestionIndex, questions.length]);

  const attemptedCount = Object.keys(answers).length;
  const unansweredCount = questions.length - attemptedCount;

  if (showResults) {
    const percentage = quiz.totalPoints ? Math.round((score / quiz.totalPoints) * 100) : 0;
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border-hover bg-card p-5 sm:p-8 text-center"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-[#22C55E]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Quiz Submitted!</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">Great effort! Here's your summary:</p>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="rounded-xl border border-border-hover bg-[#0B0D12] p-3 sm:p-4">
                <p className="text-2xl sm:text-3xl font-bold text-white">{score}/{quiz.totalPoints}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Score</p>
              </div>
              <div className="rounded-xl border border-border-hover bg-[#0B0D12] p-3 sm:p-4">
                <p className="text-2xl sm:text-3xl font-bold text-white">{percentage}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Accuracy</p>
              </div>
            </div>

            <div className="space-y-2 mb-4 sm:mb-6 max-h-64 overflow-y-auto">
              {questions.map((q, index) => {
                const isCorrect = answers[q.id] === q.correctAnswer;
                return (
                  <div key={q.id} className="flex items-start gap-2.5 sm:gap-3 rounded-lg border border-border-hover bg-[#0B0D12] p-2.5 sm:p-3 text-left">
                    {isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">Q{index + 1}: {q.question}</p>
                      {!isCorrect && q.explanation && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{q.explanation}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white shrink-0">{isCorrect ? `+${q.points}` : "0"}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Link
                href={`/quiz/${quizCode}/results`}
                className="flex-1 h-11 sm:h-10 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white hover:border-white/20 transition-colors flex items-center justify-center"
              >
                View Results
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 h-11 sm:h-10 rounded-xl border border-[#EC4899]/30 bg-[#EC4899]/10 text-sm font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors flex items-center justify-center"
              >
                Back to Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const watermarkText = useMemo(() => {
    if (!quizProgress) return '';
    const username = registration?.studentName || 'Student';
    const rollNumber = registration?.rollNumber || 'R001';
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    return `${username} | ${rollNumber} | ${quizCode} | ${timestamp}`;
  }, [quizProgress, quizCode, registration]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border-hover bg-[#0B0C0F]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{quiz.title}</h1>
            <p className="text-xs text-muted-foreground">Q {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F59E0B]" />
              <span className="text-xs sm:text-sm font-mono text-white font-semibold">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <button
              onClick={handleSubmitClick}
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
            className="quiz-watermark-container rounded-2xl border border-border-hover bg-card p-4 sm:p-6"
          >
            {watermarkText && <div className="quiz-watermark" data-watermark={watermarkText}></div>}
            <div className="quiz-watermark-content">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Q{currentQuestionIndex + 1}</span>
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
                          : "border-border-hover bg-[#0B0D12] hover:border-border-hover active:scale-[0.98]"
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
      <div className="shrink-0 border-t border-border-hover bg-[#0B0C0F] px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-10 sm:h-9 rounded-lg border border-border-hover bg-white/5 text-xs sm:text-xs font-medium text-white hover:border-border-hover transition-colors disabled:opacity-50"
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
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-10 sm:h-9 rounded-lg border border-border-hover bg-white/5 text-xs sm:text-xs font-medium text-white hover:border-border-hover transition-colors disabled:opacity-50"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowSubmitModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-3xl border border-border-hover bg-card p-6 sm:p-8 shadow-2xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
                  <HelpCircle className="w-8 h-8 text-[#F59E0B]" />
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-2">Submit Quiz?</h3>
                <p className="text-sm text-muted-foreground text-center mb-6">Please review your progress before submitting.</p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between rounded-xl border border-border-hover bg-[#0F1117] p-3">
                    <span className="text-xs text-muted-foreground">Total Questions</span>
                    <span className="text-sm font-semibold text-white">{questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border-hover bg-[#0F1117] p-3">
                    <span className="text-xs text-muted-foreground">Attempted</span>
                    <span className="text-sm font-semibold text-white">{attemptedCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-{#EF4444}/20 bg-[#EF4444]/5 p-3">
                    <span className="text-xs text-[#FBBF24]">Unanswered</span>
                    <span className="text-sm font-semibold text-[#FBBF24]">{unansweredCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border-hover bg-[#0F1117] p-3">
                    <span className="text-xs text-muted-foreground">Time Remaining</span>
                    <span className="text-sm font-semibold text-white">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSubmitModal(false)}
                    className="flex-1 h-12 rounded-xl border border-border-hover bg-white/[0.03] text-sm font-semibold text-white hover:border-white/[0.16] hover:bg-white/[0.06] transition-all"
                  >
                    Continue Attempt
                  </button>
                  <button
                    onClick={confirmSubmit}
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-sm font-bold text-white hover:shadow-[0_0_24px_rgba(239,68,68,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Quiz
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}