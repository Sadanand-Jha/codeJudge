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
  comingSoon?: boolean;
}

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Inbox", href: "/profile/inbox", icon: Inbox },
  { label: "Followers", href: "/profile/followers", icon: Users, comingSoon: true },
  { label: "Following", href: "/profile/following", icon: Users, comingSoon: true },
  { label: "History", href: "/profile/history", icon: History, comingSoon: true },
  { label: "Achievements", href: "/profile/achievements", icon: Trophy, comingSoon: true },
  { label: "Activity", href: "/profile/activity", icon: Activity },
  { label: "My Purchases", href: "/profile/purchases", icon: ShoppingBag, comingSoon: true },
  { label: "Statistics", href: "/profile/statistics", icon: BarChart3 },
];

export function isProfilePathActive(pathname: string, href: string): boolean {
  if (href === "/profile") return pathname === "/profile";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ProfileNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const unread = useInboxStore((s) => s.unread);
  const showSuccess = usePurchasesStore((s) => s.showSuccess);

  return (
    <div className="space-y-1.5">
      {PROFILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = isProfilePathActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-[12px] border-2 px-3 py-2.5 text-sm font-bold transition-all duration-150",
              isActive
                ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]"
                : "border-transparent text-[var(--qs-muted)] hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
            )}
          >
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border-2 transition-colors",
                isActive
                  ? "border-white/25 bg-white/15 text-[var(--qs-on-brand)]"
                  : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-brand)] group-hover:border-[var(--qs-brand)]"
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <span className="min-w-0 truncate">{item.label}</span>
            {item.comingSoon && (
              <span
                className={cn(
                  "ml-auto shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.04em]",
                  isActive
                    ? "border-white/30 bg-white/15 text-[var(--qs-on-brand)]"
                    : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                )}
              >
                Coming soon
              </span>
            )}
            {item.href === "/profile/inbox" && unread > 0 && (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-1.5 text-[10px] font-extrabold text-[var(--qs-ink)]">
                {unread}
              </span>
            )}
            {item.href === "/profile/purchases" && showSuccess && !item.comingSoon && (
              <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-[var(--qs-sun)]" />
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
    <nav className="settings-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4 lg:h-full lg:flex-none lg:overflow-y-hidden">
      <div className="relative mb-5 overflow-hidden rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] p-3 shadow-[3px_3px_0_var(--qs-sun)]">
        <div className="relative flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
            {avatar ? (
              <Image
                src={avatar.url}
                alt={avatar.label}
                fill
                sizes="44px"
                unoptimized
                className="object-cover"
              />
            ) : (
              <span className="grid h-full w-full place-items-center bg-[var(--qs-brand)] text-sm font-extrabold text-[var(--qs-on-brand)]">
                {(user?.username || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-[var(--qs-ink)]">
              {user?.username || "Your profile"}
            </p>
            <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
              Student profile
            </p>
          </div>
        </div>
      </div>

      <p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--qs-muted)]">
        Your space
      </p>

      <ProfileNavLinks onNavigate={onNavigate} />

      <div className="my-4 h-0.5 rounded-full bg-[var(--qs-line)]" />

      <p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--qs-muted)]">
        Account
      </p>
      <Link
        href="/settings"
        onClick={onNavigate}
        aria-current={settingsActive ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-[12px] border-2 px-3 py-2.5 text-sm font-bold transition-all duration-150",
          settingsActive
            ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]"
            : "border-transparent text-[var(--qs-muted)] hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
        )}
      >
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border-2 transition-colors",
            settingsActive
              ? "border-white/25 bg-white/15 text-[var(--qs-on-brand)]"
              : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-brand)] group-hover:border-[var(--qs-brand)]"
          )}
        >
          <Settings className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        <span className="min-w-0 truncate">Profile Settings</span>
      </Link>

      <div className="mt-5 rounded-[16px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5">
        <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-muted)]">
          Keep your identity fresh across quizzes, rooms and leaderboards from{" "}
          <Link
            href="/settings"
            onClick={onNavigate}
            className="font-extrabold text-[var(--qs-brand)] underline-offset-2 hover:underline"
          >
            Settings
          </Link>
          .
        </p>
      </div>
    </nav>
  );
}

export default function ProfileSidebar({ onNavigate }: { onNavigate?: () => void }) {
  useEffect(() => {
    loadInboxUnread();
  }, []);

  return (
    <aside className="sticky top-14 z-20 hidden h-[calc(100dvh-3.5rem)] w-[264px] shrink-0 self-start overflow-hidden border-r-2 border-[var(--qs-line)] bg-[var(--qs-surface)] lg:block">
      <ProfileSidebarContent onNavigate={onNavigate} />
    </aside>
  );
}

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
        className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r-2 border-[var(--qs-line)] bg-[var(--qs-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b-2 border-[var(--qs-line)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
              <User className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="text-sm font-extrabold text-[var(--qs-ink)]">Profile</span>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-[9px] border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
            aria-label="Close profile navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ProfileSidebarContent onNavigate={onClose} />
      </motion.div>
    </motion.div>
  );
}
