"use client";

import { useState } from "react";
import { Camera, Check } from "lucide-react";
import { DEFAULT_AVATAR_URL, getPredefinedAvatarByUrl } from "@/config/dicebear";
import SettingsPanel from "./SettingsPanel";
import AvatarSelectionModal, { PROFILE_IMAGES } from "./AvatarSelectionModal";

interface AvatarSettingsProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdated?: (avatarUrl: string) => void;
}

export default function AvatarSettings({
  currentAvatarUrl,
  onAvatarUpdated,
}: AvatarSettingsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const effectiveAvatarUrl = currentAvatarUrl || DEFAULT_AVATAR_URL;
  const matchedImage = PROFILE_IMAGES.find((image) => image.src === effectiveAvatarUrl);
  const avatarData = matchedImage
    ? { label: matchedImage.label }
    : getPredefinedAvatarByUrl(effectiveAvatarUrl);

  return (
    <>
      <SettingsPanel
        title="Profile picture"
        description="Choose an avatar for your QuizSupport profile."
        icon={Camera}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] shadow-[4px_4px_0_var(--qs-sun)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- avatar URLs are user-configured */}
            <img
              src={effectiveAvatarUrl}
              alt="Current avatar"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ok)]">
              <Check className="h-3 w-3" />
              Current avatar
            </span>
            <p className="mt-2 text-sm font-extrabold text-[var(--qs-ink)]">
              {avatarData?.label || "Default avatar"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--qs-muted)]">
              Pick a new look from the avatar library. Locked avatars are coming soon.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--qs-sun)]"
          >
            <Camera className="h-4 w-4" />
            Change avatar
          </button>
        </div>
      </SettingsPanel>

      <AvatarSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentAvatarUrl={effectiveAvatarUrl}
        onAvatarUpdated={onAvatarUpdated}
      />
    </>
  );
}
