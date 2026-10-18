import Link from "next/link";
import { ArrowLeft, BookOpen, Terminal } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata = buildPublicPageMetadata({
  title: "Documentation",
  description:
    "Guides for creating quizzes, sharing access codes, and tracking results on QuizSupport.",
  path: "/docs",
});

export default function DocsPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Documentation</h1>
            <p className="text-sm text-muted-foreground mt-1">Guides and references for using QuizSupport.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-semibold text-white">Getting Started</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-0.5">•</span>
                Create a quiz: write your questions, mark the correct answers, and publish
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-0.5">•</span>
                Share the quiz access code with your class or group
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-0.5">•</span>
                Join a quiz with its code and get instant results
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-0.5">•</span>
                Track scores and attempt history across devices
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-sm font-semibold text-white">API Reference</h2>
            </div>
            <p className="text-sm text-muted-foreground">API documentation coming soon.</p>
          </div>

          <Link
            href="/quiz"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#7C3AED] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
