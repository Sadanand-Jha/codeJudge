export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Skeleton Hero */}
      <div className="mb-6 border border-[#E6E7EB] bg-white p-6 text-center">
        <div className="mx-auto mb-2 h-7 w-48 animate-pulse rounded bg-[#E6E7EB]" />
        <div className="mx-auto mb-4 h-4 w-80 animate-pulse rounded bg-[#E6E7EB]" />
        <div className="flex items-center justify-center gap-3">
          <div className="h-7 w-24 animate-pulse rounded bg-[#E6E7EB]" />
          <div className="h-7 w-24 animate-pulse rounded bg-[#E6E7EB]" />
        </div>
      </div>

      {/* Skeleton Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-[#E6E7EB] bg-white p-4 text-center">
            <div className="mx-auto mb-1 h-6 w-16 animate-pulse rounded bg-[#E6E7EB]" />
            <div className="mx-auto h-3 w-20 animate-pulse rounded bg-[#E6E7EB]" />
          </div>
        ))}
      </div>

      {/* Skeleton Activity */}
      <div className="mt-6 border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <div className="h-3 w-28 animate-pulse rounded bg-[#E6E7EB]" />
        </div>
        <div className="p-3">
          <div className="h-3 w-72 animate-pulse rounded bg-[#E6E7EB]" />
        </div>
      </div>

      {/* Loading indicator */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#6B7280]">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        Loading...
      </div>
    </div>
  );
}