"use client";

import {
  Settings,
  Shield,
  Monitor,
  Plug,
  ChevronRight,
} from "lucide-react";

const ROWS = [
  { icon: Settings, label: "Account Settings", description: "Manage your account information" },
  { icon: Shield, label: "Security", description: "Password, 2FA, login history" },
  { icon: Monitor, label: "Sessions", description: "Active devices and sessions" },
  { icon: Plug, label: "Connected Services", description: "Third-party integrations" },
];

export function AccountSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-profile-text-primary">Account</h2>
      <div className="space-y-0">
        {ROWS.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.label}
              type="button"
              className="flex w-full items-center gap-3 border-b border-profile-border py-3.5 text-left transition-colors hover:bg-profile-surface-elevated last:border-b-0"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-profile-surface-elevated">
                <Icon className="h-4 w-4 text-profile-text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-profile-text-primary">{r.label}</p>
                <p className="text-[11px] text-profile-text-muted">{r.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-profile-text-muted" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
