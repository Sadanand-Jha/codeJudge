"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Radio, Activity, FlaskConical, ListOrdered, Users,
  Sparkles, Server, AlertTriangle, Cpu, ShieldCheck, ScrollText,
  ArrowLeft, LogOut, Gauge, FileUp, ListChecks, MessageSquare, BookOpen,
  BarChart3, Boxes, CreditCard, GitBranch, HeartPulse, Settings2, Wallet,
  ChevronDown, type LucideIcon,
} from "lucide-react";
import { ownerLogout } from "@/services/auth";
import { clearPlatformSession, getPlatformEmail, notifyPlatformSessionInvalid } from "@/lib/platformToken";
import { StatusDot } from "@/components/platform/ui";
import { SecureLogo } from "@/components/common/SecureLogo";

interface NavItem { label: string; href: string; icon: LucideIcon }
interface NavGroup { label: string; collapsible?: boolean; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Overview", href: "/platform", icon: LayoutDashboard },
      { label: "Live now", href: "/platform/live", icon: Radio },
      { label: "Engagement", href: "/platform/engagement", icon: Activity },
      { label: "Recent activity", href: "/platform/activity", icon: Activity },
      { label: "User feedback", href: "/platform/feedback", icon: MessageSquare },
    ],
  },
  {
    label: "Product",
    items: [
      { label: "Quiz analytics", href: "/platform/quizzes", icon: FlaskConical },
      { label: "Top quizzes", href: "/platform/quizzes/top", icon: ListOrdered },
      { label: "Pricing", href: "/platform/pricing", icon: CreditCard },
      { label: "User analytics", href: "/platform/users", icon: Users },
      { label: "Student progress", href: "/platform/users/progress", icon: Users },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { label: "Question ingestion", href: "/platform/question-import", icon: FileUp },
      { label: "Syllabus ingestion", href: "/platform/syllabus-import", icon: BookOpen },
      { label: "Question bank", href: "/platform/questions", icon: ListChecks },
      { label: "API observability", href: "/platform/observability", icon: Gauge },
      { label: "Model catalogue", href: "/platform/models", icon: Boxes },
      { label: "AI usage", href: "/platform/ai", icon: Sparkles },
      { label: "Platform health", href: "/platform/health", icon: Server },
      { label: "Errors", href: "/platform/errors", icon: AlertTriangle },
      { label: "Background jobs", href: "/platform/jobs", icon: Cpu },
      { label: "Security", href: "/platform/security", icon: ShieldCheck },
      { label: "Audit log", href: "/platform/audit", icon: ScrollText },
    ],
  },
  {
    label: "AI Operations",
    collapsible: true,
    items: [
      { label: "Overview", href: "/platform/ai-ops", icon: Sparkles },
      { label: "Models", href: "/platform/ai-ops/models", icon: Boxes },
      { label: "Routing & fallbacks", href: "/platform/ai-ops/routing", icon: GitBranch },
      { label: "Usage & costs", href: "/platform/ai-ops/usage", icon: BarChart3 },
      { label: "Request logs", href: "/platform/ai-ops/logs", icon: ScrollText },
      { label: "User access", href: "/platform/ai-ops/access", icon: Users },
      { label: "Credits & billing", href: "/platform/ai-ops/credits", icon: CreditCard },
      { label: "Budgets & limits", href: "/platform/ai-ops/budgets", icon: Wallet },
      { label: "Health & alerts", href: "/platform/ai-ops/health", icon: HeartPulse },
      { label: "Settings", href: "/platform/ai-ops/settings", icon: Settings2 },
    ],
  },
];

