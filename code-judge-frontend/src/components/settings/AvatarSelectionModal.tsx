"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, User, Lock, Sparkles } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { getPredefinedAvatarByUrl } from "@/config/dicebear";
import { useToast } from "@/hooks/useToast";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { updateAvatar } from "@/services/avatar";
import { useAuthStore } from "@/store/authStore";

interface AvatarSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl: string | null;
  onAvatarUpdated?: (avatarUrl: string) => void;
}

// ─────────────────────────────────────────
// Profile Image Options
// image1-14.png are UNLOCKED (free to use)
// hero1-6.png are LOCKED (coming soon)
// ─────────────────────────────────────────
export const PROFILE_IMAGES: Array<{ src: string; label: string; unlocked: boolean }> = [
  { src: "/images/quiz/image1.png", label: "Avatar 1", unlocked: true },
  { src: "/images/quiz/image2.png", label: "Avatar 2", unlocked: true },
  { src: "/images/quiz/image3.png", label: "Avatar 3", unlocked: true },
  { src: "/images/quiz/image4.png", label: "Avatar 4", unlocked: true },
  { src: "/images/quiz/image5.png", label: "Avatar 5", unlocked: true },
  { src: "/images/quiz/image6.png", label: "Avatar 6", unlocked: true },
  { src: "/images/quiz/image7.png", label: "Avatar 7", unlocked: true },
  { src: "/images/quiz/image8.png", label: "Avatar 8", unlocked: true },
  { src: "/images/quiz/image9.png", label: "Avatar 9", unlocked: true },
  { src: "/images/quiz/image10.png", label: "Avatar 10", unlocked: true },
  { src: "/images/quiz/image11.png", label: "Avatar 11", unlocked: true },
  { src: "/images/quiz/image12.png", label: "Avatar 12", unlocked: true },
  { src: "/images/quiz/image13.png", label: "Avatar 13", unlocked: true },
  { src: "/images/quiz/image14.png", label: "Avatar 14", unlocked: true },
  { src: "/images/hero/hero1.png", label: "Coming soon", unlocked: false },
  { src: "/images/hero/hero2.png", label: "Coming soon", unlocked: false },
  { src: "/images/hero/hero3.png", label: "Coming soon", unlocked: false },
  { src: "/images/hero/hero4.png", label: "Coming soon", unlocked: false },
  { src: "/images/hero/hero5.png", label: "Coming soon", unlocked: false },
  { src: "/images/hero/hero6.png", label: "Coming soon", unlocked: false },
];

