"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Building2,
  ChevronRight,
  LogOut,
  Pencil,
  Settings,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { BillButton, PageHeader, Panel, Skeleton, StatusBadge } from "@/components/creator/billing/ui";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/store/authStore";
import { SETTINGS_SECTIONS } from "./mockData";
import type { CreatorSettingsSection } from "./types";

const SECTION_ICONS: Record<string, typeof Settings> = {
  account: Settings,
  creator: UserRound,
  notifications: Bell,
  privacy: ShieldCheck,
  organization: Building2,
  finance: Wallet,
};

function QsToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40",
        checked ? "border-[var(--qs-ink)] bg-[var(--qs-brand)]" : "border-[var(--qs-line)] bg-[var(--qs-line)]/40"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(26,18,64,0.3)] transition-all duration-200",
          checked ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("");
}

function formatMemberSince(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function CreatorSettingsPage() {
  const { success: toastSuccess } = useToast();
  const authUser = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [sections, setSections] = useState<CreatorSettingsSection[]>(SETTINGS_SECTIONS);
  const [activeTab, setActiveTab] = useState<string>("account");
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!hasHydrated) void hydrate();
  }, [hasHydrated, hydrate]);

  const fullName = [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ");
  const accountName = authUser?.displayName || fullName || authUser?.username || "Creator";
  const memberSince = authUser?.createdAt ? formatMemberSince(authUser.createdAt) : null;
  const activeSection = sections.find((s) => s.id === activeTab) ?? sections[0];
  const activeEnabled = activeSection.rows.filter((r) => r.enabled).length;

  const setRow = (sectionId: string, rowId: string, enabled: boolean) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, rows: s.rows.map((r) => (r.id === rowId ? { ...r, enabled } : r)) }
          : s
      )
    );
  };

  const toggleSection = (sectionId: string, rowId: string, enabled: boolean) => {
    setRow(sectionId, rowId, enabled);
    const row = activeSection.rows.find((r) => r.id === rowId);
    toastSuccess({ title: row?.label ?? "Setting updated", description: enabled ? "Enabled" : "Disabled" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creator Settings"
        subtitle="Manage your account, notifications and payout preferences."
        actions={
          <BillButton variant="danger" onClick={() => setConfirmLogout(true)}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </BillButton>
        }
      />

      {/* Account summary */}
      {!hasHydrated ? (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 shadow-[0_6px_18px_rgba(26,18,64,0.05)] sm:p-5">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl sm:w-28" />
        </section>
      ) : (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 shadow-[0_6px_18px_rgba(26,18,64,0.05)] sm:p-5">
          <div className="relative shrink-0">
            {authUser?.avatarUrl ? (
              <img
                src={authUser.avatarUrl}
                alt={accountName}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-lg font-bold text-white">
                {initialsOf(accountName)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-bold text-[var(--qs-ink)]">{accountName}</h2>
              <StatusBadge label="Verification pending" tone="amber" dot />
            </div>
            {(authUser?.username || memberSince) && (
              <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--qs-muted)]">
                {authUser?.username && <span className="min-w-0 truncate">@{authUser.username}</span>}
                {authUser?.username && memberSince && (
                  <span aria-hidden="true" className="opacity-60">
                    ·
                  </span>
                )}
                {memberSince && <span className="whitespace-nowrap">Member since {memberSince}</span>}
              </p>
            )}
          </div>
          <BillButton variant="ghost" href="/creator/profile" className="w-full shrink-0 sm:w-auto">
            <Pencil className="h-3.5 w-3.5" />
            Edit profile
          </BillButton>
        </section>
      )}

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmLogout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setConfirmLogout(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              className="w-full max-w-md rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-6 shadow-[0_24px_60px_rgba(26,18,64,0.3)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--qs-bad)]/10 text-[var(--qs-bad)]">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--qs-ink)]">Sign out</h3>
                  <p className="text-xs text-[var(--qs-muted)]">Return to student mode</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-[var(--qs-muted)]">
                You&apos;ll be signed out of Creator Studio and returned to the student experience.
              </p>
              <div className="mt-6 flex items-center justify-end gap-2">
                <BillButton variant="ghost" onClick={() => setConfirmLogout(false)}>
                  Cancel
                </BillButton>
                <BillButton variant="danger" href="/quiz">
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </BillButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* Section nav — horizontal scroll on mobile, vertical sidebar on desktop */}
        <Panel noPadding className="self-start">
          <nav className="hide-scrollbar flex gap-1 overflow-x-auto p-2 lg:flex-col" aria-label="Settings sections">
            {sections.map((section) => {
              const Icon = SECTION_ICONS[section.id] ?? Settings;
              const enabledCount = section.rows.filter((r) => r.enabled).length;
              const isActive = activeTab === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveTab(section.id)}
                  className={cn(
                    "flex w-auto shrink-0 items-center gap-3 rounded-xl border-2 px-2.5 py-2.5 text-left transition-colors lg:w-full",
                    isActive
                      ? "border-[var(--qs-brand)]/30 bg-[var(--qs-brand)]/[0.07]"
                      : "border-transparent hover:bg-[var(--qs-line)]/30"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors",
                      isActive
                        ? "border-[var(--qs-brand)]/30 bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]"
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[13px] font-semibold whitespace-nowrap",
                        isActive ? "text-[var(--qs-ink)]" : "text-[var(--qs-muted)]"
                      )}
                    >
                      {section.label}
                    </span>
                    <span className="hidden text-[10px] font-medium text-[var(--qs-muted)] lg:block">
                      {enabledCount}/{section.rows.length} on
                    </span>
                  </span>
                  {isActive && <ChevronRight className="hidden h-3.5 w-3.5 text-[var(--qs-brand)] lg:block" />}
                </button>
              );
            })}
          </nav>
          <div className="hidden border-t-2 border-[var(--qs-line)] px-3.5 py-3 lg:block">
            <p className="text-[10px] leading-4 text-[var(--qs-muted)]">
              Preferences apply to your creator account only.
            </p>
          </div>
        </Panel>

        {/* Active section */}
        <div className="space-y-3">
          <Panel
            title={activeSection.label}
            subtitle={activeSection.description}
            action={
              <StatusBadge label={`${activeEnabled} of ${activeSection.rows.length} enabled`} tone="slate" />
            }
          >
            <div className="divide-y divide-[var(--qs-line)]">
              {activeSection.rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--qs-ink)]">{row.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--qs-muted)]">{row.description}</p>
                  </div>
                  {row.kind === "toggle" ? (
                    <QsToggle
                      checked={row.enabled}
                      onChange={(v) => toggleSection(activeSection.id, row.id, v)}
                    />
                  ) : (
                    <Link
                      href="/creator/billing/credits"
                      className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--qs-brand)] hover:brightness-110"
                    >
                      Manage
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <p className="flex items-center gap-1.5 px-1 text-[11px] text-[var(--qs-muted)]">
            <ShieldCheck className="h-3 w-3" />
            Changes are saved automatically to your creator account.
          </p>
        </div>
      </div>
    </div>
  );
}
