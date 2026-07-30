"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  TrendingUp,
  ThumbsUp,
  MessageCircle,
  Eye,
  Share2,
  Bookmark,
  Award,
  Users,
  Search,
  Sparkles,
  Code2,
  Trophy,
  GraduationCap,
  Building2,
  Zap,
  Plus,
  FileText,
  Verified,
  Pin,
  Flame,
  Target,
  BarChart3,
  Lightbulb,
  BookOpen,
  Send,
  ArrowRight,
  Check,
  Star,
  Heart,
  Hash,
  Tag,
  ChevronDown,
  X,
  Layers,
  Server,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

const stats = [
  { label: "Total Posts", value: "12.4K", icon: MessageSquare, color: "text-[#7C3AED]" },
  { label: "Contributors", value: "3.2K", icon: Users, color: "text-[#3B82F6]" },
  { label: "Solved Questions", value: "8.7K", icon: Check, color: "text-[#22C55E]" },
  { label: "Reputation Shared", value: "45.2K", icon: Award, color: "text-[#F59E0B]" },
];

const categories = [
  { name: "Algorithms", icon: Code2, count: 3420, color: "text-[#7C3AED]" },
  { name: "Data Structures", icon: Layers, count: 2890, color: "text-[#3B82F6]" },
  { name: "Competitive Programming", icon: Trophy, count: 1560, color: "text-[#22C55E]" },
  { name: "Interview", icon: GraduationCap, count: 2100, color: "text-[#F59E0B]" },
  { name: "Companies", icon: Building2, count: 980, color: "text-[#EF4444]" },
  { name: "Backend", icon: Server, count: 720, color: "text-[#22C55E]" },
  { name: "Frontend", icon: Code2, count: 650, color: "text-[#3B82F6]" },
  { name: "AI/ML", icon: Sparkles, count: 480, color: "text-[#7C3AED]" },
  { name: "Bookmarks", icon: Bookmark, count: 0, color: "text-[#F59E0B]" },
  { name: "Following", icon: Users, count: 0, color: "text-[#3B82F6]" },
];

const posts = [
  {
    id: 1,
    title: "How I solved 3Sum in O(n²) with two pointers",
    preview: "After struggling with 3Sum for weeks, I finally found an elegant two-pointer approach that reduces the complexity...",
    author: "Sarah Chen",
    avatar: "S",
    rating: 1850,
    time: "2 hours ago",
    tags: ["Algorithms", "Two Pointers"],
    problem: "3Sum",
    likes: 234,
    comments: 45,
    views: "2.1K",
    bookmarked: false,
    pinned: true,
    verified: true,
    difficulty: "Medium",
  },
  {
    id: 2,
    title: "Google Interview Experience - L4 Position",
    preview: "Just finished my Google interview loop. Here's my detailed breakdown of each round, the questions asked, and tips...",
    author: "Arjun Mehta",
    avatar: "A",
    rating: 2100,
    time: "5 hours ago",
    tags: ["Interview", "Google"],
    problem: null,
    likes: 567,
    comments: 89,
    views: "5.3K",
    bookmarked: true,
    pinned: false,
    verified: true,
    difficulty: "Hard",
  },
  {
    id: 3,
    title: "Segment Tree Explanation - Complete Guide with Visualizations",
    preview: "Segment trees are powerful data structures for range queries. In this post, I'll explain the concept with...",
    author: "Priya Nair",
    avatar: "P",
    rating: 1650,
    time: "1 day ago",
    tags: ["Data Structures", "Trees"],
    problem: "Range Sum Query",
    likes: 189,
    comments: 32,
    views: "1.8K",
    bookmarked: false,
    pinned: false,
    verified: false,
    difficulty: "Hard",
  },
  {
    id: 4,
    title: "Dynamic Programming Tricks You Need to Know",
    preview: "DP can be intimidating, but these 10 patterns cover 90% of DP problems. From knapsack to LIS, I've got you covered...",
    author: "David Kim",
    avatar: "D",
    rating: 1920,
    time: "2 days ago",
    tags: ["Algorithms", "DP"],
    problem: "Multiple",
    likes: 445,
    comments: 67,
    views: "3.2K",
    bookmarked: true,
    pinned: false,
    verified: true,
    difficulty: "Hard",
  },
  {
    id: 5,
    title: "Codeforces Round #847 Editorial",
    preview: "Here's my detailed editorial for the recent Codeforces round. Problem A was a simple observation, but Problem E...",
    author: "Aisha Khan",
    avatar: "A",
    rating: 2300,
    time: "3 days ago",
    tags: ["Contests", "Editorial"],
    problem: "Multiple",
    likes: 312,
    comments: 56,
    views: "2.7K",
    bookmarked: false,
    pinned: false,
    verified: true,
    difficulty: "Mixed",
  },
  {
    id: 6,
    title: "Graph Algorithms Every Developer Should Know",
    preview: "From BFS/DFS to Dijkstra and MST, this comprehensive guide covers all essential graph algorithms with code examples...",
    author: "Sneha Patil",
    avatar: "S",
    rating: 1780,
    time: "1 week ago",
    tags: ["Algorithms", "Graphs"],
    problem: null,
    likes: 278,
    comments: 41,
    views: "2.4K",
    bookmarked: false,
    pinned: false,
    verified: false,
    difficulty: "Medium",
  },
];

