import { MessageSquare } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "AI Feedback — ByteClash",
  description: "Get AI-powered code reviews and feedback.",
};

export default function AIFeedbackPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Feedback</h1>
            <p className="text-sm text-muted-foreground mt-1">Get detailed code reviews from AI.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-semibold text-white">Code Reviews</h2>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-[#6B7280]" />
              </div>
              <p className="text-sm text-muted-foreground">Submit a solution to get AI feedback.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
