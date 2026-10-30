"use client";

import Link from "next/link";
import {
  ClipboardList,
  Database,
  Users,
  Settings,
  Wallet,
  Coins,
  CalendarClock,
  ArrowLeftRight,
  ArrowLeft,
  BookOpen,
  UserRound,
  Globe,
  Building2,
  ShieldCheck,
  NotebookPen,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Boxes,
  BadgeCheck,
  Sparkles,
  MessageSquare,
  MailPlus,
  FileImage,
  Lock,
  Megaphone,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useAuthStore } from "@/store/authStore";
import { FOCUS_MODE_ENABLED } from "@/config/focusMode";
import { verificationLabel, verificationState } from "@/lib/verification";
import { useMySubscription } from "@/hooks/useMySubscription";
import { canUseCustomHeader } from "@/lib/planAccess";

export interface CreatorNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  match?: (pathname: string) => boolean;
  color?: "pink" | "purple";
  premium?: boolean;
}

const _FULL_CREATOR_NAV: Array<{ label: string; items: CreatorNavItem[] }> = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/creator", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Quizzes",
    items: [
      { label: "All Quizzes", href: "/creator/quizzes", icon: ListChecks, match: (p) => p === "/creator/quizzes" || p.startsWith("/creator/quizzes/") },
      { label: "Tests", href: "/creator/tests", icon: ClipboardList, match: (p) => p === "/creator/tests" || (p.startsWith("/creator/tests/") && !p.startsWith("/creator/tests/create")), color: "purple" },
      { label: "My Headers", href: "/creator/headers", icon: FileImage, premium: true },
      { label: "Create Test", href: "/creator/tests/create", icon: NotebookPen, match: (p) => p === "/creator/tests/create", color: "purple" },
    ],
  },
  {
    label: "Question Bank",
    items: [
      { label: "Question Bank", href: "/creator/question-bank", icon: Database },
      { label: "Problems", href: "/creator/problems", icon: NotebookPen },
      { label: "Resources", href: "/creator/resources", icon: FolderKanban },
    ],
  },
  {
    label: "Participants",
    items: [
      { label: "Students", href: "/creator/students", icon: Users },
      { label: "Classes", href: "/creator/classes", icon: GraduationCap },
      { label: "Batches", href: "/creator/batches", icon: Boxes },
      { label: "Organizations", href: "/creator/organizations", icon: Building2 },
      { label: "Invitations", href: "/creator/invitations", icon: MailPlus },
      { label: "My Rooms", href: "/creator/rooms", icon: UserRound },
    ],
  },
  {
    label: "AI Studio",
    items: [
      { label: "AI Studio", href: "/creator/ai-studio", icon: Sparkles },
      { label: "AI Chat", href: "/ai/chat", icon: MessageSquare },
    ],
  },
  {
    label: "Advertise",
    items: [
      {
        label: "Advertise",
        href: "/creator/advertise",
        icon: Megaphone,
        match: (p) => p === "/creator/advertise" || (p.startsWith("/creator/advertise/") && !p.startsWith("/creator/advertise/create")),
      },
      { label: "Create Campaign", href: "/creator/advertise/create", icon: Plus, match: (p) => p === "/creator/advertise/create" },
    ],
  },
  {
    label: "Payments",
    items: [
      { label: "Billing overview", href: "/creator/billing", icon: Wallet, exact: true },
      { label: "Monthly plans", href: "/creator/billing/plans", icon: CalendarClock },
      { label: "AI credits", href: "/creator/billing/credits", icon: Coins },
      { label: "Transactions", href: "/creator/billing/transactions", icon: ArrowLeftRight },
      // Selling pages disabled for now (routes commented out, components kept):
      // { label: "Earnings", href: "/creator/billing/earnings", icon: TrendingUp },
      // { label: "Payouts", href: "/creator/billing/payouts", icon: Banknote },
      // { label: "Refunds", href: "/creator/billing/refunds", icon: RotateCcw },
      // { label: "Tax & Compliance", href: "/creator/billing/tax", icon: Scale },
      // { label: "Documents", href: "/creator/billing/documents", icon: FileText },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Creator Profile", href: "/creator/profile", icon: UserRound, exact: true },
      { label: "Public Profile", href: "/creator/profile/public", icon: Globe },
      { label: "Company / Org", href: "/creator/company", icon: Building2, exact: true },
      { label: "Verification", href: "/creator/verification", icon: ShieldCheck },
      { label: "Settings", href: "/creator/settings", icon: Settings },
    ],
  },
];

// Focus mode: only Problems / Quizzes / Tests (& related question bank) remain visible.
// Payments, analytics, participants, advertise, AI studio, settings etc. are hidden.
const FOCUS_CREATOR_ALLOWED = new Set([
  // Quizzes / Tests
  "/creator/quizzes",
  "/creator/quizzes/create",
  "/creator/quizzes/ai-generate",
  "/creator/tests",
  "/creator/tests/create",
  "/creator/headers",
  // Problems & question bank
  "/creator/question-bank",
  "/creator/questions",
  "/creator/problems",
  "/creator/resources",
  "/creator/create",
  // Rooms
  "/creator/rooms",
  // Billing (plans, credits + history; selling pages stay hidden)
  "/creator/billing/plans",
  "/creator/billing/credits",
  "/creator/billing/transactions",
]);

