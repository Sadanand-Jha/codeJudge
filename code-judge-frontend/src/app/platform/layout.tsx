"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { usePlatformGate, OwnerGate } from "@/components/platform/OwnerGate";
import { PlatformSidebar, PlatformSidebarDrawer } from "@/components/platform/PlatformSidebar";
import { GlobalSearch } from "@/components/platform/GlobalSearch";
import { SecureLogo } from "@/components/common/SecureLogo";
import { useTheme } from "@/context/ThemeContext";
import "./platform.css";

const CRUMB_LABELS: Record<string, string> = {
  live: "Live now",
  engagement: "Engagement",
  activity: "Recent activity",
  feedback: "User feedback",
  quizzes: "Quiz analytics",
  top: "Top quizzes",
  users: "User analytics",
  progress: "Student progress",
  "question-import": "Question ingestion",
  questions: "Question bank",
  observability: "API observability",
  models: "Model catalogue",
  ai: "AI usage",
  health: "Platform health",
  errors: "Errors",
  jobs: "Background jobs",
  security: "Security",
  audit: "Audit log",
};

const AI_OPS_CRUMBS: Record<string, string> = {
  "ai-ops": "AI operations",
  models: "Models & registry",
  routing: "Routing & fallbacks",
  usage: "Usage & costs",
  logs: "Request logs",
  access: "User access",
  credits: "Credits & billing",
  budgets: "Budgets & limits",
  health: "Health & alerts",
  settings: "Settings",
};

function crumbFor(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length <= 1) return "Overview";
  const last = parts[parts.length - 1];
  if (pathname.startsWith("/platform/ai-ops")) {
    const label = AI_OPS_CRUMBS[last] ?? "AI operations";
    return last === "ai-ops" ? label : `AI operations · ${label}`;
  }
  return CRUMB_LABELS[last] ?? last.replace(/-/g, " ");
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { gate, setGate } = usePlatformGate();
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Platform console is light-only like Creator Studio (no toggle in navbar).
  useEffect(() => {
    if (theme === "dark") setTheme("light");
  }, [theme, setTheme]);

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
    <div className="platform-shell qs-ui relative min-h-screen overflow-x-clip">
      {/* No data fetching here — each nested page calls only its own API */}
      <PlatformSidebar />
      <PlatformSidebarDrawer open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="relative min-w-0 lg:pl-60">
        <header className="sticky top-0 z-20 flex h-[58px] w-full items-center gap-2 border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 sm:px-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button onClick={() => setNavOpen(true)} className="shrink-0 rounded-lg p-2 text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)] lg:hidden" aria-label="Open Platform navigation">
              <Menu size={20} />
            </button>
            <Link href="/platform" className="flex shrink-0 items-center" aria-label="QuizSupport Platform home">
              <SecureLogo size={30} variant="mark" className="sm:hidden" />
              <SecureLogo size={40} variant="full" className="hidden sm:block" />
            </Link>
            <span className="hidden shrink-0 whitespace-nowrap rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-0.5 text-[9px] font-extrabold tracking-[0.14em] text-[var(--qs-brand)] md:inline">OWNER CONSOLE</span>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-1.5">
            <GlobalSearch />
            <span className="hidden shrink-0 whitespace-nowrap rounded-full border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] px-2 py-px text-[9px] font-extrabold tracking-[0.14em] text-[var(--qs-bad)] xl:inline-flex">
              PRIVATE · OWNER
            </span>
            <Link href="/platform" aria-label="Owner profile" className="flex items-center gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-1 pl-1 pr-2 transition-colors hover:border-[var(--qs-brand)]">
              <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[11px] font-extrabold text-[var(--qs-on-brand)]">O</span>
            </Link>
          </div>
        </header>
        <div className="border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-2 md:px-6 xl:px-8">
          <nav className="flex items-center gap-1.5 text-[13px] text-[var(--qs-muted)]" aria-label="Breadcrumb">
            <Link href="/quiz" className="font-bold hover:text-[var(--qs-brand)]">QuizSupport</Link>
            <span>/</span>
            <Link href="/platform" className="font-bold hover:text-[var(--qs-brand)]">Platform</Link>
            {pathname !== "/platform" && (
              <>
                <span>/</span>
                <span className="font-extrabold capitalize text-[var(--qs-ink)]">{crumbFor(pathname)}</span>
              </>
            )}
          </nav>
        </div>
        <main className="mx-auto max-w-[1480px] min-w-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
          {children}
          <p className="pb-4 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
            {pathname.startsWith("/platform/ai-ops")
              ? "AI operations demo workspace · Sample data only · Backend integration pending"
              : "Private owner console · Real platform data only · Unavailable telemetry is never estimated"}
          </p>
        </main>
      </div>
    </div>
  );
}
