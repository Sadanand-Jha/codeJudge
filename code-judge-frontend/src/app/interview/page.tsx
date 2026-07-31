import Link from "next/link";
import { ArrowRight, BookOpen, Brain, Building2, Users } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "Interview Preparation — ByteClash",
  description: "Prepare for coding interviews with ByteClash.",
};

const categories = [
  { title: "Data Structures", desc: "Arrays, Linked Lists, Trees, Graphs", icon: BookOpen, color: "#7C3AED", href: "/problems?tag=Data+Structures" },
  { title: "Algorithms", desc: "Sorting, DP, Graph Algorithms", icon: Brain, color: "#3B82F6", href: "/problems?tag=Algorithms" },
  { title: "System Design", desc: "Coming soon", icon: Building2, color: "#F59E0B", href: "#" },
  { title: "Mock Interviews", desc: "Coming soon", icon: Users, color: "#22C55E", href: "#" },
];

export default function InterviewPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Interview Preparation</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Structured practice for coding interviews.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group rounded-2xl border border-white/[0.06] bg-[#111827] p-5 transition-all hover:border-[#7C3AED]/30 hover:shadow-[0_0_24px_rgba(124,58,237,0.08)]"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}30` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white group-hover:text-[#7C3AED] transition-colors">{cat.title}</p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">{cat.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#6B7280] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
