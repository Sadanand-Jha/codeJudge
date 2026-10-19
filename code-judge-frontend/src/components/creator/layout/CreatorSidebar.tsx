"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Database,
  FilePlus2,
  Layers,
  Users,
  Settings,
  Wallet,
  Coins,
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
  Megaphone,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useAuthStore } from "@/store/authStore";
import { FOCUS_MODE_ENABLED } from "@/config/focusMode";
import { verificationLabel, verificationState } from "@/lib/verification";

export interface CreatorNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  match?: (pathname: string) => boolean;
  color?: "pink" | "purple";
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
      { label: "All Quizzes", href: "/creator/quizzes", icon: ListChecks, match: (p) => p === "/creator/quizzes" || (p.startsWith("/creator/quizzes/") && !p.startsWith("/creator/quizzes/create") && !p.startsWith("/creator/quizzes/ai-generate")) },
      { label: "Create Quiz", href: "/creator/quizzes/create", icon: FilePlus2, match: (p) => p === "/creator/quizzes/create" || p === "/creator/quizzes/ai-generate" },
      { label: "Tests", href: "/creator/tests", icon: ClipboardList, match: (p) => p === "/creator/tests" || (p.startsWith("/creator/tests/") && !p.startsWith("/creator/tests/create")), color: "purple" },
      { label: "Create Test", href: "/creator/tests/create", icon: NotebookPen, match: (p) => p === "/creator/tests/create", color: "purple" },
      { label: "Test Series", href: "/creator/series", icon: Layers, color: "purple" },
      { label: "Create Test Series", href: "/creator/series/create", icon: FolderKanban, color: "purple" },
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
      { label: "Rooms", href: "/creator/rooms", icon: UserRound },
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
        match: (p) => p === "/creator/advertise" || p.startsWith("/creator/advertise/"),
      },
      { label: "Create Campaign", href: "/creator/advertise/create", icon: Plus },
    ],
  },
  {
    label: "Payments",
    items: [
      { label: "Buy Credits", href: "/creator/billing/credits", icon: Coins },
      // Selling pages disabled for now (routes commented out, components kept):
      // { label: "Earnings", href: "/creator/billing/earnings", icon: TrendingUp },
      { label: "Transactions", href: "/creator/billing/transactions", icon: ArrowLeftRight },
      // { label: "Payouts", href: "/creator/billing/payouts", icon: Banknote },
      { label: "Billing", href: "/creator/billing", icon: Wallet, exact: true },
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
  // Quizzes / Tests / Series
  "/creator/quizzes",
  "/creator/quizzes/create",
  "/creator/quizzes/ai-generate",
  "/creator/tests",
  "/creator/tests/create",
  "/creator/series",
  "/creator/series/create",
  // Problems & question bank
  "/creator/question-bank",
  "/creator/questions",
  "/creator/problems",
  "/creator/resources",
  "/creator/create",
  // Rooms
  "/creator/rooms",
  // Billing (credits + history; selling pages stay hidden)
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
  showLabels,
  onNavigate,
}: {
  item: CreatorNavItem;
  pathname: string;
  showLabels: boolean;
  onNavigate?: () => void;
}) {
  const isActive = item.match
    ? item.match(pathname)
    : item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const isAiStudio = item.href === "/creator/ai-studio";
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-label={showLabels ? undefined : item.label}
      title={showLabels ? undefined : item.label}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40",
        showLabels ? "px-3" : "justify-center px-0",
        isAiStudio
          ? "ai-studio-btn"
          : isActive ? "text-[var(--qs-ink)]" : "text-[var(--qs-muted)] hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)]"
      )}
    >
      {isActive && !isAiStudio && (
        <motion.span
          layoutId="creatorSidebarActive"
          className="absolute inset-0 rounded-lg border-2 border-[var(--qs-brand)]/25 bg-[var(--qs-brand)]/10"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      {isAiStudio ? (
        <span className="relative z-10 inline-flex shrink-0">
          <Icon className="h-5 w-5 text-white" />
        </span>
      ) : (
        <Icon
          className={cn(
            "relative z-10 h-[18px] w-[18px] shrink-0 transition-colors",
            isActive
              ? "text-[var(--qs-brand)]"
              : "text-[var(--qs-muted)] group-hover:text-[var(--qs-ink)]"
          )}
        />
      )}
      {showLabels && (
        <span className={cn("relative z-10 truncate", isAiStudio ? "text-white font-semibold" : isActive && "font-semibold")}>{item.label}</span>
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
  const showLabels = mobile || true;
  const user = useAuthStore((s) => s.user);
  const displayName = user?.displayName || user?.username || "Creator";
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const verification = verificationState(user?.isVerified);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Creator identity header */}
      <div className="border-b-2 border-[var(--qs-line)] px-4 py-3">
        <Link
          href={FOCUS_MODE_ENABLED ? "/creator/quizzes" : "/creator/profile"}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3 transition-colors hover:border-[var(--qs-brand)]/45"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--qs-brand)] text-sm font-bold text-white">
            {avatarInitial}
            {verification === "verified" && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--qs-ok)] ring-2 ring-[var(--qs-surface)]">
                <BadgeCheck className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-bold text-[var(--qs-ink)]">{displayName}</p>
            <p
              className={cn(
                "truncate text-[10px] font-medium",
                verification === "verified" ? "text-[var(--qs-ok)]" : "text-[var(--qs-warn)]"
              )}
            >
              {verificationLabel(verification)}
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto hide-scrollbar px-3 py-4">
        {CREATOR_NAV.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-6")}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--qs-muted)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  showLabels={showLabels}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 border-t-2 border-[var(--qs-line)] p-3">
        {BOTTOM_NAV.length > 0 && (
          <div className="space-y-0.5">
            {BOTTOM_NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-line)]/40 hover:text-[var(--qs-ink)]"
              >
                <item.icon className="h-4 w-4 text-[var(--qs-muted)]" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
        {/* Back to Student Mode — mobile only, at last of sidebar */}
        {mobile && (
          <div className="mt-3 border-t-2 border-[var(--qs-line)] pt-3">
            <Link
              href="/quiz"
              onClick={onNavigate}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border-2 border-[var(--qs-ink)]/80 bg-[var(--qs-brand)] px-3 py-2.5 text-[13px] font-bold text-white shadow-[3px_3px_0_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_var(--qs-sun)]"
            >
              <ArrowLeft className="h-4 w-4 text-white" />
              Back to Student Mode
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
