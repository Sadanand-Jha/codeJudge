"use client";

import { Pencil } from "lucide-react";
import { IST_TIMEZONE } from "@/lib/formatters";
import type { CreatorProfile } from "@/components/creator/workspace/types";

function formatDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { timeZone: IST_TIMEZONE, day: "numeric", month: "short", year: "numeric" });
}

export function AccountDetails({
  profile,
  lastActive,
  onEdit,
}: {
  profile: CreatorProfile;
  lastActive?: string | null;
  onEdit: () => void;
}) {
  const rows: Array<{ label: string; value: string }> = [
    profile.fullName ? { label: "Full name", value: profile.fullName } : null,
    profile.email ? { label: "Email", value: profile.email } : null,
    { label: "Username", value: `@${profile.creatorUsername}` },
    { label: "Account type", value: profile.role || "Individual" },
    {
      label: "Account status",
      value: `${profile.verified ? "Verified" : "Unverified"} · Active`,
    },
    formatDateTime(profile.createdAt) ? { label: "Registered", value: formatDateTime(profile.createdAt) } : null,
    formatDateTime(lastActive) ? { label: "Last active", value: formatDateTime(lastActive) } : null,
    profile.location ? { label: "Location", value: profile.location } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-profile-border bg-profile-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-profile-text-primary">Account details</h2>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-profile-border px-3 py-1.5 text-[12px] font-semibold text-profile-text-secondary transition-colors hover:bg-profile-surface-elevated hover:text-profile-text-primary focus-visible:outline-2 focus-visible:outline-profile-accent"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-4 border-b border-profile-border py-2.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
            <dt className="shrink-0 text-[12px] font-medium text-profile-text-muted">{r.label}</dt>
            <dd className="truncate text-right text-[13px] font-medium text-profile-text-primary" title={r.value}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
