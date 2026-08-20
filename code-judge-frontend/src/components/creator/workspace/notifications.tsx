"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ShoppingBag,
  ClipboardCheck,
  Banknote,
  RotateCcw,
  ShieldCheck,
  Star,
  BarChart3,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { CREATOR_NOTIFICATIONS } from "./mockData";
import type { CreatorNotificationKind } from "./types";

const KIND_META: Record<CreatorNotificationKind, { icon: typeof ShoppingBag; color: string }> = {
  sale: { icon: ShoppingBag, color: "text-emerald-500" },
  attempt: { icon: ClipboardCheck, color: "text-sky-500" },
  payout: { icon: Banknote, color: "text-violet-500" },
  refund: { icon: RotateCcw, color: "text-amber-500" },
  verification: { icon: ShieldCheck, color: "text-rose-500" },
  feedback: { icon: Star, color: "text-yellow-500" },
  weekly: { icon: BarChart3, color: "text-pink-500" },
};

export function CreatorNotifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(CREATOR_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Creator notifications"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
          open
            ? "border-pink-500/30 bg-pink-500/[0.08] text-pink-500 dark:border-ai-accent/30 dark:bg-ai-accent-soft dark:text-ai-accent"
            : "border-border bg-card text-text-secondary hover:text-text-primary"
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[9px] font-bold text-white ring-2 ring-card">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Creator notifications</p>
                <p className="text-[10px] font-medium text-text-muted">Sales, attempts & payouts</p>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-500 transition-colors hover:text-pink-600 dark:text-ai-accent"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              {items.map((n) => {
                const meta = KIND_META[n.kind];
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.03]",
                      !n.read && "bg-pink-500/[0.04]"
                    )}
                  >
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]", meta.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-snug text-text-primary">{n.title}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">{n.description}</p>
                      <p className="mt-1 text-[10px] font-medium text-text-muted">{n.time}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink-500 dark:bg-ai-accent" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}