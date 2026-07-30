export default function Loading() {
  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
          <div className="absolute inset-0 rounded-full border-2 border-[#7C3AED] border-t-transparent animate-spin" />
        </div>
        <p className="text-xs text-[#6B7280]">Loading...</p>
      </div>
    </div>
  );
}
