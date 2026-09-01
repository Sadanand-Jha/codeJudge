"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownWideNarrow, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/helpers";

interface SortOption {
  id: string;
  label: string;
}

interface SortDropdownProps {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible label for screen readers. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Themed custom sort dropdown — replaces the native <select> with a styled
 * popover matching the pink/violet room design language.
 */
export default function SortDropdown({ options, value, onChange, ariaLabel, className }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value) ?? options[0];

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-xl border px-3 text-[11px] font-semibold transition-all sm:h-12 sm:px-3.5 sm:text-xs",
          open
            ? "border-pink-500/40 bg-pink-500/[0.06] text-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.08)]"
            : "border-input-border bg-input-bg text-text-primary hover:border-border-hover"
        )}
      >
        <ArrowDownWideNarrow className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", open ? "text-pink-500" : "text-text-muted")} />
        <span className="whitespace-nowrap">{selected?.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-text-muted transition-transform duration-200",
            open && "rotate-180 text-pink-500"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 z-40 mt-2 w-48 origin-top-right overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-2xl shadow-black/20"
          >
            {options.map((opt) => {
              const active = opt.id === value;
              return (
                <li key={opt.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                      active ? "bg-pink-500/10 text-pink-500" : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
                    )}
                  >
                    <span className="whitespace-nowrap">{opt.label}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
