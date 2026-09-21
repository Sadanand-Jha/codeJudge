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
    halo: string;
    topLine: string;
    button: string;
  }
> = {
  emerald: {
    icon: Play,
    tile: "from-emerald-500 to-teal-600",
    halo: "bg-emerald-500/40",
    topLine: "from-emerald-500 via-teal-400/80 to-transparent",
    button:
      "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 hover:brightness-110",
  },
  pink: {
    icon: Zap,
    tile: "from-pink-500 to-pink-600",
    halo: "bg-pink-500/40",
    topLine: "from-pink-500 via-pink-400/80 to-transparent",
    button:
      "bg-gradient-to-r from-pink-500 to-pink-600 shadow-lg shadow-pink-500/25 hover:brightness-110",
  },
  rose: {
    icon: Square,
    tile: "from-rose-500 to-red-600",
    halo: "bg-rose-500/40",
    topLine: "from-rose-500 via-red-400/80 to-transparent",
    button:
      "bg-gradient-to-r from-rose-500 to-red-600 shadow-lg shadow-rose-500/25 hover:brightness-110",
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
}) {
  const v = VARIANTS[confirmColor];
  const Icon = v.icon;

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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          {/* Ambient color wash behind the card */}
          <div
            className={cn(
              "pointer-events-none absolute h-72 w-72 rounded-full blur-[120px]",
              v.halo
            )}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/50"
          >
            {/* Accent hairline */}
            <div
              className={cn("h-1 w-full bg-gradient-to-r", v.topLine)}
            />

            <div className="px-6 pb-6 pt-7 text-center">
              {/* Icon tile with soft glow halo */}
              <div className="relative mx-auto mb-5 h-16 w-16">
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl blur-xl",
                    v.halo
                  )}
                />
                <div
                  className={cn(
                    "relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-xl",
                    v.tile
                  )}
                >
                  <Icon className="h-7 w-7" />
                </div>
              </div>

              <h3 className="text-lg font-extrabold tracking-tight text-text-primary">
                {title}
              </h3>
              <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-relaxed text-text-secondary">
                {description}
              </p>

              {details && details.length > 0 && (
                <div className={cn("mt-6 grid gap-2.5", details.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                  {details.map((d) => (
                    <div
                      key={d.label}
                      className="rounded-xl border border-border bg-card-hover/50 px-3 py-3 text-left transition-colors duration-150"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        {d.label}
                      </p>
                      <p className="mt-1 truncate text-[13px] font-bold tabular-nums text-text-primary">
                        {d.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {children && <div className="mt-5 text-left">{children}</div>}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border bg-card-hover/40 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-border px-4 text-xs font-semibold text-text-secondary transition-all duration-150 hover:border-border-hover hover:bg-card-hover hover:text-text-primary active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl px-5 text-xs font-bold text-white transition-all duration-150 active:scale-[0.98]",
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
