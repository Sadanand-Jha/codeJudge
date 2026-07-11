"use client";

interface RatingBadgeProps {
  rating: number | null;
}

function getRatingColor(rating: number | null): string {
  if (rating === null) return "border-zinc-700/50 text-zinc-400 bg-zinc-800/50";
  if (rating < 1000) return "border-zinc-600/50 text-zinc-300 bg-zinc-800/50";
  if (rating < 1200) return "border-green-700/50 text-green-400 bg-green-950/30";
  if (rating < 1400) return "border-cyan-700/50 text-cyan-400 bg-cyan-950/30";
  if (rating < 1600) return "border-blue-700/50 text-blue-400 bg-blue-950/30";
  if (rating < 1900) return "border-purple-700/50 text-purple-400 bg-purple-950/30";
  if (rating < 2100) return "border-orange-700/50 text-orange-400 bg-orange-950/30";
  if (rating < 2400) return "border-red-700/50 text-red-400 bg-red-950/30";
  return "border-amber-500/50 text-amber-300 bg-amber-950/30";
}

function getRatingLabel(rating: number | null): string {
  if (rating === null) return "Unrated";
  if (rating < 1000) return "Newbie";
  if (rating < 1200) return "Pupil";
  if (rating < 1400) return "Specialist";
  if (rating < 1600) return "Expert";
  if (rating < 1900) return "Candidate Master";
  if (rating < 2100) return "Master";
  if (rating < 2400) return "International Master";
  return "Legendary Grandmaster";
}

export default function RatingBadge({ rating }: RatingBadgeProps) {
  const colorClasses = getRatingColor(rating);
  const label = getRatingLabel(rating);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors duration-200 ${colorClasses}`}
    >
      {rating !== null ? <>{rating}</> : null}
      <span className="opacity-70">·</span>
      {label}
    </span>
  );
}