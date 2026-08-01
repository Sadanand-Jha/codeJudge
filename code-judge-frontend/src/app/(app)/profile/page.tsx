"use client";

import { useEffect, useState } from "react";
import { getUserInfo } from "@/services/user";
import type { UserInfo } from "@/types/user";
import {
  ProfileHero,
  StatsCards,
  RatingHistory,
  TopicMastery,
  ActivityHeatmap,
  RecentContests,
  RecentSubmissions,
  Achievements,
  StreakWidget,
} from "@/components/dashboard";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getUserInfo();
        setProfile(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-32 rounded-3xl bg-[#111827] animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-[#111827] animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 h-80 rounded-2xl bg-[#111827] animate-pulse" />
            <div className="h-80 rounded-2xl bg-[#111827] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <ProfileHero
          username={profile?.username || "User"}
          email={profile?.email || "user@example.com"}
          avatarUrl={profile?.avatarUrl}
          bio={profile?.bio}
          rating={profile?.rating}
          maxRating={profile?.maxRating}
          country={profile?.country}
          joinDate={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined}
        />
        <StatsCards solved={127} currentRating={profile?.rating || 0} maxRating={profile?.maxRating || 0} contributions={23} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><RatingHistory /></div>
          <div className="space-y-6"><StreakWidget streak={47} goal={100} /></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1"><TopicMastery /></div>
          <div className="lg:col-span-2"><ActivityHeatmap /></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentContests />
          <RecentSubmissions />
        </div>

        <Achievements />
      </div>
    </div>
  );
}