"use client";

import { Pencil, BadgeCheck, Settings, Globe } from "lucide-react";
import { useSavedAvatar } from "@/store/avatarStore";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";
import type { CreatorProfile } from "@/components/creator/workspace/types";
import { verificationLabel, verificationState } from "@/lib/verification";

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
  const verification = verificationState(profile.verificationStatus);
  const isVerified = verification === "verified";
  const memberSince = formatMemberSince(profile.createdAt);

  return (
    <div className="rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[6px_6px_0_var(--qs-sun)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* Avatar */}
        <div className="relative shrink-0 self-start">
          <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] sm:h-24 sm:w-24">
            <img src={avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
          </div>
          {isVerified && (
            <span
              title="Verified creator"
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--qs-ok)] text-white ring-4 ring-[var(--qs-surface)]"
            >
              <BadgeCheck className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        {/* Identity */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="qs-display truncate text-[24px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-[28px]">
              {profile.displayName}
            </h1>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] px-2.5 py-0.5 text-[11px] font-extrabold text-[var(--qs-ok)]">
                <BadgeCheck className="h-3 w-3" />
                {verificationLabel(verification)}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border-2 border-[var(--qs-warn)]/35 bg-[var(--qs-sun)]/25 px-2.5 py-0.5 text-[11px] font-extrabold text-[var(--qs-warn)]">
                {verificationLabel(verification)}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[13px] font-medium text-[var(--qs-muted)]">
            @{profile.creatorUsername}
            {profile.email ? <span> · {profile.email}</span> : null}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-[var(--qs-muted)]">
            <span className="rounded-full border-2 border-[var(--qs-line)] px-2.5 py-0.5 font-extrabold uppercase tracking-[0.08em]">
              {profile.role || "Creator"}
            </span>
            {memberSince ? <span className="font-medium">Member since {memberSince}</span> : null}
          </div>
          {profile.bio ? (
            <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-[var(--qs-muted)]">{profile.bio}</p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2 max-sm:flex-wrap">
          <button
            type="button"
            onClick={onViewPublic}
            title="View public profile"
            aria-label="View public profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
          >
            <Globe className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onSettings}
            title="Profile settings"
            aria-label="Profile settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-[13px] font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}
