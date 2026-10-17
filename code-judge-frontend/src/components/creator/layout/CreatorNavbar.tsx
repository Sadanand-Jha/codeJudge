"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Coins } from "lucide-react";
import { cn } from "@/lib/helpers";
import { SecureLogo } from "@/components/common/SecureLogo";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { useSavedAvatar } from "@/store/avatarStore";
import { useAuthStore } from "@/store/authStore";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
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
    { label: "Creator Profile", href: "/creator/profile" },
    { label: "Public Profile", href: "/creator/profile/public" },
    { label: "Settings", href: "/creator/settings" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open creator profile menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--qs-line)]/40"
      >
        <img
          src={avatar?.url || DEFAULT_AVATAR_URL}
          alt={displayName}
          className="h-7 w-7 rounded-full object-cover"
        />
        <span className="hidden max-w-32 truncate text-xs font-semibold text-[var(--qs-ink)] sm:block">{displayName}</span>
        <ChevronDown className={cn("hidden h-3 w-3 text-[var(--qs-muted)] transition-transform sm:block", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-1.5 shadow-[0_14px_36px_rgba(26,18,64,0.18)]"
          >
            <div className="border-b-2 border-[var(--qs-line)] px-3 py-2">
              <p className="truncate text-xs font-semibold text-[var(--qs-ink)]">{displayName}</p>
              {user?.email && <p className="mt-0.5 truncate text-[10px] text-[var(--qs-muted)]">{user.email}</p>}
            </div>
            <div className="pt-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center rounded-lg px-3 py-2 text-xs font-medium text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CreatorNavbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const creditBalance = useAICreditsStore((s) => s.balance.totalRemaining);
  return (
    <header className="qs-ui sticky top-0 z-30 flex h-14 min-w-0 w-full max-w-full items-center gap-2 border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)]/85 px-2.5 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none sm:shrink-0">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            aria-label="Open Studio navigation"
            className="-ml-1 shrink-0 rounded-lg p-2 text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        {/* Brand — full wordmark on desktop; icon-only mark on mobile so it
            doesn't overlap the credits/workspace/profile actions. */}
        <Link href="/creator/quizzes" className="flex shrink-0 items-center" aria-label="QuizSupport Creator Studio home">
          <SecureLogo size={36} variant="mark" className="sm:hidden" />
          <SecureLogo size={48} variant="full" className="hidden sm:block" />
        </Link>
      </div>

      <div className="hidden min-w-0 flex-1 sm:block" />
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        <Link
          href="/creator/billing/credits"
          title="Buy AI credits"
          aria-label={`${creditBalance} AI credits left. Buy more.`}
          className="mr-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/25 px-2.5 py-1.5 text-xs font-bold tabular-nums text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-sun)]/45"
        >
          <Coins className="h-3.5 w-3.5" />
          {creditBalance}
        </Link>
        <WorkspaceSwitcher />
        <ProfileMenu />
      </div>
    </header>
  );
}
