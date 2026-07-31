"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Clock,
  Users,
  Star,
  BookOpen,
  TrendingUp,
  Award,
  Flame,
  Target,
  Trophy,
  ChevronDown,
  Sparkles,
  Code2,
  GitBranch,
  Brain,
  Server,
  Cpu,
  Layers,
  FileText,
  Lightbulb,
  MessageSquare,
  ThumbsUp,
  Bookmark,
  Heart,
  Play,
  Check,
  Lock,
  ArrowRight,
  BarChart3,
  Zap,
  Shield,
  Building2,
  GraduationCap,
  Filter,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

const stats = [
  { label: "Total Collections", value: "24", icon: BookOpen, color: "text-[#7C3AED]" },
  { label: "Problems", value: "1,247", icon: Code2, color: "text-[#3B82F6]" },
  { label: "Bookmarks", value: "156", icon: Bookmark, color: "text-[#F59E0B]" },
  { label: "Completed", value: "8", icon: Check, color: "text-[#22C55E]" },
];

const featuredCollection = {
  title: "FAANG Interview Preparation",
  problems: 320,
  hours: 82,
  companies: ["Google", "Amazon", "Microsoft", "Meta"],
  progress: 45,
  difficulty: "Hard",
  creator: "ByteClash Team",
  followers: "24.5K",
  description:
    "A comprehensive collection of problems asked in FAANG interviews. Covers all essential topics with company-specific patterns.",
};

