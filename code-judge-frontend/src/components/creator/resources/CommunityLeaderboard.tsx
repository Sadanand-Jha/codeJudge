"use client";

import { CommunityAvatar } from "@/components/creator/resources/CommunityAvatar";
import { cn } from "@/lib/helpers";
import type { CommunityTopTeacher } from "@/services/quiz";
import { useAuthStore } from "@/store/authStore";

function teacherName(teacher: CommunityTopTeacher) {
  return teacher.displayName?.trim() || teacher.username || `Teacher #${teacher.id}`;
}

function attemptLabel(count: number) {
  return `${count} attempt${count === 1 ? "" : "s"}`;
}

function quizLabel(count: number) {
  return `${count} quiz${count === 1 ? "" : "zes"}`;
}

export function CommunityLeaderboard({
  teachers,
  loading,
}: {
  teachers: CommunityTopTeacher[];
  loading: boolean;
}) {
  const user = useAuthStore((state) => state.user);

  if (loading) {
    return (
      <section aria-label="Community leaderboard" className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[20px] font-extrabold leading-6 tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[22px]">
            🏆 Top teachers
          </h2>
          <span className="h-11 w-[76px] animate-pulse rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-surface)]" />
        </div>
        <div className="grid grid-cols-[1fr_1.12fr_1fr] items-end gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[154px] animate-pulse rounded-[16px] border border-[var(--qs-line)] bg-[var(--qs-surface)]"
            />
          ))}
        </div>
        <div className="h-[198px] animate-pulse rounded-[16px] border border-[var(--qs-line)] bg-[var(--qs-surface)]" />
      </section>
    );
  }

  if (teachers.length === 0) {
    return (
      <section aria-label="Community leaderboard">
        <div className="rounded-[20px] border-2 border-dashed border-[#b9aaf5] px-5 py-8 text-center">
          <b className="mb-1.5 block text-[18px] font-extrabold text-[var(--qs-ink)]">No rankings yet</b>
          <span className="text-[14px] font-semibold leading-5 text-[var(--qs-muted)]">
            Top teachers will appear here once quizzes are attempted.
          </span>
        </div>
      </section>
    );
  }

  const topThree = teachers.slice(0, 3);
  const rest = teachers.slice(3);
  const podiumSlots =
    topThree.length >= 3
      ? [
          { teacher: topThree[1], rank: 2 as const },
          { teacher: topThree[0], rank: 1 as const },
          { teacher: topThree[2], rank: 3 as const },
        ]
      : topThree.length === 2
        ? [
            { teacher: topThree[1], rank: 2 as const },
            { teacher: topThree[0], rank: 1 as const },
          ]
        : [{ teacher: topThree[0], rank: 1 as const }];

  const isCurrentUser = (teacher: CommunityTopTeacher) => String(teacher.id) === String(user?.id);

  return (
    <section aria-label="Community leaderboard" className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[20px] font-extrabold leading-6 tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[22px]">
            🏆 Top teachers
          </h2>
          <p className="mt-0.5 text-[12px] font-semibold text-[var(--qs-muted)]">Ranked by total quiz attempts</p>
        </div>
        <span className="shrink-0 rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-[12px] font-extrabold text-[var(--qs-brand)]">
          All time
        </span>
      </div>

      <div
        className={cn(
          "grid items-end gap-2",
          podiumSlots.length === 3
            ? "grid-cols-[1fr_1.12fr_1fr]"
            : podiumSlots.length === 2
              ? "grid-cols-2"
              : "grid-cols-1"
        )}
      >
        {podiumSlots.map(({ teacher, rank }) => (
          <PodiumCard
            key={teacher.id}
            teacher={teacher}
            rank={rank}
            isYou={isCurrentUser(teacher)}
          />
        ))}
      </div>

      {rest.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-extrabold tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[20px]">
              All rankings
            </h3>
            <span className="text-[11px] font-bold text-[var(--qs-muted)] sm:text-[12px]">All quiz attempts</span>
          </div>
          <div className="overflow-hidden rounded-[16px] border border-[var(--qs-line)] bg-[var(--qs-surface)]">
            {rest.map((teacher, index) => {
              const rank = index + 4;
              const name = teacherName(teacher);
              const you = isCurrentUser(teacher);
              return (
                <div
                  key={teacher.id}
                  className={cn(
                    "grid grid-cols-[26px_38px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[var(--qs-line)] px-3 py-3 last:border-b-0",
                    you && "bg-[var(--qs-poly-1)]"
                  )}
                >
                  <span
                    className={cn(
                      "text-center text-[13px] font-extrabold",
                      you ? "text-[var(--qs-brand)]" : "text-[var(--qs-muted)]"
                    )}
                  >
                    {rank}
                  </span>
                  <CommunityAvatar name={name} src={teacher.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-extrabold leading-5 text-[var(--qs-ink)]">
                        {name}
                      </span>
                      {you && (
                        <span className="shrink-0 rounded-[5px] bg-[var(--qs-poly-2)] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.04em] text-[var(--qs-brand)]">
                          You
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[12px] font-semibold leading-4 text-[var(--qs-muted)]">
                      {quizLabel(teacher.quizzes)} · {attemptLabel(teacher.attempts)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-extrabold leading-5 text-[var(--qs-brand)]">
                      {teacher.attempts.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] font-bold leading-4 text-[var(--qs-muted)]">attempts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function PodiumCard({
  teacher,
  rank,
  isYou,
}: {
  teacher: CommunityTopTeacher;
  rank: 1 | 2 | 3;
  isYou: boolean;
}) {
  const first = rank === 1;
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" } as const;
  const labels = { 1: "Champion", 2: "Runner-up", 3: "Third place" } as const;
  const name = teacherName(teacher);

  return (
    <article
      className={cn(
        "relative min-w-0 rounded-[16px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-1.5 pb-3 pt-4 text-center",
        first
          ? "border-[1.5px] border-[var(--qs-brand)] pb-4 pt-5 shadow-[0_4px_0_var(--qs-poly-3)]"
          : "shadow-[0_2px_0_var(--qs-poly-1)]"
      )}
    >
      {first && (
        <span aria-hidden="true" className="absolute -top-4 left-1/2 -translate-x-1/2 text-[22px]">
          👑
        </span>
      )}
      <span
        className={cn(
          "absolute -top-2 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full border text-[10px] font-extrabold",
          rank === 1 && "border-[#e8bd28] bg-[#fff0a8] text-[#6a4c00]",
          rank === 2 && "border-[#c9cedb] bg-[#edf0f7] text-[#5b6274]",
          rank === 3 && "border-[#e9ad83] bg-[#ffe0ca] text-[#8c4c25]"
        )}
      >
        {rank}
      </span>
      <div className="mb-2 flex justify-center">
        <CommunityAvatar name={name} src={teacher.avatarUrl} size={first ? "lg" : "md"} />
      </div>
      <div className="flex items-center justify-center gap-1">
        <div className="truncate text-[12px] font-extrabold leading-4 text-[var(--qs-ink)]" title={name}>
          {name}
        </div>
        {isYou && (
          <span className="shrink-0 rounded-[5px] bg-[var(--qs-poly-2)] px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.04em] text-[var(--qs-brand)]">
            You
          </span>
        )}
      </div>
      <div className="mt-1 text-[11px] font-bold text-[var(--qs-muted)]">{attemptLabel(teacher.attempts)}</div>
      <div className="mt-0.5 text-[10px] font-semibold text-[var(--qs-muted)]">{quizLabel(teacher.quizzes)}</div>
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--qs-poly-1)] px-2 py-1 text-[10px] font-extrabold text-[var(--qs-brand)]">
        {medals[rank]} {labels[rank]}
      </span>
    </article>
  );
}
