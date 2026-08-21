"use client";

import type { CreatorProfile } from "@/components/creator/workspace/types";

export function CreatorDetails({ profile }: { profile: CreatorProfile }) {
  const rows = [
    profile.location && { label: "Location", value: profile.location },
    profile.website && { label: "Website", value: profile.website },
    profile.qualifications.length > 0 && {
      label: "Qualifications",
      value: profile.qualifications.join(", "),
    },
    profile.languages.length > 0 && {
      label: "Languages",
      value: profile.languages.join(", "),
    },
    { label: "Joined", value: profile.createdAt },
    { label: "Creator ID", value: profile.creatorId },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-profile-text-primary">Details</h2>
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-4 border-b border-profile-border py-2.5 sm:odd:pr-6 sm:even:pl-6"
          >
            <span className="shrink-0 text-[12px] font-medium text-profile-text-muted">{r.label}</span>
            <span className="truncate text-right text-[13px] font-medium text-profile-text-primary">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
