import Link from "next/link";
import { ArrowLeft, BookOpen, Code2, Terminal } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "Documentation — ByteClash",
  description: "ByteClash documentation and guides.",
};

export default function DocsPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Documentation</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Guides and references for using ByteClash.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-semibold text-white">Getting Started</h2>
            </div>
            <ul className="space-y-2 text-sm text-[#9CA3AF]">
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-0.5">•</span>
                Browse problems in the <Link href="/problems" className="text-[#7C3AED] hover:underline">Problemset</Link>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-0.5">•</span>
                Submit solutions using the built-in editor
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-0.5">•</span>
                Track your progress on your profile
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7C3AED] mt-0.5">•</span>
                Join contests to compete with others
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-sm font-semibold text-white">API Reference</h2>
            </div>
            <p className="text-sm text-[#9CA3AF]">API documentation coming soon.</p>
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
