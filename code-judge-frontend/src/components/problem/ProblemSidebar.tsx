"use client";

import Link from "next/link";
import DifficultyBadge from "./DifficultyBadge";
import RatingBadge from "./RatingBadge";
import TagBadge from "./TagBadge";

interface ProblemSidebarProps {
  rating: number | null;
  timeLimitMs: number;
  memoryLimitMb: number;
  contestId: string | null;
  source: string | null;
  problemId: string;
  tags: string[];
}

function formatTime(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
  return `${mb}MB`;
}

export default function ProblemSidebar({
  rating,
  timeLimitMs,
  memoryLimitMb,
  contestId,
  source,
  problemId,
  tags,
}: ProblemSidebarProps) {
  return (
    <aside className="space-y-4">
      {/* Problem Information Card */}
      <div className="card-premium p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#6B7280]">
          Problem Information
        </h3>
        <div className="space-y-3">
          <InfoRow label="Rating" value={rating !== null ? rating.toString() : "Unrated"} />
          <InfoRow label="Time Limit" value={formatTime(timeLimitMs)} />
          <InfoRow label="Memory Limit" value={formatMemory(memoryLimitMb)} />
          {contestId && <InfoRow label="Contest" value={contestId} />}
          {source && <InfoRow label="Source" value={source} />}
          <InfoRow label="Problem ID" value={problemId} mono />
        </div>
        {tags.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#6B7280]">
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Link
          href={`/problems/${problemId}/editor`}
          className="btn-primary flex w-full items-center justify-center gap-2 py-3"
        >
          Solve Problem
        </Link>
        <button className="btn-secondary w-full py-3">
          Run Code
        </button>
        <button className="btn-gradient flex w-full items-center justify-center gap-2 py-3">
          Ask AI Coach
        </button>
      </div>

      {/* Navigation Links */}
      <div className="space-y-2">
        <NavItem label="Editorial" disabled />
        <NavItem label="Discussion" disabled />
        <NavItem label="Accepted Solutions" disabled />
        <NavItem label="Related Problems" disabled />
      </div>
    </aside>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

function InfoRow({ label, value, mono }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#6B7280]">{label}</span>
      <span className={`text-sm font-medium text-[#111827] ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

interface NavItemProps {
  label: string;
  disabled?: boolean;
}

function NavItem({ label, disabled }: NavItemProps) {
  return (
    <button
      disabled={disabled}
      className="w-full rounded-xl border border-[#E6E7EB] bg-white px-4 py-3 text-left text-sm font-medium text-[#6B7280] transition-all hover:border-[#D1D5E0] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}