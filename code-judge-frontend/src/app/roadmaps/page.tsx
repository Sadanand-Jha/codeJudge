"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Clock,
  Users,
  Star,
  ArrowRight,
  Play,
  Check,
  Lock,
  BookOpen,
  TrendingUp,
  Award,
  Flame,
  Target,
  Zap,
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
  Video,
  FileCode,
  Lightbulb,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

const stats = [
  { label: "Total Roadmaps", value: "24", icon: BookOpen, color: "text-[#7C3AED]" },
  { label: "Completed", value: "3", icon: Check, color: "text-[#22C55E]" },
  { label: "In Progress", value: "2", icon: Play, color: "text-[#3B82F6]" },
  { label: "Hours Invested", value: "147h", icon: Clock, color: "text-[#F59E0B]" },
];

const featuredRoadmap = {
  title: "Data Structures & Algorithms",
  progress: 68,
  nextTopic: "Binary Search on Answer",
  difficulty: "Intermediate",
  estimatedRemaining: "12 hours",
  expectedCompletion: "Aug 15, 2025",
  topics: 42,
  hours: 32,
  learners: "52K",
  rating: 4.9,
};

const roadmaps = [
  {
    id: 1,
    title: "Data Structures & Algorithms",
    description: "Master arrays, linked lists, trees, graphs, and advanced data structures from scratch.",
    icon: Layers,
    gradient: "from-[#7C3AED] to-[#3B82F6]",
    topics: 42,
    hours: 32,
    learners: "52K",
    rating: 4.9,
    difficulty: "Intermediate",
    progress: 68,
    category: "DSA",
    status: "in-progress",
  },
  {
    id: 2,
    title: "Competitive Programming",
    description: "Master contest-level problem solving with advanced techniques and strategies.",
    icon: Trophy,
    gradient: "from-[#F59E0B] to-[#EF4444]",
    topics: 38,
    hours: 45,
    learners: "28K",
    rating: 4.8,
    difficulty: "Advanced",
    progress: 35,
    category: "CP",
    status: "in-progress",
  },
  {
    id: 3,
    title: "Dynamic Programming Mastery",
    description: "From memoization to tabulation — conquer every DP pattern that exists.",
    icon: Brain,
    gradient: "from-[#7C3AED] to-[#EC4899]",
    topics: 24,
    hours: 18,
    learners: "31K",
    rating: 4.7,
    difficulty: "Advanced",
    progress: 0,
    category: "DSA",
    status: "not-started",
  },
  {
    id: 4,
    title: "Graphs",
    description: "BFS, DFS, shortest paths, MST, network flow, and everything graph-related.",
    icon: GitBranch,
    gradient: "from-[#22C55E] to-[#3B82F6]",
    topics: 28,
    hours: 22,
    learners: "19K",
    rating: 4.6,
    difficulty: "Intermediate",
    progress: 100,
    category: "DSA",
    status: "completed",
  },
  {
    id: 5,
    title: "Trees & BST",
    description: "Binary trees, BSTs, AVL, Red-Black trees, and tree-based problem solving.",
    icon: GitBranch,
    gradient: "from-[#3B82F6] to-[#7C3AED]",
    topics: 18,
    hours: 14,
    learners: "24K",
    rating: 4.5,
    difficulty: "Intermediate",
    progress: 100,
    category: "DSA",
    status: "completed",
  },
  {
    id: 6,
    title: "Binary Search",
    description: "Binary search on arrays, answers, and advanced search techniques.",
    icon: Search,
    gradient: "from-[#7C3AED] to-[#6366F1]",
    topics: 12,
    hours: 8,
    learners: "33K",
    rating: 4.8,
    difficulty: "Beginner",
    progress: 0,
    category: "DSA",
    status: "not-started",
  },
  {
    id: 7,
    title: "Recursion & Backtracking",
    description: "Master recursive thinking, backtracking patterns, and pruning strategies.",
    icon: Layers,
    gradient: "from-[#EC4899] to-[#7C3AED]",
    topics: 16,
    hours: 12,
    learners: "21K",
    rating: 4.6,
    difficulty: "Intermediate",
    progress: 0,
    category: "DSA",
    status: "not-started",
  },
  {
    id: 8,
    title: "Greedy Algorithms",
    description: "Exchange arguments, greedy proofs, and classic greedy problem patterns.",
    icon: Zap,
    gradient: "from-[#F59E0B] to-[#7C3AED]",
    topics: 14,
    hours: 10,
    learners: "18K",
    rating: 4.5,
    difficulty: "Intermediate",
    progress: 0,
    category: "DSA",
    status: "not-started",
  },
  {
    id: 9,
    title: "Bit Manipulation",
    description: "Bitwise operations, bitmasks, bit DP, and competitive bit tricks.",
    icon: Cpu,
    gradient: "from-[#6366F1] to-[#3B82F6]",
    topics: 10,
    hours: 6,
    learners: "15K",
    rating: 4.4,
    difficulty: "Advanced",
    progress: 0,
    category: "DSA",
    status: "not-started",
  },
  {
    id: 10,
    title: "System Design",
    description: "Scalability, load balancing, databases, caching, and distributed systems.",
    icon: Server,
    gradient: "from-[#3B82F6] to-[#22C55E]",
    topics: 30,
    hours: 40,
    learners: "44K",
    rating: 4.9,
    difficulty: "Advanced",
    progress: 0,
    category: "System Design",
    status: "not-started",
  },
  {
    id: 11,
    title: "Frontend Developer",
    description: "React, Next.js, state management, performance, and modern frontend patterns.",
    icon: Code2,
    gradient: "from-[#7C3AED] to-[#3B82F6]",
    topics: 35,
    hours: 28,
    learners: "38K",
    rating: 4.7,
    difficulty: "Intermediate",
    progress: 0,
    category: "Frontend",
    status: "not-started",
  },
  {
    id: 12,
    title: "Backend Developer",
    description: "APIs, databases, authentication, microservices, and backend architecture.",
    icon: Server,
    gradient: "from-[#22C55E] to-[#3B82F6]",
    topics: 32,
    hours: 35,
    learners: "29K",
    rating: 4.6,
    difficulty: "Advanced",
    progress: 0,
    category: "Backend",
    status: "not-started",
  },
];

