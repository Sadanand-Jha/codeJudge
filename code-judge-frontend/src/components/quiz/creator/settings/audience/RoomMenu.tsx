"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/helpers";

export interface RoomMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  onClick: () => void;
}

interface RoomMenuProps {
  items: RoomMenuItem[];
  align?: "left" | "right";
  /** Render into a light/dark friendly wrapper for light-theme overrides. */
  className?: string;
}

/**
 * Compact three-dot menu used on room cards and in the room management table.
 * Closes itself on selection and on outside click.
 */
export default function RoomMenu({ items, align = "right", className }: RoomMenuProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (item: RoomMenuItem) => {
    setOpen(false);
    item.onClick();
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-brand)]/10 hover:text-[var(--qs-ink)]"
        aria-label="Room actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className={cn(
                "absolute z-50 mt-1 w-44 overflow-hidden rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] py-1 shadow-[4px_4px_0_var(--qs-sun)]",
                align === "right" ? "right-0" : "left-0"
              )}
            >
              {items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(item);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-bold transition-colors",
                      i > 0 && "mt-0.5 border-t-2 border-[var(--qs-line)] pt-2",
                      item.destructive
                        ? "text-[var(--qs-bad)] hover:bg-[var(--qs-badbg)]"
                        : "text-[var(--qs-ink)] hover:bg-[var(--qs-poly-0)]"
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {item.label}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
