"use client";

import { useMemo } from "react";
import { BadgeCheck, Globe, Mail, MapPin } from "lucide-react";
import { PageHeader, Panel, BillButton } from "@/components/creator/billing/ui";
import { creatorProfileFromUser } from "@/components/creator/profile/creatorProfile";
import { useSavedAvatar } from "@/store/avatarStore";
import { useAuthStore } from "@/store/authStore";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";

export function PublicProfilePage() {
  const user = useAuthStore((state) => state.user);
  const profile = useMemo(() => creatorProfileFromUser(user), [user]);
  const avatar = useSavedAvatar();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Public Profile"
        subtitle="A preview built from your actual ByteClash profile information."
        actions={
          <BillButton variant="ghost" href="/settings">
            Edit profile
          </BillButton>
        }
      />

      <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-28 bg-gradient-to-r from-pink-500/20 via-violet-500/20 to-sky-500/20" />
        <div className="px-5 pb-6 sm:px-8 sm:pb-8">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-card shadow-xl">
              <img
                src={avatar?.url || DEFAULT_AVATAR_URL}
                alt={profile.displayName}
                className="h-full w-full object-cover"
              />
              {profile.verified && (
                <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                  <BadgeCheck className="h-4 w-4 text-white" />
                </span>
              )}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-extrabold tracking-tight text-text-primary">{profile.displayName}</h2>
              <p className="text-xs font-medium text-pink-500 dark:text-ai-accent">@{profile.creatorUsername}</p>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-text-secondary">
            {profile.bio || "No bio added yet."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-text-secondary">
            {profile.email && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2">
                <Mail className="h-3.5 w-3.5" /> {profile.email}
              </span>
            )}
            {profile.location && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2">
                <MapPin className="h-3.5 w-3.5" /> {profile.location}
              </span>
            )}
          </div>
        </div>
      </section>

      <Panel title="Published content" subtitle="Only real published creator content will appear here.">
        <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border px-5 text-center">
          <Globe className="mb-2 h-5 w-5 text-text-muted" />
          <p className="text-sm font-semibold text-text-primary">No published content available</p>
          <p className="mt-1 text-xs text-text-muted">Tests, quizzes and series will show here when they are connected to this profile.</p>
        </div>
      </Panel>
    </div>
  );
}
