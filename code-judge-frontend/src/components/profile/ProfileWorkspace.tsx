"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, User } from "lucide-react";
import ProfileSidebar, { ProfileMobileNav, PROFILE_NAV_ITEMS } from "./ProfileSidebar";
import { isProfilePathActive } from "./ProfileSidebar";
import QuizSpaceAtmosphere from "@/components/quiz/live/QuizSpaceAtmosphere";

/**
 * Profile Workspace
 *
 * A dedicated workspace for the user's profile with its own
 * left-side navigation — mirroring the existing Settings page.
 *
 * Desktop: sticky sidebar + content.
 * Mobile : a profile action bar that opens the nav as a drawer.
 */
export default function ProfileWorkspace({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  const activeItem = PROFILE_NAV_ITEMS.find((i) => isProfilePathActive(pathname, i.href));

  return (
    <div className="profile-theme relative flex min-h-[calc(100dvh-3.5rem)] overflow-x-hidden bg-[#fffdfb] transition-colors duration-500 dark:bg-[#070912]">
      <div className="pointer-events-none fixed inset-x-0 bottom-0 top-14 z-0" aria-hidden="true">
        <QuizSpaceAtmosphere />
        <div className="absolute inset-0 bg-white/62 dark:bg-[#070912]/35" />
      </div>
      {/* Desktop sidebar */}
      <ProfileSidebar />

      {/* Main content */}
      <div className="relative z-10 min-w-0 flex-1 overflow-x-hidden">
        {/* Mobile profile action bar */}
        <div className="sticky top-14 z-30 flex items-center justify-between gap-3 border-b border-pink-200/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-2xl dark:border-violet-400/10 dark:bg-[#0e1220]/80 lg:hidden">
          <button
            onClick={() => setNavOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-pink-200/80 bg-white/75 px-3.5 py-2 text-sm font-semibold text-text-primary shadow-sm transition-all hover:border-pink-300 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-violet-400/25"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-orange-400 dark:from-violet-600 dark:to-indigo-500">
              <User className="h-3 w-3 text-white" />
            </span>
            {activeItem?.label ?? "Profile"}
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            Profile
          </span>
        </div>

        {children}
      </div>

      <AnimatePresence>
        {navOpen && <ProfileMobileNav open={navOpen} onClose={() => setNavOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