const timelineTopics = [
  { name: "Introduction", hours: "1h", difficulty: "Easy", completed: true, locked: false },
  { name: "Time Complexity", hours: "2h", difficulty: "Easy", completed: true, locked: false },
  { name: "Arrays", hours: "3h", difficulty: "Easy", completed: true, locked: false },
  { name: "Strings", hours: "2h", difficulty: "Easy", completed: true, locked: false },
  { name: "Sorting", hours: "3h", difficulty: "Medium", completed: true, locked: false },
  { name: "Binary Search", hours: "2h", difficulty: "Medium", completed: true, locked: false },
  { name: "Linked List", hours: "3h", difficulty: "Medium", completed: true, locked: false },
  { name: "Stack", hours: "2h", difficulty: "Medium", completed: true, locked: false },
  { name: "Queue", hours: "2h", difficulty: "Medium", completed: true, locked: false },
  { name: "Trees", hours: "4h", difficulty: "Medium", completed: true, locked: false },
  { name: "BST", hours: "3h", difficulty: "Medium", completed: true, locked: false },
  { name: "Heap", hours: "3h", difficulty: "Medium", completed: false, locked: false },
  { name: "Graph", hours: "5h", difficulty: "Hard", completed: false, locked: false },
  { name: "Shortest Path", hours: "4h", difficulty: "Hard", completed: false, locked: true },
  { name: "DP", hours: "6h", difficulty: "Hard", completed: false, locked: true },
  { name: "Advanced DP", hours: "5h", difficulty: "Hard", completed: false, locked: true },
  { name: "Segment Tree", hours: "4h", difficulty: "Hard", completed: false, locked: true },
  { name: "Practice Contest", hours: "3h", difficulty: "Hard", completed: false, locked: true },
];

const achievements = [
  { name: "Array Master", icon: Layers, unlocked: true, color: "from-[#7C3AED] to-[#3B82F6]" },
  { name: "Binary Search Wizard", icon: Search, unlocked: true, color: "from-[#3B82F6] to-[#22C55E]" },
  { name: "Tree Explorer", icon: GitBranch, unlocked: true, color: "from-[#22C55E] to-[#F59E0B]" },
  { name: "Graph Explorer", icon: GitBranch, unlocked: false, color: "from-[#6B7280] to-[#6B7280]" },
  { name: "DP Champion", icon: Brain, unlocked: false, color: "from-[#6B7280] to-[#6B7280]" },
  { name: "Contest Specialist", icon: Trophy, unlocked: false, color: "from-[#6B7280] to-[#6B7280]" },
];

const sidebarItems = [
  { label: "Today's Goal", value: "Complete 3 topics", icon: Target, color: "text-[#7C3AED]" },
  { label: "Roadmap Streak", value: "12 days 🔥", icon: Flame, color: "text-[#F59E0B]" },
  { label: "Weekly Progress", value: "8/12 topics", icon: TrendingUp, color: "text-[#22C55E]" },
  { label: "Hours Learned", value: "147h total", icon: Clock, color: "text-[#3B82F6]" },
];

