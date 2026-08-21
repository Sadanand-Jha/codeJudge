"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, Compass } from "lucide-react";
import PreparationSidebar, {
  PreparationMobileNav,
  isPrepPathActive,
} from "./PreparationSidebar";
import { preparationModules } from "@/config/preparation";

/**
 * Preparation Workspace
 *
 * A dedicated workspace for the preparation area with its own left-side
 * navigation — mirroring the Profile workspace. The main website rail keeps
 * a single "Preparation" entry; this second sidebar lists the sections.
 *
 * Desktop: sticky sidebar + content.
 * Mobile : a preparation action bar that opens the nav as a drawer.
 */
export default function PreparationWorkspace({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  const activeItem = preparationModules.find((m) => isPrepPathActive(pathname, m.href));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <PreparationSidebar />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Mobile preparation action bar */}
        <div className="sticky top-14 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setNavOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-border-hover"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#EC4899] to-[#8B5CF6]">
              <Compass className="h-3 w-3 text-white" />
            </span>
            {activeItem?.label ?? "Preparation"}
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            Preparation
          </span>
        </div>

        {children}
      </div>

      <AnimatePresence>
        {navOpen && <PreparationMobileNav open={navOpen} onClose={() => setNavOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
