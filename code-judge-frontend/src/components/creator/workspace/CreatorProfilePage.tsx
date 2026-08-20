"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Globe,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { PageHeader, MockDataTag, Panel, StatusBadge, BillButton } from "@/components/creator/billing/ui";
import { useToast } from "@/hooks/useToast";
import { CREATOR_PROFILE } from "./mockData";

const INPUT_CLS =
  "w-full rounded-xl border border-border bg-input-bg px-3 py-2.5 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent";

const LABEL_CLS = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary";

const STATS = [
  { label: "Students", value: "1,842" },
  { label: "Tests", value: "27" },
  { label: "Test Series", value: "12" },
  { label: "Rating", value: "4.8" },
];

export function CreatorProfilePage() {
  const { success: toastSuccess, info: toastInfo } = useToast();
  const [saved, setSaved] = useState(true);
  const profile = CREATOR_PROFILE;
  const editDisabled = () => toastInfo({ title: "Preview mode", description: "Editing tags is disabled in this preview." });

  const [form, setForm] = useState({
    displayName: profile.displayName,
    bio: profile.bio,
    website: profile.website,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    experience: profile.experienceYears,
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    toastSuccess({ title: "Profile saved", description: "Your public profile has been updated." });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creator Profile"
        subtitle="How you appear to students on ByteClash."
        badge={<MockDataTag />}
        actions={
          <div className="flex items-center gap-2">
            <BillButton variant="ghost" href="/creator/profile/public">
              <Globe className="h-3.5 w-3.5" />
              View public profile
            </BillButton>
            <BillButton onClick={handleSave} disabled={saved}>
              <Check className="h-3.5 w-3.5" />
              {saved ? "Saved" : "Save changes"}
            </BillButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Preview card */}
        <div className="space-y-6">
          <Panel title="Public Preview" subtitle="As students will see you">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-2xl font-bold text-white">
                  {profile.displayName.charAt(0)}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-card">
                  <ShieldCheck className="h-3.5 w-3.5 text-white" />
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-text-primary">{form.displayName}</h3>
              <p className="text-xs font-medium text-pink-500 dark:text-ai-accent">@{profile.creatorUsername}</p>
              <StatusBadge label="Verified Creator" tone="emerald" className="mt-2" />
              <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">{form.bio}</p>
              <div className="mt-4 grid w-full grid-cols-4 gap-2 border-t border-border pt-4">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <p className="text-sm font-bold text-text-primary">{s.value}</p>
                    <p className="text-[9px] font-medium uppercase tracking-wide text-text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Profile Status">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-white/[0.02] px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <p className="text-[13px] font-semibold text-text-primary">Verified</p>
                </div>
                <span className="text-[11px] text-text-secondary">12 Mar 2023</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-white/[0.02] px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <Link2 className="h-4 w-4 text-violet-500" />
                  <p className="text-[13px] font-semibold text-text-primary">{profile.publicProfileUrl}</p>
                </div>
                <span className="text-[11px] text-emerald-500">Live</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Your profile is visible to students. You can control visibility in settings.
              </p>
            </div>
          </Panel>
        </div>

        {/* Edit form */}
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Basic Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLS}>Display name</label>
                <input
                  className={INPUT_CLS}
                  value={form.displayName}
                  onChange={(e) => update("displayName", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Username</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-muted">@</span>
                  <input className={cn(INPUT_CLS, "pl-7")} value={profile.creatorUsername} readOnly />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>Bio</label>
                <textarea
                  className={cn(INPUT_CLS, "min-h-24 resize-none")}
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Website</label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    className={cn(INPUT_CLS, "pl-9")}
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Experience</label>
                <input
                  className={INPUT_CLS}
                  type="number"
                  value={form.experience}
                  onChange={(e) => update("experience", e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    className={cn(INPUT_CLS, "pl-9")}
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Phone</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    className={cn(INPUT_CLS, "pl-9")}
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Location</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    className={cn(INPUT_CLS, "pl-9")}
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Languages</label>
                <input className={INPUT_CLS} value={profile.languages.join(", ")} readOnly />
              </div>
            </div>
          </Panel>

          <Panel title="Expertise & Subjects">
            <div className="space-y-5">
              <div>
                <p className={LABEL_CLS}>Expertise</p>
                <div className="flex flex-wrap gap-2">
                  {profile.expertise.map((tag) => (
                    <Chip key={tag} label={tag} onRemove={editDisabled} />
                  ))}
                  <AddChip onClick={editDisabled} />
                </div>
              </div>
              <div>
                <p className={LABEL_CLS}>Subjects taught</p>
                <div className="flex flex-wrap gap-2">
                  {profile.subjects.map((tag) => (
                    <Chip key={tag} label={tag} onRemove={editDisabled} />
                  ))}
                </div>
              </div>
              <div>
                <p className={LABEL_CLS}>Exams covered</p>
                <div className="flex flex-wrap gap-2">
                  {profile.exams.map((tag) => (
                    <Chip key={tag} label={tag} onRemove={editDisabled} />
                  ))}
                </div>
              </div>
              <div>
                <p className={LABEL_CLS}>Qualifications</p>
                <ul className="space-y-1.5">
                  {profile.qualifications.map((q) => (
                    <li key={q} className="flex items-center gap-2 text-[13px] text-text-secondary">
                      <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-text-primary"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="text-text-muted transition-colors hover:text-pink-500"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </motion.span>
  );
}

function AddChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-pink-500/30 hover:text-pink-500"
    >
      <Users className="h-3 w-3" />
      Add
    </button>
  );
}