"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, User, Lock, Sparkles } from "lucide-react";
import {
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

// ─────────────────────────────────────────
// Profile Image Options
// image1-14.png are UNLOCKED (free to use)
// hero1-6.png are LOCKED (coming soon)
// ─────────────────────────────────────────
const PROFILE_IMAGES: Array<{ src: string; label: string; unlocked: boolean }> = [
  { src: "/images/quiz/image1.png", label: "image1", unlocked: true },
  { src: "/images/quiz/image2.png", label: "image2", unlocked: true },
  { src: "/images/quiz/image3.png", label: "image3", unlocked: true },
  { src: "/images/quiz/image4.png", label: "image4", unlocked: true },
  { src: "/images/quiz/image5.png", label: "image5", unlocked: true },
  { src: "/images/quiz/image6.png", label: "image6", unlocked: true },
  { src: "/images/quiz/image7.png", label: "image7", unlocked: true },
  { src: "/images/quiz/image8.png", label: "image8", unlocked: true },
  { src: "/images/quiz/image9.png", label: "image9", unlocked: true },
  { src: "/images/quiz/image10.png", label: "image10", unlocked: true },
  { src: "/images/quiz/image11.png", label: "image11", unlocked: true },
  { src: "/images/quiz/image12.png", label: "image12", unlocked: true },
  { src: "/images/quiz/image13.png", label: "image13", unlocked: true },
  { src: "/images/quiz/image14.png", label: "image14", unlocked: true },
  { src: "/images/hero/hero1.png", label: "hero1", unlocked: false },
  { src: "/images/hero/hero2.png", label: "hero2", unlocked: false },
  { src: "/images/hero/hero3.png", label: "hero3", unlocked: false },
  { src: "/images/hero/hero4.png", label: "hero4", unlocked: false },
  { src: "/images/hero/hero5.png", label: "hero5", unlocked: false },
  { src: "/images/hero/hero6.png", label: "hero6", unlocked: false },
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

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAvatar(currentAvatarUrl);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => {
        document.body.style.overflow = "";
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, currentAvatarUrl]);

  const hasChanges = selectedAvatar !== currentAvatarUrl;
  const canSave = hasChanges && !saving;

  const selectedAvatarData = getPredefinedAvatarByUrl(selectedAvatar);

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
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-border-hover bg-card shadow-2xl flex flex-col"
          >
            {/* ===== Header ===== */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-white">Choose Your Avatar</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select an image. Locked images are coming soon.
                </p>
              </div>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ===== Preview Section ===== */}
            <div className="border-b border-border px-6 py-5">
              <div className="flex flex-col items-center gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Current Selection
                </p>
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#7C3AED]/40 to-[#3B82F6]/30 blur-lg" />
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] opacity-60 blur-[2px]" />
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedAvatar || "empty"}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 bg-background shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
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
              </div>
            </div>

            {/* ===== Image Grid ===== */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-4">
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
                      aria-label={`Select ${img.label}`}
                      className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200 ${
                        isSelected
                          ? "border-[#7C3AED] bg-[#7C3AED]/10 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                          : img.unlocked
                          ? "border-border bg-background hover:border-white/[0.14] hover:bg-white/[0.03]"
                          : "border-white/[0.04] bg-background opacity-70 cursor-pointer"
                      }`}
                    >
                      {/* Selected glow overlay */}
                      {isSelected && (
                        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-[#7C3AED]/20 via-transparent to-[#3B82F6]/15" />
                      )}

                      {/* Image */}
                      <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white/[0.03] ring-2 ring-white/[0.04]">
                        <img
                          src={img.src}
                          alt={img.label}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 rounded-full bg-[#7C3AED]/20" />
                        )}
                        {/* Lock overlay for locked images */}
                        {!img.unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-[1px]">
                            <Lock className="h-4 w-4 text-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Label */}
                      <span
                        className={`text-[10px] font-semibold transition-colors ${
                          isSelected
                            ? "text-white"
                            : img.unlocked
                            ? "text-muted-foreground group-hover:text-white"
                            : "text-[#6B7280]"
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

                      {/* Small lock badge for locked images */}
                      {!img.unlocked && !isSelected && (
                        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1E293B] border-2 border-[#111827]">
                          <Lock className="h-2.5 w-2.5 text-foreground" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ===== Footer Actions ===== */}
            <div className="flex items-center justify-end gap-2.5 border-t border-border px-6 py-4 bg-background/50">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg border border-border-hover bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-border-hover hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#C7DDEC]/20 bg-card shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Glow effect */}
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-[#C7DDEC]/10 blur-3xl" />

                  <div className="relative flex flex-col items-center gap-4 p-8 text-center">
                    {/* Icon */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#C7DDEC]/20 to-[#7C3AED]/20 border border-[#C7DDEC]/30">
                      <Sparkles className="h-7 w-7 text-foreground" />
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-lg font-bold text-white">Coming Soon</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        This image is part of our premium collection and will be available soon.
                      </p>
                    </div>

                    {/* Badge */}
                    <span className="rounded-full border border-[#C7DDEC]/20 bg-[#C7DDEC]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                      Premium
                    </span>

                    {/* Close button */}
                    <button
                      onClick={() => setShowComingSoon(false)}
                      className="mt-2 w-full rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6366F1] px-6 py-2.5 text-sm font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]"
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