"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { useCreditState } from "@/hooks/useCreditState";

type GenerateWithAiButtonSize = "sm" | "md" | "lg";

interface GenerateWithAiButtonProps {
  label?: string;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  size?: GenerateWithAiButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  className?: string;
  ariaLabel?: string;
  /** Use "plain" when the caller supplies a fully custom trigger (tiles/callouts). */
  variant?: "button" | "plain";
  children?: ReactNode;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const POPOVER_WIDTH = 320;
const VIEWPORT_GAP = 8;
const POPOVER_ESTIMATED_HEIGHT = 196;

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function placeCreditPopover(
  trigger: { top: number; bottom: number; left: number; width: number },
  viewport: { width: number; height: number },
  popoverHeight = POPOVER_ESTIMATED_HEIGHT
): PopoverPosition {
  const width = Math.min(POPOVER_WIDTH, Math.max(240, viewport.width - VIEWPORT_GAP * 2));
  const centered = trigger.left + trigger.width / 2 - width / 2;
  const left = clamp(centered, VIEWPORT_GAP, Math.max(VIEWPORT_GAP, viewport.width - width - VIEWPORT_GAP));
  const below = trigger.bottom + VIEWPORT_GAP;
  const above = trigger.top - popoverHeight - VIEWPORT_GAP;
  const top =
    below + popoverHeight <= viewport.height - VIEWPORT_GAP
      ? below
      : Math.max(VIEWPORT_GAP, above);
  return { top, left, width };
}

function positionForTrigger(element: HTMLElement, height: number): PopoverPosition {
  const rect = element.getBoundingClientRect();
  return placeCreditPopover(
    { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
    { width: window.innerWidth, height: window.innerHeight },
    height
  );
}

function CreditPopover({
  trigger,
  onClose,
  onNavigate,
}: {
  trigger: RefObject<HTMLAnchorElement | null> | RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const [position, setPosition] = useState<PopoverPosition>(() => {
    const viewport =
      typeof window === "undefined"
        ? { width: POPOVER_WIDTH + VIEWPORT_GAP * 2, height: 640 }
        : { width: window.innerWidth, height: window.innerHeight };
    return placeCreditPopover(
      { top: 80, bottom: 112, left: 16, width: 120 },
      viewport
    );
  });

  useIsomorphicLayoutEffect(() => {
    const element = trigger.current;
    if (element) {
      setPosition(
        positionForTrigger(element, ref.current?.offsetHeight ?? POPOVER_ESTIMATED_HEIGHT)
      );
    }
    ref.current?.focus();
  }, [trigger]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        trigger.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || trigger.current?.contains(target)) return;
      onClose();
    };
    const onViewportChange = () => {
      const element = trigger.current;
      if (!element) return;
      setPosition(
        positionForTrigger(element, ref.current?.offsetHeight ?? POPOVER_ESTIMATED_HEIGHT)
      );
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [onClose, trigger]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      tabIndex={-1}
      className="fixed z-[240] rounded-[16px] border-2 border-[var(--qs-credit-chip-border)] bg-[var(--qs-credit-surface)] p-4 text-left text-[var(--qs-ink)] shadow-[6px_6px_0_var(--qs-credit-accent)] outline-none"
      style={{ top: position.top, left: position.left, width: position.width }}
    >
      <p
        id={titleId}
        className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--qs-credit-chip-text)]"
      >
        Out of credits
      </p>
      <p id={bodyId} className="mt-1.5 text-[13px] font-medium leading-5 text-[var(--qs-ink)]">
        Refuel your credits to generate quizzes with AI. Credits stay valid for 6 months.
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <a
          href="/creator/billing/credits"
          onClick={onNavigate}
          className="inline-flex min-h-9 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-1.5 text-[12px] font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-credit-accent)] transition-transform hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--qs-brand)] active:translate-y-0 active:shadow-none"
        >
          Buy credits
        </a>
        <a
          href="/creator/billing/transactions"
          onClick={onNavigate}
          className="inline-flex min-h-9 items-center justify-center rounded-[10px] border-2 border-[var(--qs-credit-chip-border)] bg-[var(--qs-credit-surface)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--qs-credit-chip-text)] transition-colors hover:bg-[var(--qs-credit-card)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--qs-brand)]"
        >
          History
        </a>
      </div>
    </div>,
    document.body
  );
}

/**
 * The one AI action used across Creator Studio. Every trigger that starts an
 * AI generation uses this button, so the zero-credit popover cannot be
 * bypassed by a newer entry point.
 */
export function GenerateWithAiButton({
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
  variant = "button",
  children,
}: GenerateWithAiButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { state } = useCreditState();
  const empty = state === "empty";

  const baseClasses = cn(
    variant === "button" && "b b-ai",
    variant === "button" && size === "sm" && "sm",
    variant === "button" && size === "lg" && "lg",
    fullWidth && "b-full",
    empty && variant === "plain" && "cursor-not-allowed opacity-60 saturate-50",
    className
  );

  const handleComingSoon = () => {
    toast.info({
      title: "Coming soon",
      description: "AI quiz generation is not available yet.",
    });
  };

  const handleActivate = (event: MouseEvent<HTMLElement>) => {
    if (comingSoon) {
      event.preventDefault();
      handleComingSoon();
      return;
    }
    if (empty) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (onClick) onClick();
  };

  const closePopover = useCallback(() => setOpen(false), []);

  const triggerProps = {
    "aria-label": ariaLabel ?? label,
    "aria-disabled": empty || disabled || comingSoon ? ("true" as const) : undefined,
    "aria-expanded": empty ? open : undefined,
    "aria-haspopup": empty ? ("dialog" as const) : undefined,
    "data-credit-state": empty ? "empty" : undefined,
    className: baseClasses,
  };

  const content = children ?? <span>{label}</span>;

  return (
    <>
      {href ? (
        <a
          {...triggerProps}
          ref={anchorRef}
          href={href}
          onClick={handleActivate}
          tabIndex={disabled ? -1 : undefined}
        >
          {content}
        </a>
      ) : (
        <button
          {...triggerProps}
          ref={buttonRef}
          type={type}
          onClick={handleActivate}
          disabled={disabled && !empty}
        >
          {content}
        </button>
      )}
      {open && typeof document !== "undefined" && (
        <CreditPopover
          trigger={href ? anchorRef : buttonRef}
          onClose={closePopover}
          onNavigate={closePopover}
        />
      )}
    </>
  );
}

/** Backward-compatible alias for older imports. */
export const AiGenerateButton = GenerateWithAiButton;
