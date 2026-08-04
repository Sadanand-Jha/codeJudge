import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRatingHex(rating: number | null | undefined): string {
  const r = rating ?? 0;
  if (r >= 2400) return "#EF4444";
  if (r >= 2100) return "#F97316";
  if (r >= 1900) return "#7C3AED";
  if (r >= 1600) return "#3B82F6";
  if (r >= 1400) return "#F59E0B";
  if (r >= 1200) return "#22C55E";
  return "#9CA3AF";
}