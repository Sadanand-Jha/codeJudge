"use client";

import { Pencil, BadgeCheck, Settings, Globe } from "lucide-react";
import { useSavedAvatar } from "@/store/avatarStore";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";
import type { CreatorProfile } from "@/components/creator/workspace/types";

function formatMemberSince(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", year: "numeric" });
}

export function ProfileHeader({
  profile,
  onEdit,
  onSettings,
  onViewPublic,
}: {
  profile: CreatorProfile;
  onEdit: () => void;
  onSettings: () => void;
  onViewPublic: () => void;
}) {
  const savedAvatar = useSavedAvatar();
  const avatarUrl = savedAvatar?.url || profile.avatarUrl || DEFAULT_AVATAR_URL;
  const isVerified = profile.verificationStatus === "verified";
  const memberSince = formatMemberSince(profile.createdAt);

  return (
    <div className="rounded-2xl border border-profile-border bg-profile-surface p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* Avatar */}
        <div className="relative shrink-0 self-start">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-profile-border bg-profile-surface-elevated sm:h-24 sm:w-24">
            <img src={avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
          </div>
          {isVerified && (
            <span
              title="Verified creator"
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-profile-surface"
            >
              <BadgeCheck className="h-3.5 w-3.5 text-white" />
            </span>
          )}
        </div>

        {/* Identity */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight text-profile-text-primary sm:text-2xl">
              {profile.displayName}
            </h1>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-3 w-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Verification pending
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-profile-text-secondary">
            @{profile.creatorUsername}
            {profile.email ? <span className="text-profile-text-muted"> · {profile.email}</span> : null}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-profile-text-muted">
            <span className="rounded-md border border-profile-border bg-profile-surface-elevated px-2 py-0.5 font-semibold uppercase tracking-[0.08em]">
              {profile.role || "Creator"}
            </span>
            {memberSince ? <span>Member since {memberSince}</span> : null}
          </div>
          {profile.bio ? (
            <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-profile-text-secondary">{profile.bio}</p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onViewPublic}
            title="View public profile"
            aria-label="View public profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-profile-border text-profile-text-muted transition-colors hover:bg-profile-surface-elevated hover:text-profile-text-primary focus-visible:outline-2 focus-visible:outline-profile-accent"
          >
            <Globe className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onSettings}
            title="Profile settings"
            aria-label="Profile settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-profile-border text-profile-text-muted transition-colors hover:bg-profile-surface-elevated hover:text-profile-text-primary focus-visible:outline-2 focus-visible:outline-profile-accent"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-profile-accent px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-profile-accent-hover hover:shadow-[0_4px_16px_rgba(232,90,173,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-profile-accent active:scale-[0.98]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}
