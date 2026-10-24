"use client";

import { getUserTimeZone } from "@/lib/timezone";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  GraduationCap,
  MapPin,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getAvatarUrlById } from "@/config/dicebear";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  getPublicStudentProfile,
  type PublicStudentProfile as PublicStudentProfileData,
} from "@/services/user";

function ratingLabel(rating: number): string {
  if (rating >= 2100) return "Grandmaster";
  if (rating >= 1900) return "Master";
  if (rating >= 1600) return "Expert";
  if (rating >= 1400) return "Specialist";
  if (rating >= 1200) return "Pupil";
  return "Newbie";
}

function displayName(profile: PublicStudentProfileData): string {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return profile.displayName?.trim() || fullName || profile.username;
}

function memberSinceLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    timeZone: getUserTimeZone(),
    month: "short",
    year: "numeric",
  });
}

export default function PublicStudentProfile({ username }: { username: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicStudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError(null);
    });

    getPublicStudentProfile(username, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setProfile(data);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(err, "We couldn't load this profile."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [username]);

  const location = useMemo(() => {
    if (!profile) return null;
    return [profile.state, profile.country].filter(Boolean).join(", ") || null;
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-full bg-[var(--qs-bg)]">
        <div className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6">
          <div className="app-skeleton h-64 rounded-[26px] border-2 border-[var(--qs-line)]" />
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="app-skeleton h-52 rounded-[22px]" />
            <div className="app-skeleton h-52 rounded-[22px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-full bg-[var(--qs-bg)]">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--qs-bad)] text-[var(--qs-bad)]">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="qs-display mt-4 text-2xl text-[var(--qs-ink)]">Profile unavailable</h1>
          <p className="mt-2 text-sm text-[var(--qs-muted)]">
            {error || "This student profile could not be found."}
          </p>
          <Link
            href="/rooms/my"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)]"
          >
            <ArrowLeft className="h-4 w-4" />
            My Rooms
          </Link>
        </div>
      </div>
    );
  }

  const name = displayName(profile);
  const memberSince = memberSinceLabel(profile.memberSince);
  const avatar = profile.avatarUrl || getAvatarUrlById(profile.avatarId ?? 1);
  const rating = Math.round(profile.rating || 0);
  const maxRating = Math.round(profile.maxRating || 0);

  return (
    <div className="min-h-full bg-[var(--qs-bg)]">
      <div className="mx-auto w-full max-w-[1080px] px-4 py-6 pb-20 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
            Public profile
          </span>
        </div>

        <section className="overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
          <div
            className="h-24 border-b-2 border-[var(--qs-line)] bg-[linear-gradient(110deg,var(--qs-brand)_0%,#9b7cf6_45%,var(--qs-sun)_100%)] sm:h-28"
            aria-hidden="true"
          />
          <div className="px-5 pb-6 sm:px-7 sm:pb-7">
            <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] shadow-[4px_4px_0_var(--qs-sun)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- avatar URLs are user-configured */}
                  <img src={avatar} alt={`${name} avatar`} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 pb-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h1 className="qs-display truncate text-2xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-3xl">
                      {name}
                    </h1>
                    {profile.isVerified ? (
                      <BadgeCheck className="h-5 w-5 shrink-0 text-[var(--qs-brand)]" aria-label="Verified" />
                    ) : null}
                  </div>
                  <p className="truncate text-sm font-semibold text-[var(--qs-muted)]">
                    @{profile.username}
                  </p>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] px-3 py-1.5 text-xs font-extrabold text-[var(--qs-ink)]">
                <Star className="h-3.5 w-3.5 text-[#C98A00]" />
                {ratingLabel(rating)} · {rating}
              </span>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--qs-muted)]">
              {profile.bio || "This student hasn't added a bio yet."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--qs-muted)]">
              {profile.college ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {profile.college}
                </span>
              ) : null}
              {location ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </span>
              ) : null}
              {memberSince ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Member since {memberSince}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
            <h2 className="text-sm font-extrabold text-[var(--qs-ink)]">About</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--qs-muted)]">
              {profile.bio || "No bio added yet."}
            </p>
            <dl className="mt-4 space-y-3 border-t-2 border-[var(--qs-line)] pt-4 text-sm">
              {profile.college ? (
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-[var(--qs-muted)]">College</dt>
                  <dd className="text-right font-bold text-[var(--qs-ink)]">{profile.college}</dd>
                </div>
              ) : null}
              {location ? (
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-semibold text-[var(--qs-muted)]">Location</dt>
                  <dd className="text-right font-bold text-[var(--qs-ink)]">{location}</dd>
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-4">
                <dt className="font-semibold text-[var(--qs-muted)]">Username</dt>
                <dd className="text-right font-bold text-[var(--qs-ink)]">@{profile.username}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
            <h2 className="text-sm font-extrabold text-[var(--qs-ink)]">Coding profile</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                  <Trophy className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                  Rating
                </p>
                <p className="mt-1.5 text-2xl font-extrabold text-[var(--qs-ink)]">{rating}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-[var(--qs-muted)]">
                  {ratingLabel(rating)}
                </p>
              </div>
              <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                  <Target className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                  Peak rating
                </p>
                <p className="mt-1.5 text-2xl font-extrabold text-[var(--qs-ink)]">
                  {maxRating || "—"}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-[var(--qs-muted)]">
                  Personal best
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-3 text-sm">
              <span className="flex items-center gap-2 font-semibold text-[var(--qs-muted)]">
                <BadgeCheck className={cn("h-4 w-4", profile.isVerified ? "text-[var(--qs-ok)]" : "text-[var(--qs-muted)]")} />
                Account status
              </span>
              <span className={cn("font-extrabold", profile.isVerified ? "text-[var(--qs-ok)]" : "text-[var(--qs-muted)]")}>
                {profile.isVerified ? "Verified" : "Member"}
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
