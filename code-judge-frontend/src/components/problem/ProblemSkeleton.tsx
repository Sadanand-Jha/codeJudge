"use client";

export default function ProblemSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <div className="mb-6 h-4 w-48 animate-pulse rounded bg-[#E5E7EB]" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] xl:gap-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-[#E5E7EB]" />
            <div className="flex flex-wrap gap-3">
              <div className="h-6 w-28 animate-pulse rounded-md bg-[#E5E7EB]" />
              <div className="h-6 w-36 animate-pulse rounded-md bg-[#E5E7EB]" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-4 w-full animate-pulse rounded bg-[#E5E7EB]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-[#E5E7EB]" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-[#E5E7EB]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#E5E7EB]" />
          </div>
          <div className="space-y-3">
            <div className="h-5 w-16 animate-pulse rounded bg-[#E5E7EB]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#E5E7EB]" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-[#E5E7EB]" />
          </div>
          <div className="space-y-3">
            <div className="h-5 w-20 animate-pulse rounded bg-[#E5E7EB]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#E5E7EB]" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-[#E5E7EB]" />
          </div>
          <div className="space-y-3">
            <div className="h-5 w-24 animate-pulse rounded bg-[#E5E7EB]" />
            <div className="h-20 w-full animate-pulse rounded-lg bg-[#E5E7EB]/60" />
          </div>
        </div>
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="h-72 animate-pulse rounded-xl bg-[#E5E7EB]/60" />
        </div>
      </div>
    </div>
  );
}