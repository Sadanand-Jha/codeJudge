"use client";

import { Pencil, BadgeCheck } from "lucide-react";
import { useSavedAvatar } from "@/store/avatarStore";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";
import type { CreatorProfile } from "@/components/creator/workspace/types";

export function ProfileHeader({
  profile,
  onEdit,
}: {
  profile: CreatorProfile;
  onEdit: () => void;
}) {
  const savedAvatar = useSavedAvatar();
  const avatarUrl = savedAvatar?.url || DEFAULT_AVATAR_URL;
  const isVerified = profile.verificationStatus === "verified";

  return (
    <div className="flex items-start gap-5 sm:items-center sm:gap-6">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="h-[88px] w-[88px] overflow-hidden rounded-full border-2 border-profile-border shadow-sm sm:h-[104px] sm:w-[104px]">
          <img
            src={avatarUrl}
            alt={profile.displayName}
            className="h-full w-full object-cover"
          />
        </div>
        {isVerified && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-profile-accent ring-2 ring-profile-bg">
            <BadgeCheck className="h-3 w-3 text-white" />
          </span>
        )}
      </div>

      {/* Identity */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-[24px] font-bold tracking-tight text-profile-text-primary sm:text-[28px]">
            {profile.displayName}
          </h1>
        </div>
        <p className="mt-0.5 text-[14px] text-profile-text-secondary">
          @{profile.creatorUsername}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="rounded-md border border-profile-border bg-profile-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-profile-text-muted">
            Creator
          </span>
          <span className="text-[11px] text-profile-text-muted">·</span>
          <span className="text-[11px] text-profile-text-muted">Assessment Author</span>
        </div>
        {profile.bio && (
          <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-profile-text-secondary">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Edit button */}
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-profile-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-profile-accent-hover"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit Profile
      </button>
    </div>
  );
}
