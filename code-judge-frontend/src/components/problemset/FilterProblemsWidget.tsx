export default function FilterProblemsWidget() {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium text-[#6B7280]">Difficulty:</label>
      <div className="flex items-center gap-1">
        <input
          type="text"
          placeholder="Min"
          className="w-full rounded border border-[#E6E7EB] bg-white px-2 py-1 text-[11px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40"
        />
        <span className="text-[11px] text-[#9CA3AF]">—</span>
        <input
          type="text"
          placeholder="Max"
          className="w-full rounded border border-[#E6E7EB] bg-white px-2 py-1 text-[11px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40"
        />
      </div>
      <div className="text-right">
        <button className="text-[10px] text-[#2563EB] hover:underline">Add tag</button>
      </div>
      <div className="flex justify-center pt-1">
        <button className="rounded border border-[#E6E7EB] bg-white px-6 py-1 text-[11px] text-[#6B7280] hover:bg-[#FAFAFB] hover:text-[#111827] transition-colors">
          Apply
        </button>
      </div>
    </div>
  );
}