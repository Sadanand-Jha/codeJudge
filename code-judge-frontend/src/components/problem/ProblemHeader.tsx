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
      <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
        {displayTitle}
      </h1>
      <div className="flex flex-wrap items-center gap-3">
        {rating !== null && <RatingBadge rating={rating} size="md" />}
        {source && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-text-secondary">
            <span className="opacity-70">Source:</span>
            {source}
          </span>
        )}
        {contestId && problemIndex && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-text-secondary">
            <span className="opacity-70">{contestId}</span>
            <span className="opacity-50">·</span>
            <span className="font-mono">{problemIndex}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-text-secondary">
          ID: {problemId}
        </span>
      </div>
    </header>
  );
}