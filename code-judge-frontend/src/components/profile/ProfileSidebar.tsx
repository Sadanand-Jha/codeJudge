"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  ShoppingBag,
  History,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useInboxStore, loadInboxUnread } from "@/store/inboxStore";
import { usePurchasesStore } from "@/store/purchasesStore";
import { useAuthStore } from "@/store/authStore";
import { useSavedAvatar } from "@/store/avatarStore";

export interface ProfileNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Icon color tone used for the active/resting highlight */
  tone: string;
}

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  { label: "Profile", href: "/profile", icon: User, tone: "from-[#F59E0B] to-[#F97316]" },
  { label: "Inbox", href: "/profile/inbox", icon: Inbox, tone: "from-[#3B82F6] to-[#06B6D4]" },
  { label: "Followers", href: "/profile/followers", icon: Users, tone: "from-[#22C55E] to-[#10B981]" },
  { label: "Following", href: "/profile/following", icon: Users, tone: "from-[#8B5CF6] to-[#6366F1]" },
  { label: "History", href: "/profile/history", icon: History, tone: "from-[#3B82F6] to-[#06B6D4]" },
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
                ? "bg-gradient-to-r from-pink-500/12 to-orange-400/8 text-text-primary shadow-[inset_0_0_0_1px_rgba(244,114,182,0.24)] dark:from-violet-500/15 dark:to-cyan-400/[0.04] dark:shadow-[inset_0_0_0_1px_rgba(139,124,255,0.2)]"
                : "text-text-secondary hover:bg-pink-500/[0.055] hover:text-text-primary dark:hover:bg-violet-500/[0.07]"
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
                className="absolute right-2 h-1.5 w-1.5 rounded-full bg-pink-500 shadow-[0_0_9px_rgba(236,72,153,.8)] dark:bg-violet-400 dark:shadow-[0_0_10px_rgba(139,124,255,.9)]"
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
  const user = useAuthStore((state) => state.user);
  const avatar = useSavedAvatar();

  return (
    <nav className="settings-scroll h-full overflow-y-auto px-3 py-4">
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-pink-200/70 bg-gradient-to-br from-white via-pink-50/90 to-orange-50/70 p-3 shadow-sm dark:border-violet-400/15 dark:from-violet-500/[0.11] dark:via-[#111827] dark:to-cyan-500/[0.05]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-300/25 blur-2xl dark:bg-cyan-400/10" />
        <div className="relative flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-pink-400 via-orange-300 to-amber-300 p-[2px] shadow-[0_8px_20px_-10px_rgba(244,114,182,.9)] dark:from-violet-400 dark:via-indigo-500 dark:to-cyan-400">
            {avatar ? <Image src={avatar.url} alt={avatar.label} fill sizes="44px" unoptimized className="rounded-[14px] bg-white object-cover dark:bg-[#101624]" /> : <span className="grid h-full w-full place-items-center rounded-[14px] bg-white dark:bg-[#101624]"><User className="h-5 w-5" /></span>}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-primary">{user?.username || "Your profile"}</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-pink-500 dark:text-violet-300">Player command centre</p>
          </div>
        </div>
      </div>

      <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
        Your space
      </p>

      <ProfileNavLinks onNavigate={onNavigate} />

      <div className="my-3 border-t border-pink-200/60 dark:border-white/[0.07]" />

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

      <div className="relative mt-4 overflow-hidden rounded-2xl border border-pink-200/70 bg-gradient-to-br from-pink-50/90 to-cyan-50/70 p-4 shadow-sm dark:border-white/[0.07] dark:from-violet-500/[0.09] dark:to-cyan-400/[0.035]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-pink-300/25 blur-2xl dark:bg-violet-500/20" />
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
    <aside className="sticky top-0 z-20 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 self-start overflow-hidden border-r border-pink-200/80 bg-gradient-to-b from-[#fff9fc] via-[#fffdfb] to-[#fff8f1] shadow-[14px_0_48px_-38px_rgba(236,72,153,.72)] dark:border-white/[0.07] dark:from-[#111522] dark:via-[#0d111d] dark:to-[#0b101b] dark:shadow-[12px_0_55px_-38px_rgba(91,70,190,.7)] lg:block">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-pink-100/55 to-transparent dark:from-violet-500/[0.08]" aria-hidden="true" />
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
      className="fixed inset-x-0 top-0 z-[60] h-dvh bg-black/60 lg:hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-pink-200/70 bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#0d111d]/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-pink-200/60 px-5 py-4 dark:border-white/[0.07]">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 dark:from-violet-600 dark:to-indigo-500">
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
