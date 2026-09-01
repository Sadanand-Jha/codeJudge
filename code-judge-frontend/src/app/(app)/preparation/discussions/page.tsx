"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
  Check,
  Code2,
  Trophy,
  GraduationCap,
  Building2,
  Plus,
  FileText,
  Verified,
  Pin,
  Target,
  Lightbulb,
  BookOpen,
  Server,
  Route,
} from "lucide-react";
import { PrepPageHeader } from "@/components/preparation";

const stats = [
  { label: "Total Posts", value: "12.4K", icon: MessageSquare, color: "text-accent" },
  { label: "Contributors", value: "3.2K", icon: Users, color: "text-accent-secondary" },
  { label: "Experiences Shared", value: "8.7K", icon: GraduationCap, color: "text-success" },
  { label: "Questions Answered", value: "45.2K", icon: Check, color: "text-warning" },
];

const categories = [
  { name: "Interview Experiences", icon: GraduationCap, count: 2100, color: "text-warning" },
  { name: "Company Preparation", icon: Building2, count: 980, color: "text-danger" },
  { name: "DSA", icon: Code2, count: 3420, color: "text-accent" },
  { name: "System Design", icon: Server, count: 720, color: "text-success" },
  { name: "CS Fundamentals", icon: BookOpen, count: 650, color: "text-accent-secondary" },
  { name: "Roadmaps", icon: Route, count: 410, color: "text-accent" },
  { name: "Career Advice", icon: Target, count: 830, color: "text-warning" },
  { name: "Study Strategies", icon: Lightbulb, count: 480, color: "text-accent" },
  { name: "Contests", icon: Trophy, count: 1560, color: "text-success" },
  { name: "Bookmarks", icon: Bookmark, count: 0, color: "text-warning" },
  { name: "Following", icon: Users, count: 0, color: "text-accent-secondary" },
];

