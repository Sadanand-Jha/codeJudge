"use client";

import { useEffect, useRef, useState } from "react";
import { getUserTimeZone } from "@/lib/timezone";

import {
  BadgeCheck,
  Camera,
  Check,
  Globe,
  Loader2,
  Lock,
  Pencil,
  Settings,
  X,
} from "lucide-react";
import { useSavedAvatar } from "@/store/avatarStore";
import { useAuthStore } from "@/store/authStore";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";
import type { CreatorProfile } from "@/components/creator/workspace/types";
import { verificationLabel, verificationState } from "@/lib/verification";
import { getApiErrorMessage } from "@/lib/apiError";
import { canChangeProfilePhoto } from "@/lib/planAccess";
import { showUpgradeModal } from "@/lib/upgradePrompt";
import { useMySubscription } from "@/hooks/useMySubscription";
import { useToast } from "@/hooks/useToast";
import { updateProfile } from "@/services/user";
import { updateAvatar, uploadAvatarFile } from "@/services/avatar";
import { renameAvatarFile, validateAvatarFile } from "@/utils/avatarUpload";

function formatMemberSince(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { timeZone: getUserTimeZone(), month: "short", year: "numeric" });
}

export function ProfileHeader({
  profile,
  onSettings,
  onViewPublic,
}: {
  profile: CreatorProfile;
  onSettings: () => void;
  onViewPublic: () => void;
}) {
  const savedAvatar = useSavedAvatar();
  const toast = useToast();
  const { subscription, isLoading: subscriptionLoading } = useMySubscription();
  const canUploadPhoto = canChangeProfilePhoto(subscription);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.displayName);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const avatarUrl = previewUrl || savedAvatar?.url || profile.avatarUrl || DEFAULT_AVATAR_URL;
  const verification = verificationState(profile.verificationStatus);
  const isVerified = verification === "verified";
  const memberSince = formatMemberSince(profile.createdAt);

  const startEditingName = () => {
    setNameDraft(profile.displayName);
    setEditingName(true);
  };

  const cancelEditingName = () => {
    setNameDraft(profile.displayName);
    setEditingName(false);
  };

  const saveName = async () => {
    const nextName = nameDraft.trim();
    if (!nextName) {
      toast.error({ title: "Name required", description: "Enter your name before saving." });
      return;
    }
    if (nextName.length > 80) {
      toast.error({ title: "Name too long", description: "Keep your name within 80 characters." });
      return;
    }
    if (nextName === profile.displayName.trim()) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      const result = await updateProfile({ displayName: nextName });
      const savedName = result.displayName ?? nextName;
      useAuthStore.getState().setUser({ displayName: savedName });
      setNameDraft(savedName);
      setEditingName(false);
      toast.success({
        title: "Name updated",
        description: "Your creator name has been saved.",
        timestamp: "Just now",
      });
    } catch (error) {
      toast.error({
        title: "Could not update name",
        description: getApiErrorMessage(error, "Please try again."),
      });
    } finally {
      setSavingName(false);
    }
  };

  const requestAvatarUpload = () => {
    if (subscriptionLoading) return;
    if (!canUploadPhoto) {
      showUpgradeModal({
        title: "Unlock custom profile photos",
        description:
          "Uploading your own profile photo is available on paid plans and active trials.",
        eyebrow: "Profile photos",
        tab: "plans",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file || uploading) return;
    if (!canUploadPhoto) {
      requestAvatarUpload();
      return;
    }

    const validation = validateAvatarFile(file);
    if (!validation.ok) {
      toast.error({ title: "Invalid image", description: validation.error });
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const localPreview = URL.createObjectURL(file);
    objectUrlRef.current = localPreview;
    setPreviewUrl(localPreview);
    setUploading(true);
    setUploadProgress(0);

    try {
      const renamedFile = renameAvatarFile(file, {
        userId: profile.id || profile.creatorUsername,
        displayName: (editingName ? nameDraft.trim() : "") || profile.displayName,
      });
      const uploaded = await uploadAvatarFile(renamedFile, setUploadProgress);
      const persistedUrl = await updateAvatar(uploaded.secureUrl);

      useAuthStore.getState().setUser({ avatarUrl: persistedUrl });
      toast.success({
        title: "Profile photo updated",
        description: "Your new photo is live.",
        timestamp: "Just now",
      });
    } catch (error) {
      toast.error({
        title: "Upload failed",
        description: getApiErrorMessage(error, "Could not upload your photo. Please try again."),
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreviewUrl(null);
    }
  };

  return (
    <div className="rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[6px_6px_0_var(--qs-sun)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* Avatar */}
        <div className="relative shrink-0 self-start">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] sm:h-24 sm:w-24">
            {/* eslint-disable-next-line @next/next/no-img-element -- avatar URL is user-configured */}
            <img src={avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--qs-ink)]/65 text-[11px] font-extrabold text-white">
                {uploadProgress}%
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={requestAvatarUpload}
            disabled={uploading || subscriptionLoading}
            title={
              canUploadPhoto
                ? "Upload profile photo"
                : "Profile photo uploads are available on paid plans and active trials"
            }
            aria-label={
              canUploadPhoto
                ? "Upload profile photo"
                : "Upgrade to upload a profile photo"
            }
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading || subscriptionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : canUploadPhoto ? (
              <Camera className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void handleAvatarFile(file);
            }}
          />

          {isVerified && (
            <span
              title="Verified creator"
              className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--qs-ok)] text-white ring-4 ring-[var(--qs-surface)]"
            >
              <BadgeCheck className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        {/* Identity */}
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveName();
                  }
                  if (event.key === "Escape") cancelEditingName();
                }}
                maxLength={80}
                autoFocus
                aria-label="Creator name"
                className="h-10 w-full max-w-[320px] rounded-[12px] border-2 border-[var(--qs-brand)] bg-[var(--qs-field)] px-3 text-[18px] font-extrabold tracking-tight text-[var(--qs-ink)] outline-none sm:text-[22px]"
              />
              <button
                type="button"
                onClick={() => void saveName()}
                disabled={savingName}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 text-[12px] font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {savingName ? "Saving" : "Save"}
              </button>
              <button
                type="button"
                onClick={cancelEditingName}
                disabled={savingName}
                aria-label="Cancel name edit"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-bad)] hover:text-[var(--qs-bad)] disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="qs-display truncate text-[24px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-[28px]">
                {profile.displayName}
              </h1>
              <button
                type="button"
                onClick={startEditingName}
                title="Edit name"
                aria-label="Edit name"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-brand)]/10 hover:text-[var(--qs-brand)]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
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
          )}
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
            onClick={startEditingName}
            className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-[13px] font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Name
          </button>
        </div>
      </div>
    </div>
  );
}
