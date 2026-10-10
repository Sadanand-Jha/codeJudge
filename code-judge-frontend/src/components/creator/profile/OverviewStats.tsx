"use client";

import { Users, Repeat2, Wallet, ClipboardList, type LucideIcon } from "lucide-react";
import type { CreatorProfileOverview } from "@/services/creatorProfile";

const nf = new Intl.NumberFormat("en-IN");

function Card({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-profile-border bg-profile-surface p-4 transition-colors hover:border-profile-text-muted/40">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-profile-surface-elevated">
          <Icon className="h-3.5 w-3.5 text-profile-text-muted" />
        </span>
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-profile-text-muted">
          {label}
        </span>
      </div>
      <p className="mt-2.5 truncate text-[26px] font-bold leading-none tracking-tight text-profile-text-primary">
        {value}
      </p>
      {sub ? <p className="mt-1.5 truncate text-[11px] text-profile-text-muted">{sub}</p> : null}
    </div>
  );
}

export function OverviewStats({ overview }: { overview: CreatorProfileOverview }) {
  const { students, attempts, assessments } = overview;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card icon={Users} label="Students" value={nf.format(students.total)} sub="Students reached" />
      <Card
        icon={Repeat2}
        label="Total Attempts"
        value={nf.format(attempts.total)}
        sub={`${nf.format(attempts.completed)} completed`}
      />
      <Card icon={Wallet} label="Credits Remaining" value="—" sub="Credit tracking isn't available yet" />
      <Card
        icon={ClipboardList}
        label="Assessments Created"
        value={nf.format(assessments.total)}
        sub={`${nf.format(assessments.published)} published · ${nf.format(assessments.draft)} draft`}
      />
    </div>
  );
}

export function OverviewStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-profile-border bg-profile-surface p-4">
          <div className="h-7 w-24 rounded-lg bg-profile-surface-elevated" />
          <div className="mt-2.5 h-7 w-16 rounded-md bg-profile-surface-elevated" />
          <div className="mt-1.5 h-3 w-28 rounded bg-profile-surface-elevated" />
        </div>
      ))}
    </div>
  );
}
