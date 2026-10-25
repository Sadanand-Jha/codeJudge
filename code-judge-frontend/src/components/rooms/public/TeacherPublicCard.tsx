"use client";

import { BadgeCheck, Star } from "lucide-react";
import type { CreatorPublicStats } from "@/services/quiz";
import { cn } from "@/lib/helpers";

interface TeacherPublicCardProps {
  teacher: CreatorPublicStats | null;
  className?: string;
}

function Stat({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 text-center", className)}>
      <p className="text-[18px] font-extrabold text-[var(--qs-ink)]">{value}</p>
      <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
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

  return (
    <section
      aria-label="Teacher details"
      className={cn(
        "rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5 text-left",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-xl font-extrabold text-[var(--qs-on-brand)]">
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
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">
            Your teacher
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[18px] font-extrabold text-[var(--qs-ink)]">
            <span className="truncate">{name}</span>
            {teacher.isVerified ? (
              <BadgeCheck
                className="h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]"
                aria-label="Verified teacher"
              />
            ) : null}
          </p>
          <p className="truncate text-[12px] font-semibold text-[var(--qs-muted)]">
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
            <span className="text-[13px] font-bold text-[var(--qs-ink)]">
              {teacher.averageTeacherRating != null
                ? teacher.averageTeacherRating.toFixed(1)
                : "New"}
            </span>
            {teacher.teacherRatingCount > 0 ? (
              <span className="text-[12px] font-semibold text-[var(--qs-muted)]">
                · {teacher.teacherRatingCount}{" "}
                {teacher.teacherRatingCount === 1 ? "rating" : "ratings"}
              </span>
            ) : null}
            {teacher.rating > 0 ? (
              <span className="rounded-full bg-[var(--qs-poly-1)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-brand)]">
                Rating {teacher.rating}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {teacher.bio ? (
        <p className="mt-2 line-clamp-2 text-[13px] leading-[1.45] text-[var(--qs-muted)]">
          {teacher.bio}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2 border-t-2 border-[var(--qs-line)] pt-3">
        <Stat value={teacher.uniqueStudents} label="Students" />
        <Stat
          value={teacher.quizzesCreated}
          label="Quizzes"
          className="border-x-2 border-[var(--qs-line)] px-1"
        />
        <Stat value={teacher.totalAttempts} label="Attempts" />
      </div>
    </section>
  );
}
