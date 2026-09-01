"use client";

import type { CreatorProfile } from "@/components/creator/workspace/types";

export function AboutSection({ profile }: { profile: CreatorProfile }) {
  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-profile-text-primary">About</h2>
      <p className="max-w-2xl text-[13px] leading-relaxed text-profile-text-secondary">
        {profile.bio || "No bio added yet."}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {profile.location && (
          <DetailRow label="Location" value={profile.location} />
        )}
        {profile.experienceYears > 0 && (
          <DetailRow label="Experience" value={`${profile.experienceYears} years`} />
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-profile-border py-2.5">
      <span className="text-[12px] font-medium text-profile-text-muted">{label}</span>
      <span className="text-[13px] font-medium text-profile-text-primary">{value}</span>
    </div>
  );
}
