import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Hero Section */}
      <div className="mb-6 border border-[#E6E7EB] bg-white p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[#111827]">CodeJudge</h1>
        <p className="mb-4 text-sm text-[#6B7280]">
          AI-powered competitive programming platform. Practice, compete, and improve.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/problems"
            className="rounded border border-[#2563EB] bg-[#2563EB] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1D4ED8] transition-colors"
          >
            Problemset
          </Link>
          <Link
            href="/contests"
            className="rounded border border-[#E6E7EB] bg-white px-4 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#111827] hover:border-[#D1D5E0] transition-colors"
          >
            Contests
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <div className="text-lg font-bold text-[#2563EB]">2,500+</div>
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">Problems</div>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <div className="text-lg font-bold text-[#2563EB]">50+</div>
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">Contests</div>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <div className="text-lg font-bold text-[#2563EB]">10,000+</div>
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">Users</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ Recent Activity</span>
        </div>
        <div className="p-3 text-[11px] text-[#6B7280]">
          <p>Welcome to CodeJudge! Start solving problems to see your activity here.</p>
        </div>
      </div>
    </div>
  );
}