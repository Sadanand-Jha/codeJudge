"use client";

import { FileText, Upload, Edit3, Clock } from "lucide-react";

const ACTIVITY = [
  { icon: FileText, action: "Published DSA Assessment", time: "2 hours ago", color: "text-profile-accent" },
  { icon: Upload, action: "Uploaded Physics Problem Set", time: "Yesterday", color: "text-profile-purple" },
  { icon: Edit3, action: "Updated Mock Interview Quiz", time: "3 days ago", color: "text-profile-text-muted" },
  { icon: FileText, action: "Created NEET Biology Test", time: "1 week ago", color: "text-profile-text-muted" },
  { icon: Clock, action: "Scheduled JEE Mock for Saturday", time: "2 weeks ago", color: "text-profile-text-muted" },
];

export function RecentActivity() {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-profile-text-primary">Recent Activity</h2>
      <div className="space-y-0">
        {ACTIVITY.map((a, i) => {
          const Icon = a.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-profile-border py-3 last:border-b-0"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-profile-surface-elevated">
                <Icon className={`h-3.5 w-3.5 ${a.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-profile-text-primary">{a.action}</p>
              </div>
              <span className="shrink-0 text-[11px] text-profile-text-muted">{a.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
