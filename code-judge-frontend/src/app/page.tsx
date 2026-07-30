import Link from "next/link";
import { ArrowRight, Code2, Trophy, Users, TrendingUp, Flame, Target, BookOpen } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "Dashboard — CodeJudge",
  description: "Your competitive programming dashboard on CodeJudge.",
};

const stats = [
  { label: "Problems Solved", value: "127", icon: Code2, color: "#22C55E", trend: "+12 this week" },
  { label: "Current Rating", value: "1450", icon: TrendingUp, color: "#7C3AED", trend: "+48 this month" },
  { label: "Global Rank", value: "#3,421", icon: Trophy, color: "#FBBF24", trend: "Top 12%" },
  { label: "Day Streak", value: "12", icon: Flame, color: "#F59E0B", trend: "Keep going!" },
];

const quickActions = [
  { label: "Browse Problems", desc: "Practice coding challenges", href: "/problems", icon: Code2, color: "#7C3AED" },
  { label: "Join Contest", desc: "Compete with others", href: "/contests", icon: Trophy, color: "#FBBF24" },
  { label: "View Leaderboard", desc: "See global rankings", href: "/leaderboard", icon: Users, color: "#3B82F6" },
  { label: "Learning Roadmaps", desc: "Structured learning paths", href: "/roadmaps", icon: BookOpen, color: "#22C55E" },
];

const recentActivity = [
  { problem: "Two Sum", verdict: "Accepted", rating: 1200, time: "2h ago", status: "solved" },
  { problem: "Longest Substring", verdict: "TLE", rating: 1400, time: "5h ago", status: "attempted" },
  { problem: "Binary Tree DFS", verdict: "Accepted", rating: 1300, time: "1d ago", status: "solved" },
  { problem: "Merge Intervals", verdict: "Wrong Answer", rating: 1500, time: "2d ago", status: "attempted" },
];

export default function HomePage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Header */}
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back 👋</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Here's what's happening with your coding journey.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111827] p-5 transition-colors hover:border-white/[0.12]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                  <p className="text-xs font-medium text-[#9CA3AF] mt-1">{stat.label}</p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">{stat.trend}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111827] p-5 transition-all hover:border-[#7C3AED]/30 hover:shadow-[0_0_24px_rgba(124,58,237,0.08)]"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${action.color}15`, border: `1px solid ${action.color}30` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: action.color }} />
                    </div>
                    <p className="text-sm font-semibold text-white group-hover:text-[#7C3AED] transition-colors">
                      {action.label}
                    </p>
                    <p className="text-[10px] text-[#6B7280] mt-0.5">{action.desc}</p>
                    <ArrowRight className="absolute top-5 right-5 w-4 h-4 text-[#6B7280] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
              <Link
                href="/problems"
                className="text-[10px] text-[#9CA3AF] hover:text-[#7C3AED] transition-colors flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentActivity.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.status === "solved" ? "bg-[#22C55E]" : "bg-[#F59E0B]"
                      }`}
                    />
                    <span className="text-sm text-white font-medium">{activity.problem}</span>
                    <span className="text-[10px] text-[#6B7280]">Rating {activity.rating}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        activity.status === "solved"
                          ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20"
                          : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                      }`}
                    >
                      {activity.verdict}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}