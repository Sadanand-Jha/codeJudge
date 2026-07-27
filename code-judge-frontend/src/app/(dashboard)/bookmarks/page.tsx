import Link from "next/link";

export default function BookmarksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Bookmarks</h1>
      </div>
      <div className="border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ Saved Problems</span>
        </div>
        <div className="p-3 text-[11px] text-[#6B7280]">
          <p>No bookmarked problems yet. <Link href="/problems" className="text-[#2563EB] hover:underline">Browse problems</Link></p>
        </div>
      </div>
    </div>
  );
}