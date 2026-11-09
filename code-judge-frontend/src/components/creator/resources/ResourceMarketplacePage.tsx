"use client";

import { useEffect, useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/helpers";
import { getCommunityTopTeachers, type CommunityTopTeacher } from "@/services/quiz";

const AVATAR_TONES = [
  "bg-[var(--qs-sun)] text-[var(--qs-ink)]",
  "bg-[var(--qs-poly-1)] text-[var(--qs-brand)]",
  "bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
  "bg-[var(--qs-ink)] text-[var(--qs-sun)]",
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarTone(name: string): string {
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[var(--qs-ink)] font-extrabold tracking-[-0.02em]",
        avatarTone(name),
        size === "lg"
          ? "h-[72px] w-[72px] text-[26px] shadow-[3px_3px_0_var(--qs-ink)]"
          : "h-[54px] w-[54px] text-[19px]"
      )}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}

export function ResourceMarketplacePage() {
  const [topTeachers, setTopTeachers] = useState<CommunityTopTeacher[]>([]);
  const [topTeachersLoading, setTopTeachersLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCommunityTopTeachers(10)
      .then((teachers) => {
        if (active) setTopTeachers(teachers);
      })
      .catch(() => {
        if (active) setTopTeachers([]);
      })
      .finally(() => {
        if (active) setTopTeachersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 pb-[120px]">
      <header className="relative overflow-hidden rounded-[28px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] p-[22px] text-[var(--qs-on-brand)] shadow-[8px_8px_0_var(--qs-sun)] sm:p-[34px]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[70px] -top-[90px] h-[290px] w-[290px] rounded-full bg-white/[0.08]"
        />
        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-ink)] px-3 py-[5px] text-[12px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-sun)]">
          <Sparkles className="h-3 w-3 fill-current" />
          Teacher community
        </span>
        <h1 className="qs-display relative mt-3.5 mb-2 text-[34px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[46px]">
          Community
        </h1>
        <p className="relative max-w-[520px] text-[15.5px] font-medium leading-[1.5] text-white/[0.88]">
          Free quizzes shared by teachers. Pick the ones you like and pull them into your
          account in one tap.
        </p>
      </header>

      <section aria-label="Top teachers">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--qs-ink)]">
            Top teachers
          </h2>
        </div>
        <div className="mt-1 flex gap-3.5 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:thin]">
          {topTeachersLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[148px] w-[150px] shrink-0 animate-pulse rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
              />
            ))
          ) : topTeachers.length === 0 ? (
            <p className="rounded-[18px] border-2 border-dashed border-[var(--qs-line)] px-5 py-6 text-[13px] font-bold text-[var(--qs-muted)]">
              No teachers with quiz attempts yet.
            </p>
          ) : (
            topTeachers.slice(0, 10).map((item) => {
              const name = item.displayName?.trim() || item.username || `Teacher #${item.id}`;
              return (
                <div
                  key={item.id}
                  className="grid w-[150px] shrink-0 justify-items-center gap-1 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-4 font-[inherit] text-[var(--qs-ink)]"
                >
                  <Avatar name={name} src={item.avatarUrl} size="lg" />
                  <b className="text-center text-[14.5px] font-extrabold">{name}</b>
                  <small className="text-[12px] font-bold text-[var(--qs-muted)]">
                    {item.quizzes} quiz{item.quizzes === 1 ? "" : "zes"} · {item.attempts} attempt
                    {item.attempts === 1 ? "" : "s"}
                  </small>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section aria-live="polite" aria-label="Community quizzes">
        <div className="rounded-[22px] border-2 border-dashed border-[#b9aaf5] px-5 py-12 text-center font-bold text-[var(--qs-muted)]">
          <b className="mb-1 block text-[20px] text-[var(--qs-ink)]">No quizzes yet</b>
          Community quizzes will appear here once teachers start sharing them.
        </div>
      </section>

      <p className="flex items-start justify-center gap-2 text-center text-[12.5px] font-medium leading-[1.4] text-[var(--qs-muted)]">
        <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
        Only questions, options, answers and the teacher&apos;s name are shared. Student data
        is never shown.
      </p>
    </div>
  );
}
