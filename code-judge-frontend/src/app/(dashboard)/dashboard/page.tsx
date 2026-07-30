import Link from "next/link";
import { ArrowRight, Code2, TrendingUp, Flame, CheckCircle2, Clock } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "Dashboard — CodeJudge",
  description: "Your coding activity dashboard on CodeJudge.",
};

const stats = [
  { label: "Solved", value: "0", icon: CheckCircle2, color: "#22C55E" },
  { label: "Attempted", value: "0", icon: Clock, color: "#F59E0B" },
  { label: "Rating", value: "0", icon: TrendingUp, color: "#7C3AED" },
  { label: "Streak", value: "0", icon: Flame, color: "#F59E0B" },
];

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Track your progress and activity.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/[0.06] bg-[#111827] p-5"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                  <p className="text-xs font-medium text-[#9CA3AF] mt-1">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Recent Submissions</h2>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3">
                <Code2 className="w-5 h-5 text-[#6B7280]" />
              </div>
              <p className="text-sm text-[#9CA3AF]">No submissions yet.</p>
              <Link
                href="/problems"
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all"
              >
                Start solving <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
