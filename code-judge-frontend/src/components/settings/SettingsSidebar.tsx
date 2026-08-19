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
  /** Icon gradient tone for the resting/active chip */
  tone: string;
  danger?: boolean;
}

export const SETTINGS_NAV_GROUPS: { label: string; items: SettingsNavItem[] }[] = [
  {
    label: "General",
    items: [
      { id: "profile", label: "Profile", icon: User, tone: "from-[#F59E0B] to-[#F97316]" },
      { id: "personal", label: "Personal Info", icon: IdCard, tone: "from-[#3B82F6] to-[#06B6D4]" },
      { id: "competitive", label: "Competitive", icon: Trophy, tone: "from-[#FBBF24] to-[#F59E0B]" },
      { id: "coding", label: "Coding Prefs", icon: Code2, tone: "from-[#22C55E] to-[#10B981]" },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "account", label: "Account", icon: Shield, tone: "from-[#8B5CF6] to-[#6366F1]" },
      { id: "privacy", label: "Privacy", icon: Lock, tone: "from-[#06B6D4] to-[#3B82F6]" },
      { id: "notifications", label: "Notifications", icon: Bell, tone: "from-[#F59E0B] to-[#F97316]" },
      { id: "appearance", label: "Appearance", icon: Palette, tone: "from-[#F97316] to-[#F59E0B]" },
      { id: "connected", label: "Connected", icon: Link2, tone: "from-[#3B82F6] to-[#06B6D4]" },
    ],
  },
  {
    label: "Danger",
    items: [{ id: "danger", label: "Danger Zone", icon: AlertTriangle, tone: "from-[#EF4444] to-[#DC2626]", danger: true }],
  },
];

/**
 * Settings navigation links — mirrors the profile sidebar treatment:
 * gradient icon chips, tinted active state and a spring-animated dot.
 */
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
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            {group.label}
          </p>
          <div className="space-y-1">
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
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                    isActive
                      ? item.danger
                        ? "bg-danger/10 text-danger shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)]"
                        : "bg-[#F59E0B]/10 text-text-primary shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)]"
                      : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br transition-transform duration-200",
                      item.tone,
                      isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100 group-hover:scale-110"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
                  </span>
                  <span
                    className={cn(
                      "transition-colors",
                      isActive
                        ? item.danger
                          ? "font-semibold text-danger"
                          : "font-semibold text-text-primary"
                        : "text-text-secondary"
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="settingsNavActive"
                      className={cn(
                        "absolute right-2 h-1.5 w-1.5 rounded-full",
                        item.danger
                          ? "bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                          : "bg-[#F59E0B] shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                      )}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Desktop settings sidebar — sticky below the app navbar.
 */
export default function SettingsSidebar({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border bg-card lg:block">
      <nav className="settings-scroll h-full overflow-y-auto p-4">
        <div className="mb-3 flex items-center gap-2 px-3 pt-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#F97316]">
            <Settings className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
          </span>
          <p className="text-sm font-bold tracking-tight text-text-primary">Settings</p>
        </div>

        <SettingsNavLinks activeSection={activeSection} onSelect={onSelect} />

        <div className="mt-6 rounded-xl border border-border bg-card-hover/60 p-4">
          <p className="text-[10px] font-medium leading-relaxed text-text-muted">
            Settings sync across your whole ByteClash account — profile, editor and notifications.
          </p>
        </div>
      </nav>
    </aside>
  );
}

/**
 * Mobile settings navigation drawer.
 */
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
      className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#F97316]">
              <Settings className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-sm font-bold text-text-primary">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-accent/5 hover:text-text-primary"
            aria-label="Close settings navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="settings-scroll h-[calc(100%-4rem)] overflow-y-auto p-4">
          <SettingsNavLinks activeSection={activeSection} onSelect={onSelect} onNavigate={onClose} />
        </nav>
      </motion.div>
    </motion.div>
  );
}