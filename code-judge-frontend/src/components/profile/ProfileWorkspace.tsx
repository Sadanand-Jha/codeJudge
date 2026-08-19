"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, User } from "lucide-react";
import ProfileSidebar, { ProfileMobileNav, PROFILE_NAV_ITEMS } from "./ProfileSidebar";
import { isProfilePathActive } from "./ProfileSidebar";

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
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <ProfileSidebar />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Mobile profile action bar */}
        <div className="sticky top-14 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setNavOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-border-hover"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#F59E0B] to-[#F97316]">
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
