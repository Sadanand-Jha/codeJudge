"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileCompletion } from "./ProfileCompletion";
import { AboutSection } from "./AboutSection";
import { CreatorDetails } from "./CreatorDetails";
import { ExpertiseSection } from "./ExpertiseSection";
import { StudioPreferences } from "./StudioPreferences";
import { AccountSection } from "./AccountSection";
import { DangerZone } from "./DangerZone";
import { creatorProfileFromUser } from "./creatorProfile";

export function CreatorProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profile = useMemo(() => creatorProfileFromUser(user), [user]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-10 py-8">
      <section>
        <ProfileHeader profile={profile} onEdit={() => router.push("/settings")} />
      </section>

      <section>
        <ProfileCompletion profile={profile} />
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section>
          <AboutSection profile={profile} />
        </section>
        <section>
          <CreatorDetails profile={profile} />
        </section>
      </div>

      {(profile.expertise.length > 0 || profile.subjects.length > 0 || profile.exams.length > 0) && (
        <section>
          <ExpertiseSection
            expertise={profile.expertise}
            subjects={profile.subjects}
            exams={profile.exams}
          />
        </section>
      )}

      <section>
        <StudioPreferences />
      </section>

      <section>
        <AccountSection />
      </section>

      <section>
        <DangerZone />
      </section>
    </div>
  );
}
