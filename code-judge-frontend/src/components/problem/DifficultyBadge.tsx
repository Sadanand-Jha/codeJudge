"use client";

interface DifficultyBadgeProps {
  rating: number | null;
}

function getDifficulty(rating: number | null): { label: string; color: string; bg: string; border: string } {
  if (rating === null) return { label: "Unrated", color: "text-[#6B7280]", bg: "bg-[#F3F4F6]", border: "border-[#E6E7EB]" };
  if (rating < 1200) return { label: "Easy", color: "text-[#16A34A]", bg: "bg-[#16A34A]/10", border: "border-[#16A34A]/20" };
  if (rating < 1600) return { label: "Medium", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10", border: "border-[#F59E0B]/20" };
  if (rating < 2100) return { label: "Hard", color: "text-[#DC2626]", bg: "bg-[#DC2626]/10", border: "border-[#DC2626]/20" };
  return { label: "Expert", color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10", border: "border-[#8B5CF6]/20" };
}

export default function DifficultyBadge({ rating }: DifficultyBadgeProps) {
  const { label, color, bg, border } = getDifficulty(rating);
  
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${color} ${bg} ${border}`}>
      {label}
    </span>
  );
}