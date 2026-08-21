"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Loader2, Plus } from "lucide-react";
import { CreatorSidebar, CREATOR_NAV } from "./CreatorSidebar";
import { useAuthStore } from "@/store/authStore";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { CreatorNotifications } from "@/components/creator/workspace/notifications";

function useBreadcrumb(pathname: string): string[] {
  for (const group of CREATOR_NAV) {
    const match = group.items.find((n) =>
      n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`)
    );
    if (match) return [group.label, match.label];
  }
  return ["Creator Studio"];
}

export default function CreatorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const breadcrumb = useBreadcrumb(pathname);
  const title = breadcrumb[0] === "Creator Studio" ? "Creator Studio" : `${breadcrumb[0]} / ${breadcrumb[1]}`;

  const avatarInitial = user?.username?.[0]?.toUpperCase() ?? "C";

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ai-bg">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-ai-bg" data-ai-scope>
      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer sidebar */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-y-0 left-0 z-50 w-[300px] border-r border-border bg-card shadow-2xl lg:hidden"
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-white/[0.06]"
            >
              <X className="h-4 w-4" />
            </button>
            <CreatorSidebar pathname={pathname} mobile onNavigate={() => setDrawerOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border bg-card lg:block">
        <CreatorSidebar pathname={pathname} />
      </aside>

      {/* Main column */}
      <div className="lg:pl-[264px]">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-ai-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-text-secondary transition-colors hover:text-text-primary lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          <h1 className="min-w-0 truncate text-[15px] font-bold tracking-tight text-text-primary">{title}</h1>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/creator/create"
              className="hidden items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-2 text-xs font-bold text-white transition-all hover:brightness-105 sm:flex"
            >
              <Plus className="h-3.5 w-3.5" />
              Create
            </Link>
            <ThemeToggle />
            <CreatorNotifications />
            <Link
              href="/creator/profile"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-xs font-bold text-white ring-2 ring-white/10 transition-shadow hover:shadow-[0_0_16px_rgba(236,72,153,0.35)]"
              aria-label="Creator Profile"
              title={user?.username ?? "Account"}
            >
              {avatarInitial}
            </Link>
          </div>
        </header>

        {/* The quiz studio is a full-bleed workspace — keep it tight to the navbar. */}
        <main
          className={
            pathname.startsWith("/creator/quizzes/create") || pathname.startsWith("/creator/quizzes/ai-generate")
              ? "px-4 pt-0 pb-6 sm:px-6 lg:px-8"
              : "px-4 py-6 sm:px-6 lg:px-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
