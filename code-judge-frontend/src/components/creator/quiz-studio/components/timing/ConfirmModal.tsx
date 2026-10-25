"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/helpers";

type Variant = "emerald" | "pink" | "rose";

const VARIANTS: Record<
  Variant,
  {
    icon: LucideIcon;
    tile: string;
    button: string;
  }
> = {
  emerald: {
    icon: Play,
    tile: "border-[var(--qs-ink)] bg-[var(--qs-ok)] text-white",
    button: "border-[var(--qs-ink)] bg-[var(--qs-ok)] text-white",
  },
  pink: {
    icon: Zap,
    tile: "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]",
    button: "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]",
  },
  rose: {
    icon: Square,
    tile: "border-[var(--qs-ink)] bg-[var(--qs-bad)] text-white",
    button: "border-[var(--qs-ink)] bg-[var(--qs-bad)] text-white",
  },
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  details,
  children,
  confirmLabel,
  confirmColor = "pink",
  confirmDisabled = false,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  details?: { label: string; value: string }[];
  children?: React.ReactNode;
  confirmLabel: string;
  confirmColor?: Variant;
  confirmDisabled?: boolean;
  icon?: LucideIcon;
}) {
  const v = VARIANTS[confirmColor];
  const Icon = icon ?? v.icon;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1A1240]/60 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]"
          >
            <div className="px-6 pb-6 pt-7 text-center">
              {/* Icon tile */}
              <div
                className={cn(
                  "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] border-2 shadow-[3px_3px_0_var(--qs-sun)]",
                  v.tile
                )}
              >
                <Icon className="h-7 w-7" />
              </div>

              <h3 className="text-lg font-black tracking-tight text-[var(--qs-ink)]">
                {title}
              </h3>
              <p className="mx-auto mt-2 max-w-[320px] text-[13px] font-medium leading-relaxed text-[var(--qs-muted)]">
                {description}
              </p>

              {details && details.length > 0 && (
                <div className={cn("mt-6 grid gap-2.5", details.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                  {details.map((d) => (
                    <div
                      key={d.label}
                      className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-3 text-left"
                    >
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
                        {d.label}
                      </p>
                      <p className="mt-1 truncate text-[13px] font-black tabular-nums text-[var(--qs-ink)]">
                        {d.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {children && <div className="mt-5 text-left">{children}</div>}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmDisabled}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-[12px] border-2 px-5 text-xs font-extrabold shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50",
                  v.button
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