const recentBadges = [
  { name: "Array Master", icon: Layers, color: "bg-[#7C3AED]/10 text-[#7C3AED]" },
  { name: "BST Pro", icon: GitBranch, color: "bg-[#22C55E]/10 text-[#22C55E]" },
  { name: "Sort Ninja", icon: Zap, color: "bg-[#F59E0B]/10 text-[#F59E0B]" },
];

const difficultyFilters = ["Beginner", "Intermediate", "Advanced"];
const categoryFilters = ["DSA", "Competitive Programming", "Interview Preparation", "System Design", "Backend", "Frontend", "AI/ML"];
const languageFilters = ["C++", "Java", "Python", "JavaScript", "TypeScript"];
const statusFilters = ["Not Started", "In Progress", "Completed"];

export default function RoadmapsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const filteredRoadmaps = roadmaps.filter((rm) => {
    const matchesSearch = rm.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilters = activeFilters.length === 0 || activeFilters.some((f) =>
      rm.difficulty === f || rm.category === f || rm.status === f.replace(/\s/g, "-").toLowerCase() ||
      rm.title.includes(f)
    );
    return matchesSearch && matchesFilters;
  });

  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">Roadmaps</h1>
              <p className="text-sm text-text-secondary mt-2 max-w-2xl">
                Master Data Structures, Algorithms, Competitive Programming and Interviews through structured learning paths.
              </p>
            </div>
            <div className="hidden md:grid grid-cols-4 gap-3">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-border bg-card px-4 py-3 min-w-[120px]">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Featured Roadmap Hero */}
          <div className="relative rounded-2xl border border-border bg-gradient-to-br from-accent/5 via-card to-card p-6 mb-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
            <div className="relative flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[10px] font-semibold text-accent uppercase tracking-wider">
                    Current Roadmap
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-accent-secondary/10 border border-accent-secondary/20 text-[10px] font-medium text-accent-secondary">
                    {featuredRoadmap.difficulty}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">{featuredRoadmap.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary mb-4">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {featuredRoadmap.topics} Topics</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {featuredRoadmap.hours} Hours</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {featuredRoadmap.learners} Learners</span>
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-[#F59E0B]" /> {featuredRoadmap.rating}</span>
                </div>

                {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-text-primary">{featuredRoadmap.progress}% Complete</span>
                      <span className="text-[11px] text-text-muted">~{featuredRoadmap.estimatedRemaining} remaining</span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${featuredRoadmap.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                    />
                  </div>
                </div>

                {/* Next Topic */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-card-hover border border-border mb-4">
                  <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Next Topic</p>
                    <p className="text-sm font-medium text-text-primary">{featuredRoadmap.nextTopic}</p>
                  </div>
                  <span className="text-[11px] text-text-muted">Expected: {featuredRoadmap.expectedCompletion}</span>
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roadmaps..."
                className="w-full h-12 bg-card border border-border rounded-xl pl-12 pr-4 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent/40 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                Filters
                {activeFilters.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-accent/15 text-accent text-[10px]">
                    {activeFilters.length}
                  </span>
                )}
              </button>
              {activeFilters.length > 0 && (
                <button
                  onClick={() => setActiveFilters([])}
                  className="text-[11px] text-text-secondary hover:text-text-primary transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-border bg-card">
                    <div>
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Difficulty</p>
                      <div className="flex flex-wrap gap-1.5">
                        {difficultyFilters.map((f) => (
                          <button
                            key={f}
                            onClick={() => toggleFilter(f)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                              activeFilters.includes(f)
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-border bg-card-hover text-text-secondary hover:border-border-hover"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Category</p>
                      <div className="flex flex-wrap gap-1.5">
                        {categoryFilters.map((f) => (
                          <button
                            key={f}
                            onClick={() => toggleFilter(f)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                              activeFilters.includes(f)
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-border bg-card-hover text-text-secondary hover:border-border-hover"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Languages</p>
                      <div className="flex flex-wrap gap-1.5">
                        {languageFilters.map((f) => (
                          <button
                            key={f}
                            onClick={() => toggleFilter(f)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                              activeFilters.includes(f)
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-border bg-card-hover text-text-secondary hover:border-border-hover"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Status</p>
                      <div className="flex flex-wrap gap-1.5">
                        {statusFilters.map((f) => (
                          <button
                            key={f}
                            onClick={() => toggleFilter(f)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                              activeFilters.includes(f)
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-border bg-card-hover text-text-secondary hover:border-border-hover"
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

          {/* Main Layout: Roadmap Grid + Right Sidebar */}
          <div className="flex gap-6">
            {/* Roadmap Grid */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRoadmaps.map((rm, idx) => {
                  const Icon = rm.icon;
                  return (
                    <motion.div
                      key={rm.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      whileHover={{ y: -4 }}
                      onClick={() => setSelectedRoadmap(rm.id === selectedRoadmap ? null : rm.id)}
                      className="group rounded-2xl border border-border bg-card overflow-hidden cursor-pointer hover:border-accent/30 hover:shadow-[0_8px_32px_rgba(124,58,237,0.1)] transition-all"
                    >
                      {/* Gradient Banner */}
                      <div className={`h-24 bg-gradient-to-r ${rm.gradient} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-3 right-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                            rm.difficulty === "Beginner" ? "bg-[#22C55E]/20 border-[#22C55E]/30 text-[#22C55E]" :
                            rm.difficulty === "Intermediate" ? "bg-[#F59E0B]/20 border-[#F59E0B]/30 text-[#F59E0B]" :
                            "bg-[#EF4444]/20 border-[#EF4444]/30 text-[#EF4444]"
                          }`}>
                            {rm.difficulty}
                          </span>
                        </div>
                        <div className="absolute -bottom-4 left-4 w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      <div className="p-4 pt-6">
                        <h3 className="text-sm font-bold text-text-primary mb-1 group-hover:text-accent transition-colors">{rm.title}</h3>
                        <p className="text-xs text-text-secondary leading-relaxed mb-3 line-clamp-2">{rm.description}</p>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-secondary mb-3">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {rm.topics} Topics</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {rm.hours}h</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {rm.learners}</span>
                          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-[#F59E0B]" /> {rm.rating}</span>
                        </div>

                        {/* Progress */}
                        {rm.progress > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-text-muted">{rm.progress === 100 ? "Completed" : "In Progress"}</span>
                              <span className="text-[10px] font-medium text-text-primary">{rm.progress}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-border overflow-hidden">
                              <div
                                className={`h-full rounded-full ${rm.progress === 100 ? "bg-[#22C55E]" : "bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]"}`}
                                style={{ width: `${rm.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Continue Button */}
                        <button className={`w-full h-9 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                          rm.progress === 100
                            ? "bg-success/10 border border-success/20 text-success hover:bg-success/20"
                            : rm.progress > 0
                            ? "bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20"
                            : "bg-card-hover border border-border text-text-primary hover:border-border-hover"
                        }`}>
                          {rm.progress === 100 ? (
                            <><Check className="w-3.5 h-3.5" /> Completed</>
                          ) : rm.progress > 0 ? (
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

              {/* Roadmap Preview Timeline */}
              <AnimatePresence>
                {selectedRoadmap && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 rounded-2xl border border-border bg-card p-6 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-text-primary">Roadmap Timeline</h3>
                        <p className="text-xs text-text-secondary mt-1">Follow the path from basics to mastery</p>
                      </div>
                      <button
                        onClick={() => setSelectedRoadmap(null)}
                        className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Close
                      </button>
                    </div>

                    <div className="relative">
                      {/* Vertical Line */}
                      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />

                      <div className="space-y-3">
                        {timelineTopics.map((topic, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative flex items-start gap-4"
                          >
                            {/* Node */}
                            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              topic.completed
                                ? "bg-gradient-to-br from-[#22C55E] to-[#3B82F6] shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                                : topic.locked
                                ? "bg-card-hover border border-border"
                                : "bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                            }`}>
                              {topic.completed ? (
                                <Check className="w-4 h-4 text-white" />
                              ) : topic.locked ? (
                                <Lock className="w-3.5 h-3.5 text-text-muted" />
                              ) : (
                                <span className="text-xs font-bold text-white">{idx + 1}</span>
                              )}
                            </div>

                            {/* Content */}
                            <div className={`flex-1 rounded-xl border p-3 transition-all ${
                              topic.locked
                                ? "border-border bg-card-hover opacity-50"
                                : "border-border bg-card-hover hover:border-border-hover"
                            }`}>
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <h4 className="text-sm font-medium text-text-primary">{topic.name}</h4>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                                  topic.difficulty === "Easy" ? "bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]" :
                                  topic.difficulty === "Medium" ? "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]" :
                                  "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]"
                                }`}>
                                  {topic.difficulty}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {topic.hours}</span>
                                {!topic.locked && (
                                  <>
                                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> 5 Problems</span>
                                    <span className="flex items-center gap-1"><Video className="w-3 h-3" /> 2 Videos</span>
                                    <span className="flex items-center gap-1"><Lightbulb className="w-3 h-3" /> AI Notes</span>
                                  </>
                                )}
                              </div>
                              {!topic.locked && (
                                <div className="flex items-center gap-2 mt-2">
                                  <button className="text-[11px] font-medium text-accent hover:text-accent-secondary transition-colors flex items-center gap-1">
                                    {topic.completed ? "Review" : "Start"} <ArrowRight className="w-3 h-3" />
                                  </button>
                                  {!topic.completed && (
                                    <button className="text-[11px] font-medium text-success hover:text-success transition-colors flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Mark Complete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Achievements */}
              <div className="mt-6 rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-warning" />
                  <h3 className="text-base font-semibold text-text-primary">Achievements</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {achievements.map((ach) => {
                    const Icon = ach.icon;
                    return (
                      <div
                        key={ach.name}
                        className={`rounded-xl border p-3 text-center transition-all ${
                          ach.unlocked
                            ? "border-border bg-card-hover hover:border-border-hover"
                            : "border-border bg-card-hover opacity-40"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${ach.color} flex items-center justify-center mx-auto mb-2`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-[10px] font-medium text-text-primary leading-tight">{ach.name}</p>
                        {ach.unlocked && (
                          <span className="text-[9px] text-success mt-1 block">Unlocked</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Community */}
              <div className="mt-6 rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-accent" />
                  <h3 className="text-base font-semibold text-text-primary">Community</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-card-hover p-4">
                    <h4 className="text-sm font-medium text-text-primary mb-2">Top Contributors</h4>
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
                            <span className="text-xs text-text-primary">{c.name}</span>
                          </div>
                          <span className="text-[11px] text-text-secondary">{c.contributions} notes</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card-hover p-4">
                    <h4 className="text-sm font-medium text-text-primary mb-2">Tips & FAQ</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ThumbsUp className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                        <p className="text-[11px] text-text-secondary leading-relaxed">Practice at least 3 problems per topic to solidify concepts.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ThumbsUp className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                        <p className="text-[11px] text-text-secondary leading-relaxed">Don't skip the basics — strong fundamentals make advanced topics easier.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ThumbsUp className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                        <p className="text-[11px] text-text-secondary leading-relaxed">Use AI hints when stuck, but try solving first for at least 20 minutes.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="hidden xl:block w-72 shrink-0 space-y-4">
              {/* Stats Cards */}
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">{item.label}</span>
                    </div>
                    <p className="text-sm font-bold text-text-primary">{item.value}</p>
                  </div>
                );
              })}

              {/* Recent Badges */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <h4 className="text-xs font-semibold text-text-primary mb-3">Recent Badges</h4>
                <div className="space-y-2">
                  {recentBadges.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div key={badge.name} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg ${badge.color} flex items-center justify-center`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs text-text-primary">{badge.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Contest */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-warning" />
                  <h4 className="text-xs font-semibold text-text-primary">Upcoming Contest</h4>
                </div>
                <div className="rounded-xl border border-border bg-card-hover p-3">
                  <p className="text-xs font-medium text-text-primary">ByteClash Weekly #247</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">Starts in 2 days</p>
                  <button className="mt-2 w-full h-7 rounded-md bg-accent/10 border border-accent/20 text-accent text-[11px] font-medium hover:bg-accent/20 transition-colors">
                    Register
                  </button>
                </div>
              </div>

              {/* Recommended Roadmaps */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <h4 className="text-xs font-semibold text-text-primary">Recommended</h4>
                </div>
                <div className="space-y-2">
                  {[
                    { title: "Dynamic Programming", reason: "Based on your progress" },
                    { title: "System Design", reason: "For interview prep" },
                    { title: "Bit Manipulation", reason: "Quick win" },
                  ].map((rec) => (
                    <div key={rec.title} className="rounded-lg border border-border bg-card-hover p-2.5 hover:border-border-hover transition-colors cursor-pointer">
                      <p className="text-xs font-medium text-text-primary">{rec.title}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Friends Progress */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-success" />
                  <h4 className="text-xs font-semibold text-text-primary">Friends Progress</h4>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Aisha Khan", progress: 75, action: "completed Graphs" },
                    { name: "David Kim", progress: 42, action: "learning DP" },
                    { name: "Sneha Patil", progress: 90, action: "near completion" },
                  ].map((friend) => (
                    <div key={friend.name} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED]/50 to-[#3B82F6]/50 flex items-center justify-center text-white text-[10px] font-bold">
                        {friend.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-text-primary truncate">{friend.name}</p>
                        <p className="text-[10px] text-text-secondary">{friend.action}</p>
                      </div>
                      <span className="text-[10px] text-accent">{friend.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}