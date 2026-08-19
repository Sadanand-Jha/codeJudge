"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Inbox,
  Users,
  Trophy,
  Activity,
  BarChart3,
  Settings,
  UsersRound,
  ShoppingBag,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useInboxStore, loadInboxUnread } from "@/store/inboxStore";
import { usePurchasesStore } from "@/store/purchasesStore";

export interface ProfileNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Icon color tone used for the active/resting highlight */
  tone: string;
}

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  { label: "Profile", href: "/profile", icon: User, tone: "from-[#F59E0B] to-[#F97316]" },
  { label: "Rooms", href: "/profile/rooms", icon: UsersRound, tone: "from-[#F59E0B] to-[#F97316]" },
  { label: "Inbox", href: "/profile/inbox", icon: Inbox, tone: "from-[#3B82F6] to-[#06B6D4]" },
  { label: "Followers", href: "/profile/followers", icon: Users, tone: "from-[#22C55E] to-[#10B981]" },
  { label: "Following", href: "/profile/following", icon: Users, tone: "from-[#8B5CF6] to-[#6366F1]" },
  { label: "Achievements", href: "/profile/achievements", icon: Trophy, tone: "from-[#FBBF24] to-[#F59E0B]" },
  { label: "Activity", href: "/profile/activity", icon: Activity, tone: "from-[#F59E0B] to-[#F97316]" },
  { label: "My Purchases", href: "/profile/purchases", icon: ShoppingBag, tone: "from-[#EC4899] to-[#8B5CF6]" },
  { label: "Statistics", href: "/profile/statistics", icon: BarChart3, tone: "from-[#06B6D4] to-[#3B82F6]" },
];

export function isProfilePathActive(pathname: string, href: string): boolean {
  if (href === "/profile") return pathname === "/profile";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Shared profile navigation used by both the desktop sidebar
 * and the mobile drawer.
 */
function ProfileNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const unread = useInboxStore((s) => s.unread);
  const showSuccess = usePurchasesStore((s) => s.showSuccess);

  return (
    <div className="space-y-1">
      {PROFILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = isProfilePathActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-[#F59E0B]/10 text-text-primary shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)]"
                : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br transition-transform duration-200",
                item.tone,
                isActive
                  ? "opacity-100"
                  : "opacity-40 group-hover:opacity-100 group-hover:scale-110"
              )}
            >
              <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
            </span>
            <span className={cn("transition-colors", isActive ? "font-semibold text-text-primary" : "text-text-secondary")}>
              {item.label}
            </span>
            {item.href === "/profile/inbox" && unread > 0 && (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F59E0B] px-1.5 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                {unread}
              </span>
            )}
            {item.href === "/profile/purchases" && showSuccess && (
              <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-[#EC4899] shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
            )}
            {isActive && (
              <motion.span
                layoutId="profileNavActive"
                className="absolute right-2 h-1.5 w-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function ProfileSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/settings");

  return (
    <nav className="settings-scroll h-full overflow-y-auto p-4">
      <p className="px-3 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
        Profile
      </p>

      <ProfileNavLinks onNavigate={onNavigate} />

      <div className="my-4 border-t border-border" />

      <p className="px-3 pb-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
        Account
      </p>
      <Link
        href="/settings"
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          settingsActive
            ? "bg-accent/10 text-[#F59E0B] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)]"
            : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#F97316] to-[#F59E0B] opacity-40 transition-opacity group-hover:opacity-100">
          <Settings className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
        </span>
        <span className={cn("transition-colors", settingsActive ? "font-semibold text-accent" : "text-text-secondary")}>
          Profile Settings
        </span>
        {settingsActive && (
          <motion.span
            layoutId="profileNavActive"
            className="absolute right-2 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </Link>

      <div className="mt-6 rounded-xl border border-border bg-card-hover/60 p-4">
        <p className="text-[10px] font-medium leading-relaxed text-text-muted">
          Your profile is your identity across ByteClash. Customize it from{" "}
          <Link href="/settings" onClick={onNavigate} className="font-semibold text-[#F59E0B] hover:underline">
            Settings
          </Link>
          .
        </p>
      </div>
    </nav>
  );
}

/**
 * Desktop profile sidebar — sticky below the app navbar.
 */
export default function ProfileSidebar({ onNavigate }: { onNavigate?: () => void }) {
  useEffect(() => {
    // Load the unread inbox badge once on mount.
    loadInboxUnread();
  }, []);

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border bg-card lg:block">
      <ProfileSidebarContent onNavigate={onNavigate} />
    </aside>
  );
}

/**
 * Mobile profile navigation drawer.
 */
export function ProfileMobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (open) {
      loadInboxUnread();
    }
  }, [open]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#F97316] to-[#F59E0B]">
              <User className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-sm font-bold text-text-primary">Profile</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-accent/5 hover:text-text-primary"
            aria-label="Close profile navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ProfileSidebarContent onNavigate={onClose} />
      </motion.div>
    </motion.div>
  );
}