const collections = [
  {
    id: 1,
    title: "Blind 75",
    description: "The curated list of 75 essential problems that cover all important patterns.",
    icon: Eye,
    gradient: "from-[#7C3AED] to-[#3B82F6]",
    problems: 75,
    hours: 24,
    difficulty: "Mixed",
    companies: ["Google", "Amazon", "Meta"],
    completion: 100,
    bookmarks: 2341,
    likes: 892,
    category: "Interview",
    status: "completed",
  },
  {
    id: 2,
    title: "NeetCode 150",
    description: "NeetCode's curated 150 problems for technical interview mastery.",
    icon: GraduationCap,
    gradient: "from-[#22C55E] to-[#3B82F6]",
    problems: 150,
    hours: 45,
    difficulty: "Mixed",
    companies: ["All FAANG"],
    completion: 68,
    bookmarks: 3421,
    likes: 1204,
    category: "Interview",
    status: "in-progress",
  },
  {
    id: 3,
    title: "Striver A2Z DSA",
    description: "Complete DSA sheet by Striver covering every topic from basics to advanced.",
    icon: BookOpen,
    gradient: "from-[#F59E0B] to-[#EF4444]",
    problems: 180,
    hours: 52,
    difficulty: "Mixed",
    companies: ["Amazon", "Microsoft"],
    completion: 35,
    bookmarks: 4521,
    likes: 1567,
    category: "Algorithms",
    status: "in-progress",
  },
  {
    id: 4,
    title: "Top Interview Questions",
    description: "Most frequently asked questions in top tech companies.",
    icon: Trophy,
    gradient: "from-[#EC4899] to-[#7C3AED]",
    problems: 200,
    hours: 38,
    difficulty: "Medium",
    companies: ["Google", "Meta", "Amazon"],
    completion: 0,
    bookmarks: 2891,
    likes: 945,
    category: "Interview",
    status: "not-started",
  },
  {
    id: 5,
    title: "Dynamic Programming Master",
    description: "From memoization to tabulation — master every DP pattern.",
    icon: Brain,
    gradient: "from-[#7C3AED] to-[#EC4899]",
    problems: 120,
    hours: 28,
    difficulty: "Hard",
    companies: ["Google", "Amazon"],
    completion: 0,
    bookmarks: 1876,
    likes: 743,
    category: "Dynamic Programming",
    status: "not-started",
  },
  {
    id: 6,
    title: "Graph Theory",
    description: "BFS, DFS, shortest paths, MST, network flow, and advanced graph algorithms.",
    icon: GitBranch,
    gradient: "from-[#22C55E] to-[#3B82F6]",
    problems: 85,
    hours: 22,
    difficulty: "Hard",
    companies: ["Google", "Meta"],
    completion: 100,
    bookmarks: 1234,
    likes: 567,
    category: "Graphs",
    status: "completed",
  },
  {
    id: 7,
    title: "Binary Search Collection",
    description: "Binary search on arrays, answers, and advanced search techniques.",
    icon: Search,
    gradient: "from-[#7C3AED] to-[#6366F1]",
    problems: 45,
    hours: 12,
    difficulty: "Medium",
    companies: ["Amazon", "Google"],
    completion: 0,
    bookmarks: 987,
    likes: 432,
    category: "Binary Search",
    status: "not-started",
  },
  {
    id: 8,
    title: "Bit Manipulation",
    description: "Bitwise operations, bitmasks, bit DP, and competitive programming tricks.",
    icon: Cpu,
    gradient: "from-[#6366F1] to-[#3B82F6]",
    problems: 35,
    hours: 8,
    difficulty: "Hard",
    companies: ["Google"],
    completion: 0,
    bookmarks: 756,
    likes: 321,
    followers: "12.3K",
    category: "Algorithms",
    status: "not-started",
  },
  {
    id: 9,
    title: "Codeforces 1200 Ladder",
    description: "Progress from 800 to 1200 rating on Codeforces with curated problems.",
    icon: TrendingUp,
    gradient: "from-[#3B82F6] to-[#22C55E]",
    problems: 100,
    hours: 30,
    difficulty: "Easy",
    companies: ["Codeforces"],
    completion: 0,
    bookmarks: 2345,
    likes: 876,
    followers: "18.2K",
    category: "Contest",
    status: "not-started",
  },
  {
    id: 10,
    title: "Codeforces 1600 Ladder",
    description: "Advanced competitive programming problems for 1200-1600 rating.",
    icon: Zap,
    gradient: "from-[#F59E0B] to-[#EF4444]",
    problems: 120,
    hours: 38,
    difficulty: "Medium",
    companies: ["Codeforces"],
    completion: 0,
    bookmarks: 1876,
    likes: 654,
    followers: "14.5K",
    category: "Contest",
    status: "not-started",
  },
  {
    id: 11,
    title: "LeetCode Top 100",
    description: "Most important 100 problems from LeetCode for interview preparation.",
    icon: Trophy,
    gradient: "from-[#22C55E] to-[#10B981]",
    problems: 100,
    hours: 35,
    difficulty: "Mixed",
    companies: ["All FAANG"],
    completion: 0,
    bookmarks: 3456,
    likes: 1234,
    followers: "28.9K",
    category: "Interview",
    status: "not-started",
  },
  {
    id: 12,
    title: "Google Interview",
    description: "Company-specific problems asked in Google interviews.",
    icon: Building2,
    gradient: "from-[#7C3AED] to-[#3B82F6]",
    problems: 85,
    hours: 28,
    difficulty: "Hard",
    companies: ["Google"],
    completion: 0,
    bookmarks: 2134,
    likes: 987,
    followers: "19.3K",
    category: "Company",
    status: "not-started",
  },
  {
    id: 13,
    title: "Amazon Interview",
    description: "Amazon leadership principles and technical questions.",
    icon: Building2,
    gradient: "from-[#22C55E] to-[#3B82F6]",
    problems: 75,
    hours: 24,
    difficulty: "Medium",
    companies: ["Amazon"],
    completion: 0,
    bookmarks: 1876,
    likes: 765,
    followers: "16.7K",
    category: "Company",
    status: "not-started",
  },
  {
    id: 14,
    title: "Microsoft Interview",
    description: "Microsoft interview questions covering all rounds.",
    icon: Building2,
    gradient: "from-[#3B82F6] to-[#7C3AED]",
    problems: 70,
    hours: 22,
    difficulty: "Medium",
    companies: ["Microsoft"],
    completion: 0,
    bookmarks: 1543,
    likes: 632,
    followers: "14.1K",
    category: "Company",
    status: "not-started",
  },
];

