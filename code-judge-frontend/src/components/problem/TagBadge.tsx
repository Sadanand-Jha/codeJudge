"use client";

interface TagBadgeProps {
  tag: string;
}

export default function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E6E7EB] bg-gradient-to-r from-[#F5F5F7] to-[#FFFFFF] px-3 py-1 text-sm font-medium text-[#6B7280] transition-all duration-200 hover:border-[#2563EB]/30 hover:from-[#2563EB]/5 hover:to-[#2563EB]/10 hover:text-[#2563EB]">
      {tag}
    </span>
  );
}