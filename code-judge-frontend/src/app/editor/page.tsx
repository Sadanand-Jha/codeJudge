import { Code2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "Code Editor — CodeJudge",
  description: "Online code editor on CodeJudge.",
};

export default function EditorPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Code Editor</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Write and test code online.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-semibold text-white">Editor</h2>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3">
                <Code2 className="w-5 h-5 text-[#6B7280]" />
              </div>
              <p className="text-sm text-[#9CA3AF]">Select a problem to start coding.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
