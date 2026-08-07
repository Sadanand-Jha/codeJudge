import Link from "next/link";
import { Bookmark, ArrowRight } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "Bookmarks — ByteClash",
  description: "Your bookmarked problems on ByteClash.",
};

export default function BookmarksPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Bookmarks</h1>
            <p className="text-sm text-muted-foreground mt-1">Problems you&apos;ve saved for later.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Saved Problems</h2>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3">
                <Bookmark className="w-5 h-5 text-[#6B7280]" />
              </div>
              <p className="text-sm text-muted-foreground">No bookmarked problems yet.</p>
              <Link
                href="/problems"
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all"
              >
                Browse problems <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
