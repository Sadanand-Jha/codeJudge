"use client";

interface RatingBadgeProps {
  rating: number | null;
  size?: "sm" | "md";
}

// Codeforces rating colors - kept for proper rating display
import { getRatingHex } from "@/lib/helpers";

function getRatingColor(rating: number | null): string {
  const hex = getRatingHex(rating);
  const map: Record<string, string> = {
    "#9CA3AF": "text-[#9CA3AF]",
    "#22C55E": "text-[#22C55E]",
    "#F59E0B": "text-[#F59E0B]",
    "#3B82F6": "text-[#3B82F6]",
    "#7C3AED": "text-[#7C3AED]",
    "#F97316": "text-[#F97316]",
    "#EF4444": "text-[#EF4444]",
  };
  return map[hex] ?? "text-[#9CA3AF]";
}

function getRatingBg(rating: number | null): string {
  const hex = getRatingHex(rating);
  const map: Record<string, string> = {
    "#9CA3AF": "bg-[#F3F4F6]",
    "#22C55E": "bg-[#22C55E]/10",
    "#F59E0B": "bg-[#F59E0B]/10",
    "#3B82F6": "bg-[#3B82F6]/10",
    "#7C3AED": "bg-[#7C3AED]/10",
    "#F97316": "bg-[#F97316]/10",
    "#EF4444": "bg-[#EF4444]/10",
  };
  return map[hex] ?? "bg-[#F3F4F6]";
}

function getRatingBorder(rating: number | null): string {
  const hex = getRatingHex(rating);
  const map: Record<string, string> = {
    "#9CA3AF": "border-[#E5E7EB]",
    "#22C55E": "border-[#22C55E]/20",
    "#F59E0B": "border-[#F59E0B]/20",
    "#3B82F6": "border-[#3B82F6]/20",
    "#7C3AED": "border-[#7C3AED]/20",
    "#F97316": "border-[#F97316]/20",
    "#EF4444": "border-[#EF4444]/20",
  };
  return map[hex] ?? "border-[#E5E7EB]";
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