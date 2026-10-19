"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { ToastIcon, toastTone } from "./ToastIcons";
import type { ToastItem, ToastType } from "@/types/toast";
import { useToastStore } from "@/store/toastStore";

interface ToastCardProps {
  toast: ToastItem;
  mobile?: boolean;
}

const SWIPE_THRESHOLD = 80;

const mobileTone: Record<ToastType, { card: string; bar: string }> = {
  success: { card: "bg-[var(--qs-ok)] text-[var(--qs-bg)]", bar: "var(--qs-bg)" },
  error: { card: "bg-[var(--qs-bad)] text-[var(--qs-on-bad)]", bar: "var(--qs-sun)" },
  warning: { card: "bg-[var(--qs-sun)] text-[#1a1240]", bar: "#1a1240" },
  info: { card: "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]", bar: "var(--qs-sun)" },
  loading: { card: "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]", bar: "var(--qs-sun)" },
};

export function ToastCard({ toast, mobile = false }: ToastCardProps) {
  const removeToast = useToastStore((s) => s.removeToast);
  const pauseToast = useToastStore((s) => s.pauseToast);
  const resumeToast = useToastStore((s) => s.resumeToast);

  const [progress, setProgress] = useState(100);
  const [, setIsHovered] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(toast.createdAt);
  const elapsedRef = useRef<number>(0);

  const isPersistent =
    toast.duration === 0 || toast.duration === Infinity || toast.type === "loading";

  const dismiss = useCallback(() => {
    removeToast(toast.id);
  }, [removeToast, toast.id]);

  useEffect(() => {
    if (isPersistent) return;

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
      startRef.current = Date.now() - elapsedRef.current;
    }
  }, [isPersistent, toast.paused, toast.id, resumeToast]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (mobile ? info.offset.y < -SWIPE_THRESHOLD / 2 : Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
        dismiss();
      }
    },
    [dismiss, mobile]
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

  const tone = toastTone[toast.type];
  const isError = toast.type === "error";
  const mobileStyles = mobileTone[toast.type];

  return (
    <motion.div
      layout
      initial={mobile ? { opacity: 0, y: -28 } : { opacity: 0, x: 90, scale: 0.94 }}
      animate={mobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0, scale: 1 }}
      exit={
        mobile
          ? { opacity: 0, y: -28, transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } }
          : {
              opacity: 0,
              x: 90,
              scale: 0.94,
              transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
            }
      }
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 32,
      }}
      drag={mobile ? "y" : "x"}
      dragConstraints={mobile ? { top: 0, bottom: 0 } : { left: 0, right: 0 }}
      dragElastic={mobile ? 0.4 : 0.6}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="alert"
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={
        mobile
          ? `group relative flex w-full cursor-pointer items-start gap-2.5 overflow-hidden border-b-2 border-[var(--qs-ink)] px-3.5 py-3 pr-10 outline-none ${mobileStyles.card}`
          : `group relative flex w-full cursor-pointer items-start gap-3 overflow-hidden rounded-[16px] border-2 border-[#1A1240] bg-white p-3.5 pr-10 outline-none ${
              isError ? "toast-shake" : ""
            }`
      }
      style={mobile ? undefined : { boxShadow: `4px 4px 0 0 ${tone.solid}` }}
    >
      <ToastIcon type={toast.type} variant={mobile ? "mobile" : "bubble"} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <h3
            className={`truncate text-[14px] font-extrabold leading-snug tracking-tight ${
              mobile ? "" : "text-[#1A1240]"
            }`}
          >
            {toast.title}
          </h3>
          {toast.timestamp && (
            <span
              className={`shrink-0 text-[10.5px] font-semibold ${
                mobile ? "opacity-70" : "text-[#8f8aa8]"
              }`}
            >
              {toast.timestamp}
            </span>
          )}
        </div>
        {toast.description && (
          <p
            className={`text-[12.5px] font-medium leading-relaxed ${
              mobile ? "opacity-85" : "text-[#5c5679]"
            }`}
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
            className={
              mobile
                ? "b sm mt-2"
                : "mt-1.5 w-fit rounded-[9px] border-2 border-[#1A1240] bg-[#FFD23F] px-2.5 py-1 text-[11.5px] font-extrabold text-[#1A1240] shadow-[2px_2px_0_#1A1240] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
            }
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {toast.dismissible && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className={
            mobile
              ? "absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg border-2 border-transparent opacity-75 transition-opacity hover:bg-black/10 hover:opacity-100"
              : "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-transparent text-[#8f8aa8] opacity-0 transition-all hover:border-[#1A1240] hover:bg-[#FFD23F] hover:text-[#1A1240] focus:opacity-100 group-hover:opacity-100"
          }
          aria-label="Dismiss notification"
        >
          <X className={mobile ? "h-3.5 w-3.5" : "h-3 w-3"} strokeWidth={3} />
        </button>
      )}

      {!isPersistent && (
        <div
          className={`absolute bottom-0 left-0 h-[3px] w-full overflow-hidden ${
            mobile ? "bg-black/15" : "bg-[#F0EBFF]"
          }`}
        >
          <div
            className="h-full transition-none"
            style={{
              width: `${progress}%`,
              background: mobile ? mobileStyles.bar : tone.solid,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
