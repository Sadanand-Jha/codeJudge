"use client";

import RatingBadge from "./RatingBadge";

interface ProblemHeaderProps {
  title: string;
  contestId: string | null;
  problemIndex: string | null;
  rating: number | null;
  source: string | null;
  problemId: string;
}

export default function ProblemHeader({
  title,
  contestId,
  problemIndex,
  rating,
  source,
  problemId,
}: ProblemHeaderProps) {
  const displayTitle = contestId && problemIndex ? `${contestId}${problemIndex} — ${title}` : title;

  return (
    <header className="mb-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-[#111827] md:text-3xl">
        {displayTitle}
      </h1>
      <div className="flex flex-wrap items-center gap-3">
        {rating !== null && <RatingBadge rating={rating} size="md" />}
        {source && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs text-[#6B7280]">
            <span className="opacity-70">Source:</span>
            {source}
          </span>
        )}
        {contestId && problemIndex && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs text-[#6B7280]">
            <span className="opacity-70">{contestId}</span>
            <span className="opacity-50">·</span>
            <span className="font-mono">{problemIndex}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 font-mono text-xs text-[#6B7280]">
          ID: {problemId}
        </span>
      </div>
    </header>
  );
}