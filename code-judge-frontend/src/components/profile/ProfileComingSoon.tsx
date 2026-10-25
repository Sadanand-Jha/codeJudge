"use client";

import Link from "next/link";
import { ArrowLeft, Construction, Sparkles } from "lucide-react";
import ProfileSectionHeader from "./ProfileSectionHeader";

export default function ProfileComingSoon({
  title,
  description,
  backHref = "/profile",
  backLabel = "Back to profile",
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <ProfileSectionHeader
          title={title}
          description={description}
          icon={Sparkles}
          iconTone="from-[#F59E0B] to-[#F97316]"
          badge={
            <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
              Coming soon
            </span>
          }
        />

        <div className="relative overflow-hidden rounded-[20px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-12 text-center sm:py-16">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240] shadow-[3px_3px_0_var(--qs-ink)]">
            <Construction className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <h2 className="mt-4 text-lg font-extrabold text-[var(--qs-ink)]">Coming soon</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[var(--qs-muted)]">
            This section is not connected yet. We are building it and will make it available here
            soon.
          </p>
          <Link
            href={backHref}
            className="mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
