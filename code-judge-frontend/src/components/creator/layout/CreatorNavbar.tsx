"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Users,
  TrendingUp,
  Bell,
  ChevronDown,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import ThemeToggle from "@/components/ui/ThemeToggle";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";
import { CREATOR_PROFILE, CREATOR_NOTIFICATIONS } from "@/components/creator/workspace/mockData";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString("en-IN");
}

// ─── Popover wrapper ────────────────────────────────────────────────────────

function MetricPopover({
  trigger,
  children,
  open,
  onOpenChange,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-xl border border-border bg-card p-3 shadow-xl"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Metric Pill ────────────────────────────────────────────────────────────

function MetricPill({
  icon: Icon,
  iconColor,
  value,
  label,
  popoverContent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  value: string;
  label: string;
  popoverContent?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const pill = (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-default select-none">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
      <span className="text-xs font-semibold text-text-primary">{value}</span>
      <span className="text-[10px] font-medium text-text-muted hidden xl:inline">{label}</span>
    </div>
  );

  if (!popoverContent) return pill;

  return (
    <MetricPopover trigger={pill} open={open} onOpenChange={setOpen}>
      {popoverContent}
    </MetricPopover>
  );
}

// ─── Notifications Popover ──────────────────────────────────────────────────

function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = CREATOR_NOTIFICATIONS.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const kindIcon: Record<string, string> = {
    sale: "💰",
    attempt: "📝",
    payout: "🏦",
    verification: "✅",
    refund: "↩️",
    feedback: "⭐",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center h-8 w-8 rounded-lg hover:bg-white/[0.06] transition-colors"
      >
        <Bell className="h-4 w-4 text-text-secondary" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-50 w-80 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-xs font-semibold text-text-primary">Notifications</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-0.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {CREATOR_NOTIFICATIONS.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]",
                    !n.read && "bg-white/[0.01]"
                  )}
                >
                  <span className="mt-0.5 text-sm">{kindIcon[n.kind] || "📌"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary leading-tight">{n.title}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{n.description}</p>
                    <p className="text-[10px] text-text-muted mt-1">{n.time}</p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  )}
                </div>
              ))}
            </div>
            <Link
              href="/creator/analytics"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1 border-t border-border px-4 py-2.5 text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
            >
              View all analytics
              <ExternalLink className="h-3 w-3" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Profile Menu ───────────────────────────────────────────────────────────

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const creator = CREATOR_PROFILE;
  const initial = creator.displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const menuItems = [
    { label: "Creator Profile", href: "/creator/profile" },
    { label: "Public Profile", href: "/creator/profile/public" },
    { label: "Settings", href: "/creator/settings" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-[11px] font-bold text-white">
          {initial}
        </div>
        <ChevronDown className={cn("h-3 w-3 text-text-muted transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl"
          >
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center rounded-lg px-3 py-2 text-xs font-medium text-text-secondary hover:bg-white/[0.04] hover:text-text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Navbar ────────────────────────────────────────────────────────────

export default function CreatorNavbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const pathname = usePathname();
  const creator = CREATOR_PROFILE;
  const stats = creator.stats;

  // Compute growth (mock: +18.4% from dashboard metrics)
  const growthPct = "+18.4%";

  return (
    <header
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      className="h-14 min-w-0 w-full border-b border-border bg-card/80 backdrop-blur-xl flex items-center px-4 gap-2 sticky top-0 z-30 select-none"
    >
      {/* Left: Brand + Navigation */}
      <div className="flex items-center gap-1 min-w-0 shrink-0">
        {/* Mobile menu toggle */}
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden shrink-0 p-2 -ml-1 rounded-lg hover:bg-white/[0.04] text-text-secondary"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Studio brand */}
        <Link href="/creator" className="flex items-center gap-2 shrink-0 mr-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-violet-600">
            <span className="text-[10px] font-black text-white">S</span>
          </div>
          <span className="hidden sm:block text-[13px] font-bold text-text-primary tracking-tight">Studio</span>
        </Link>

        {/* Separator */}
        <div className="hidden sm:block h-4 w-px bg-border mx-1" />

        {/* Nav links — compact */}
        <nav className="hidden md:flex items-center gap-0.5">
          {[
            { label: "Quizzes", href: "/creator/quizzes" },
            { label: "Library", href: "/creator/tests" },
            { label: "Analytics", href: "/creator/analytics" },
          ].map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  isActive
                    ? "text-text-primary bg-white/[0.06]"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/[0.03]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Center: Business Metrics */}
      <div className="hidden lg:flex items-center gap-0.5">
        <MetricPill
          icon={Star}
          iconColor="text-amber-400"
          value={stats.rating.toString()}
          label="Rating"
          popoverContent={
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-amber-400" />
                <span className="text-lg font-bold text-text-primary">{stats.rating}</span>
                <span className="text-xs text-text-muted">/ 5.0</span>
              </div>
              <div className="text-[11px] text-text-secondary mb-2">Based on 342 reviews</div>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const pct = star === 5 ? 78 : star === 4 ? 16 : star === 3 ? 4 : star === 2 ? 1 : 1;
                  return (
                    <div key={star} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-2 text-text-muted">{star}</span>
                      <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-text-muted">{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 pt-2 border-t border-border text-[10px] text-success font-medium">
                ↑ 0.2 this month
              </div>
            </div>
          }
        />

        <MetricPill
          icon={Users}
          iconColor="text-blue-400"
          value={formatNumber(stats.students)}
          label="Learners"
          popoverContent={
            <div>
              <div className="text-sm font-bold text-text-primary mb-1">{formatNumber(stats.students)} learners</div>
              <div className="text-[11px] text-text-secondary mb-2">Unique students across all content</div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-text-muted">This month</span>
                  <span className="text-text-primary font-medium">+118</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total attempts</span>
                  <span className="text-text-primary font-medium">{formatNumber(stats.totalAttempts)}</span>
                </div>
              </div>
              <Link
                href="/creator/analytics/students"
                className="mt-2 flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-hover transition-colors"
              >
                View students <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          }
        />


        <MetricPill
          icon={TrendingUp}
          iconColor="text-success"
          value={growthPct}
          label="Growth"
          popoverContent={
            <div>
              <div className="text-sm font-bold text-success mb-1">{growthPct}</div>
              <div className="text-[11px] text-text-secondary mb-2">Revenue growth vs previous period</div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-text-muted">Period</span>
                  <span className="text-text-primary font-medium">Jul 21 — Aug 20</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Learners growth</span>
                  <span className="text-success font-medium">+18.4%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Sales growth</span>
                  <span className="text-success font-medium">+23.1%</span>
                </div>
              </div>
              <Link
                href="/creator/analytics"
                className="mt-2 flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-hover transition-colors"
              >
                View analytics <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          }
        />
      </div>

      {/* Right: Workspace + Theme + Notifications + Profile */}
      <div className="flex items-center gap-1 shrink-0">
        <WorkspaceSwitcher />
        <ThemeToggle />
        <NotificationsDropdown />
        <ProfileMenu />
      </div>
    </header>
  );
}
