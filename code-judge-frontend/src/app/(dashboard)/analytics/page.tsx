import { BarChart3, TrendingUp, Target, Award } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "Analytics — CodeJudge",
  description: "View your coding analytics on CodeJudge.",
};

const stats = [
  { label: "Problems Solved", value: "0", icon: Target, color: "#22C55E" },
  { label: "Success Rate", value: "0%", icon: TrendingUp, color: "#7C3AED" },
  { label: "Avg Attempts", value: "0", icon: BarChart3, color: "#3B82F6" },
  { label: "Best Rating", value: "0", icon: Award, color: "#FBBF24" },
];

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Insights into your coding performance.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-white/[0.06] bg-[#111827] p-5">
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
            <h2 className="text-sm font-semibold text-white mb-4">By Difficulty</h2>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3">
                <BarChart3 className="w-5 h-5 text-[#6B7280]" />
              </div>
              <p className="text-sm text-[#9CA3AF]">Solve problems to see analytics here.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
