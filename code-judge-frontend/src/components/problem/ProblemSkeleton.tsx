"use client";

export default function ProblemSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading problem">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="app-skeleton h-8 w-3/4 rounded" />
        <div className="flex gap-3">
          <div className="app-skeleton h-8 w-24 rounded-full" />
          <div className="app-skeleton h-8 w-20 rounded-full" />
          <div className="app-skeleton h-8 w-16 rounded-full" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        <div className="app-skeleton h-4 w-full rounded" />
        <div className="app-skeleton h-4 w-5/6 rounded" />
        <div className="app-skeleton h-4 w-4/6 rounded" />
        <div className="app-skeleton h-4 w-full rounded" />
        <div className="app-skeleton h-4 w-3/4 rounded" />
      </div>
    </div>
  );
}

export function TabSkeleton() {
  return (
    <div className="flex gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="app-skeleton h-10 w-24 rounded-xl" />
      ))}
    </div>
  );
}

export function SubmissionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="app-skeleton h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="app-skeleton h-4 w-32 rounded" />
        <div className="app-skeleton h-3 w-24 rounded" />
      </div>
      <div className="app-skeleton h-6 w-20 rounded-full" />
    </div>
  );
}

export function DiscussionCardSkeleton() {
  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="app-skeleton h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="app-skeleton h-4 w-3/4 rounded" />
          <div className="app-skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="app-skeleton h-3 w-full rounded" />
      <div className="app-skeleton h-3 w-5/6 rounded" />
    </div>
  );
}
