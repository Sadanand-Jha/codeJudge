"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Database,
  FilePlus2,
  Layers,
  Users,
  BarChart3,
  Settings,
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  ArrowLeft,
  Home,
  Banknote,
  RotateCcw,
  Scale,
  BookOpen,
  UserRound,
  Globe,
  Building2,
  ShieldCheck,
  NotebookPen,
  FolderKanban,
  GraduationCap,
  ListChecks,
  Boxes,
  Gauge,
  BadgeCheck,
  Presentation,
  Sparkles,
  MessageSquare,
  MailPlus,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { CREATOR_PROFILE } from "@/components/creator/workspace/mockData";

export interface CreatorNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  match?: (pathname: string) => boolean;
}

export const CREATOR_NAV: Array<{ label: string; items: CreatorNavItem[] }> = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/creator", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Content",
    items: [
      { label: "Tests", href: "/creator/tests", icon: ClipboardList },
      { label: "Quizzes", href: "/creator/quizzes", icon: ListChecks, exact: true },
      { label: "Test Series", href: "/creator/series", icon: Layers },
      { label: "Question Bank", href: "/creator/question-bank", icon: Database },
      { label: "Problems", href: "/creator/problems", icon: NotebookPen },
      { label: "Resources", href: "/creator/resources", icon: FolderKanban },
      { label: "AI Studio", href: "/creator/ai-studio", icon: Sparkles },
      { label: "AI Chat", href: "/ai/chat", icon: MessageSquare },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Create New", href: "/creator/create", icon: FilePlus2, exact: true },
      { label: "Create Test", href: "/creator/tests/create", icon: ClipboardList },
      { label: "Create Quiz", href: "/creator/quizzes/create", icon: ListChecks, match: (p) => p === "/creator/quizzes/create" || p === "/creator/quizzes/ai-generate" },
      { label: "Create Problem", href: "/creator/problems/create", icon: NotebookPen },
      { label: "Create Test Series", href: "/creator/series/create", icon: Layers },
    ],
  },
  {
    label: "Audience",
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
    label: "Analytics",
    items: [
      { label: "Overview", href: "/creator/analytics", icon: BarChart3, exact: true },
      { label: "Test Analytics", href: "/creator/analytics/test", icon: Gauge },
      { label: "Student Analytics", href: "/creator/analytics/students", icon: Users },
      { label: "Content Analytics", href: "/creator/analytics/content", icon: Presentation },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Earnings", href: "/creator/billing/earnings", icon: TrendingUp },
      { label: "Transactions", href: "/creator/billing/transactions", icon: ArrowLeftRight },
      { label: "Payouts", href: "/creator/billing/payouts", icon: Banknote },
      { label: "Billing", href: "/creator/billing", icon: Wallet, exact: true },
      { label: "Refunds", href: "/creator/billing/refunds", icon: RotateCcw },
      { label: "Tax & Compliance", href: "/creator/billing/tax", icon: Scale },
      { label: "Documents", href: "/creator/billing/documents", icon: FileText },
    ],
  },
  {
    label: "Creator",
    items: [
      { label: "Creator Profile", href: "/creator/profile", icon: UserRound, exact: true },
      { label: "Public Profile", href: "/creator/profile/public", icon: Globe },
      { label: "Company / Org", href: "/creator/company", icon: Building2, exact: true },
      { label: "Verification", href: "/creator/verification", icon: ShieldCheck },
      { label: "Settings", href: "/creator/settings", icon: Settings },
    ],
  },
];

const BOTTOM_NAV: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Upgrade", href: "/pricing", icon: Sparkles },
  { label: "Help Center", href: "/docs", icon: BookOpen },
];

function NavRow({
  item,
  pathname,
  showLabels,
}: {
  item: CreatorNavItem;
  pathname: string;
  showLabels: boolean;
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
      aria-label={showLabels ? undefined : item.label}
      title={showLabels ? undefined : item.label}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        showLabels ? "px-3" : "justify-center px-0",
        isAiStudio
          ? "ai-studio-btn"
          : isActive ? "text-text-primary" : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary dark:hover:bg-ai-hover"
      )}
    >
      {isActive && !isAiStudio && (
        <motion.span
          layoutId="creatorSidebarActive"
          className="absolute inset-0 rounded-lg border border-pink-500/20 bg-pink-500/[0.08] dark:border-ai-accent/20 dark:bg-ai-accent-soft"
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
            isActive ? "text-pink-500 dark:text-ai-accent" : "text-text-muted group-hover:text-text-primary"
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
  const creator = CREATOR_PROFILE;
  const avatarInitial = creator.displayName.charAt(0).toUpperCase();
  const isVerified = creator.verificationStatus === "verified";

  return (
    <div className="flex h-full w-full flex-col">
      {/* Creator identity header */}
      <div className="border-b border-border px-4 py-3">
        <Link
          href="/creator/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-pink-500/30 hover:bg-white/[0.03]"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-sm font-bold text-white">
            {avatarInitial}
            {isVerified && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                <BadgeCheck className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-bold text-text-primary">{creator.displayName}</p>
            <p className="truncate text-[10px] font-medium text-emerald-500">Verified Creator</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto hide-scrollbar px-3 py-4">
        {CREATOR_NAV.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-6")}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow key={item.href} item={item} pathname={pathname} showLabels={showLabels} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="space-y-0.5">
          {BOTTOM_NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
            >
              <item.icon className="h-4 w-4 text-text-muted" />
              {item.label}
            </Link>
          ))}
        </div>
        {/* Back to Student Mode — mobile only, at last of sidebar */}
        {mobile && (
          <div className="mt-3 border-t border-border pt-3">
            <Link
              href="/dashboard"
              onClick={onNavigate}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
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