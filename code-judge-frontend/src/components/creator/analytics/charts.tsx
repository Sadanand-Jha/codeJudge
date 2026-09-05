"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/helpers";
import { IconButton } from "@/components/creator/billing/ui";

/* ============================================================
   MiniBarChart — CSS bar chart (divs + framer-motion)
   ============================================================ */
export function MiniBarChart({
  data,
  height = 220,
  formatter,
  barClassName = "bg-[#EC4899]",
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  formatter?: (value: number) => string;
  barClassName?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="group relative flex h-full min-w-0 flex-1 flex-col">
          <div className="pointer-events-none absolute inset-x-0 -top-8 z-20 mx-auto hidden w-max max-w-[180px] rounded-lg border border-border bg-popover px-2 py-1.5 text-center shadow-xl group-hover:block">
            <span className="block text-[10px] font-semibold text-text-primary">{d.label}</span>
            <span className="block text-[10px] font-bold text-pink-500 dark:text-ai-accent">
              {formatter ? formatter(d.value) : d.value}
            </span>
          </div>
          <div className="relative flex flex-1 items-end">
            <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-text-secondary">{d.value}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max((d.value / max) * 100, 6)}%` }}
              transition={{ delay: i * 0.03, duration: 0.55, ease: "easeOut" }}
              className={cn("w-full rounded-t-xl", barClassName)}
            />
          </div>
          <span className="mt-1.5 truncate text-center text-[10px] font-medium text-text-muted">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   OverflowMenu — compact dropdown action menu (ellipsis)
   ============================================================ */
export function OverflowMenu({
  items,
  label = "More actions",
}: {
  items: Array<{ label: string; icon?: ReactNode; onSelect?: () => void }>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <IconButton label={label} onClick={() => setOpen((o) => !o)} active={open}>
        <MoreHorizontal className="h-4 w-4" />
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-1 w-44 rounded-xl border border-border bg-card p-1 shadow-2xl"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}