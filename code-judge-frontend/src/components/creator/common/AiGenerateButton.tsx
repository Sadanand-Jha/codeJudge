"use client";

import Link from "next/link";
import { cn } from "@/lib/helpers";

type AiGenerateButtonSize = "sm" | "md" | "lg";

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
 * The creator-facing AI action. Uses the AI variant of the button family:
 * flat brand fill, ink border, hard sun shadow and the built-in spark badge.
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
    "b b-ai",
    size === "sm" && "sm",
    size === "lg" && "lg",
    fullWidth && "b-full",
    className
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes} aria-label={ariaLabel ?? label}>
        <span>{label}</span>
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
      <span>{label}</span>
    </button>
  );
}
