"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { getCommunityTopTeachers, type CommunityTopTeacher } from "@/services/quiz";
import { CommunityLeaderboard } from "@/components/creator/resources/CommunityLeaderboard";

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
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 pb-[120px] sm:gap-6">
      <header className="relative overflow-hidden rounded-[20px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] p-4 text-[var(--qs-on-brand)] shadow-[2px_3px_0_var(--qs-sun)] sm:rounded-[28px] sm:border-2 sm:p-[34px] sm:shadow-[8px_8px_0_var(--qs-sun)]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[70px] -top-[90px] hidden h-[290px] w-[290px] rounded-full bg-white/[0.08] sm:block"
        />
        <h1 className="qs-display relative mb-1.5 text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] sm:mb-2 sm:text-[46px] sm:leading-[1.02] sm:tracking-[-0.035em]">
          Community
        </h1>
        <p className="relative max-w-[520px] text-[14px] font-semibold leading-[1.5] text-white sm:text-[15.5px]">
          Free quizzes shared by teachers. Pick the ones you like and pull them into your
          account in one tap.
        </p>
      </header>

      <CommunityLeaderboard teachers={topTeachers} loading={topTeachersLoading} />

      <section aria-live="polite" aria-label="Community quizzes">
        <div className="rounded-[20px] border-2 border-dashed border-[#b9aaf5] px-5 py-12 text-center font-bold text-[var(--qs-muted)]">
          <b className="mb-1.5 block text-[18px] font-extrabold text-[var(--qs-ink)] sm:text-[20px]">No quizzes yet</b>
          <span className="text-[14px] leading-5 sm:text-[15px]">Community quizzes will appear here once teachers start sharing them.</span>
        </div>
      </section>

      <p className="flex items-start justify-center gap-2 text-center text-[12px] font-medium leading-[1.45] text-[var(--qs-muted)] sm:text-[12.5px]">
        <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
        Only questions, options, answers and the teacher&apos;s name are shared. Student data
        is never shown.
      </p>
    </div>
  );
}
