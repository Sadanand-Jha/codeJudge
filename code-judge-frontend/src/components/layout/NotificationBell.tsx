"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Trophy,
  UserPlus,
  CheckCircle2,
  Timer,
  BellRing,
  ChevronRight,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/helpers";

interface Notification {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconTone: string;
  title: string;
  description: string;
  timeLabel: string;
  unread: boolean;
  href?: string;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    icon: UserPlus,
    iconTone: "from-[#EC4899] to-[#7C3AED]",
    title: "Collaboration request",
    description: "Sarah invited you to collaborate on “Algo Basics”.",
    timeLabel: "2m ago",
    unread: true,
    href: "/inbox",
  },
  {
    id: "2",
    icon: Trophy,
    iconTone: "from-amber-500 to-orange-500",
    title: "New achievement unlocked",
    description: "You earned the “10 Quizzes Taken” badge. Keep it up!",
    timeLabel: "1h ago",
    unread: true,
    href: "/profile",
  },
  {
    id: "3",
    icon: Timer,
    iconTone: "from-sky-500 to-blue-600",
    title: "Contest starting soon",
    description: "Weekly DSA Contest #42 starts in 30 minutes.",
    timeLabel: "3h ago",
    unread: true,
    href: "/contests",
  },
  {
    id: "4",
    icon: BellRing,
    iconTone: "from-emerald-500 to-green-600",
    title: "Result ready",
    description: "Your attempt for “JS Fundamentals” is graded — you scored 92%.",
    timeLabel: "1d ago",
    unread: false,
    href: "/quiz/js-fundamentals",
  },
  {
    id: "5",
    icon: CheckCircle2,
    iconTone: "from-[#7C3AED] to-[#3B82F6]",
    title: "Quiz published",
    description: "“React Hooks Deep Dive” you authored is now live.",
    timeLabel: "2d ago",
    unread: false,
    href: "/quiz/react-hooks",
  },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex items-center gap-1 rounded-lg p-1 hover:text-text-primary transition-colors"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#EC4899] px-0.5 text-[8px] font-bold text-white shadow-[0_0_6px_rgba(236,72,153,0.8)]">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/30"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#7C3AED]">
                    <Bell className="h-3.5 w-3.5 text-white" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-text-primary">Notifications</p>
                    <p className="text-[10px] text-text-muted">
                      {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                    </p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-text-secondary transition-colors hover:bg-accent/5 hover:text-text-primary"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="mx-auto h-5 w-5 text-text-muted" />
                    <p className="mt-3 text-xs font-semibold text-text-primary">No notifications</p>
                    <p className="mt-1 text-[10px] text-text-muted">
                      New activity will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const Icon = notification.icon;
                    const Wrapper = notification.href ? Link : "div";
                    return (
                      <Wrapper
                        key={notification.id}
                        href={notification.href ?? "#"}
                        onClick={() => markRead(notification.id)}
                        className={cn(
                          "flex items-start gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0",
                          notification.unread
                            ? "bg-gradient-to-r from-[#EC4899]/[0.05] to-[#7C3AED]/[0.03] hover:from-[#EC4899]/[0.09] hover:to-[#7C3AED]/[0.06]"
                            : "hover:bg-accent/5"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm",
                            notification.iconTone
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[11px] font-bold text-text-primary">
                              {notification.title}
                            </p>
                            <span className="shrink-0 text-[9px] text-text-muted">
                              {notification.timeLabel}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
                            {notification.description}
                          </p>
                        </div>
                        {notification.unread && (
                          <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#EC4899] shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                        )}
                      </Wrapper>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border bg-background/50 px-4 py-2.5">
                <Link
                  href="/inbox"
                  onClick={close}
                  className="flex items-center justify-center gap-1 text-[10px] font-bold text-accent transition-colors hover:text-text-primary"
                >
                  View all notifications
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
