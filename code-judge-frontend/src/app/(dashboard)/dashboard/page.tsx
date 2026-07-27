import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Dashboard</h1>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <div className="text-lg font-bold text-[#2563EB]">0</div>
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">Solved</div>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <div className="text-lg font-bold text-[#2563EB]">0</div>
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">Attempted</div>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <div className="text-lg font-bold text-[#2563EB]">0</div>
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider">Rating</div>
        </div>
      </div>
      <div className="border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ Recent Submissions</span>
        </div>
        <div className="p-3 text-[11px] text-[#6B7280]">
          <p>No submissions yet. <Link href="/problems" className="text-[#2563EB] hover:underline">Start solving!</Link></p>
        </div>
      </div>
    </div>
  );
}