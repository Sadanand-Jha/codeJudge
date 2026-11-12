"use client";

import Image from "next/image";
import { cn } from "@/lib/helpers";

const OWL_SRC = "/images/quiz/cheerful-owl-study-champion.png";

/**
 * Cheerful owl loader — the student-quiz loading mascot.
 *
 * Renders the "study champion" owl with a gentle bob and twinkling sparkles so
 * every student-facing loading moment (starting an attempt, joining a quiz,
 * verifying access, waiting rooms, results) feels friendly instead of empty.
 * Animation is CSS-only and automatically disabled for reduced-motion users.
 */
export function CheerfulOwlLoader({
  size = 200,
  className,
  caption,
  action,
  label = "Loading",
}: {
  /** Rendered owl width in pixels. Height follows the artwork's 3:2 ratio. */
  size?: number;
  className?: string;
  caption?: React.ReactNode;
  action?: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("flex flex-col items-center gap-4 text-center", className)}
    >
      <div className="relative" style={{ width: size, aspectRatio: "3 / 2" }}>
        <span
          aria-hidden="true"
          className="qs-owl-sparkle left-[3%] top-[22%] h-3 w-3"
          style={{ animationDelay: "0s" }}
        />
        <span
          aria-hidden="true"
          className="qs-owl-sparkle right-[5%] top-[10%] h-2.5 w-2.5"
          style={{ animationDelay: "0.45s" }}
        />
        <span
          aria-hidden="true"
          className="qs-owl-sparkle bottom-[16%] right-[12%] h-2 w-2"
          style={{ animationDelay: "0.9s" }}
        />
        <Image
          src={OWL_SRC}
          alt=""
          fill
          priority
          sizes={`${size}px`}
          className="qs-owl-bob select-none object-contain"
        />
      </div>
      {caption ? (
        <p className="max-w-sm text-sm font-medium leading-6 text-[var(--qs-muted)]">{caption}</p>
      ) : null}
      {action}
      <style>{`
        .qs-owl-bob {
          animation: qs-owl-bob 2.4s ease-in-out infinite;
          transform-origin: 50% 88%;
          will-change: transform;
        }
        .qs-owl-sparkle {
          position: absolute;
          border-radius: 2px;
          background: var(--qs-sun, #f5b93b);
          animation: qs-owl-twinkle 1.9s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @keyframes qs-owl-bob {
          0%, 100% { transform: translateY(0) rotate(-1.5deg); }
          50% { transform: translateY(-9px) rotate(1.5deg); }
        }
        @keyframes qs-owl-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.6) rotate(45deg); }
          50% { opacity: 1; transform: scale(1) rotate(45deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .qs-owl-bob { animation: none; }
          .qs-owl-sparkle { animation: none; opacity: 0.6; transform: rotate(45deg); }
        }
      `}</style>
    </div>
  );
}

export default CheerfulOwlLoader;
