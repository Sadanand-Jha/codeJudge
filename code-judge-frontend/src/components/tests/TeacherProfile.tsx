"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, Users, Layers, Star, Check, UserPlus, GraduationCap } from "lucide-react";
import type { Teacher } from "./types";
import { TEACHER_MAP, SERIES, EXAM_MAP } from "./mockData";
import { SeriesThumbnail } from "./SeriesThumbnail";
import { ExamChip, PriceTag, Stars, TeacherAvatar, PrimaryButton } from "./ui";
import { cn } from "@/lib/helpers";

export function TeacherProfile({ teacherId }: { teacherId: string }) {
  const teacher: Teacher | undefined = TEACHER_MAP[teacherId];
  const [following, setFollowing] = useState(teacher?.following ?? false);

  if (!teacher) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-24 text-center sm:px-8 lg:px-12">
        <p className="text-sm text-text-secondary">This educator could not be found.</p>
        <Link href="/tests" className="mt-3 inline-block text-sm font-semibold text-pink-500 dark:text-ai-accent">
          ← Back to Tests
        </Link>
      </div>
    );
  }

  const series = SERIES.filter((s) => s.teacher.id === teacher.id);

  return (
    <div className="tests-ambient relative min-h-screen">
      <div className="mx-auto w-full max-w-[1200px] px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative h-36 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 sm:h-44"
        >
          <div className="tests-thumb-grid absolute inset-0 opacity-40" />
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-black/10 blur-2xl" />
        </motion.div>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="relative -mt-12 flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-end"
        >
          <TeacherAvatar name={teacher.name} gradient={teacher.avatarGradient} size={88} className="ring-4 ring-card" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">{teacher.name}</h1>
              {teacher.verified && <BadgeCheck className="h-5 w-5 text-sky-500" />}
              <span className="text-sm text-text-muted">{teacher.handle}</span>
            </div>
            <div className="mt-1 text-sm text-text-secondary">{teacher.role}</div>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-text-secondary">{teacher.bio}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {teacher.badges?.map((b) => (
                <span key={b} className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/8 px-2.5 py-0.5 text-[10px] font-bold text-violet-500 dark:text-violet-300">
                  <GraduationCap className="h-3 w-3" /> {b}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-extrabold text-text-primary">
                <Stars rating={teacher.rating} size={14} /> {teacher.rating.toFixed(1)}
              </div>
              <div className="text-[10px] text-text-muted">Rating</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <button
              onClick={() => setFollowing(!following)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-bold transition-all",
                following
                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] hover:-translate-y-0.5"
              )}
            >
              {following ? (
                <>
                  <Check className="h-4 w-4" /> Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Follow
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { icon: Layers, label: "Test Series", value: String(teacher.seriesCount) },
            { icon: Users, label: "Students", value: `${(teacher.studentCount / 1000).toFixed(0)}K` },
            { icon: Star, label: "Reviews", value: teacher.reviewCount.toLocaleString("en-IN") },
            { icon: GraduationCap, label: "Subjects", value: String(teacher.subjects.length) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <s.icon className="h-4 w-4 text-pink-500 dark:text-ai-accent" />
              <div className="mt-2 text-lg font-extrabold tabular-nums text-text-primary">{s.value}</div>
              <div className="text-[11px] font-semibold text-text-muted">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Subjects */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-8 flex flex-wrap items-center gap-2"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Teaches:</span>
          {teacher.subjects.map((sub) => (
            <span key={sub} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-text-secondary">
              {sub}
            </span>
          ))}
        </motion.section>

        {/* Their series */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-text-primary">Test Series by {teacher.name.split(" ")[0]}</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {series.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.2) }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/30 hover:shadow-[0_16px_40px_rgba(236,72,153,0.10)] dark:hover:border-ai-accent/30"
              >
                <Link href={`/tests/series/${s.id}`} className="flex flex-1 flex-col">
                  <SeriesThumbnail exam={EXAM_MAP[s.examId]} compact />
                  <div className="flex flex-1 flex-col p-4">
                    <ExamChip label={s.examName} className={EXAM_MAP[s.examId].chipClass} />
                    <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-text-primary group-hover:text-pink-500 dark:group-hover:text-ai-accent">
                      {s.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
                      <Stars rating={s.rating} size={11} />
                      <span className="font-bold text-text-primary">{s.rating.toFixed(1)}</span>
                      <span className="text-text-muted">· {(s.studentCount / 1000).toFixed(1)}K students</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <PriceTag price={s.price} originalPrice={s.originalPrice} />
                      <PrimaryButton href={`/tests/series/${s.id}`} className="px-3.5 py-2 text-[11px]">
                        View
                      </PrimaryButton>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          {series.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
              <p className="text-sm font-semibold text-text-primary">No public test series yet</p>
              <p className="mt-1 text-xs text-text-muted">Check back soon.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}