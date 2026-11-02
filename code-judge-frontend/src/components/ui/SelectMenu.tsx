"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/helpers";

export interface SelectMenuItem {
  value: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Renders after a divider, e.g. an "Add new…" action. */
  action?: boolean;
}

export default function SelectMenu({
  value,
  items,
  onChange,
  ariaLabel,
  placeholder = "Select",
  disabled = false,
  className,
  menuClassName,
}: {
  value: string;
  items: SelectMenuItem[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = items.find((item) => item.value === value && !item.action);
  const firstActionIndex = items.findIndex((item) => item.action);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (item: SelectMenuItem) => {
    if (item.disabled) return;
    onChange(item.value);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-card px-2.5 text-left text-xs font-semibold text-text-primary outline-none transition",
          open
            ? "border-accent/60 ring-2 ring-accent/15"
            : "border-border hover:border-border-hover",
          "focus-visible:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-200",
            open && "rotate-180 text-accent"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={cn(
              "absolute left-0 right-0 z-50 mt-1.5 max-h-64 origin-top overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-2xl shadow-black/20",
              menuClassName
            )}
          >
            <ul role="listbox" aria-label={ariaLabel}>
              {items.map((item, index) => {
                const active = item.value === value && !item.action;
                const divider = item.action && index === firstActionIndex && index > 0;
                return (
                  <li
                    key={item.value}
                    className={cn(divider && "mt-1 border-t border-border pt-1")}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={item.disabled}
                      onClick={() => choose(item)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors disabled:opacity-40",
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-text-secondary hover:bg-card-hover hover:text-text-primary",
                        item.action && "text-accent"
                      )}
                    >
                      {item.icon && (
                        <span className="grid h-3.5 w-3.5 shrink-0 place-items-center">
                          {item.icon}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{item.label}</span>
                        {item.hint && (
                          <span className="mt-0.5 block truncate text-[10px] font-medium text-text-muted">
                            {item.hint}
                          </span>
                        )}
                      </span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.6} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
