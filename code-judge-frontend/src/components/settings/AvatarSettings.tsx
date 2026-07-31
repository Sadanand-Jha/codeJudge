"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Loader2,
  Sparkles,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { SettingsCard } from "@/components/ui/settings";
import { PREDEFINED_AVATARS, getPredefinedAvatar } from "@/config/dicebear";
import { useAvatarStore } from "@/store/avatarStore";
import type { AvatarGender, PredefinedAvatar } from "@/config/dicebear";

/* =============================================
   Types
   ============================================= */

type Filter = "all" | AvatarGender;

/* =============================================
   Main Component — Avatar Selection
   ============================================= */

export default function AvatarSettings() {
  const toast = useToast();

  // Shared avatar store — the saved avatar is persisted and shared with the
  // navbar and profile preview, while the pending selection is what the user
  // picks in this card before clicking "Save Changes".
  const savedAvatarId = useAvatarStore((s) => s.savedAvatarId);
  const pendingAvatarId = useAvatarStore((s) => s.pendingAvatarId);
  const setPendingAvatar = useAvatarStore((s) => s.setPendingAvatar);
  const setSavedAvatar = useAvatarStore((s) => s.setSavedAvatar);

  // Filter chip
  const [filter, setFilter] = useState<Filter>("all");

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Avatar currently in view: pending selection, otherwise the saved avatar
  const selectedId = pendingAvatarId ?? savedAvatarId;
  const savedAvatar = getPredefinedAvatar(savedAvatarId) ?? null;
  const selectedAvatar = getPredefinedAvatar(selectedId) ?? null;

  // Derived state
  const hasChanges = selectedId !== savedAvatarId;
  const canSave = hasChanges && !saving;
  const isInitial = selectedId === "";
  const currentLabel = selectedAvatar ? selectedAvatar.label : "No avatar selected";

  // Filtered gallery
  const galleryAvatars = useMemo(
    () =>
      filter === "all"
        ? PREDEFINED_AVATARS
        : PREDEFINED_AVATARS.filter((a) => a.gender === filter),
    [filter]
  );

  /* ----- Handlers ----- */

  const handleSelect = (avatar: PredefinedAvatar) => {
    setPendingAvatar(avatar.id);
    if (saved) setSaved(false);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // Simulated save — backend will persist the chosen avatar id.
      await new Promise((r) => setTimeout(r, 1100));
      setSavedAvatar(selectedAvatar?.id ?? selectedId);
      setSaved(true);
      toast.success({
        title: "Profile picture updated",
        description: `Your avatar is now ${selectedAvatar?.label ?? "selected"}.`,
        timestamp: "Just now",
      });
      // Reset the saved flash after a moment.
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error({
        title: "Save Failed",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!hasChanges || saving) return;
    setPendingAvatar(null);
    setSaved(false);
    toast.info({
      title: "Changes discarded",
      description: "Reverted to your current avatar.",
    });
  };

  /* ----- Render ----- */

  return (
    <SettingsCard
      title="Profile Picture"
      description="Choose an avatar for your CodeJudge profile."
      icon={<Sparkles className="h-4 w-4" />}
    >
      <div className="space-y-6">
        {/* ===== Current Avatar ===== */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
          <CurrentAvatarPreview
            selectedAvatar={selectedAvatar}
            isInitial={isInitial}
          />

          <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:items-start sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Current Avatar
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={currentLabel}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-2 text-sm font-semibold text-white"
              >
                {isInitial
                  ? "Select one of the available avatars."
                  : `Selected: ${currentLabel}`}
              </motion.p>
            </AnimatePresence>
            {savedAvatar && selectedAvatar && savedAvatar.id === selectedAvatar.id && !isInitial && (
              <p className="mt-1 text-xs text-[#6B7280]">
                This is your current profile picture.
              </p>
            )}
          </div>
        </div>

        {/* ===== Filter Chips ===== */}
        <div>
          <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">
            Filter
          </label>
          <div className="flex items-center gap-2">
            {(["all", "male", "female"] as const).map((f) => {
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-all duration-300 ${
                    isActive
                      ? "border-[#7C3AED]/50 bg-[#7C3AED]/15 text-white shadow-[0_0_16px_rgba(124,58,237,0.15)]"
                      : "border-white/[0.08] bg-[#09090B] text-[#9CA3AF] hover:border-white/[0.16] hover:text-white"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== Avatar Gallery ===== */}
        <AvatarGallery
          avatars={galleryAvatars}
          selectedId={selectedId}
          onSelect={handleSelect}
        />

        {/* ===== Unsaved Changes Indicator ===== */}
        <AnimatePresence>
          {hasChanges && !saving && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/[0.06] px-4 py-2.5">
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#F59E0B]" />
                <span className="text-xs font-medium text-[#F59E0B]">
                  Unsaved Changes
                </span>
                <span className="text-xs text-[#F59E0B]/70">
                  — your current selection hasn't been saved yet.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Success Flash ===== */}
        <AnimatePresence>
          {saved && !saving && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/[0.06] px-4 py-2.5">
                <Check className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
                <span className="text-xs font-medium text-[#22C55E]">
                  Profile picture updated successfully.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Actions ===== */}
        <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#6B7280]">
            Avatars are generated by CodeJudge. Pick one, then save to update your profile.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCancel}
              disabled={!hasChanges || saving}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/[0.14] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6366F1] px-6 py-2.5 text-sm font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}

/* =============================================
   Current Avatar Preview
   ============================================= */

function CurrentAvatarPreview({
  selectedAvatar,
  isInitial,
}: {
  selectedAvatar: PredefinedAvatar | null;
  isInitial: boolean;
}) {
  return (
    <div className="relative shrink-0">
      {/* Soft glow */}
      <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#7C3AED]/40 to-[#3B82F6]/30 blur-lg" />

      {/* Avatar ring */}
      <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] opacity-60 blur-[2px]" />

      {/* Avatar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedAvatar?.id ?? "empty"}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="relative h-[120px] w-[120px] overflow-hidden rounded-full border-2 border-white/10 bg-[#09090B] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          {selectedAvatar ? (
            <img
              src={selectedAvatar.url}
              alt={selectedAvatar.label}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-10 w-10 text-[#6B7280]" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Online indicator */}
      <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#09090B] bg-[#22C55E]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
        </span>
      </div>
    </div>
  );
}

/* =============================================
   Avatar Gallery
   ============================================= */

function AvatarGallery({
  avatars,
  selectedId,
  onSelect,
}: {
  avatars: PredefinedAvatar[];
  selectedId: string;
  onSelect: (avatar: PredefinedAvatar) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">
        Avatar Gallery
      </label>

      {avatars.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.08] bg-[#09090B]/40 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
            <User className="h-5 w-5 text-[#6B7280]" />
          </div>
          <p className="text-sm font-medium text-white">
            Select one of the available avatars.
          </p>
          <p className="text-xs text-[#6B7280]">
            No avatars match this filter.
          </p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          <AnimatePresence mode="popLayout">
            {avatars.map((avatar) => {
              const isSelected = avatar.id === selectedId;
              return (
                <motion.button
                  key={avatar.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelect(avatar)}
                  aria-pressed={isSelected}
                  aria-label={`Select ${avatar.label}`}
                  className={`group relative flex flex-col items-center gap-2 rounded-[14px] border p-3 transition-colors duration-200 ${
                    isSelected
                      ? "border-[#7C3AED] bg-[#7C3AED]/10 shadow-[0_0_24px_rgba(124,58,237,0.25)]"
                      : "border-white/[0.06] bg-[#09090B]/60 hover:border-white/[0.14] hover:bg-white/[0.03]"
                  }`}
                  style={{
                    boxShadow: isSelected
                      ? "0 0 24px rgba(124,58,237,0.25), 0 8px 24px rgba(0,0,0,0.25)"
                      : "0 2px 10px rgba(0,0,0,0.18)",
                  }}
                >
                  {/* Selected glow */}
                  {isSelected && (
                    <div className="pointer-events-none absolute inset-0 rounded-[14px] bg-gradient-to-br from-[#7C3AED]/25 via-transparent to-[#3B82F6]/20" />
                  )}

                  {/* Avatar preview */}
                  <div className="relative h-16 w-16 overflow-hidden rounded-full bg-white/[0.03] ring-2 ring-white/[0.04]">
                    <img
                      src={avatar.url}
                      alt={avatar.label}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 rounded-full bg-[#7C3AED]/20" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-xs font-semibold transition-colors ${
                      isSelected ? "text-white" : "text-[#9CA3AF] group-hover:text-white"
                    }`}
                  >
                    {avatar.label}
                  </span>
                  <span
                    className={`text-[10px] font-medium capitalize transition-colors ${
                      isSelected ? "text-[#7C3AED]" : "text-[#6B7280]"
                    }`}
                  >
                    {avatar.gender}
                  </span>

                  {/* Checkmark */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 24 }}
                        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#7C3AED] border-2 border-[#09090B] shadow-[0_0_12px_rgba(124,58,237,0.6)]"
                      >
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}