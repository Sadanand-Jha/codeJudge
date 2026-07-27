export default function AIChatPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">AI Chat</h1>
      </div>
      <div className="border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ Chat</span>
        </div>
        <div className="flex h-[400px] items-center justify-center p-3">
          <div className="text-center">
            <p className="text-[11px] text-[#6B7280]">Ask AI about problems, algorithms, or concepts.</p>
            <p className="mt-1 text-[10px] text-[#9CA3AF]">Chat feature coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}