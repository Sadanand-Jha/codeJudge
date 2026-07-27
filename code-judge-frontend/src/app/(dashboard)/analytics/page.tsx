export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Analytics</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border border-[#E6E7EB] bg-white p-4">
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-2">Problems Solved</div>
          <div className="text-lg font-bold text-[#2563EB]">0</div>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4">
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-2">Success Rate</div>
          <div className="text-lg font-bold text-[#2563EB]">0%</div>
        </div>
      </div>
      <div className="border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ By Difficulty</span>
        </div>
        <div className="p-3 text-[11px] text-[#6B7280]">
          <p>Solve problems to see analytics here.</p>
        </div>
      </div>
    </div>
  );
}