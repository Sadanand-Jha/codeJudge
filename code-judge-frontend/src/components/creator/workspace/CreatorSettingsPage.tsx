"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, UserRound, Bell, ShieldCheck, Building2, Wallet, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/helpers";
import { PageHeader, MockDataTag, Panel } from "@/components/creator/billing/ui";
import { Toggle } from "@/components/ui/settings";
import { useToast } from "@/hooks/useToast";
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

export function CreatorSettingsPage() {
  const { success: toastSuccess } = useToast();
  const [sections, setSections] = useState<CreatorSettingsSection[]>(SETTINGS_SECTIONS);
  const [activeTab, setActiveTab] = useState<string>("account");
  const [confirmLogout, setConfirmLogout] = useState(false);

  const activeSection = sections.find((s) => s.id === activeTab) ?? sections[0];

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
        badge={<MockDataTag />}
        actions={
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2 text-[13px] font-bold text-danger transition-colors hover:bg-red-600 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        }
      />

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmLogout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setConfirmLogout(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Sign out</h3>
                  <p className="text-xs text-text-secondary">Return to student mode</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-text-secondary">
                You&apos;ll be signed out of Creator Studio and returned to the student experience.
              </p>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmLogout(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                >
                  Cancel
                </button>
                <Link
                  href="/"
                  onClick={() => setConfirmLogout(false)}
                  className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-[13px] font-bold text-danger transition-colors hover:bg-red-600 hover:text-white"
                >
                  Sign out
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Section nav */}
        <div className="space-y-1">
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
                  "group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                  isActive
                    ? "border-pink-500/30 bg-pink-500/[0.06] dark:border-ai-accent/30 dark:bg-ai-accent-soft"
                    : "border-transparent hover:border-border hover:bg-white/[0.03]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-pink-500 dark:text-ai-accent" : "text-text-muted")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[13px] font-semibold", isActive ? "text-text-primary" : "text-text-secondary")}>{section.label}</p>
                  <p className="text-[10px] text-text-muted">
                    {enabledCount}/{section.rows.length} enabled
                  </p>
                </div>
                <ChevronRight className={cn("h-3.5 w-3.5", isActive ? "text-pink-500 dark:text-ai-accent" : "text-text-muted")} />
              </button>
            );
          })}
        </div>

        {/* Active section */}
        <div className="lg:col-span-3">
          <Panel title={activeSection.label} subtitle={activeSection.description}>
            <div className="divide-y divide-border">
              {activeSection.rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{row.label}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">{row.description}</p>
                  </div>
                  <Toggle
                    checked={row.enabled}
                    onChange={(v) => toggleSection(activeSection.id, row.id, v)}
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}