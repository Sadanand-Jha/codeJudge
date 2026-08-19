"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/helpers";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
} as const;

interface AudienceModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: keyof typeof SIZES;
  children: React.ReactNode;
  /** Render a sticky footer bar below the scrollable content. */
  footer?: React.ReactNode;
}

/**
 * Shared modal shell for the Audience flows (Select Rooms / Create Room).
 * Large, centered, backdrop-blur overlay — never a tiny dropdown.
 */
export default function AudienceModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = "lg",
  children,
  footer,
}: AudienceModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-hidden overflow-x-hidden rounded-none border-0 bg-card shadow-2xl shadow-black/50",
              "sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl sm:border sm:border-border",
              SIZES[size]
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />

            {/* Header — fixed */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3.5">
                {icon && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500 ring-1 ring-inset ring-pink-500/20">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-text-primary">{title}</h3>
                  {subtitle && (
                    <p className="mt-0.5 max-w-md text-xs leading-relaxed text-text-secondary">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-8 sm:px-6 sm:pt-6">{children}</div>

            {/* Sticky footer — fixed */}
            {footer && (
              <div className="shrink-0 border-t border-border bg-background px-5 py-4 sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
