import Link from "next/link";
import {
  ArrowRight,
  Code2,
  TrendingUp,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Trophy,
  Users,
  MessageSquare,
  Newspaper,
  GitBranch,
  Briefcase,
  Compass,
  ExternalLink,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import DeveloperFeedCard from "@/components/feed/DeveloperFeedCard";
import { feedPosts } from "@/data/developerFeed";

export const metadata = {
  title: "Dashboard — ByteClash",
  description: "Your coding activity dashboard on ByteClash.",
};

const featuredContest = {
  title: "ByteClash Weekly #247",
  description: "3 problems · 2 hours · Rated for all",
  startTime: "Starts in 2 days",
  participants: 1240,
};

const dailyChallenge = {
  title: "Longest Increasing Path in a Matrix",
  difficulty: "Hard",
  tags: ["DP", "DFS", "Topological Sort"],
  acceptance: "42.3%",
};

const weeklyChallenge = {
  title: "Minimum Cost to Connect Sticks",
  difficulty: "Medium",
  tags: ["Greedy", "Heap", "Array"],
  acceptance: "61.8%",
};

const upcomingEvents = [
  { title: "AI & Algorithms Roundtable", time: "Today, 8:00 PM", type: "Webinar" },
  { title: "System Design Interview Prep", time: "Tomorrow, 6:30 PM", type: "Workshop" },
  { title: "Contest #247", time: "Starts in 2 days", type: "Contest" },
];

const trendingDiscussions = [
  { title: "Is CP still worth it in 2025?", replies: 342, hot: true },
  { title: "Best resources for segment trees", replies: 128, hot: false },
  { title: "How to avoid burnout during contests", replies: 95, hot: false },
  { title: "Rated vs unrated — honest comparison", replies: 210, hot: true },
];

const topBlogs = [
  { title: "Mastering bitmask DP", author: "Sarah Chen", reads: "12.4K" },
  { title: "System design for interviews", author: "Arjun Mehta", reads: "8.9K" },
  { title: "From 1200 to 1900 in 3 months", author: "Rahul Verma", reads: "15.1K" },
];

const friendActivity = [
  { name: "Aisha Khan", action: "solved", target: "Three Sum", time: "5m ago" },
  { name: "David Kim", action: "commented on", target: "Dijkstra visualization", time: "12m ago" },
  { name: "Sneha Patil", action: "achieved", target: "7 day streak", time: "1h ago" },
];

const aiRecommended = [
  { title: "Network Delay Time", reason: "Based on your graph practice", difficulty: "Medium" },
  { title: "Word Ladder II", reason: "Strengthen BFS skills", difficulty: "Hard" },
  { title: "LRU Cache", reason: "Common interview question", difficulty: "Hard" },
];

const topContributors = [
  { name: "Sarah Chen", contributions: 124, avatar: "SC" },
  { name: "Arjun Mehta", contributions: 98, avatar: "AM" },
  { name: "Priya Nair", contributions: 87, avatar: "PN" },
];

const trendingAlgorithms = [
  { name: "Dynamic Programming", count: 342 },
  { name: "Graph Theory", count: 278 },
  { name: "Binary Search", count: 195 },
  { name: "Greedy", count: 167 },
];

const learningPaths = [
  { title: "Dynamic Programming Mastery", lessons: 24, progress: 65 },
  { title: "Graph Algorithms", lessons: 18, progress: 30 },
  { title: "Binary Search Deep Dive", lessons: 12, progress: 80 },
];

const companyPreparation = [
  { company: "Google", problems: 45, completed: 12 },
  { company: "Amazon", problems: 38, completed: 8 },
  { company: "Microsoft", problems: 32, completed: 15 },
];

const recentEditorials = [
  { title: "Contest #246 Editorial", author: "ByteClash Team", date: "Yesterday" },
  { title: "LeetCode Weekly #312", author: "Community", date: "2 days ago" },
  { title: "Codeforces Round #944", author: "Arjun Mehta", date: "3 days ago" },
];

const openSourceProjects = [
  { name: "cp-algorithms-js", stars: "2.4K", language: "TypeScript" },
  { name: "competitive-programming-template", stars: "1.8K", language: "C++" },
  { name: "algorithm-visualizer", stars: "3.1K", language: "JavaScript" },
];

const codingNews = [
  { title: "New CP platform launches AI-powered hints", source: "TechCrunch", time: "2h ago" },
  { title: "Google Kick Start returns for 2025", source: "Official Blog", time: "5h ago" },
  { title: "How AI is changing technical interviews", source: "Hacker News", time: "8h ago" },
];

export default function HomePage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Discover, learn, and connect with the developer community.</p>
          </div>

          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Featured Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Featured Contest */}
                <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5 hover:border-border-hover transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-[#7C3AED]" />
                        <span className="text-[10px] font-semibold text-[#7C3AED] uppercase tracking-wider">Featured Contest</span>
                      </div>
                      <h3 className="text-base font-semibold text-white mb-1">{featuredContest.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{featuredContest.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {featuredContest.startTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {featuredContest.participants.toLocaleString()} participants
                        </span>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white text-xs font-semibold hover:shadow-lg hover:shadow-[#7C3AED]/20 transition-all">
                      Register
                    </button>
                  </div>
                </div>

                {/* Daily Challenge */}
                <div className="rounded-2xl border border-border bg-card p-5 hover:border-border-hover transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-[#22C55E]" />
                    <span className="text-[10px] font-semibold text-[#22C55E] uppercase tracking-wider">Daily Challenge</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2">{dailyChallenge.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {dailyChallenge.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-border-hover text-[10px] text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-md bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">{dailyChallenge.difficulty}</span>
                    <span>{dailyChallenge.acceptance} acceptance</span>
                  </div>
                </div>
              </div>

              {/* Weekly Challenge & Upcoming Events */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-[#3B82F6]" />
                    <span className="text-[10px] font-semibold text-[#3B82F6] uppercase tracking-wider">Weekly Challenge</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{weeklyChallenge.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {weeklyChallenge.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-border-hover text-[10px] text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-md bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">{weeklyChallenge.difficulty}</span>
                    <span>{weeklyChallenge.acceptance} acceptance</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Compass className="w-4 h-4 text-[#EC4899]" />
                    <span className="text-[10px] font-semibold text-[#EC4899] uppercase tracking-wider">Upcoming Events</span>
                  </div>
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div key={event.title} className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{event.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{event.time}</p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/[0.04] border border-border-hover text-[10px] text-muted-foreground">
                          {event.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Developer Feed */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white">Developer Feed</h2>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#7C3AED] text-[11px] font-medium hover:bg-[#7C3AED]/20 transition-colors">
                      For You
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-border-hover text-muted-foreground text-[11px] font-medium hover:text-white hover:border-border-hover transition-colors">
                      Following
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {feedPosts.map((post) => (
                    <DeveloperFeedCard key={post.id} post={post} />
                  ))}
                </div>
              </div>

              {/* Bottom Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Featured Learning Paths */}
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Featured Learning Paths</h3>
                    <Link href="/learn" className="text-[11px] text-[#7C3AED] hover:text-[#8B5CF6] transition-colors flex items-center gap-1">
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {learningPaths.map((path) => (
                      <div key={path.title} className="rounded-xl border border-border bg-white/[0.02] p-4 hover:border-border-hover transition-colors">
                        <h4 className="text-xs font-semibold text-white mb-1">{path.title}</h4>
                        <p className="text-[11px] text-muted-foreground mb-3">{path.lessons} lessons</p>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]" style={{ width: `${path.progress}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{path.progress}% complete</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Company Preparation */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Company Prep</h3>
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-3">
                    {companyPreparation.map((company) => (
                      <div key={company.company}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white">{company.company}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {company.completed}/{company.problems}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]"
                            style={{ width: `${(company.completed / company.problems) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recently Published Editorials */}
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Recently Published Editorials</h3>
                    <Newspaper className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-3">
                    {recentEditorials.map((item) => (
                      <div key={item.title} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 hover:border-border-hover transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.author} · {item.date}
                          </p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coding News */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Coding News</h3>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-3">
                    {codingNews.map((item) => (
                      <div key={item.title} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 hover:border-border-hover transition-colors">
                        <p className="text-xs font-medium text-white leading-relaxed">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {item.source} · {item.time}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="hidden xl:block w-80 shrink-0 space-y-4">
              {/* Trending Discussions */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
                  <h3 className="text-sm font-semibold text-white">Trending Discussions</h3>
                </div>
                <div className="space-y-3">
                  {trendingDiscussions.map((item) => (
                    <div key={item.title} className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white leading-snug line-clamp-2 hover:text-[#7C3AED] transition-colors cursor-pointer">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.replies} replies</p>
                      </div>
                      {item.hot && <Flame className="w-3.5 h-3.5 text-[#EF4444] shrink-0 mt-0.5" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Blogs */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-[#3B82F6]" />
                  <h3 className="text-sm font-semibold text-white">Top Blogs</h3>
                </div>
                <div className="space-y-3">
                  {topBlogs.map((item) => (
                    <div key={item.title} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 hover:border-border-hover transition-colors">
                      <p className="text-xs font-medium text-white leading-snug line-clamp-2 hover:text-[#3B82F6] transition-colors cursor-pointer">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {item.author} · {item.reads} reads
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Friend Activity */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-[#22C55E]" />
                  <h3 className="text-sm font-semibold text-white">Friend Activity</h3>
                </div>
                <div className="space-y-3">
                  {friendActivity.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED]/50 to-[#3B82F6]/50 flex items-center justify-center text-white text-[10px] font-bold">
                        {item.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white">
                          <span className="font-medium">{item.name}</span> {item.action}{" "}
                          <span className="text-[#7C3AED]">{item.target}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Recommended Problems */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                  <h3 className="text-sm font-semibold text-white">AI Recommended</h3>
                </div>
                <div className="space-y-3">
                  {aiRecommended.map((item) => (
                    <div key={item.title} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 hover:border-[#7C3AED]/30 transition-colors cursor-pointer group">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-white group-hover:text-[#7C3AED] transition-colors">{item.title}</p>
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/[0.04] border border-border-hover text-[10px] text-muted-foreground">
                          {item.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Contests */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-[#F59E0B]" />
                  <h3 className="text-sm font-semibold text-white">Upcoming Contests</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Codeforces Round #945", time: "Tomorrow, 8:00 PM", duration: "2 hours" },
                    { name: "LeetCode Weekly #312", time: "Sat, 10:00 AM", duration: "1.5 hours" },
                    { name: "ByteClash Monthly", time: "Next week", duration: "3 hours" },
                  ].map((contest) => (
                    <div key={contest.name} className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                      <div>
                        <p className="text-xs font-medium text-white">{contest.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{contest.time}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{contest.duration}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Contributors */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
                  <h3 className="text-sm font-semibold text-white">Top Contributors</h3>
                </div>
                <div className="space-y-3">
                  {topContributors.map((contributor) => (
                    <div key={contributor.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-white text-xs font-bold">
                        {contributor.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white">{contributor.name}</p>
                        <p className="text-[11px] text-muted-foreground">{contributor.contributions} contributions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending Algorithms */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <GitBranch className="w-4 h-4 text-[#22C55E]" />
                  <h3 className="text-sm font-semibold text-white">Trending Algorithms</h3>
                </div>
                <div className="space-y-3">
                  {trendingAlgorithms.map((algo) => (
                    <div key={algo.name} className="flex items-center justify-between">
                      <span className="text-xs text-white">{algo.name}</span>
                      <span className="text-[11px] text-muted-foreground">{algo.count} problems</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open Source Projects */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#7C3AED]" />
                    <h3 className="text-sm font-semibold text-white">Open Source Projects</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  {openSourceProjects.map((project) => (
                    <div key={project.name} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 hover:border-border-hover transition-colors">
                      <div>
                        <p className="text-xs font-medium text-white">{project.name}</p>
                        <p className="text-[11px] text-muted-foreground">{project.language}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">⭐ {project.stars}</span>
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