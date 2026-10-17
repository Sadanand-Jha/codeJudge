"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
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

/* Mock notifications are intentionally disabled until this component is wired
 * to the real notifications API.
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
*/

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
        className="relative grid h-8 w-8 place-items-center rounded-lg border border-ai-border bg-ai-surface text-ai-text-sec transition-colors hover:bg-ai-hover hover:text-ai-text"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-ai-accent px-0.5 text-[8px] font-bold text-accent-foreground">
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
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 overflow-hidden rounded-2xl border border-ai-border bg-ai-surface shadow-2xl shadow-black/20 dark:shadow-black/40"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-ai-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai-accent">
                    <Bell className="h-3.5 w-3.5 text-accent-foreground" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ai-text">Notifications</p>
                    <p className="text-[10px] text-ai-text-mut">
                      {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                    </p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-ai-text-sec transition-colors hover:bg-ai-hover hover:text-ai-text"
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
                    <Bell className="mx-auto h-5 w-5 text-ai-text-mut" />
                    <p className="mt-3 text-xs font-semibold text-ai-text">No notifications</p>
                    <p className="mt-1 text-[10px] text-ai-text-mut">
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
                          "flex items-start gap-3 border-b border-ai-border/60 px-4 py-3 transition-colors last:border-b-0",
                          notification.unread
                            ? "bg-ai-accent/[0.06] hover:bg-ai-accent/10"
                            : "hover:bg-ai-hover"
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
                          <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-ai-accent" />
                        )}
                      </Wrapper>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-ai-border bg-ai-bg/50 px-4 py-2.5">
                <Link
                  href="/inbox"
                  onClick={close}
                  className="flex items-center justify-center gap-1 text-[10px] font-bold text-ai-accent transition-colors hover:text-ai-accent-hover"
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
