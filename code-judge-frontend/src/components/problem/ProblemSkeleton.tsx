"use client";

import { motion } from "framer-motion";

export default function ProblemSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-3/4 rounded bg-white/[0.06]" />
        <div className="flex gap-3">
          <div className="h-8 w-24 rounded-full bg-white/[0.06]" />
          <div className="h-8 w-20 rounded-full bg-white/[0.06]" />
          <div className="h-8 w-16 rounded-full bg-white/[0.06]" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-white/[0.06]" />
        <div className="h-4 w-5/6 rounded bg-white/[0.06]" />
        <div className="h-4 w-4/6 rounded bg-white/[0.06]" />
        <div className="h-4 w-full rounded bg-white/[0.06]" />
        <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
      </div>
    </div>
  );
}

export function TabSkeleton() {
  return (
    <div className="flex gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 w-24 rounded-xl bg-white/[0.06]" />
      ))}
    </div>
  );
}

export function SubmissionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="h-10 w-10 rounded-full bg-white/[0.06]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-white/[0.06]" />
        <div className="h-3 w-24 rounded bg-white/[0.06]" />
      </div>
      <div className="h-6 w-20 rounded-full bg-white/[0.06]" />
    </div>
  );
}

export function DiscussionCardSkeleton() {
  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-white/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
          <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-white/[0.06]" />
      <div className="h-3 w-5/6 rounded bg-white/[0.06]" />
    </div>
  );
}