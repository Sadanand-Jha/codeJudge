"use client";

import { motion } from "framer-motion";
import {
  User,
  IdCard,
  Trophy,
  Code2,
  Shield,
  Lock,
  Bell,
  Palette,
  Link2,
  AlertTriangle,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  comingSoon?: boolean;
  danger?: boolean;
}

export const SETTINGS_NAV_GROUPS: { label: string; items: SettingsNavItem[] }[] = [
  {
    label: "General",
    items: [
      { id: "profile", label: "Profile", icon: User },
      { id: "personal", label: "Personal Info", icon: IdCard, comingSoon: true },
      { id: "competitive", label: "Competitive", icon: Trophy, comingSoon: true },
      { id: "coding", label: "Coding Prefs", icon: Code2, comingSoon: true },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "account", label: "Account", icon: Shield, comingSoon: true },
      { id: "privacy", label: "Privacy", icon: Lock, comingSoon: true },
      { id: "notifications", label: "Notifications", icon: Bell, comingSoon: true },
      { id: "appearance", label: "Appearance", icon: Palette },
      { id: "connected", label: "Connected", icon: Link2, comingSoon: true },
    ],
  },
  {
    label: "Danger",
    items: [
      {
        id: "danger",
        label: "Danger Zone",
        icon: AlertTriangle,
        comingSoon: true,
        danger: true,
      },
    ],
  },
];

function SettingsNavLinks({
  activeSection,
  onSelect,
  onNavigate,
}: {
  activeSection: string;
  onSelect: (id: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-5">
      {SETTINGS_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--qs-muted)]">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item.id);
                    onNavigate?.();
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-[12px] border-2 px-3 py-2.5 text-left text-sm font-bold transition-all duration-150",
                    isActive
                      ? item.danger
                        ? "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)] shadow-[2px_2px_0_var(--qs-sun)]"
                        : "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]"
                      : "border-transparent text-[var(--qs-muted)] hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border-2 transition-colors",
                      isActive
                        ? item.danger
                          ? "border-[var(--qs-bad)] bg-[var(--qs-bad)]/10 text-[var(--qs-bad)]"
                          : "border-white/25 bg-white/15 text-[var(--qs-on-brand)]"
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-brand)] group-hover:border-[var(--qs-brand)]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.comingSoon ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.04em]",
                        isActive
                          ? item.danger
                            ? "border-[var(--qs-bad)]/30 bg-[var(--qs-bad)]/10 text-[var(--qs-bad)]"
                            : "border-white/30 bg-white/15 text-[var(--qs-on-brand)]"
                          : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                      )}
                    >
                      Soon
                    </span>
                  ) : null}
                  {isActive ? (
                    <motion.span
                      layoutId="settingsNavActive"
                      className={cn(
                        "absolute right-2 h-1.5 w-1.5 rounded-full",
                        item.danger
                          ? "bg-[var(--qs-bad)]"
                          : "bg-[var(--qs-sun)] shadow-[0_0_8px_rgba(255,210,63,0.8)]"
                      )}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsSidebar({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="sticky top-14 z-20 hidden h-[calc(100dvh-3.5rem)] w-[264px] shrink-0 self-start overflow-hidden border-r-2 border-[var(--qs-line)] bg-[var(--qs-surface)] lg:block">
      <nav className="settings-scroll h-full overflow-y-auto px-3 py-4">
        <div className="mb-5 flex items-center gap-2.5 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]">
            <Settings className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-[var(--qs-ink)]">Settings</p>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
              Your account
            </p>
          </div>
        </div>

        <SettingsNavLinks activeSection={activeSection} onSelect={onSelect} />

        <div className="mt-6 rounded-[16px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5">
          <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-muted)]">
            Update profile details, avatar and theme here. More account controls are coming soon.
          </p>
        </div>
      </nav>
    </aside>
  );
}

export function SettingsMobileNav({
  onClose,
  activeSection,
  onSelect,
}: {
  onClose: () => void;
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-x-0 top-0 z-[60] h-dvh bg-black/60 lg:hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r-2 border-[var(--qs-line)] bg-[var(--qs-surface)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--qs-line)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
              <Settings className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="text-sm font-extrabold text-[var(--qs-ink)]">Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-[9px] border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
            aria-label="Close settings navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="settings-scroll h-[calc(100%-3.75rem)] overflow-y-auto px-3 py-4">
          <SettingsNavLinks activeSection={activeSection} onSelect={onSelect} onNavigate={onClose} />
        </nav>
      </motion.div>
    </motion.div>
  );
}