const posts = [
  {
    id: 1,
    title: "How to structure DSA revision 2 months before placements?",
    preview:
      "With placements around the corner, here is the exact revision plan I used — pattern-wise practice, timed sets and weekly mock tests...",
    author: "Sarah Chen",
    avatar: "S",
    rating: 1850,
    time: "2 hours ago",
    tags: ["Study Strategies", "DSA"],
    problem: null as string | null,
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
    title: "Google SDE Intern interview experience — all rounds",
    preview:
      "Just finished my Google interview loop. Here's my detailed breakdown of each round, the questions asked, and tips...",
    author: "Arjun Mehta",
    avatar: "A",
    rating: 2100,
    time: "5 hours ago",
    tags: ["Interview Experiences", "Google"],
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
    title: "Segment Tree — complete guide with visualizations",
    preview:
      "Segment trees are powerful data structures for range queries. In this post, I'll explain the concept with...",
    author: "Priya Nair",
    avatar: "P",
    rating: 1650,
    time: "1 day ago",
    tags: ["DSA", "Trees"],
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
    title: "Amazon SDE Internship — preparation strategy that worked",
    preview:
      "From the leadership principles to the DSA rounds, this is how I prepared over 10 weeks using roadmaps + company tracks...",
    author: "David Kim",
    avatar: "D",
    rating: 1920,
    time: "2 days ago",
    tags: ["Company Preparation", "Amazon"],
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
    title: "Is System Design needed for intern roles?",
    preview:
      "Short answer: basics yes, deep dives rarely. Here's what was actually asked across 12 intern interviews I collected...",
    author: "Aisha Khan",
    avatar: "A",
    rating: 2300,
    time: "3 days ago",
    tags: ["System Design", "Interview Experiences"],
    problem: null,
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
    title: "Graph algorithms every placement candidate should know",
    preview:
      "From BFS/DFS to Dijkstra and MST, this comprehensive guide covers all essential graph algorithms with code examples...",
    author: "Sneha Patil",
    avatar: "S",
    rating: 1780,
    time: "1 week ago",
    tags: ["DSA", "Graphs"],
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
  { name: "Amazon Preparation", posts: 189, trend: "+8%" },
  { name: "Dynamic Programming", posts: 145, trend: "+23%" },
  { name: "Placement Revision", posts: 120, trend: "+45%" },
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

const filters = [
  "Latest",
  "Trending",
  "Following",
  "My Discussions",
  "Interview Experiences",
  "Company Prep",
  "Roadmaps",
  "Study Strategies",
];

export default function DiscussionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Latest");

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-[1400px]">
        <PrepPageHeader
          section="Discussions"
          title="Discussions"
          subtitle="Interview experiences, company prep advice and study strategies from the community."
          actions={
            <>
              <button className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-medium text-text-primary transition-colors hover:border-border-hover">
                <FileText className="h-3.5 w-3.5" />
                Write Article
              </button>
              <button className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white transition-all hover:shadow-[0_6px_20px_rgba(139,92,246,0.35)]">
                <Plus className="h-3.5 w-3.5" />
                Ask Question
              </button>
            </>
          }
        />

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{stat.label}</span>
                </div>
                <p className="mt-2 text-lg font-extrabold tabular-nums leading-none text-text-primary">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discussions..."
            className="h-12 w-full rounded-xl border border-input-border bg-input-bg pl-12 pr-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                activeFilter === filter
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-card text-text-secondary hover:border-border-hover hover:text-text-primary"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Three column layout */}
        <div className="flex gap-6">
          {/* Categories */}
          <div className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">Categories</h3>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.name}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
                        <span>{cat.name}</span>
                      </span>
                      <span className="text-[10px] tabular-nums text-text-muted">{cat.count > 0 ? cat.count : ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feed */}
          <div className="min-w-0 flex-1 space-y-4">
            {filteredPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={{ y: -2 }}
                className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition-all hover:border-[#7C3AED]/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.12)] dark:hover:border-ai-accent/40"
              >
                {/* Author row */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-xs font-bold text-white">
                    {post.avatar}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-text-primary">{post.author}</span>
                    {post.verified && <Verified className="h-3 w-3 text-accent" />}
                  </div>
                  <span className="text-[10px] text-text-muted">•</span>
                  <span className="text-[10px] font-medium text-text-secondary">Rating {post.rating}</span>
                  <span className="text-[10px] text-text-muted">•</span>
                  <span className="text-[10px] text-text-secondary">{post.time}</span>
                  {post.pinned && <Pin className="h-3 w-3 text-warning" />}
                </div>

                {/* Title */}
                <h3 className="mb-2 text-sm font-bold text-text-primary transition-colors group-hover:text-[#7C3AED] dark:group-hover:text-ai-accent">
                  {post.title}
                </h3>

                {/* Preview */}
                <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-text-secondary">{post.preview}</p>

                {/* Tags */}
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-md border border-border bg-card-hover px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {tag}
                    </span>
                  ))}
                  {post.problem && (
                    <span className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      {post.problem}
                    </span>
                  )}
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                      post.difficulty === "Easy"
                        ? "border-success/20 bg-success/10 text-success"
                        : post.difficulty === "Medium"
                        ? "border-warning/20 bg-warning/10 text-warning"
                        : "border-danger/20 bg-danger/10 text-danger"
                    }`}
                  >
                    {post.difficulty}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[11px] font-medium text-text-secondary">
                    <button className="flex items-center gap-1 transition-colors hover:text-accent">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {post.likes}
                    </button>
                    <button className="flex items-center gap-1 transition-colors hover:text-accent">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {post.comments}
                    </button>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {post.views}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className={`rounded-md p-1.5 transition-colors ${
                        post.bookmarked
                          ? "bg-warning/10 text-warning"
                          : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
                      }`}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                    </button>
                    <button className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary">
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right sidebar */}
          <div className="hidden w-72 shrink-0 space-y-4 xl:block">
            {/* Trending topics */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-text-primary">Trending Topics</h3>
              </div>
              <div className="space-y-1">
                {trendingTopics.map((topic) => (
                  <div
                    key={topic.name}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-card-hover"
                  >
                    <span className="text-[12px] font-medium text-text-primary">{topic.name}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] tabular-nums text-text-secondary">{topic.posts}</span>
                      <span className="text-[10px] font-semibold text-success">{topic.trend}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top contributors */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-bold text-text-primary">Top Contributors</h3>
              </div>
              <div className="space-y-2.5">
                {topContributors.map((user) => (
                  <div key={user.name} className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/60 to-violet-600/60 text-[10px] font-bold text-white">
                      {user.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-[12px] font-semibold text-text-primary">{user.name}</p>
                        {user.badge === "Expert" && <Verified className="h-3 w-3 text-accent" />}
                      </div>
                      <p className="text-[10px] text-text-secondary">{user.reputation.toLocaleString()} reputation</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested users */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-success" />
                <h3 className="text-sm font-bold text-text-primary">Suggested Users</h3>
              </div>
              <div className="space-y-2.5">
                {suggestedUsers.map((user) => (
                  <div key={user.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/60 to-violet-600/60 text-[10px] font-bold text-white">
                        {user.avatar}
                      </div>
                      <span className="text-[12px] font-medium text-text-primary">{user.name}</span>
                    </div>
                    <button className="text-[11px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent">
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