// Exact-only routes: prefix matching on "/creator" would unlock every studio
// page, and "/creator/billing" would unlock the hidden selling pages.
const FOCUS_CREATOR_EXACT = new Set([
  "/creator",
  "/creator/billing",
]);

function isFocusAllowedHref(href: string): boolean {
  if (FOCUS_CREATOR_EXACT.has(href)) return true;
  for (const allowed of FOCUS_CREATOR_ALLOWED) {
    if (href === allowed || href.startsWith(allowed + "/")) return true;
  }
  return false;
}

const _FOCUS_CREATOR_NAV: Array<{ label: string; items: CreatorNavItem[] }> = _FULL_CREATOR_NAV
  .map((group) => ({
    ...group,
    items: group.items.filter((item) => isFocusAllowedHref(item.href)),
  }))
  .filter((group) => group.items.length > 0);

export const CREATOR_NAV: Array<{ label: string; items: CreatorNavItem[] }> = FOCUS_MODE_ENABLED ? _FOCUS_CREATOR_NAV : _FULL_CREATOR_NAV;

const _FULL_BOTTOM_NAV: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Upgrade", href: "/pricing", icon: Sparkles },
  { label: "Help Center", href: "/docs", icon: BookOpen },
];
const BOTTOM_NAV: Array<{ label: string; href: string; icon: LucideIcon }> = FOCUS_MODE_ENABLED ? [] : _FULL_BOTTOM_NAV;

function NavRow({
  item,
  pathname,
  onNavigate,
  premiumLocked = false,
}: {
  item: CreatorNavItem;
  pathname: string;
  onNavigate?: () => void;
  premiumLocked?: boolean;
}) {
  const isActive = item.match
    ? item.match(pathname)
    : item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-[13px] font-bold outline-none transition-all duration-150 focus-visible:ring-3 focus-visible:ring-[var(--qs-brand)]/40",
        isActive
          ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] shadow-[3px_3px_0_var(--qs-sun)]"
          : "border-transparent text-[var(--qs-muted)] hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          isActive
            ? "text-[var(--qs-on-brand)]"
            : "text-[var(--qs-muted)] group-hover:text-[var(--qs-ink)]"
        )}
      />
      <span className={cn("min-w-0 flex-1 truncate", isActive && "font-extrabold text-[var(--qs-on-brand)]")}>
        {item.label}
      </span>
      {item.premium && (
        premiumLocked ? (
          <Lock className="h-3 w-3 shrink-0 text-[var(--qs-muted)]" aria-label="Pro plan required" />
        ) : (
          <span className="shrink-0 rounded-full border border-current px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.08em] opacity-75">
            Pro
          </span>
        )
      )}
    </Link>
  );
}

export function CreatorSidebar({
  pathname,
  mobile = false,
  onNavigate,
}: {
  pathname: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const { subscription } = useMySubscription();
  const premiumLocked = !canUseCustomHeader(subscription);
  const displayName = user?.displayName || user?.username || "Creator";
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const verification = verificationState(user?.isVerified);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Brand header — mirrors the student sidebar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-[var(--qs-line)] px-3 py-3">
        <Link
          href="/creator"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5"
          aria-label="QuizSupport Creator Studio home"
        >
          <span className="min-w-0 truncate text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
            Creator Studio
          </span>
        </Link>
        {mobile && (
          <button
            type="button"
            onClick={onNavigate}
            className="b b-close sm shrink-0"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Creator identity */}
      <div className="shrink-0 border-b-2 border-[var(--qs-line)] px-3 py-2.5">
        <Link
          href={FOCUS_MODE_ENABLED ? "/creator/quizzes" : "/creator/profile"}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2 transition-colors hover:border-[var(--qs-brand)]"
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[12px] font-extrabold text-[var(--qs-on-brand)]">
            {avatarInitial}
            {verification === "verified" && (
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)]">
                <BadgeCheck className="h-2 w-2 text-[var(--qs-ink)]" />
              </span>
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-extrabold text-[var(--qs-ink)]">{displayName}</p>
            <p
              className={cn(
                "truncate text-[10px] font-bold",
                verification === "verified" ? "text-[var(--qs-ok)]" : "text-[var(--qs-warn)]"
              )}
            >
              {verificationLabel(verification)}
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="hide-scrollbar flex-1 overflow-y-auto px-2.5 py-3">
        {CREATOR_NAV.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="my-2 h-0.5 rounded-full bg-[var(--qs-line)]" />}
            <p className="px-3 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--qs-brand)]">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  premiumLocked={premiumLocked}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 space-y-1 border-t-2 border-[var(--qs-line)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {BOTTOM_NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className="group flex items-center gap-2.5 rounded-xl border-2 border-transparent px-3 py-2 text-[13px] font-bold text-[var(--qs-muted)] transition-all duration-150 hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
          >
            <item.icon className="h-4 w-4 text-[var(--qs-muted)] transition-colors group-hover:text-[var(--qs-ink)]" />
            {item.label}
          </Link>
        ))}
        {mobile && (
          <div className="border-t-2 border-[var(--qs-line)] pt-3">
            <Link href="/quiz" onClick={onNavigate} className="b b-pri w-full justify-start gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Student Mode
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
