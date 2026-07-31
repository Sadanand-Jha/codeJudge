import Link from "next/link";
import { Code2, ArrowRight } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "Submissions — ByteClash",
  description: "All submissions on ByteClash.",
};

export default function SubmissionsPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Submissions</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">All your submissions across problems.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#111827]/40">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#111827]">
                  <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">ID</th>
                  <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Problem</th>
                  <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Verdict</th>
                  <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3">
                        <Code2 className="w-5 h-5 text-[#6B7280]" />
                      </div>
                      <p className="text-sm text-[#9CA3AF]">No submissions yet.</p>
                      <Link
                        href="/problems"
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all"
                      >
                        Browse problems <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
