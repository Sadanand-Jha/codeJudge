"use client";

export default function ProblemSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 h-4 w-48 animate-pulse rounded bg-zinc-800" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] xl:gap-10">
        {/* Main content skeleton */}
        <div className="space-y-8">
          {/* Header skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-zinc-800" />
            <div className="flex flex-wrap gap-3">
              <div className="h-6 w-28 animate-pulse rounded-md bg-zinc-800" />
              <div className="h-6 w-36 animate-pulse rounded-md bg-zinc-800" />
            </div>
          </div>

          {/* Statement skeleton */}
          <div className="space-y-4">
            <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
          </div>

          {/* Input skeleton */}
          <div className="space-y-3">
            <div className="h-5 w-16 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-800" />
          </div>

          {/* Output skeleton */}
          <div className="space-y-3">
            <div className="h-5 w-20 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-800" />
          </div>

          {/* Constraints skeleton */}
          <div className="space-y-3">
            <div className="h-5 w-24 animate-pulse rounded bg-zinc-800" />
            <div className="h-20 w-full animate-pulse rounded-lg bg-zinc-800/60" />
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="h-72 animate-pulse rounded-xl bg-zinc-800/60" />
        </div>
      </div>
    </div>
  );
}