"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, User } from "lucide-react";
import ProfileSidebar, { ProfileMobileNav, PROFILE_NAV_ITEMS } from "./ProfileSidebar";
import { isProfilePathActive } from "./ProfileSidebar";

export default function ProfileWorkspace({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  const activeItem = PROFILE_NAV_ITEMS.find((i) => isProfilePathActive(pathname, i.href));

  return (
    <div className="qs-ui profile-theme relative flex min-h-[calc(100dvh-3.5rem)] overflow-x-clip bg-[var(--qs-bg)]">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.32]"
          style={{
            backgroundImage:
              "linear-gradient(var(--qs-line) 1px, transparent 1px), linear-gradient(90deg, var(--qs-line) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[var(--qs-brand)]/10 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[var(--qs-sun)]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[var(--qs-brand)]/[0.07] blur-3xl" />
      </div>

      <ProfileSidebar />

      <div className="relative z-10 min-w-0 flex-1 overflow-x-clip">
        <div className="sticky top-14 z-30 flex items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)]/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <button
            onClick={() => setNavOpen(true)}
            className="flex items-center gap-2 rounded-[11px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-sm font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-[7px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
              <User className="h-3 w-3" strokeWidth={2.4} />
            </span>
            {activeItem?.label ?? "Profile"}
            <ChevronDown className="h-3.5 w-3.5 text-[var(--qs-muted)]" />
          </button>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--qs-muted)]">
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
