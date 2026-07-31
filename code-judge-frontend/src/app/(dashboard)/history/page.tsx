import Link from "next/link";
import { Code2, ArrowRight } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "Submission History — ByteClash",
  description: "Your submission history on ByteClash.",
};

export default function HistoryPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Submission History</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">All your past submissions.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Submissions</h2>
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
