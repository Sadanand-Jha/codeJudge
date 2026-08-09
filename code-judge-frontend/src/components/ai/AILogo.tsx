"use client";

import { cn } from "@/lib/helpers";

type Variant = "mono" | "accent";
type Size = "xs" | "sm" | "md" | "lg";

const sizeMap: Record<Size, string> = {
  xs: "h-4 w-4", // 16px
  sm: "h-5 w-5", // 20px
  md: "h-6 w-6", // 24px
  lg: "h-7 w-7", // 28px — for the Thinking header
};

/**
 * Our own AI Assistant mark: an asymmetric "crystal spark".
 *
 * Concept:
 *  - a central faceted diamond core
 *  - 5 asymmetric crystalline rays radiating from the core
 *  - 2 micro "spark" fragments orbiting the core
 *  - rounded, modern edges — reads as intelligence + energy + creation
 *
 * It is deliberately NOT a generic sparkle / cracker / flower symbol and is
 * built to be recognizable at 16–32px. `currentColor` is only used on the mono
 * variant (set via the outer `text-*` color, so it adapts to dark/light and the
 * surrounding text contrast); the accent variant uses explicit gradient colors.
 */
export default function AILogo({
  variant = "mono",
  size = "md",
  className,
  animate = false,
  style,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}) {
  const isAccent = variant === "accent";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        sizeMap[size],
        "shrink-0",
        isAccent ? "text-pink-500" : "text-text-muted",
        animate && "animate-pulse",
        className
      )}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="ai-accent-core" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#F8B5D6" />
          <stop offset="100%" stopColor="#8A4FFF" />
        </radialGradient>
        <filter id="ai-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="ai-spark" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#F8B5D6" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#F8B5D6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Rays (behind the core) — asymmetric crystal facets. White so they read on
          dark gradients, light themes, and the pink→purple avatar alike. */}
      <g
        strokeWidth={1}
        strokeLinecap="round"
        stroke={isAccent ? "#ffffff" : "currentColor"}
        opacity={isAccent ? 0.8 : 0.55}
      >
        <line x1="12" y1="12" x2="12" y2="5.5" transform="rotate(-22 12 12)" />
        <line x1="12" y1="12" x2="16.5" y2="12" transform="rotate(18 12 12)" />
        <line x1="12" y1="12" x2="9" y2="16.2" transform="rotate(100 12 12)" />
        <line x1="12" y1="12" x2="15" y2="16.2" transform="rotate(230 12 12)" />
        <line x1="12" y1="12" x2="7.8" y2="15" transform="rotate(300 12 12)" />
      </g>

      {/* Core diamond (centered on 12,12 where the rays converge) */}
      <polygon
        points="12,7 16,12 12,17 8,12"
        fill={isAccent ? "url(#ai-accent-core)" : "currentColor"}
        opacity={isAccent ? 1 : 0.9}
        filter={isAccent ? "url(#ai-soft-glow)" : undefined}
      />

      {/* Orbiting spark fragments — accent only, for a "live" feel */}
      {isAccent && (
        <>
          <circle cx="17" cy="7" r="1.9" fill="url(#ai-spark)" />
          <circle cx="6.5" cy="16.2" r="1.3" fill="#ffffffa0" />
        </>
      )}
    </svg>
  );
}
