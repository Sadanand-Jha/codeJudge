"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/helpers";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BackButton from "@/components/layout/BackButton";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";
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
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
      >
        <img
          src={avatar?.url || DEFAULT_AVATAR_URL}
          alt={displayName}
          className="h-7 w-7 rounded-full object-cover"
        />
        <span className="hidden max-w-32 truncate text-xs font-semibold text-text-primary sm:block">{displayName}</span>
        <ChevronDown className={cn("hidden h-3 w-3 text-text-muted transition-transform sm:block", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-border bg-card p-1.5 shadow-xl"
          >
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-xs font-semibold text-text-primary">{displayName}</p>
              {user?.email && <p className="mt-0.5 truncate text-[10px] text-text-muted">{user.email}</p>}
            </div>
            <div className="pt-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center rounded-lg px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
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
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 min-w-0 w-full max-w-full items-center gap-2 border-b border-border bg-card/80 px-2.5 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none sm:shrink-0">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            aria-label="Open Studio navigation"
            className="-ml-1 shrink-0 rounded-lg p-2 text-text-secondary hover:bg-white/[0.04] lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <Link href="/creator" className="mr-1 flex min-w-0 shrink-0 items-center gap-1.5 sm:mr-2 sm:gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-violet-600">
            <span className="text-[10px] font-black text-white">S</span>
          </div>
          <span className="hidden truncate text-[13px] font-bold tracking-tight text-text-primary sm:block">Studio</span>
        </Link>

        {/* Back — internal Studio pages only (hidden across the quiz flow) */}
        <BackButton className="border-border bg-card/60" />

        <div className="mx-1 hidden h-4 w-px shrink-0 bg-border sm:block" />
        <nav className="hidden shrink-0 items-center gap-0.5 md:flex">
          {[
            { label: "Quizzes", href: "/creator/quizzes" },
            { label: "Library", href: "/creator/tests" },
          ].map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active ? "bg-white/[0.06] text-text-primary" : "text-text-secondary hover:bg-white/[0.03] hover:text-text-primary"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="hidden min-w-0 flex-1 sm:block" />
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        <WorkspaceSwitcher />
        <div className="hidden shrink-0 min-[350px]:flex">
          <ThemeToggle />
        </div>
        <ProfileMenu />
      </div>
    </header>
  );
}
