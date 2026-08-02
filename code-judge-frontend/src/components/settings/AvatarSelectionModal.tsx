"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, User } from "lucide-react";
import {
  PREDEFINED_AVATARS,
  getPredefinedAvatarByUrl,
  type PredefinedAvatar,
} from "@/config/dicebear";
import { useToast } from "@/hooks/useToast";
import { updateAvatar } from "@/services/avatar";

interface AvatarSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl: string | null;
  onAvatarUpdated?: (avatarUrl: string) => void;
}

export default function AvatarSelectionModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  onAvatarUpdated,
}: AvatarSelectionModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatarUrl);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAvatar(currentAvatarUrl);
      // Lock background scroll immediately when modal opens
      document.body.style.overflow = "hidden";
    } else {
      // Delay unlocking scroll until exit animation completes
      const timer = setTimeout(() => {
        document.body.style.overflow = "";
      }, 300);
      return () => clearTimeout(timer);
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, currentAvatarUrl]);

  const hasChanges = selectedAvatar !== currentAvatarUrl;
  const canSave = hasChanges && !saving;

  const selectedAvatarData = getPredefinedAvatarByUrl(selectedAvatar);

  const handleSelect = (avatar: PredefinedAvatar) => {
    setSelectedAvatar(avatar.url);
  };

  const handleSave = async () => {
    if (!canSave || !selectedAvatar) return;

    setSaving(true);
    try {
      const newAvatarUrl = await updateAvatar(selectedAvatar);

      // Update parent state / Redux
      if (onAvatarUpdated) {
        onAvatarUpdated(newAvatarUrl);
      }

      // Success toast
      toast.success({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
        timestamp: "Just now",
      });

      // Close modal
      onClose();
    } catch {
      toast.error({
        title: "Update Failed",
        description: "Failed to update avatar. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Discard temporary selection and close
    setSelectedAvatar(currentAvatarUrl);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111827] shadow-2xl flex flex-col"
          >
            {/* ===== Header ===== */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-white">Choose Your Avatar</h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Select one of the seven predefined avatars. Your profile picture will be updated after saving.
                </p>
              </div>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg p-1.5 text-[#9CA3AF] transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ===== Preview Section ===== */}
            <div className="border-b border-white/[0.06] px-6 py-5">
              <div className="flex flex-col items-center gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Current Selection
                </p>
                <div className="relative">
                  {/* Glow */}
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#7C3AED]/40 to-[#3B82F6]/30 blur-lg" />
                  {/* Ring */}
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] opacity-60 blur-[2px]" />
                  {/* Avatar */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedAvatar || "empty"}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 bg-[#09090B] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                    >
                      {selectedAvatar ? (
                        <img
                          src={selectedAvatar}
                          alt={selectedAvatarData?.label || "Selected avatar"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-10 w-10 text-[#6B7280]" />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <p className="text-sm font-semibold text-white">
                  {selectedAvatarData?.label || "No avatar selected"}
                </p>
                {selectedAvatarData && (
                  <p className="text-[10px] font-medium capitalize text-[#7C3AED]">
                    {selectedAvatarData.gender}
                  </p>
                )}
              </div>
            </div>

            {/* ===== Avatar Grid ===== */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-4">
                {PREDEFINED_AVATARS.map((avatar) => {
                  const isSelected = selectedAvatar === avatar.url;
                  const isCurrent = currentAvatarUrl === avatar.url;

                  return (
                    <motion.button
                      key={avatar.id}
                      whileHover={{ y: -3, scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelect(avatar)}
                      disabled={saving}
                      aria-pressed={isSelected}
                      aria-label={`Select ${avatar.label}`}
                      className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200 ${
                        isSelected
                          ? "border-[#7C3AED] bg-[#7C3AED]/10 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                          : "border-white/[0.06] bg-[#09090B] hover:border-white/[0.14] hover:bg-white/[0.03]"
                      }`}
                    >
                      {/* Selected glow overlay */}
                      {isSelected && (
                        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-[#7C3AED]/20 via-transparent to-[#3B82F6]/15" />
                      )}

                      {/* Avatar image */}
                      <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white/[0.03] ring-2 ring-white/[0.04]">
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

                      {/* Label - show avatar label */}
                      <span
                        className={`text-[10px] font-semibold transition-colors ${
                          isSelected ? "text-white" : "text-[#9CA3AF] group-hover:text-white"
                        }`}
                      >
                        {avatar.label}
                      </span>

                      {/* Check icon overlay for selected */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 24 }}
                            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#7C3AED] border-2 border-[#111827] shadow-[0_0_12px_rgba(124,58,237,0.6)]"
                          >
                            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Current avatar badge */}
                      {isCurrent && !isSelected && (
                        <div className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#22C55E] border-2 border-[#111827]">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ===== Footer Actions ===== */}
            <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4 bg-[#09090B]/50">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/[0.12] hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6366F1] px-6 py-2.5 text-sm font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
