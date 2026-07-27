export default function AIHintsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">AI Hints</h1>
      </div>
      <div className="border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ Hints</span>
        </div>
        <div className="p-3 text-[11px] text-[#6B7280]">
          <p>Select a problem to get AI-generated hints and guidance.</p>
        </div>
      </div>
    </div>
  );
}