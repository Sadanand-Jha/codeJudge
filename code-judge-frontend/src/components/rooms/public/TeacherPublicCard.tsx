"use client";

import { BadgeCheck, BookOpen, Star, UsersRound, Zap } from "lucide-react";
import type { CreatorPublicStats } from "@/services/quiz";
import { cn } from "@/lib/helpers";

interface TeacherPublicCardProps {
  teacher: CreatorPublicStats | null;
  className?: string;
}

function Stat({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: typeof UsersRound;
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 text-center", className)}>
      <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-[var(--qs-ink)]">
        <Icon className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
        {label}
      </p>
    </div>
  );
}

/** Public, aggregate-only teacher card shown while joining a room. */
export default function TeacherPublicCard({ teacher, className }: TeacherPublicCardProps) {
  if (!teacher) return null;

  const name = teacher.displayName?.trim() || teacher.username;
  const place = teacher.college || teacher.country;
  const joinedYear = teacher.memberSince
    ? new Date(teacher.memberSince).getFullYear()
    : null;

  return (
    <section
      aria-label="Teacher details"
      className={cn(
        "rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5 text-left",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-base font-extrabold text-[var(--qs-on-brand)]">
          {teacher.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar URLs may be remote/user-configured
            <img
              src={teacher.avatarUrl}
              alt={`${name} avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-brand)]">
            Your teacher
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-base font-extrabold text-[var(--qs-ink)]">
            <span className="truncate">{name}</span>
            {teacher.isVerified ? (
              <BadgeCheck
                className="h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]"
                aria-label="Verified teacher"
              />
            ) : null}
          </p>
          <p className="truncate text-[11px] font-semibold text-[var(--qs-muted)]">
            @{teacher.username}
            {place ? ` · ${place}` : ""}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="inline-flex items-center gap-[1px]"
              role="img"
              aria-label={
                teacher.averageTeacherRating != null
                  ? `Teacher rating ${teacher.averageTeacherRating.toFixed(1)} out of 5`
                  : "Teacher not rated yet"
              }
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-3 w-3",
                    teacher.averageTeacherRating != null &&
                      star <= Math.round(teacher.averageTeacherRating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-[var(--qs-line)] text-[var(--qs-muted)]"
                  )}
                />
              ))}
            </span>
            <span className="text-[11px] font-bold text-[var(--qs-ink)]">
              {teacher.averageTeacherRating != null
                ? teacher.averageTeacherRating.toFixed(1)
                : "New"}
            </span>
            {teacher.teacherRatingCount > 0 ? (
              <span className="text-[10px] font-semibold text-[var(--qs-muted)]">
                · {teacher.teacherRatingCount}{" "}
                {teacher.teacherRatingCount === 1 ? "rating" : "ratings"}
              </span>
            ) : null}
            {teacher.rating > 0 ? (
              <span className="rounded-full bg-[var(--qs-poly-1)] px-2 py-0.5 text-[10px] font-bold text-[var(--qs-brand)]">
                Rating {teacher.rating}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {teacher.bio ? (
        <p className="mt-2.5 line-clamp-2 text-xs leading-5 text-[var(--qs-muted)]">
          {teacher.bio}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2 border-t-2 border-[var(--qs-line)] pt-2.5">
        <Stat icon={UsersRound} value={teacher.uniqueStudents} label="Students" />
        <Stat
          icon={BookOpen}
          value={teacher.quizzesCreated}
          label="Quizzes"
          className="border-x-2 border-[var(--qs-line)] px-1"
        />
        <Stat icon={Zap} value={teacher.totalAttempts} label="Attempts" />
      </div>

      {joinedYear ? (
        <p className="mt-2 text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
          Teaching on QuizSupport since {joinedYear}
        </p>
      ) : null}
    </section>
  );
}
