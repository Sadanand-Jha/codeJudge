"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Flame,
  Trophy,
  Star,
  Award,
  Zap,
  Play,
  Bookmark,
  BarChart3,
  Gift,
  UserPlus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Target,
  FileText,
  Sparkles,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Briefcase,
  Code2,
  Building2,
  Medal,
  CheckCircle2,
  Circle,
  Timer,
  Eye,
} from "lucide-react";
import { QuizLandingCards } from "@/components/quiz/live/QuizLandingCards";
import { StatsCard, DifficultyBadge, VisibilityBadge, QuizCard, AssessmentCard, Card } from "@/components/quiz/quizComponents";
import { QuizCardData } from "@/components/quiz/quizComponents";
import { getAllQuizzes, type QuizListItem, quizCodePath } from "@/services/quiz";
import { useToast } from "@/hooks/useToast";
import GuestGuard from "@/components/guards/GuestGuard";

// Convert API Quiz to QuizCardData for our reusable components
function toQuizCardData(q: QuizListItem): QuizCardData {
  const now = new Date();
  const start = q.starttime ? new Date(q.starttime) : null;
  const end = q.endtime ? new Date(q.endtime) : null;

  let status: QuizCardData["status"] = "upcoming";
  if (start && start <= now && (!end || end > now)) {
    status = "active";
  } else if (end && end <= now) {
    status = "completed";
  }

  return {
    id: q.code,
    title: q.name,
    description: "",
    creatorName: q.creator_name || "Unknown",
    difficulty: "Medium",
    tags: [],
    visibility: "global",
    status,
    questions: 0,
    totalPoints: 0,
    timeLimit: undefined,
    registeredCount: 0,
    attempts: 0,
    averageScore: 0,
    startTime: q.starttime || undefined,
    endTime: q.endtime || undefined,
    passingScore: undefined,
  };
}

function QuizDashboardContent() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const data = await getAllQuizzes();
        setQuizzes(data);
      } catch (err) {
        console.error("Failed to fetch quizzes:", err);
        toast.error({
          title: "Failed to Load Quizzes",
          description: "Please try again later.",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchQuizzes();
  }, []);

  const allQuizzes = useMemo(() => quizzes.map(toQuizCardData), [quizzes]);
  const upcomingQuizzes = useMemo(() => allQuizzes.filter((q) => q.status === "upcoming"), [allQuizzes]);
  const activeQuizzes = useMemo(() => allQuizzes.filter((q) => q.status === "active"), [allQuizzes]);
  const completedQuizzes = useMemo(() => allQuizzes.filter((q) => q.status === "completed"), [allQuizzes]);
  const myQuizzes = useMemo(() => allQuizzes.slice(0, 4), [allQuizzes]);

  const currentQuizzesMap = {
    upcoming: upcomingQuizzes,
    active: activeQuizzes,
    completed: completedQuizzes,
    "my-quizzes": myQuizzes,
    bookmarks: [] as QuizCardData[],
  };
  const currentQuizzes = currentQuizzesMap[activeTab as keyof typeof currentQuizzesMap] || [];

  const currentList = searchQuery
    ? currentQuizzes.filter((q) => q.title.toLowerCase().includes(searchQuery.toLowerCase()) || q.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())))
    : currentQuizzes;

  return (
    <div className="quiz-landing min-h-[calc(100vh-3.5rem)] bg-background text-text-primary p-4 sm:p-6 lg:p-8">
      {/* ===== HERO CARD ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-card"
      >
        {/* Decorative gradients */}
        <div className="absolute inset-0">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#EC4899]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#BE185D]/5 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#EC4899]/[0.03] rounded-full blur-3xl" />
        </div>

        <div className="relative p-6 sm:p-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-10">
            {/* Left: Text content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-1 rounded-full bg-[#EC4899]/10 border border-[#EC4899]/20 text-[10px] font-bold text-[#EC4899] uppercase tracking-wider">
                  Assessment Platform
                </span>
                <span className="px-2.5 py-1 rounded-full bg-card-hover border border-border text-[10px] font-medium text-text-secondary">
                  v2.0
                </span>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-3 tracking-tight"
              >
                Assessment &{" "}
                <span className="bg-gradient-to-r from-[#EC4899] to-[#F472B6] bg-clip-text text-transparent">
                  Quiz Platform
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed"
              >
                Discover, create and participate in assessments across academics, placements, coding interviews, certifications and organizations.
              </motion.p>

              {/* Quick stats */}
              <div className="flex flex-wrap items-center gap-4 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#EC4899]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{quizzes.length}+</p>
                    <p className="text-[9px] text-text-muted">Quizzes Available</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{activeQuizzes.length}</p>
                    <p className="text-[9px] text-text-muted">Active Now</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
                    <Medal className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{completedQuizzes.length}</p>
                    <p className="text-[9px] text-text-muted">Completed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Illustration / CTA */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="shrink-0 w-full lg:w-auto"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-[#EC4899]/20 to-[#BE185D]/20 rounded-3xl blur-2xl" />
                <div className="relative flex items-center gap-4 p-4 rounded-2xl border border-border bg-card/80 backdrop-blur-xl">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">Ready to test yourself?</p>
                    <p className="text-[10px] text-text-secondary mb-2">Join a live assessment or practice below</p>
                    <Link href="#join-quiz">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all flex items-center gap-2"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Join a Quiz
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ===== LANDING ACTION CARDS ===== */}
      <QuizLandingCards />

      
    </div>
  );
}

export default function QuizDashboardPage() {
  return (
    <GuestGuard action="join-contest">
      <QuizDashboardContent />
    </GuestGuard>
  );
}