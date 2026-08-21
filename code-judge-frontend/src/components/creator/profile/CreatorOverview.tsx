"use client";

import { Users, ClipboardList, Layers, TrendingUp } from "lucide-react";

const stats = [
  { label: "Assessments", value: "24", icon: ClipboardList },
  { label: "Participants", value: "8,420", icon: Users },
  { label: "Published", value: "18", icon: Layers },
  { label: "Drafts", value: "6", icon: TrendingUp },
];

export function CreatorOverview() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="rounded-xl border border-profile-border bg-profile-surface px-4 py-3.5"
          >
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-profile-text-muted" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-profile-text-muted">
                {s.label}
              </span>
            </div>
            <p className="mt-2 text-[20px] font-bold tracking-tight text-profile-text-primary">
              {s.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
