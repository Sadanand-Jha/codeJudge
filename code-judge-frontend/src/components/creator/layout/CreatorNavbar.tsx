"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Coins, Globe2, LogOut, Settings, UserRound } from "lucide-react";
import { cn } from "@/lib/helpers";
import { SecureLogo } from "@/components/common/SecureLogo";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";
import { useCreditState } from "@/hooks/useCreditState";
import { useSavedAvatar } from "@/store/avatarStore";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const requestLogout = useUIStore((state) => state.requestLogout);
  const avatar = useSavedAvatar();
  const displayName = user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Creator";

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const menuItems = [
    { label: "Creator Profile", href: "/creator/profile", icon: UserRound },
    { label: "Public Profile", href: "/creator/profile/public", icon: Globe2 },
    { label: "Settings", href: "/creator/settings", icon: Settings },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open creator profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-1 pl-1 pr-2 transition-colors hover:border-[var(--qs-brand)]"
      >
        <img
          src={avatar?.url || DEFAULT_AVATAR_URL}
          alt={displayName}
          className="h-7 w-7 rounded-full border-2 border-[var(--qs-ink)] object-cover"
        />
        <span className="hidden max-w-32 truncate text-xs font-bold text-[var(--qs-ink)] sm:block">{displayName}</span>
        <ChevronDown className={cn("hidden h-3.5 w-3.5 text-[var(--qs-muted)] transition-transform sm:block", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-2 shadow-[5px_5px_0_var(--qs-sun)]"
          >
            <div className="flex items-center gap-3 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5">
              <img
                src={avatar?.url || DEFAULT_AVATAR_URL}
                alt={displayName}
                className="h-10 w-10 shrink-0 rounded-full border-2 border-[var(--qs-ink)] object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-extrabold text-[var(--qs-ink)]">{displayName}</p>
                {user?.email && <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--qs-muted)]">{user.email}</p>}
              </div>
            </div>
            <div className="mt-1.5 space-y-0.5">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-1.5 border-t-2 border-[var(--qs-line)] pt-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  requestLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-[var(--qs-bad)] transition-colors hover:bg-[var(--qs-badbg)]"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CreatorNavbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const { state: creditState, balance: creditBalance } = useCreditState();
  const empty = creditState === "empty";
  const unknown = creditState === "unknown";

  return (
    <header className="creator-topbar qs-ui sticky top-0 z-40 flex h-[58px] min-w-0 w-full max-w-full items-center gap-2 border-b border-ai-border bg-ai-sidebar px-2.5 sm:border-b-2 sm:border-[var(--qs-line)] sm:bg-[var(--qs-surface)]/85 sm:px-3.5 sm:backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 items-center gap-4 sm:flex-none sm:shrink-0 sm:gap-1">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            aria-label="Open Studio navigation"
            className="shrink-0 rounded-lg p-2 text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)] sm:-ml-1 lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        {/* Brand — full wordmark on desktop; icon-only mark on mobile so it
            doesn't overlap the credits/workspace/profile actions. */}
        <Link href="/creator" className="flex shrink-0 items-center" aria-label="QuizSupport Creator Studio home">
          <SecureLogo size={30} variant="mark" className="sm:hidden" />
          <SecureLogo size={40} variant="full" className="hidden sm:block" />
        </Link>
      </div>

      <div className="hidden min-w-0 flex-1 sm:block" />
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        <Link
          href="/creator/billing/credits"
          title={empty ? "Buy AI credits" : "Buy AI credits"}
          aria-label={
            empty
              ? "0 AI credits left. Buy credits."
              : unknown
                ? "AI credit balance loading."
                : `${creditBalance} AI credits left. Buy more.`
          }
          data-credit-chip={creditState}
          className={cn(
            "mr-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-2 py-1 text-[10px] font-bold tabular-nums transition-colors sm:text-[11px]",
            empty
              ? "border-[var(--qs-credit-chip-border)] bg-[var(--qs-credit-chip-bg)] text-[var(--qs-credit-chip-text)] hover:brightness-[0.98]"
              : "border-[var(--qs-sun)] bg-[var(--qs-sun)]/25 text-[var(--qs-ink)] hover:bg-[var(--qs-sun)]/45"
          )}
        >
          <Coins className="h-3 w-3 shrink-0" />
          {unknown ? (
            <span className="whitespace-nowrap">— credits</span>
          ) : empty ? (
            <>
              <span className="whitespace-nowrap">0 credits left</span>
              <span className="whitespace-nowrap border-l border-current/30 pl-1.5 underline underline-offset-2">
                Buy credits
              </span>
            </>
          ) : (
            <span>{creditBalance}</span>
          )}
        </Link>
        <WorkspaceSwitcher />
        <ProfileMenu />
      </div>
    </header>
  );
}
