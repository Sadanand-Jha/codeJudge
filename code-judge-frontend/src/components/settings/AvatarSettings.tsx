"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { SettingsCard } from "@/components/ui/settings";
import { DEFAULT_AVATAR_URL, getPredefinedAvatarByUrl } from "@/config/dicebear";
import AvatarSelectionModal from "./AvatarSelectionModal";

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
  const avatarData = getPredefinedAvatarByUrl(effectiveAvatarUrl);

  return (
    <>
      <SettingsCard
        title="Profile Picture"
        description="Choose an avatar for your CodeJudge profile."
        icon={<Sparkles className="h-4 w-4" />}
      >
        <div className="space-y-4">
          {/* ===== Current Avatar ===== */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative shrink-0">
              {/* Soft glow */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#7C3AED]/40 to-[#3B82F6]/30 blur-lg" />

              {/* Avatar ring */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] opacity-60 blur-[2px]" />

              {/* Avatar */}
              <div className="relative h-[100px] w-[100px] overflow-hidden rounded-full border-2 border-white/10 bg-background shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <img
                  src={effectiveAvatarUrl}
                  alt="Current avatar"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:items-start sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Current Avatar
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {avatarData?.label || "Default Avatar"}
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                Click the button below to change your avatar
              </p>
            </div>
          </div>

          {/* ===== Change Avatar Button ===== */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full rounded-xl border border-border-hover bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/10"
          >
            Change Avatar
          </button>
        </div>
      </SettingsCard>

      {/* ===== Avatar Selection Modal (rendered outside card to avoid clipping) ===== */}
      <AvatarSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentAvatarUrl={effectiveAvatarUrl}
        onAvatarUpdated={onAvatarUpdated}
      />
    </>
  );
}