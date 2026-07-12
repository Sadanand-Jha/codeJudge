"use client";

import TagBadge from "./TagBadge";
import RatingBadge from "./RatingBadge";

interface ProblemInfoCardProps {
  rating: number | null;
  timeLimitMs: number;
  memoryLimitMb: number;
  contestId: string | null;
  source: string | null;
  problemId: string;
  tags: string[];
}

function formatTime(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${ms} ms`;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export default function ProblemInfoCard({
  rating,
  timeLimitMs,
  memoryLimitMb,
  contestId,
  source,
  problemId,
  tags,
}: ProblemInfoCardProps) {
  return (
    <aside className="rounded-xl border border-[#E5E7EB] bg-white">
      <div className="border-b border-[#E5E7EB] px-5 py-4">
        <h3 className="text-sm font-semibold text-[#111827]">Problem Information</h3>
      </div>
      <div className="space-y-0 divide-y divide-[#E5E7EB]/80">
        <InfoRow label="Rating" value={rating !== null ? `${rating}` : "Unrated"}>
          {rating !== null && <RatingBadge rating={rating} size="sm" />}
        </InfoRow>
        <InfoRow label="Time Limit" value={formatTime(timeLimitMs)} />
        <InfoRow label="Memory Limit" value={formatMemory(memoryLimitMb)} />
        {contestId && <InfoRow label="Contest" value={contestId} />}
        {source && <InfoRow label="Source" value={source} />}
        <InfoRow label="Problem ID" value={problemId} mono />
      </div>
      {tags.length > 0 && (
        <div className="border-t border-[#E5E7EB] px-5 py-4">
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
            Tags
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
  children?: React.ReactNode;
}

function InfoRow({ label, value, mono, children }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-xs text-[#9CA3AF]">{label}</span>
      <div className="flex items-center gap-2">
        {children || (
          <span
            className={`text-xs font-medium text-[#111827] ${
              mono ? "font-mono tracking-tight" : ""
            }`}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}