"use client";

interface RatingBadgeProps {
  rating: number | null;
  size?: "sm" | "md";
}

// Codeforces rating colors - kept for proper rating display
function getRatingColor(rating: number | null): string {
  if (rating === null) return "text-[#9CA3AF]";
  if (rating < 1000) return "text-[#9CA3AF]";
  if (rating < 1200) return "text-[#10B981]";
  if (rating < 1400) return "text-[#06B6D4]";
  if (rating < 1600) return "text-[#2563EB]";
  if (rating < 1900) return "text-[#8B5CF6]";
  if (rating < 2100) return "text-[#F59E0B]";
  if (rating < 2400) return "text-[#EF4444]";
  return "text-[#FBBF24]";
}

function getRatingBg(rating: number | null): string {
  if (rating === null) return "bg-[#F3F4F6]";
  if (rating < 1000) return "bg-[#F3F4F6]";
  if (rating < 1200) return "bg-[#10B981]/10";
  if (rating < 1400) return "bg-[#06B6D4]/10";
  if (rating < 1600) return "bg-[#2563EB]/10";
  if (rating < 1900) return "bg-[#8B5CF6]/10";
  if (rating < 2100) return "bg-[#F59E0B]/10";
  if (rating < 2400) return "bg-[#EF4444]/10";
  return "bg-[#FBBF24]/10";
}

function getRatingBorder(rating: number | null): string {
  if (rating === null) return "border-[#E5E7EB]";
  if (rating < 1000) return "border-[#E5E7EB]";
  if (rating < 1200) return "border-[#10B981]/20";
  if (rating < 1400) return "border-[#06B6D4]/20";
  if (rating < 1600) return "border-[#2563EB]/20";
  if (rating < 1900) return "border-[#8B5CF6]/20";
  if (rating < 2100) return "border-[#F59E0B]/20";
  if (rating < 2400) return "border-[#EF4444]/20";
  return "border-[#FBBF24]/20";
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

export default function RatingBadge({ rating, size = "sm" }: RatingBadgeProps) {
  const colorClass = getRatingColor(rating);
  const bgClass = getRatingBg(rating);
  const borderClass = getRatingBorder(rating);
  const label = getRatingLabel(rating);

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${colorClass} ${bgClass} ${borderClass}`}
      >
        {rating !== null ? rating : "—"}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${colorClass} ${bgClass} ${borderClass}`}
    >
      <span className="font-mono">{rating !== null ? rating : "—"}</span>
      <span className={`opacity-60 ${rating === null ? "hidden" : ""}`}>·</span>
      <span className={`font-medium ${rating === null ? "hidden" : ""}`}>
        {label}
      </span>
    </span>
  );
}