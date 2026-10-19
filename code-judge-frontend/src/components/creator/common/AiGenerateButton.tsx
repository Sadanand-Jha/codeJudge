"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";

type AiGenerateButtonSize = "sm" | "md" | "lg";

const SIZES: Record<AiGenerateButtonSize, string> = {
  sm: "gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px]",
  md: "gap-2 rounded-[12px] px-4 py-2.5 text-[13px]",
  lg: "gap-2 rounded-[14px] px-6 py-3 text-sm",
};

interface AiGenerateButtonProps {
  label?: string;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  size?: AiGenerateButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * The creator-facing AI action. A violet→pink gradient with a slow shimmer
 * makes AI generation feel distinct (and tempting) without competing with the
 * single primary action on each screen.
 */
export function AiGenerateButton({
  label = "Generate with AI",
  onClick,
  href,
  type = "button",
  size = "md",
  fullWidth = false,
  disabled = false,
  className,
  ariaLabel,
}: AiGenerateButtonProps) {
  const classes = cn(
    "group relative isolate inline-flex items-center justify-center overflow-hidden border-2 border-[var(--qs-ink,#1a1240)] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 font-extrabold text-white shadow-[3px_3px_0_var(--qs-sun,#ffd23f)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    SIZES[size],
    fullWidth && "w-full",
    className
  );

  const content = (
    <>
      <span
        aria-hidden="true"
        className="qs-ai-shimmer pointer-events-none absolute inset-y-0 left-0 -z-10 w-14 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
      />
      <Sparkles className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel ?? label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel ?? label}
    >
      {content}
    </button>
  );
}
