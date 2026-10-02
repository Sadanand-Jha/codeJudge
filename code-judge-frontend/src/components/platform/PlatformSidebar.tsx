"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Radio, Activity, FlaskConical, ListOrdered, Users,
  Sparkles, Server, AlertTriangle, Cpu, ShieldCheck, ScrollText,
  ArrowLeft, LogOut, Gauge, FileUp, ListChecks, type LucideIcon,
} from "lucide-react";
import { ownerLogout } from "@/services/auth";
import { clearPlatformSession, getPlatformEmail, notifyPlatformSessionInvalid } from "@/lib/platformToken";
import { StatusDot } from "@/components/platform/ui";

interface NavItem { label: string; href: string; icon: LucideIcon }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { label: "Overview", href: "/platform", icon: LayoutDashboard },
      { label: "Live now", href: "/platform/live", icon: Radio },
      { label: "Engagement", href: "/platform/engagement", icon: Activity },
      { label: "Recent activity", href: "/platform/activity", icon: Activity },
    ],
  },
  {
    label: "Product",
    items: [
      { label: "Quiz analytics", href: "/platform/quizzes", icon: FlaskConical },
      { label: "Top quizzes", href: "/platform/quizzes/top", icon: ListOrdered },
      { label: "User analytics", href: "/platform/users", icon: Users },
      { label: "Student progress", href: "/platform/users/progress", icon: Users },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { label: "Question ingestion", href: "/platform/question-import", icon: FileUp },
      { label: "Question bank", href: "/platform/questions", icon: ListChecks },
      { label: "API observability", href: "/platform/observability", icon: Gauge },
      { label: "AI usage", href: "/platform/ai", icon: Sparkles },
      { label: "Platform health", href: "/platform/health", icon: Server },
      { label: "Errors", href: "/platform/errors", icon: AlertTriangle },
      { label: "Background jobs", href: "/platform/jobs", icon: Cpu },
      { label: "Security", href: "/platform/security", icon: ShieldCheck },
      { label: "Audit log", href: "/platform/audit", icon: ScrollText },
    ],
  },
];

function SidebarBody({ onNavigate, healthOk }: { onNavigate?: () => void; healthOk?: boolean | null }) {
  const pathname = usePathname();
  const [platformEmail] = useState(() => getPlatformEmail());
  const [signingOut, setSigningOut] = useState(false);
  const name = platformEmail || "Owner";
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await ownerLogout();
    } finally {
      clearPlatformSession();
      notifyPlatformSessionInvalid(401);
      setSigningOut(false);
      onNavigate?.();
    }
  };
  const isActive = (href: string) =>
    href === "/platform" ? pathname === "/platform" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--border)] px-4 pb-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#EC4899] to-[#8B5CF6] text-[14px] font-black text-white shadow-[0_8px_24px_rgba(236,72,153,.24)]">
            C
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">CodeJudge</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Control center</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--platform-soft)] p-2.5">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--platform-soft-strong)] text-[11px] font-semibold text-[var(--text-primary)]">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12px] font-medium text-[var(--text-primary)]">{name}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#EC4899]">Private owner</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-[var(--success)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_15%,transparent)]" aria-label="Signed in" />
        </div>
      </div>

      {/* Nav — nested routes; each page fetches only its own API */}
      <nav className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Platform sections">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-5" : ""}>
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onNavigate?.()}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-[7px] text-left text-[12px] transition-colors ${
                      active
                        ? "bg-[var(--card-hover)] font-medium text-[var(--text-primary)] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-[#EC4899]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <item.icon size={15} className={active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: health + back */}
      <div className="shrink-0 border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)]">
          <StatusDot status={healthOk === null || healthOk === undefined ? "unknown" : healthOk ? "operational" : "down"} />
          {healthOk === null || healthOk === undefined ? "Health on /health" : healthOk ? "Operational" : "Attention needed"}
        </div>
        <Link
          href="/quiz"
          className="mt-1 flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={15} className="text-[var(--text-muted)]" />
          Back to Quiz
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="mt-0.5 flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-[var(--text-secondary)] hover:bg-[var(--danger)]/8 hover:text-[var(--danger)] disabled:opacity-50"
        >
          <LogOut size={15} />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}

export function PlatformSidebar({ healthOk }: { healthOk?: boolean | null }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-[100dvh] w-[248px] border-r border-[var(--border)] bg-[var(--card)] shadow-[8px_0_32px_rgba(0,0,0,.035)] lg:block" aria-label="Platform navigation">
      <SidebarBody healthOk={healthOk} />
    </aside>
  );
}

export function PlatformSidebarDrawer({ open, onClose, healthOk }: { open: boolean; onClose: () => void; healthOk?: boolean | null }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Platform navigation">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <aside className="absolute left-0 top-0 h-[100dvh] w-[min(288px,86vw)] border-r border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <SidebarBody onNavigate={onClose} healthOk={healthOk} />
      </aside>
    </div>
  );
}
