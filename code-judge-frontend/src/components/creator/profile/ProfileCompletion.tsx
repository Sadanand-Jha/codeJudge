"use client";

import { cn } from "@/lib/helpers";

export function ProfileCompletion({ profile }: { profile: { bio: string; avatarUrl: string | null; location: string; website: string } }) {
  const checks = [
    { label: "Add creator bio", done: profile.bio.length > 10 },
    { label: "Add profile image", done: !!profile.avatarUrl },
    { label: "Add location", done: profile.location.length > 0 },
    { label: "Add website", done: profile.website.length > 0 },
  ];
  const done = checks.filter((c) => c.done).length;
  const pct = Math.round((done / checks.length) * 100);

  return (
    <div className="rounded-xl border border-profile-border bg-profile-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-profile-text-primary">Profile completeness</p>
        <span className="text-[13px] font-bold text-profile-accent">{pct}%</span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-profile-border">
        <div
          className="h-full rounded-full bg-profile-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 space-y-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-[11px]">
            <span
              className={cn(
                "flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold",
                c.done
                  ? "bg-profile-accent text-white"
                  : "border border-profile-border bg-profile-surface text-profile-text-muted"
              )}
            >
              {c.done ? "✓" : ""}
            </span>
            <span className={c.done ? "text-profile-text-muted line-through" : "text-profile-text-secondary"}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
