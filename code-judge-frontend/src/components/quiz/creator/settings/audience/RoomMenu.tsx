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
        className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-primary"
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
                "absolute z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-2xl shadow-black/50",
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
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors",
                      i > 0 && "mt-0.5 border-t border-border/60 pt-2",
                      item.destructive
                        ? "text-danger hover:bg-danger/10"
                        : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
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