export default function AvatarSelectionModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  onAvatarUpdated,
}: AvatarSelectionModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const toast = useToast();

  // Reset selection when modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => setSelectedAvatar(currentAvatarUrl));
    return () => cancelAnimationFrame(frame);
  }, [isOpen, currentAvatarUrl]);

  useBodyScrollLock(isOpen);

  const hasChanges = selectedAvatar !== currentAvatarUrl;
  const canSave = hasChanges && !saving;

  const selectedAvatarData = getPredefinedAvatarByUrl(selectedAvatar);
  // The selection modal uses /images/quiz/imageN.png & /images/hero/heroN.png,
  // which are not part of the predefined avatar set — resolve the display name
  // from the picker's own list first, then fall back to predefined avatars.
  const selectedImage = PROFILE_IMAGES.find((i) => i.src === selectedAvatar);
  const selectedLabel =
    selectedImage?.label || selectedAvatarData?.label || null;

  const handleImageClick = (img: { src: string; label: string; unlocked: boolean }) => {
    if (!img.unlocked) {
      setShowComingSoon(true);
      return;
    }
    setSelectedAvatar(img.src);
  };

  const handleSave = async () => {
    if (!canSave || !selectedAvatar) return;

    setSaving(true);
    try {
      const newAvatarUrl = await updateAvatar(selectedAvatar);

      // Update the single global profile source immediately. Navbar, profile
      // sidebar, settings preview, and every other current-user avatar update
      // without re-fetching /auth/me.
      useAuthStore.getState().setUser({ avatarUrl: newAvatarUrl });

      if (onAvatarUpdated) {
        onAvatarUpdated(newAvatarUrl);
      }

      toast.success({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
        timestamp: "Just now",
      });

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
            className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)] sm:max-h-[700px]"
          >
            {/* ===== Header ===== */}
            <div className="flex items-center justify-between border-b-2 border-[var(--qs-line)] px-5 py-3.5">
              <div>
                <h2 className="text-lg font-extrabold text-[var(--qs-ink)]">Choose your avatar</h2>
                <p className="mt-0.5 text-xs text-[var(--qs-muted)]">
                  Select an image. Locked images are coming soon.
                </p>
              </div>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="grid h-8 w-8 place-items-center rounded-[9px] border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)] disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ===== Preview Section ===== */}
            <div className="border-b-2 border-[var(--qs-line)] px-5 py-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                  Current selection
                </p>
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-[var(--qs-sun)]/35 blur-lg" />
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedAvatar || "empty"}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] shadow-[4px_4px_0_var(--qs-sun)]"
                    >
                      {selectedAvatar ? (
                        <img
                          src={selectedAvatar}
                          alt={selectedLabel || "Selected avatar"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-10 w-10 text-[var(--qs-muted)]" />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <p className="text-xs font-extrabold text-[var(--qs-ink)]">
                  {selectedLabel || "No avatar selected"}
                </p>
              </div>
            </div>

            {/* ===== Image Grid ===== */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-4">
                {PROFILE_IMAGES.map((img) => {
                  const isSelected = selectedAvatar === img.src;
                  const isCurrent = currentAvatarUrl === img.src;

                  return (
                    <motion.button
                      key={img.src}
                      whileHover={img.unlocked ? { y: -3, scale: 1.03 } : {}}
                      whileTap={img.unlocked ? { scale: 0.97 } : {}}
                      onClick={() => handleImageClick(img)}
                      disabled={saving}
                      aria-pressed={isSelected}
                      aria-label={img.unlocked ? `Select ${img.label}` : "Locked avatar, coming soon"}
                      className={`group relative flex flex-col items-center gap-1.5 rounded-[14px] border-2 p-2.5 transition-all duration-200 ${
                        isSelected
                          ? "border-[var(--qs-ink)] bg-[var(--qs-brand)]/10 shadow-[2px_2px_0_var(--qs-sun)]"
                          : img.unlocked
                          ? "border-[var(--qs-line)] bg-[var(--qs-bg)] hover:border-[var(--qs-brand)]"
                          : "cursor-pointer border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] opacity-70"
                      }`}
                    >
                      {/* Selected glow overlay */}
                      {isSelected && (
                        <div className="pointer-events-none absolute inset-0 rounded-[14px] bg-[var(--qs-brand)]/10" />
                      )}

                      {/* Image */}
                      <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
                        <img
                          src={img.src}
                          alt={img.unlocked ? img.label : "Locked avatar"}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 rounded-full bg-[var(--qs-brand)]/20" />
                        )}
                        {/* Lock overlay for locked images */}
                        {!img.unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--qs-ink)]/55">
                            <Lock className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Label */}
                      <span
                        className={`text-[10px] font-extrabold transition-colors ${
                          isSelected
                            ? "text-[var(--qs-brand)]"
                            : img.unlocked
                            ? "text-[var(--qs-muted)] group-hover:text-[var(--qs-ink)]"
                            : "text-[var(--qs-muted)]"
                        }`}
                      >
                        {img.label}
                      </span>

                      {/* Check icon overlay for selected */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 24 }}
                            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] shadow-[1px_1px_0_var(--qs-sun)]"
                          >
                            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Current avatar badge */}
                      {isCurrent && !isSelected && (
                        <div className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)]">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                      )}

                      {/* Small lock badge for locked images */}
                      {!img.unlocked && !isSelected && (
                        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
                          <Lock className="h-2.5 w-2.5 text-[var(--qs-muted)]" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ===== Footer Actions ===== */}
            <div className="flex items-center justify-end gap-2.5 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)]/60 px-5 py-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="min-h-10 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="flex min-h-10 min-w-[140px] items-center justify-center gap-2 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <SecureLogo variant="mark" size={16} className="animate-pulse motion-reduce:animate-none" />
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

          {/* ===== Coming Soon Modal ===== */}
          <AnimatePresence>
            {showComingSoon && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowComingSoon(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="relative w-full max-w-sm overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Glow effect */}
                  <div className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[var(--qs-sun)]/30 blur-3xl" />

                  <div className="relative flex flex-col items-center gap-4 p-8 text-center">
                    {/* Icon */}
                    <div className="grid h-16 w-16 place-items-center rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240] shadow-[3px_3px_0_var(--qs-ink)]">
                      <Sparkles className="h-7 w-7" />
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-lg font-extrabold text-[var(--qs-ink)]">Coming soon</h3>
                      <p className="mt-1 text-sm text-[var(--qs-muted)]">
                        This image is part of our premium collection and will be available soon.
                      </p>
                    </div>

                    {/* Badge */}
                    <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                      Premium
                    </span>

                    {/* Close button */}
                    <button
                      onClick={() => setShowComingSoon(false)}
                      className="mt-2 min-h-10 w-full rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-6 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-all hover:brightness-105"
                    >
                      Got it
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
