export default function EditorPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Code Editor</h1>
      </div>
      <div className="border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ Editor</span>
        </div>
        <div className="flex h-[400px] items-center justify-center p-3">
          <div className="text-center">
            <div className="mb-2 text-lg text-[#D1D5DB] font-mono">{`{ / }`}</div>
            <p className="text-[11px] text-[#6B7280]">Select a problem to start coding.</p>
          </div>
        </div>
      </div>
    </div>
  );
}