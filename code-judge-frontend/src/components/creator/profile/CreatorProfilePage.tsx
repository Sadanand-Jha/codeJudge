"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check } from "lucide-react";
import { CREATOR_PROFILE } from "@/components/creator/workspace/mockData";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileCompletion } from "./ProfileCompletion";
import { CreatorOverview } from "./CreatorOverview";
import { AboutSection } from "./AboutSection";
import { CreatorDetails } from "./CreatorDetails";
import { ExpertiseSection } from "./ExpertiseSection";
import { RecentActivity } from "./RecentActivity";
import { StudioPreferences } from "./StudioPreferences";
import { AccountSection } from "./AccountSection";
import { CreatorFinance } from "./CreatorFinance";
import { BankDetails } from "./BankDetails";
import { DangerZone } from "./DangerZone";

export function CreatorProfilePage() {
  const profile = CREATOR_PROFILE;
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState({
    displayName: profile.displayName,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
  });

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editing]);

  const save = () => {
    setEditing(false);
    // In production, this would call an API
  };

  const cancel = () => {
    setDraft({
      displayName: profile.displayName,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
    });
    setEditing(false);
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-10 py-8">
      {/* Profile Header */}
      <section>
        <ProfileHeader profile={profile} onEdit={() => setEditing(true)} />
      </section>

      {/* Profile Completion */}
      <section>
        <ProfileCompletion profile={profile} />
      </section>

      {/* Creator Overview */}
      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold text-profile-text-primary">Creator Overview</h2>
        <CreatorOverview />
      </section>

      {/* Two-column: About + Details */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section>
          <AboutSection profile={profile} />
        </section>
        <section>
          <CreatorDetails profile={profile} />
        </section>
      </div>

      {/* Expertise */}
      <section>
        <ExpertiseSection
          expertise={profile.expertise}
          subjects={profile.subjects}
          exams={profile.exams}
        />
      </section>

      {/* Recent Activity */}
      <section>
        <RecentActivity />
      </section>

      {/* Edit Profile Inline */}
      {editing && (
        <section ref={editRef} className="rounded-xl border border-profile-border bg-profile-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-profile-text-primary">Edit Profile</h2>
            <button
              type="button"
              onClick={cancel}
              className="flex h-7 w-7 items-center justify-center rounded-md text-profile-text-muted transition-colors hover:bg-profile-surface-elevated hover:text-profile-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Display Name">
              <input
                value={draft.displayName}
                onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                className="h-10 w-full rounded-lg border border-profile-border bg-profile-surface-elevated px-3 text-[13px] text-profile-text-primary outline-none focus:border-profile-accent"
              />
            </Field>
            <Field label="Bio">
              <textarea
                value={draft.bio}
                onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-profile-border bg-profile-surface-elevated px-3 py-2.5 text-[13px] text-profile-text-primary outline-none focus:border-profile-accent"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Location">
                <input
                  value={draft.location}
                  onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-profile-border bg-profile-surface-elevated px-3 text-[13px] text-profile-text-primary outline-none focus:border-profile-accent"
                />
              </Field>
              <Field label="Website">
                <input
                  value={draft.website}
                  onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-profile-border bg-profile-surface-elevated px-3 text-[13px] text-profile-text-primary outline-none focus:border-profile-accent"
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg border border-profile-border px-4 py-2 text-[12px] font-semibold text-profile-text-secondary transition-colors hover:bg-profile-surface-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="inline-flex items-center gap-1.5 rounded-lg bg-profile-accent px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-profile-accent-hover"
              >
                <Check className="h-3.5 w-3.5" />
                Save Changes
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Studio Preferences */}
      <section>
        <StudioPreferences />
      </section>

      {/* Account */}
      <section>
        <AccountSection />
      </section>

      {/* Creator Finance */}
      <section>
        <CreatorFinance />
      </section>

      {/* Bank Details */}
      <section>
        <BankDetails />
      </section>

      {/* Danger Zone */}
      <section>
        <DangerZone />
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-profile-text-secondary">{label}</label>
      {children}
    </div>
  );
}
