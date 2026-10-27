"use client";

import Link from "next/link";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { requireAiCreditsOrNotify } from "@/store/aiCreditsStore";

type AiGenerateButtonSize = "sm" | "md" | "lg";

interface AiGenerateButtonProps {
  label?: string;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  size?: AiGenerateButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
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
  comingSoon = false,
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

  if (comingSoon) {
    return (
      <button
        type="button"
        aria-disabled="true"
        onClick={() =>
          toast.info({
            title: "Coming soon",
            description: "AI quiz generation is not available yet.",
          })
        }
        className={cn(classes, "cursor-not-allowed", fullWidth && "w-full")}
        aria-label={ariaLabel ?? label}
      >
        <span>{label}</span>
      </button>
    );
  }

  const notifyIfNeeded = () => {
    requireAiCreditsOrNotify();
  };

  if (href && !disabled) {
    return (
      <Link
        href={href}
        onClick={notifyIfNeeded}
        className={classes}
        aria-label={ariaLabel ?? label}
      >
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={() => {
        notifyIfNeeded();
        onClick?.();
      }}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel ?? label}
    >
      <span>{label}</span>
    </button>
  );
}
