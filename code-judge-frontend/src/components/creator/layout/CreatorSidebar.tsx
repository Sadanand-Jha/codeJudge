"use client";

import Link from "next/link";
import {
  ClipboardList,
  Database,
  Wallet,
  CalendarClock,
  ArrowLeft,
  BookOpen,
  UserRound,
  NotebookPen,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  BadgeCheck,
  FileImage,
  Lock,
  Share2,
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
  section: CreatorNavSection;
  badge?: string;
  exact?: boolean;
  match?: (pathname: string) => boolean;
}

export type CreatorNavSection =
  | "Overview"
  | "Quizzes"
  | "Question Papers"
  | "Library"
  | "Classroom"
  | "Billing";

export const CREATOR_NAV: CreatorNavItem[] = [
  { label: "Dashboard", href: "/creator", icon: LayoutDashboard, section: "Overview", exact: true },
  { label: "My Quizzes", href: "/creator/quizzes", icon: ListChecks, section: "Quizzes", match: (p) => p === "/creator/quizzes" || p.startsWith("/creator/quizzes/") },
  { label: "Question Papers", href: "/creator/tests", icon: ClipboardList, section: "Question Papers", match: (p) => p === "/creator/tests" || (p.startsWith("/creator/tests/") && !p.startsWith("/creator/tests/create")) },
  { label: "Create Paper", href: "/creator/tests/create", icon: NotebookPen, section: "Question Papers", match: (p) => p === "/creator/tests/create" || p.startsWith("/creator/tests/create/") },
  { label: "Assignment Builder", href: "/creator/problems", icon: NotebookPen, section: "Question Papers" },
  { label: "Paper Headers", href: "/creator/headers", icon: FileImage, section: "Question Papers", badge: "PRO" },
  { label: "My Syllabus", href: "/creator/syllabus", icon: BookOpen, section: "Library" },
  { label: "Question Bank", href: "/creator/question-bank", icon: Database, section: "Library" },
  { label: "Community", href: "/creator/resources", icon: FolderKanban, section: "Library" },
  { label: "My Classrooms", href: "/creator/rooms", icon: UserRound, section: "Classroom" },
  { label: "Billing Overview", href: "/creator/billing", icon: Wallet, section: "Billing", exact: true },
  { label: "Plans", href: "/creator/billing/plans", icon: CalendarClock, section: "Billing" },
  { label: "Refer & Earn", href: "/creator/refer-and-earn", icon: Share2, section: "Billing", exact: true },
];

export const CREATOR_NAV_SECTIONS: CreatorNavSection[] = [
  "Overview",
  "Quizzes",
  "Question Papers",
  "Library",
  "Classroom",
  "Billing",
];

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
      aria-label={item.badge ? `${item.label} — ${item.badge}` : undefined}
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
      {item.badge && (
        premiumLocked ? (
          <Lock className="h-3 w-3 shrink-0 text-[var(--qs-muted)]" aria-label="Pro plan required" />
        ) : (
          <span
            className={cn(
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.08em]",
              isActive
                ? "border-[var(--qs-ink)] text-[var(--qs-on-brand)]"
                : "border-current opacity-75"
            )}
          >
            {item.badge}
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
        {CREATOR_NAV_SECTIONS.filter((section) => CREATOR_NAV.some((item) => item.section === section)).map((section, gi) => (
          <div key={section}>
            {gi > 0 && <div className="my-2 h-0.5 rounded-full bg-[var(--qs-line)]" />}
            <p className="px-3 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--qs-brand)]">
              {section}
            </p>
            <div className="space-y-1">
              {CREATOR_NAV.filter((item) => item.section === section).map((item) => (
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