const collectionProblems = [
  { id: 1, name: "Two Sum", difficulty: "Easy", acceptance: "48.2%", solved: 2341, aiRecommended: true, status: "completed" },
  { id: 2, name: "Longest Substring Without Repeating Characters", difficulty: "Medium", acceptance: "32.1%", solved: 1876, aiRecommended: true, status: "completed" },
  { id: 3, name: "Median of Two Sorted Arrays", difficulty: "Hard", acceptance: "28.5%", solved: 987, aiRecommended: true, status: "in-progress" },
  { id: 4, name: "Longest Palindromic Substring", difficulty: "Medium", acceptance: "31.4%", solved: 1654, aiRecommended: false, status: "not-started" },
  { id: 5, name: "Regular Expression Matching", difficulty: "Hard", acceptance: "27.3%", solved: 765, aiRecommended: true, status: "not-started" },
  { id: 6, name: "Merge Intervals", difficulty: "Medium", acceptance: "45.6%", solved: 1432, aiRecommended: false, status: "not-started" },
];

const difficultyFilters = ["Easy", "Medium", "Hard", "Mixed"];
const categoryFilters = [
  "Interview",
  "Company",
  "Algorithms",
  "Data Structures",
  "Contest",
  "Dynamic Programming",
  "Graphs",
  "Greedy",
  "Binary Search",
  "Arrays",
  "Sorting",
  "Trees",
  "System Design",
];
const statusFilters = ["Not Started", "In Progress", "Completed"];

const sidebarItems = [
  { label: "Your Progress", value: "8/24 collections", icon: Target, color: "text-[#7C3AED]" },
  { label: "Weekly Goal", value: "Complete 3 collections", icon: Flame, color: "text-[#F59E0B]" },
  { label: "Problems Solved", value: "432 total", icon: Code2, color: "text-[#22C55E]" },
  { label: "Study Streak", value: "15 days", icon: TrendingUp, color: "text-[#3B82F6]" },
];

const recommendedCollections = [
  { title: "System Design Primer", reason: "Based on your interview goals", progress: 0 },
  { title: "Tree & Graph Mastery", reason: "Strengthen your fundamentals", progress: 15 },
  { title: "Dynamic Programming", reason: "Next logical step", progress: 0 },
];

const friendsLearning = [
  { name: "Aisha Khan", avatar: "A", collection: "Blind 75", progress: 92 },
  { name: "David Kim", avatar: "D", collection: "NeetCode 150", progress: 67 },
  { name: "Priya Nair", avatar: "P", collection: "Striver A2Z", progress: 45 },
];

const recentBadges = [
  { name: "Problem Solver", icon: Brain, color: "bg-[#7C3AED]/10 text-[#7C3AED]" },
  { name: "Streak Master", icon: Flame, color: "bg-[#F59E0B]/10 text-[#F59E0B]" },
  { name: "Speed Runner", icon: Zap, color: "bg-[#22C55E]/10 text-[#22C55E]" },
];

