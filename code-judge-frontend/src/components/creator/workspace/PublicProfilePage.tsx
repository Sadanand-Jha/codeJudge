"use client";

import { useMemo } from "react";
import { CalendarDays, Clock, Globe, MapPin, Pencil } from "lucide-react";
import { BillButton, EmptyState, PageHeader, Panel } from "@/components/creator/billing/ui";
import { creatorProfileFromUser } from "@/components/creator/profile/creatorProfile";
import { useSavedAvatar } from "@/store/avatarStore";
import { useAuthStore } from "@/store/authStore";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";

function memberSinceLabel(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `Member since ${date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
}

export function PublicProfilePage() {
  const user = useAuthStore((state) => state.user);
  const profile = useMemo(() => creatorProfileFromUser(user), [user]);
  const avatar = useSavedAvatar();
  const memberSince = memberSinceLabel(profile.createdAt);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Public Profile"
        subtitle="A preview built from your actual QuizSupport profile information."
        actions={
          <BillButton variant="ghost" href="/creator/profile">
            <Pencil className="h-3.5 w-3.5" />
            Edit profile
          </BillButton>
        }
      />

      {/* Public card — how students see the profile */}
      <section className="overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
        <div
          className="h-24 border-b-2 border-[var(--qs-line)] bg-gradient-to-r from-[var(--qs-brand)]/[0.14] via-[var(--qs-sun)]/[0.22] to-[var(--qs-brand)]/[0.06] sm:h-28"
          aria-hidden="true"
        />
        <div className="px-5 pb-6 sm:px-7 sm:pb-7">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] shadow-[4px_4px_0_var(--qs-sun)]">
                <img
                  src={avatar?.url || profile.avatarUrl || DEFAULT_AVATAR_URL}
                  alt={profile.displayName}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 pb-1">
                <h2 className="qs-display truncate text-xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">
                  {profile.displayName}
                </h2>
                <p className="truncate text-xs font-semibold text-[var(--qs-muted)]">
                  @{profile.creatorUsername}
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-[var(--qs-warn)]/35 bg-[var(--qs-sun)]/25 px-3 py-1 text-[11px] font-extrabold text-[var(--qs-warn)] sm:pb-1.5">
              <Clock className="h-3 w-3" />
              Verification pending
            </span>
          </div>

          <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-[var(--qs-muted)]">
            {profile.bio || "No bio added yet."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--qs-muted)]">
            {profile.location && (
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5">
                <MapPin className="h-3 w-3" />
                {profile.location}
              </span>
            )}
            {memberSince && (
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5">
                <CalendarDays className="h-3 w-3" />
                {memberSince}
              </span>
            )}
          </div>
        </div>
      </section>

      <Panel title="Published content" subtitle="Only real published creator content will appear here.">
        <EmptyState
          icon={<Globe className="h-6 w-6" />}
          title="No published content yet"
          description="Tests, quizzes and series will show here when they are connected to this profile."
        />
      </Panel>
    </div>
  );
}