function SidebarBody({ onNavigate, healthOk }: { onNavigate?: () => void; healthOk?: boolean | null }) {
  const pathname = usePathname();
  const [platformEmail] = useState(() => getPlatformEmail());
  const [signingOut, setSigningOut] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
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
  const isActive = (href: string) => {
    if (href === "/platform") return pathname === "/platform";
    // Exact match wins; parent stays inactive when a child route is open.
    // e.g. on /platform/quizzes/top only "Top quizzes" is active, not "Quiz analytics".
    if (pathname === href) return true;
    // Keep parent active only when directly on a deeper non-nav path (e.g. /platform/quizzes/123),
    // but never when the deeper path is itself a nav item.
    const allHrefs = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)));
    if (allHrefs.has(pathname)) return false;
    return pathname.startsWith(`${href}/`);
  };
  return (
    <div className="flex h-full w-full flex-col bg-[var(--qs-surface)]">
      {/* Brand header — mirrors Creator Studio */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-[var(--qs-line)] px-3 py-3">
        <Link
          href="/platform"
          onClick={() => onNavigate?.()}
          className="flex min-w-0 items-center gap-2.5"
          aria-label="QuizSupport Platform home"
        >
          <SecureLogo variant="mark" size={30} />
          <span className="min-w-0 truncate text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
            Owner Console
          </span>
        </Link>
      </div>
      {/* Owner identity */}
      <div className="shrink-0 border-b-2 border-[var(--qs-line)] px-3 py-2.5">
        <div className="flex items-center gap-2.5 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[12px] font-extrabold text-[var(--qs-on-brand)]">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-extrabold text-[var(--qs-ink)]">{name}</p>
            <p className="truncate text-[10px] font-bold text-[var(--qs-ok)]">Private owner</p>
          </div>
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--qs-ok)]" aria-label="Signed in" />
        </div>
      </div>

      {/* Nav — nested routes; each page fetches only its own API */}
      <nav className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 py-3" aria-label="Platform sections">
        {NAV_GROUPS.map((group, gi) => {
          const groupActive = group.items.some((item) => isActive(item.href));
          const collapsed = (collapsedGroups[group.label] ?? false) && !groupActive;
          return (
            <div key={group.label}>
              {gi > 0 && <div className="my-2 h-0.5 rounded-full bg-[var(--qs-line)]" />}
              {group.collapsible ? (
                <button
                  type="button"
                  onClick={() => setCollapsedGroups((prev) => ({ ...prev, [group.label]: !collapsed }))}
                  aria-expanded={!collapsed}
                  className="mb-1 flex w-full items-center justify-between rounded-[7px] px-3 py-1 pt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--qs-brand)]"
                >
                  {group.label}
                  <ChevronDown size={12} className={`transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                </button>
              ) : (
                <p className="px-3 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--qs-brand)]">
                  {group.label}
                </p>
              )}
              {collapsed ? null : (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onNavigate?.()}
                        aria-current={active ? "page" : undefined}
                        className={`group flex w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-[13px] font-bold transition-all duration-150 ${
                          active
                            ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] shadow-[3px_3px_0_var(--qs-sun)]"
                            : "border-transparent text-[var(--qs-muted)] hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
                        }`}
                      >
                        <item.icon size={18} className={active ? "shrink-0 text-[var(--qs-on-brand)]" : "shrink-0 text-[var(--qs-muted)] group-hover:text-[var(--qs-ink)]"} />
                        <span className={`truncate ${active ? "font-extrabold text-[var(--qs-on-brand)]" : ""}`}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom: health + back — mirrors Creator Studio */}
      <div className="shrink-0 space-y-1 border-t-2 border-[var(--qs-line)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold text-[var(--qs-muted)]">
          <StatusDot status={healthOk === null || healthOk === undefined ? "unknown" : healthOk ? "operational" : "down"} />
          {healthOk === null || healthOk === undefined ? "Health on /health" : healthOk ? "Operational" : "Attention needed"}
        </div>
        <Link
          href="/quiz"
          className="group flex items-center gap-2.5 rounded-xl border-2 border-transparent px-3 py-2 text-[13px] font-bold text-[var(--qs-muted)] transition-all duration-150 hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
        >
          <ArrowLeft size={16} className="text-[var(--qs-muted)] group-hover:text-[var(--qs-ink)]" />
          Back to Quiz
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex w-full items-center gap-2.5 rounded-xl border-2 border-transparent px-3 py-2 text-left text-[13px] font-bold text-[var(--qs-muted)] transition-all duration-150 hover:border-[var(--qs-bad)] hover:bg-[var(--qs-badbg)] hover:text-[var(--qs-bad)] disabled:opacity-50"
        >
          <LogOut size={16} />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}

export function PlatformSidebar({ healthOk }: { healthOk?: boolean | null }) {
  return (
    <aside data-sidebar="true" className="fixed inset-y-0 left-0 z-30 hidden h-[100dvh] w-60 shrink-0 border-r-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] lg:block" aria-label="Platform navigation">
      <SidebarBody healthOk={healthOk} />
    </aside>
  );
}

export function PlatformSidebarDrawer({ open, onClose, healthOk }: { open: boolean; onClose: () => void; healthOk?: boolean | null }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Platform navigation">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <aside className="absolute left-0 top-0 h-[100dvh] w-[min(280px,calc(100vw-2rem))] border-r-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
        <SidebarBody onNavigate={onClose} healthOk={healthOk} />
      </aside>
    </div>
  );
}
