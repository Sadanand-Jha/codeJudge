import { Lightbulb } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "AI Hints — ByteClash",
  description: "Get AI-powered hints for coding problems.",
};

export default function AIHintsPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Hints</h1>
            <p className="text-sm text-muted-foreground mt-1">Get intelligent hints to solve problems.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
              <h2 className="text-sm font-semibold text-white">Hints</h2>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3">
                <Lightbulb className="w-5 h-5 text-[#6B7280]" />
              </div>
              <p className="text-sm text-muted-foreground">Select a problem to get AI hints.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