const trendingTopics = [
  { name: "Google Interview", posts: 234, trend: "+15%" },
  { name: "Dynamic Programming", posts: 189, trend: "+8%" },
  { name: "Segment Tree", posts: 145, trend: "+23%" },
  { name: "Codeforces Round", posts: 120, trend: "+45%" },
  { name: "Binary Search", posts: 98, trend: "+12%" },
];

const topContributors = [
  { name: "Sarah Chen", avatar: "S", reputation: 12450, badge: "Expert" },
  { name: "Arjun Mehta", avatar: "A", reputation: 11200, badge: "Expert" },
  { name: "Priya Nair", avatar: "P", reputation: 9800, badge: "Master" },
  { name: "David Kim", avatar: "D", reputation: 8750, badge: "Master" },
  { name: "Aisha Khan", avatar: "A", reputation: 8200, badge: "Expert" },
];

const suggestedUsers = [
  { name: "Alex Johnson", avatar: "A" },
  { name: "Emma Wilson", avatar: "E" },
  { name: "Michael Brown", avatar: "M" },
];

const filters = ["Newest", "Trending", "Most Upvoted", "Unanswered", "Following", "Editorials", "Interview Experience", "Algorithms", "Companies", "Contests"];

export default function DiscussionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Newest");

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Discussions</h1>
              <p className="text-sm text-[#9CA3AF] mt-2 max-w-2xl">
                Learn, ask questions, share solutions and help the community.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-9 px-4 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs font-medium text-white hover:border-white/[0.12] transition-colors flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Write Article
              </button>
              <button className="h-9 px-4 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white text-xs font-semibold hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                Ask Question
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-[#111827] px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search discussions..."
              className="w-full h-12 bg-[#111827] border border-white/[0.06] rounded-xl pl-12 pr-4 text-sm text-white placeholder-[#9CA3AF] outline-none focus:border-[#7C3AED]/40 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all whitespace-nowrap ${
                  activeFilter === filter
                    ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                    : "border-white/[0.06] bg-white/[0.02] text-[#9CA3AF] hover:border-white/[0.12] hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Three Column Layout */}
          <div className="flex gap-6">
            {/* Left Sidebar - Categories */}
            <div className="hidden lg:block w-56 shrink-0">
              <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4 sticky top-20">
                <h3 className="text-xs font-semibold text-white mb-3">Categories</h3>
                <div className="space-y-1">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.name}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] text-[#9CA3AF] hover:bg-white/[0.04] hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                          <span>{cat.name}</span>
                        </div>
                        <span className="text-[10px] text-[#6B7280]">{cat.count > 0 ? cat.count : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Center - Feed */}
            <div className="flex-1 min-w-0">
              <div className="space-y-4">
                {filteredPosts.map((post, idx) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    whileHover={{ y: -2 }}
                    className="group rounded-2xl border border-white/[0.06] bg-[#111827] p-5 cursor-pointer hover:border-[#7C3AED]/30 hover:shadow-[0_8px_32px_rgba(124,58,237,0.1)] transition-all"
                  >
                    {/* Author Row */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-white text-xs font-bold">
                        {post.avatar}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white">{post.author}</span>
                        {post.verified && <Verified className="w-3 h-3 text-[#7C3AED]" />}
                      </div>
                      <span className="text-[10px] text-[#6B7280]">•</span>
                      <span className="text-[10px] text-[#9CA3AF]">Rating {post.rating}</span>
                      <span className="text-[10px] text-[#6B7280]">•</span>
                      <span className="text-[10px] text-[#9CA3AF]">{post.time}</span>
                      {post.pinned && <Pin className="w-3 h-3 text-[#F59E0B]" />}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-white mb-2 group-hover:text-[#7C3AED] transition-colors">{post.title}</h3>

                    {/* Preview */}
                    <p className="text-xs text-[#9CA3AF] leading-relaxed mb-3 line-clamp-2">{post.preview}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {post.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-[#9CA3AF]">
                          {tag}
                        </span>
                      ))}
                      {post.problem && (
                        <span className="px-2 py-0.5 rounded-md bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[10px] text-[#7C3AED]">
                          {post.problem}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                        post.difficulty === "Easy" ? "bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]" :
                        post.difficulty === "Medium" ? "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]" :
                        "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]"
                      }`}>
                        {post.difficulty}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-[11px] text-[#9CA3AF]">
                        <button className="flex items-center gap-1 hover:text-[#7C3AED] transition-colors">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {post.likes}
                        </button>
                        <button className="flex items-center gap-1 hover:text-[#7C3AED] transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {post.comments}
                        </button>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {post.views}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className={`p-1.5 rounded-md transition-colors ${post.bookmarked ? "text-[#F59E0B] bg-[#F59E0B]/10" : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.06]"}`}>
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-md text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-colors">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="hidden xl:block w-72 shrink-0 space-y-4">
              {/* Trending Topics */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
                  <h3 className="text-xs font-semibold text-white">Trending Topics</h3>
                </div>
                <div className="space-y-2">
                  {trendingTopics.map((topic) => (
                    <div key={topic.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3 h-3 text-[#7C3AED]" />
                        <span className="text-[11px] text-white">{topic.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#9CA3AF]">{topic.posts}</span>
                        <span className="text-[10px] text-[#22C55E]">{topic.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Contributors */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-[#F59E0B]" />
                  <h3 className="text-xs font-semibold text-white">Top Contributors</h3>
                </div>
                <div className="space-y-2">
                  {topContributors.map((user) => (
                    <div key={user.name} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7C3AED]/50 to-[#3B82F6]/50 flex items-center justify-center text-white text-[10px] font-bold">
                        {user.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-[11px] text-white truncate">{user.name}</p>
                          {user.badge === "Expert" && <Verified className="w-3 h-3 text-[#7C3AED]" />}
                        </div>
                        <p className="text-[10px] text-[#9CA3AF]">{user.reputation.toLocaleString()} reputation</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Users */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[#22C55E]" />
                  <h3 className="text-xs font-semibold text-white">Suggested Users</h3>
                </div>
                <div className="space-y-2">
                  {suggestedUsers.map((user) => (
                    <div key={user.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED]/50 to-[#3B82F6]/50 flex items-center justify-center text-white text-[10px] font-bold">
                          {user.avatar}
                        </div>
                        <span className="text-[11px] text-white">{user.name}</span>
                      </div>
                      <button className="text-[10px] text-[#7C3AED] hover:text-[#8B5CF6] transition-colors">Follow</button>
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