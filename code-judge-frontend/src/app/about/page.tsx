import Link from "next/link";
import { ArrowLeft, Code2, Trophy, Users, Sparkles } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "About — CodeJudge",
  description: "Learn about CodeJudge, the AI-powered competitive programming platform.",
};

const features = [
  { icon: Code2, title: "12,000+ Problems", desc: "From beginner to expert level challenges", color: "#7C3AED" },
  { icon: Trophy, title: "Weekly Contests", desc: "Compete with coders worldwide", color: "#FBBF24" },
  { icon: Users, title: "Active Community", desc: "10,000+ competitive programmers", color: "#3B82F6" },
  { icon: Sparkles, title: "AI Powered", desc: "Get hints, feedback, and code reviews", color: "#22C55E" },
];

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">About CodeJudge</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">AI-powered competitive programming platform.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6">
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              CodeJudge is a modern competitive programming platform designed to help you improve your algorithmic
              thinking and problem-solving skills. Practice with thousands of problems, compete in contests, and
              get AI-powered assistance to accelerate your learning.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-white/[0.06] bg-[#111827] p-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${f.color}15`, border: `1px solid ${f.color}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">{f.desc}</p>
                </div>
              );
            })}
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#7C3AED] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
