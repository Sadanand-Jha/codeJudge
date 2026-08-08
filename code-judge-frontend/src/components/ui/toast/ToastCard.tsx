"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { ToastIcon } from "./ToastIcons";
import type { ToastItem } from "@/types/toast";
import { useToastStore } from "@/store/toastStore";

interface ToastCardProps {
  toast: ToastItem;
}

const borderColorMap: Record<string, string> = {
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  loading: "#7C3AED",
};

const glowColorMap: Record<string, string> = {
  success: "rgba(34, 197, 94, 0.12)",
  error: "rgba(239, 68, 68, 0.15)",
  warning: "rgba(245, 158, 11, 0.12)",
  info: "rgba(59, 130, 246, 0.12)",
  loading: "rgba(124, 58, 237, 0.12)",
};

const SWIPE_THRESHOLD = 80;

export function ToastCard({ toast }: ToastCardProps) {
  const removeToast = useToastStore((s) => s.removeToast);
  const pauseToast = useToastStore((s) => s.pauseToast);
  const resumeToast = useToastStore((s) => s.resumeToast);

  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(toast.createdAt);
  const elapsedRef = useRef<number>(0);

  const isPersistent =
    toast.duration === 0 || toast.duration === Infinity || toast.type === "loading";

  const dismiss = useCallback(() => {
    removeToast(toast.id);
  }, [removeToast, toast.id]);

  // Auto-dismiss timer with requestAnimationFrame.
  // Uses Date.now() consistently: toast.createdAt is Date.now()-based, while the
  // rAF timestamp (performance.now) uses a different time base that would break
  // the elapsed calculation and prevent auto-dismissing.
  useEffect(() => {
    if (isPersistent) return;

    // Re-sync start time whenever the effect (re)runs, preserving elapsed time.
    if (!toast.paused) {
      startRef.current = Date.now() - elapsedRef.current;
    }

    const tick = () => {
      if (!toast.paused) {
        const elapsed = Date.now() - startRef.current;
        elapsedRef.current = elapsed;
        const remaining = Math.max(0, toast.duration - elapsed);
        const pct = (remaining / toast.duration) * 100;
        setProgress(pct);

        if (remaining <= 0) {
          dismiss();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.paused, toast.duration, isPersistent, dismiss]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (!isPersistent && !toast.paused) {
      pauseToast(toast.id, elapsedRef.current);
    }
  }, [isPersistent, toast.paused, toast.id, pauseToast]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isPersistent && toast.paused) {
      resumeToast(toast.id);
      // Reset start time so remaining duration is correct
      startRef.current = Date.now() - elapsedRef.current;
    }
  }, [isPersistent, toast.paused, toast.id, resumeToast]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
        dismiss();
      }
    },
    [dismiss]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        dismiss();
      }
    },
    [dismiss]
  );

  const accentColor = borderColorMap[toast.type];
  const glowColor = glowColorMap[toast.type];
  const isError = toast.type === "error";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        x: 100,
        scale: 0.95,
        transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
      }}
      transition={{
        duration: 0.22,
        ease: [0.32, 0.72, 0, 1],
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="alert"
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={`toast-card group relative flex w-full cursor-pointer items-start gap-3 overflow-hidden rounded-[15px] border border-l-[3px] p-3.5 outline-none backdrop-blur-xl ${
        isError ? "toast-shake" : ""
      }`}
      style={{
        background: "rgba(17, 24, 39, 0.72)",
        borderColor: "rgba(255, 255, 255, 0.06)",
        borderLeftColor: accentColor,
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.35), 0 0 20px ${glowColor}`,
        WebkitBackdropFilter: "blur(16px)",
        "--toast-accent": accentColor,
        "--toast-glow": glowColor,
      } as React.CSSProperties}
    >
      {/* Icon */}
      <ToastIcon type={toast.type} />

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <h3
            className="truncate font-semibold text-white"
            style={{ fontSize: "15px", lineHeight: "1.3" }}
          >
            {toast.title}
          </h3>
          {toast.timestamp && (
            <span className="shrink-0 text-[11px] text-[#6B7280]">
              {toast.timestamp}
            </span>
          )}
        </div>
        {toast.description && (
          <p
            className="text-muted-foreground"
            style={{ fontSize: "13px", lineHeight: "1.45" }}
          >
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.action?.onClick();
              dismiss();
            }}
            className="toast-action-btn mt-1 w-fit rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:bg-white/5"
            style={{ color: accentColor }}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close button — visible on hover */}
      {toast.dismissible && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="toast-close-btn absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-[#6B7280] opacity-0 transition-all hover:bg-white/5 hover:text-white focus:opacity-100 group-hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      )}

      {/* Progress bar */}
      {!isPersistent && (
        <div className="toast-progress-track absolute bottom-0 left-0 h-[2.5px] w-full overflow-hidden rounded-b-[15px] bg-white/5">
          <div
            className="h-full rounded-full transition-none"
            style={{
              width: `${progress}%`,
              background: accentColor,
              opacity: 0.7,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}