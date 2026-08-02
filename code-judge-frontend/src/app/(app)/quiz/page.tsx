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
  Plus,
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
  UserPlus,
  Eye,
} from "lucide-react";
import { QuizLandingCards } from "@/components/quiz/live/QuizLandingCards";
import { StatsCard, DifficultyBadge, VisibilityBadge, QuizCard, AssessmentCard, Card } from "@/components/quiz/quizComponents";
import { QuizCardData } from "@/components/quiz/quizComponents";
import { getAllQuizzes, type Quiz as ApiQuiz, quizCodePath } from "@/services/quiz";
import { useToast } from "@/hooks/useToast";
import GuestGuard from "@/components/guards/GuestGuard";

// Convert API Quiz to QuizCardData for our reusable components
function toQuizCardData(q: ApiQuiz): QuizCardData {
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
    coverImage: undefined,
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

const TABS = [
  { id: "upcoming", label: "Upcoming", icon: Calendar },
  { id: "active", label: "Active", icon: Play },
  { id: "completed", label: "Completed", icon: FileText },
  { id: "my-quizzes", label: "My Quizzes", icon: LayoutGrid },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
] as const;

const CATEGORY_FILTERS = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "academics", label: "Academics", icon: GraduationCap },
  { id: "placements", label: "Placements", icon: Briefcase },
  { id: "coding", label: "Coding", icon: Code2 },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "organizations", label: "Organizations", icon: Building2 },
];

function QuizDashboardContent() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [quizzes, setQuizzes] = useState<ApiQuiz[]>([]);
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
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#09090B] text-white p-4 sm:p-6 lg:p-8">
      {/* ===== HERO CARD ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#171923] via-[#111217] to-[#171923]"
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
                <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-[#A1A1AA]">
                  v2.0
                </span>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight"
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
                className="text-sm sm:text-base text-[#A1A1AA] max-w-2xl leading-relaxed"
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
                    <p className="text-sm font-bold text-white">{quizzes.length}+</p>
                    <p className="text-[9px] text-[#71717A]">Quizzes Available</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/[0.08]" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{activeQuizzes.length}</p>
                    <p className="text-[9px] text-[#71717A]">Active Now</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/[0.08]" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
                    <Medal className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{completedQuizzes.length}</p>
                    <p className="text-[9px] text-[#71717A]">Completed</p>
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
                <div className="relative flex items-center gap-4 p-4 rounded-2xl border border-white/[0.08] bg-[#111217]/80 backdrop-blur-xl">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Ready to test yourself?</p>
                    <p className="text-[10px] text-[#A1A1AA] mb-2">Create or join an assessment</p>
                    <Link href="/quiz/create">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create New Quiz
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

      {/* ===== CATEGORY FILTERS ===== */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {CATEGORY_FILTERS.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap
                ${isActive
                  ? "bg-[#EC4899]/15 text-white border border-[#EC4899]/30 shadow-[0_0_12px_rgba(236,72,153,0.15)]"
                  : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.03] border border-transparent"}`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#EC4899]" : "text-[#71717A]"}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ===== TABS + CONTROLS ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#111217] border border-white/[0.06] overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap
                  ${isActive
                    ? "bg-[#EC4899]/15 text-white shadow-[0_0_12px_rgba(236,72,153,0.15)]"
                    : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.03]"}`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-[#71717A]" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-white/[0.06] bg-[#111217] text-white placeholder-[#71717A] focus:outline-none focus:border-[#EC4899]/30 transition-colors w-full sm:w-56"
            />
          </div>

          {/* Filter */}
          <button className="p-1.5 rounded-lg border border-white/[0.06] bg-[#111217] text-[#9CA3AF] hover:text-white hover:border-white/[0.12] transition-colors">
            <Filter className="w-3.5 h-3.5" />
          </button>

          {/* View mode */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#111217] border border-white/[0.06]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded text-xs transition-all ${viewMode === "grid" ? "bg-[#EC4899]/15 text-white" : "text-[#9CA3Af] hover:text-white"}`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded text-xs transition-all ${viewMode === "list" ? "bg-[#EC4899]/15 text-white" : "text-[#9CA3Af] hover:text-white"}`}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== QUIZ LIST ===== */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-[#111217] animate-pulse" />
            ))}
          </motion.div>
        ) : currentList.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#171923] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-[#71717A]" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">No quizzes found</h3>
            <p className="text-sm text-[#A1A1AA]">
              {searchQuery ? "Try adjusting your search." : "No quizzes available in this category yet."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "flex flex-col gap-3"
            }
          >
            {currentList.map((quiz, i) => {
              // Active quizzes open the Live Assessment Room monitor;
              // others navigate to the quiz dashboard.
              const target =
                quiz.status === "active"
                  ? quizCodePath(quiz.id, "live")
                  : quizCodePath(quiz.id, "dashboard");
              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {viewMode === "grid" ? (
                    <Link href={target}>
                      <QuizCard quiz={quiz} />
                    </Link>
                  ) : (
                    <Link href={target}>
                      <AssessmentCard quiz={quiz} />
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
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