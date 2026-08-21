"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Flame, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { preparationModules, type PreparationModule } from "@/config/preparation";

/**
 * Preparation workspace navigation — mirrors the Profile sidebar pattern:
 * the main website rail holds a single "Preparation" entry, and everything
 * under /preparation/* gets this dedicated second sidebar listing the
 * preparation sections. Items are derived from src/config/preparation.ts,
 * so new modules appear here automatically.
 */

export function isPrepPathActive(pathname: string, href: string): boolean {
  // Overview only matches the hub itself, every other module matches its prefix.
  if (href === "/preparation") return pathname === "/preparation";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ACTIVE_CLS = "bg-[#EC4899]/10 text-text-primary shadow-[inset_0_0_0_1px_rgba(236,72,153,0.25)]";

function PrepNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      {preparationModules.map((item: PreparationModule) => {
        const Icon = item.icon;
        const isActive = isPrepPathActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive ? ACTIVE_CLS : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br transition-transform duration-200",
                item.tone,
                isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100 group-hover:scale-110"
              )}
            >
              <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
            </span>
            <span className={cn("transition-colors", isActive ? "font-semibold text-text-primary" : "text-text-secondary")}>
              {item.label}
            </span>
            {isActive && (
              <motion.span
                layoutId="prepNavActive"
                className="absolute right-2 h-1.5 w-1.5 rounded-full bg-[#EC4899] shadow-[0_0_8px_rgba(236,72,153,0.8)]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}

/** Compact journey summary pinned to the bottom of the sidebar. */
function PrepProgressCard() {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card-hover/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">Your journey</p>
        <Flame className="h-3.5 w-3.5 text-[#EC4899]" />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-lg font-extrabold text-text-primary">68%</span>
        <span className="text-[10px] text-text-muted">complete</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6]" />
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
        Software Engineer track · 12-day streak
      </p>
    </div>
  );
}

export function PreparationSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="settings-scroll h-full overflow-y-auto p-4">
      <p className="px-3 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
        Preparation
      </p>

      <PrepNavLinks onNavigate={onNavigate} />

      <PrepProgressCard />
    </nav>
  );
}

/**
 * Desktop preparation sidebar — sticky below the app navbar.
 */
export default function PreparationSidebar() {
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border bg-card lg:block">
      <PreparationSidebarContent />
    </aside>
  );
}

/**
 * Mobile preparation navigation drawer.
 */
export function PreparationMobileNav({
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#8B5CF6]">
              <Flame className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-sm font-bold text-text-primary">Preparation</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-accent/5 hover:text-text-primary"
            aria-label="Close preparation navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <PreparationSidebarContent onNavigate={onClose} />
      </motion.div>
    </motion.div>
  );
}
