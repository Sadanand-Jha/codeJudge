"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ProfileHeader } from "./ProfileHeader";
import { OverviewStats, OverviewStatsSkeleton } from "./OverviewStats";
import { AccountDetails } from "./AccountDetails";
import { StudentInsights } from "./StudentInsights";
import { CreditsUsage } from "./CreditsUsage";
import { ActivityTimeline } from "./ActivityTimeline";
import { creatorProfileFromUser } from "./creatorProfile";
import { getCreatorProfileOverview, type CreatorProfileOverview } from "@/services/creatorProfile";

function SectionSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-profile-border bg-profile-surface p-5" aria-hidden="true">
      <div className="h-4 w-32 rounded bg-profile-surface-elevated" />
      <div className="mt-4 space-y-2.5">
        <div className="h-3.5 rounded bg-profile-surface-elevated" />
        <div className="h-3.5 w-5/6 rounded bg-profile-surface-elevated" />
        <div className="h-3.5 w-4/6 rounded bg-profile-surface-elevated" />
      </div>
    </div>
  );
}

export function CreatorProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profile = useMemo(() => creatorProfileFromUser(user), [user]);

  const [overview, setOverview] = useState<CreatorProfileOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCreatorProfileOverview()
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load profile overview.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError("");
    setOverview(null);
    getCreatorProfileOverview()
      .then(setOverview)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load profile overview.");
      })
      .finally(() => setLoading(false));
  };

  const goSettings = useCallback(() => router.push("/creator/settings"), [router]);
  const goPublic = useCallback(() => router.push("/creator/profile/public"), [router]);

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4 px-1 py-2 sm:space-y-5">
      {/* 1 — Identity + actions */}
      <ProfileHeader profile={profile} onEdit={goSettings} onSettings={goSettings} onViewPublic={goPublic} />

      {/* 2 — Four key statistics */}
      {loading ? (
        <OverviewStatsSkeleton />
      ) : error || !overview ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-profile-border bg-profile-surface px-4 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-profile-text-primary">Couldn&apos;t load your statistics</p>
            <p className="mt-1 text-[12px] text-profile-text-muted">{error || "Please try again."}</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-profile-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-profile-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-profile-accent active:scale-[0.98]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : (
        <>
          <OverviewStats overview={overview} />

          {/* 3 — Account + credits */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AccountDetails profile={profile} lastActive={user?.lastLogin} onEdit={goSettings} />
            <CreditsUsage />
          </div>

          {/* 4 — Students + activity */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StudentInsights overview={overview} />
            <ActivityTimeline overview={overview} />
          </div>
        </>
      )}

      {/* Loading sections below the stats skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      ) : null}
    </div>
  );
}
