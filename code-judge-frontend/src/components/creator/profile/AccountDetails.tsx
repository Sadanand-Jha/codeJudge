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
    <div className="flex h-full flex-col rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="qs-display text-[17px] font-extrabold text-[var(--qs-ink)]">Account details</h2>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] px-3 py-1.5 text-[12px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-4 border-b border-[var(--qs-line)] py-2.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
          >
            <dt className="shrink-0 text-[12px] font-bold text-[var(--qs-muted)]">{r.label}</dt>
            <dd className="truncate text-right text-[13px] font-extrabold text-[var(--qs-ink)]" title={r.value}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
