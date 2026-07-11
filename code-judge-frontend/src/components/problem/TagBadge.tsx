"use client";

interface TagBadgeProps {
  tag: string;
}

export default function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-0.5 text-xs font-medium text-zinc-300 transition-colors duration-200 hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400">
      {tag}
    </span>
  );
}