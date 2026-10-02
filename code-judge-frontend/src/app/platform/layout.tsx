"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { usePlatformGate, OwnerGate } from "@/components/platform/OwnerGate";
import { PlatformSidebar, PlatformSidebarDrawer } from "@/components/platform/PlatformSidebar";
import { GlobalSearch } from "@/components/platform/GlobalSearch";
import ThemeToggle from "@/components/ui/ThemeToggle";

const CRUMB_LABELS: Record<string, string> = {
  live: "Live now",
  engagement: "Engagement",
  activity: "Recent activity",
  quizzes: "Quiz analytics",
  top: "Top quizzes",
  users: "User analytics",
  progress: "Student progress",
  "question-import": "Question ingestion",
  questions: "Question bank",
  observability: "API observability",
  ai: "AI usage",
  health: "Platform health",
  errors: "Errors",
  jobs: "Background jobs",
  security: "Security",
  audit: "Audit log",
};

function crumbFor(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length <= 1) return "Overview";
  const last = parts[parts.length - 1];
  return CRUMB_LABELS[last] ?? last.replace(/-/g, " ");
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { gate, setGate } = usePlatformGate();
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  if (gate === "checking") {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
        <div className="pf-skeleton h-8 w-2/3 rounded" />
        <div className="pf-skeleton mt-3 h-4 w-1/3 rounded" />
      </div>
    );
  }
  if (gate !== "open") {
    return (
      <div className="platform-shell min-h-screen bg-[var(--background)]">
        <OwnerGate mode={gate} onOpen={() => setGate("open")} />
      </div>
    );
  }

  return (
    <div className="platform-shell pf-canvas relative min-h-screen overflow-x-clip bg-[var(--background)] text-[var(--text-primary)]">
      {/* No data fetching here — each nested page calls only its own API */}
      <PlatformSidebar />
      <PlatformSidebarDrawer open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="relative min-w-0 lg:pl-[248px]">
        <div className="sticky top-0 z-20 -mx-0 flex h-[60px] items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)]/88 px-4 backdrop-blur-xl md:px-6 xl:px-8">
          <nav className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]" aria-label="Breadcrumb">
            <button onClick={() => setNavOpen(true)} className="mr-1 rounded-[8px] border border-[var(--border)] p-1.5 text-[var(--text-primary)] lg:hidden" aria-label="Open navigation">
              <Menu size={15} />
            </button>
            <Link href="/quiz" className="hover:text-[var(--text-primary)]">CodeJudge</Link>
            <span className="text-[var(--text-muted)]">/</span>
            <Link href="/platform" className="hover:text-[var(--text-primary)]">Platform</Link>
            {pathname !== "/platform" && (
              <>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="font-medium capitalize text-[var(--text-primary)]">{crumbFor(pathname)}</span>
              </>
            )}
            <span className="ml-1 hidden shrink-0 whitespace-nowrap rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.16em] text-[var(--text-muted)] sm:inline">OWNER CONSOLE</span>
          </nav>
          <div className="flex min-w-0 items-center justify-end gap-2 text-[12px] text-[var(--text-secondary)]">
            <GlobalSearch />
            <ThemeToggle className="h-8 w-14" />
            <span className="hidden shrink-0 whitespace-nowrap rounded border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-1.5 py-px text-[9px] font-semibold tracking-widest text-[var(--danger)] xl:inline-flex">
              PRIVATE · OWNER
            </span>
          </div>
        </div>
        <main className="mx-auto max-w-[1480px] scroll-mt-6 space-y-7 px-4 pb-8 pt-5 md:px-6 xl:px-8">
          {children}
          <p className="pb-4 text-center text-[11px] text-[var(--text-muted)]">
            Private owner console · Real platform data only · Unavailable telemetry is never estimated
          </p>
        </main>
      </div>
    </div>
  );
}