function Eye({ className }: { className?: string }) {
  return (
    <svg className={className || "w-6 h-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function CollectionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const filteredCollections = collections.filter((col) => {
    const matchesSearch = col.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilters =
      activeFilters.length === 0 ||
      activeFilters.some((f) =>
        col.difficulty === f ||
        col.category === f ||
        col.status === f.replace(/\s/g, "-").toLowerCase() ||
        col.title.includes(f)
      );
    return matchesSearch && matchesFilters;
  });

  const selectedCollectionData = collections.find((c) => c.id === selectedCollection);

  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Collections</h1>
              <p className="text-sm text-[#9CA3AF] mt-2 max-w-2xl">
                Curated problem sets to master every concept, company interview and contest.
              </p>
            </div>
            <div className="hidden md:grid grid-cols-4 gap-3">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-[#111827] px-4 py-3 min-w-[120px]">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                      <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <p className="text-lg font-bold text-white">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Featured Collection Hero */}
          <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#7C3AED]/10 via-[#111827] to-[#111827] p-6 mb-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C3AED]/10 rounded-full blur-3xl" />
            <div className="relative flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-md bg-[#7C3AED]/15 border border-[#7C3AED]/20 text-[10px] font-semibold text-[#7C3AED] uppercase tracking-wider">
                    Featured Collection
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 text-[10px] font-medium text-[#EF4444]">
                    {featuredCollection.difficulty}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{featuredCollection.title}</h2>
                <p className="text-xs text-[#9CA3AF] leading-relaxed mb-3 max-w-2xl">{featuredCollection.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#9CA3AF] mb-4">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {featuredCollection.problems} Problems</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {featuredCollection.hours} Hours</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {featuredCollection.followers} Followers</span>
                </div>

                {/* Companies */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Companies:</span>
                  <div className="flex items-center gap-1.5">
                    {featuredCollection.companies.map((company) => (
                      <span key={company} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-medium text-white">
                        {company}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-white">{featuredCollection.progress}% Complete</span>
                    <span className="text-[11px] text-[#9CA3AF]">by {featuredCollection.creator}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${featuredCollection.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                    />
                  </div>
                </div>

                <button className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white text-sm font-semibold hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all flex items-center gap-2">
                  <Play className="w-4 h-4" fill="white" />
                  Continue Learning
                </button>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search collections..."
                className="w-full h-12 bg-[#111827] border border-white/[0.06] rounded-xl pl-12 pr-4 text-sm text-white placeholder-[#6B7280] outline-none focus:border-[#7C3AED]/40 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-xs font-medium text-[#9CA3AF] hover:text-white transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                Filters
                {activeFilters.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-[#7C3AED]/15 text-[#7C3AED] text-[10px]">{activeFilters.length}</span>
                )}
              </button>
              {activeFilters.length > 0 && (
                <button onClick={() => setActiveFilters([])} className="text-[11px] text-[#9CA3AF] hover:text-white transition-colors">
                  Clear all
                </button>
              )}
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-white/[0.06] bg-[#111827]">
                    <div>
                      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Difficulty</p>
                      <div className="flex flex-wrap gap-1.5">
                        {difficultyFilters.map((f) => (
                          <button
                            key={f}
                            onClick={() => toggleFilter(f)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                              activeFilters.includes(f)
                                ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                                : "border-white/[0.06] bg-white/[0.02] text-[#9CA3AF] hover:border-white/[0.12]"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Category</p>
                      <div className="flex flex-wrap gap-1.5">
                        {categoryFilters.map((f) => (
                          <button
                            key={f}
                            onClick={() => toggleFilter(f)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                              activeFilters.includes(f)
                                ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                                : "border-white/[0.06] bg-white/[0.02] text-[#9CA3AF] hover:border-white/[0.12]"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Status</p>
                      <div className="flex flex-wrap gap-1.5">
                        {statusFilters.map((f) => (
                          <button
                            key={f}
                            onClick={() => toggleFilter(f)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                              activeFilters.includes(f)
                                ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                                : "border-white/[0.06] bg-white/[0.02] text-[#9CA3AF] hover:border-white/[0.12]"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Layout: Collection Grid + Right Sidebar */}
          <div className="flex gap-6">
            {/* Collection Grid */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCollections.map((col, idx) => {
                  const Icon = col.icon;
                  return (
                    <motion.div
                      key={col.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      whileHover={{ y: -4 }}
                      onClick={() => setSelectedCollection(col.id === selectedCollection ? null : col.id)}
                      className="group rounded-2xl border border-white/[0.06] bg-[#111827] overflow-hidden cursor-pointer hover:border-[#7C3AED]/30 hover:shadow-[0_8px_32px_rgba(124,58,237,0.1)] transition-all"
                    >
                      {/* Gradient Banner */}
                      <div className={`h-32 bg-gradient-to-r ${col.gradient} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-3 right-3 flex gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                            col.difficulty === "Easy" ? "bg-[#22C55E]/20 border-[#22C55E]/30 text-[#22C55E]" :
                            col.difficulty === "Medium" ? "bg-[#F59E0B]/20 border-[#F59E0B]/30 text-[#F59E0B]" :
                            col.difficulty === "Hard" ? "bg-[#EF4444]/20 border-[#EF4444]/30 text-[#EF4444]" :
                            "bg-white/10 border-white/20 text-white"
                          }`}>
                            {col.difficulty}
                          </span>
                        </div>
                        <div className="absolute -bottom-4 left-4 w-12 h-12 rounded-xl bg-[#111827] border border-white/[0.08] flex items-center justify-center">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      <div className="p-4 pt-6">
                        <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[#7C3AED] transition-colors">{col.title}</h3>
                        <p className="text-xs text-[#9CA3AF] leading-relaxed mb-3 line-clamp-2">{col.description}</p>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9CA3AF] mb-3">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {col.problems} Problems</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {col.hours}h</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {col.likes}</span>
                          <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" /> {col.bookmarks}</span>
                        </div>

                        {/* Companies */}
                        <div className="flex items-center gap-1.5 mb-3">
                          {col.companies.map((company) => (
                            <span key={company} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] border border-white/[0.06] text-[#9CA3AF]">
                              {company}
                            </span>
                          ))}
                        </div>

                        {/* Progress */}
                        {col.completion > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-[#9CA3AF]">{col.completion === 100 ? "Completed" : "In Progress"}</span>
                              <span className="text-[10px] font-medium text-white">{col.completion}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${col.completion === 100 ? "bg-[#22C55E]" : "bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]"}`}
                                style={{ width: `${col.completion}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <button className={`w-full h-9 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                          col.completion === 100
                            ? "bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/20"
                            : col.completion > 0
                            ? "bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#7C3AED] hover:bg-[#7C3AED]/20"
                            : "bg-white/[0.04] border border-white/[0.08] text-white hover:border-white/[0.12]"
                        }`}>
                          {col.completion === 100 ? (
                            <><Check className="w-3.5 h-3.5" /> Completed</>
                          ) : col.completion > 0 ? (
                            <>Continue <ArrowRight className="w-3.5 h-3.5" /></>
                          ) : (
                            <>Start <Play className="w-3 h-3" fill="currentColor" /></>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Collection Details */}
              <AnimatePresence>
                {selectedCollection && selectedCollectionData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 rounded-2xl border border-white/[0.06] bg-[#111827] overflow-hidden"
                  >
                    {/* Header */}
                    <div className={`h-32 bg-gradient-to-r ${selectedCollectionData.gradient} relative`}>
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="relative p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1">{selectedCollectionData.title}</h3>
                            <p className="text-xs text-white/80 max-w-2xl">{selectedCollectionData.description}</p>
                          </div>
                          <button
                            onClick={() => setSelectedCollection(null)}
                            className="text-xs text-white/80 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/10"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="p-6 border-b border-white/[0.06]">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">Problems</p>
                          <p className="text-sm font-bold text-white">{selectedCollectionData.problems}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">Hours</p>
                          <p className="text-sm font-bold text-white">{selectedCollectionData.hours}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">Followers</p>
                          <p className="text-sm font-bold text-white">{selectedCollectionData.followers}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">Difficulty</p>
                          <p className="text-sm font-bold text-white">{selectedCollectionData.difficulty}</p>
                        </div>
                      </div>

                      {/* Progress */}
                      {selectedCollectionData.completion > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-white">{selectedCollectionData.completion}% Complete</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${selectedCollectionData.completion === 100 ? "bg-[#22C55E]" : "bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]"}`}
                              style={{ width: `${selectedCollectionData.completion}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Problem List */}
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-white mb-4">Problems</h4>
                      <div className="space-y-2">
                        {collectionProblems.map((problem) => (
                          <div
                            key={problem.id}
                            className="flex items-center gap-4 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.12] transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="text-sm font-medium text-white truncate">{problem.name}</h5>
                                {problem.aiRecommended && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#7C3AED]">
                                    AI Pick
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF]">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                  problem.difficulty === "Easy" ? "bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]" :
                                  problem.difficulty === "Medium" ? "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]" :
                                  "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]"
                                }`}>
                                  {problem.difficulty}
                                </span>
                                <span>Acceptance: {problem.acceptance}</span>
                                <span>Solved: {problem.solved}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="text-[11px] font-medium text-[#7C3AED] hover:text-[#8B5CF6] transition-colors">
                                Solve
                              </button>
                              <button className="p-1.5 rounded-md hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors">
                                <Bookmark className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Achievements */}
              <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#111827] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-[#F59E0B]" />
                  <h3 className="text-base font-semibold text-white">Achievements</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {recentBadges.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div key={badge.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center hover:border-white/[0.12] transition-colors">
                        <div className={`w-10 h-10 rounded-full ${badge.color} flex items-center justify-center mx-auto mb-2`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-medium text-white">{badge.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Community */}
              <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#111827] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-[#7C3AED]" />
                  <h3 className="text-base font-semibold text-white">Community</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                    <h4 className="text-sm font-medium text-white mb-2">Top Contributors</h4>
                    <div className="space-y-2">
                      {[
                        { name: "Sarah Chen", contributions: 124 },
                        { name: "Arjun Mehta", contributions: 98 },
                        { name: "Priya Nair", contributions: 87 },
                      ].map((c) => (
                        <div key={c.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-white text-[10px] font-bold">
                              {c.name.charAt(0)}
                            </div>
                            <span className="text-xs text-white">{c.name}</span>
                          </div>
                          <span className="text-[11px] text-[#9CA3AF]">{c.contributions} notes</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                    <h4 className="text-sm font-medium text-white mb-2">Tips</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ThumbsUp className="w-3.5 h-3.5 text-[#22C55E] mt-0.5 shrink-0" />
                        <p className="text-[11px] text-[#9CA3AF] leading-relaxed">Solve at least 3 problems per day to build consistency.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ThumbsUp className="w-3.5 h-3.5 text-[#22C55E] mt-0.5 shrink-0" />
                        <p className="text-[11px] text-[#9CA3AF] leading-relaxed">Review solutions even if you solved the problem optimally.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="hidden xl:block w-72 shrink-0 space-y-4">
              {/* Stats */}
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">{item.label}</span>
                    </div>
                    <p className="text-sm font-bold text-white">{item.value}</p>
                  </div>
                );
              })}

              {/* Recommended Collections */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                  <h4 className="text-xs font-semibold text-white">Recommended</h4>
                </div>
                <div className="space-y-2">
                  {recommendedCollections.map((rec) => (
                    <div key={rec.title} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 hover:border-white/[0.12] transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-white">{rec.title}</p>
                        <span className="text-[10px] text-[#7C3AED]">{rec.progress}%</span>
                      </div>
                      <p className="text-[10px] text-[#9CA3AF]">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Friends Learning */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[#22C55E]" />
                  <h4 className="text-xs font-semibold text-white">Friends Learning</h4>
                </div>
                <div className="space-y-2">
                  {friendsLearning.map((friend) => (
                    <div key={friend.name} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED]/50 to-[#3B82F6]/50 flex items-center justify-center text-white text-[10px] font-bold">
                        {friend.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-white truncate">{friend.name}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{friend.collection}</p>
                      </div>
                      <span className="text-[10px] text-[#7C3AED]">{friend.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Badges */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-[#F59E0B]" />
                  <h4 className="text-xs font-semibold text-white">Recent Badges</h4>
                </div>
                <div className="space-y-2">
                  {recentBadges.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div key={badge.name} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg ${badge.color} flex items-center justify-center`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs text-white">{badge.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Contest */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-[#F59E0B]" />
                  <h4 className="text-xs font-semibold text-white">Upcoming Contest</h4>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <p className="text-xs font-medium text-white">ByteClash Weekly #247</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">Starts in 2 days</p>
                  <button className="mt-2 w-full h-7 rounded-md bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#7C3AED] text-[11px] font-medium hover:bg-[#7C3AED]/20 transition-colors">
                    Register
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}