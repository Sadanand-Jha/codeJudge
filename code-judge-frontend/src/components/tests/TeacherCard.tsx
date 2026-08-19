"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Layers, UserPlus, Check } from "lucide-react";
import type { Teacher } from "./types";
import { Stars, TeacherAvatar, VerifiedName } from "./ui";
import { cn } from "@/lib/helpers";

export function TeacherCard({ teacher, index = 0 }: { teacher: Teacher; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.06, 0.24) }}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/30 hover:shadow-[0_14px_34px_rgba(139,92,246,0.10)]"
    >
      <div className="flex items-center gap-3.5">
        <TeacherAvatar name={teacher.name} gradient={teacher.avatarGradient} size={48} />
        <div className="min-w-0">
          <VerifiedName name={teacher.name} verified={teacher.verified} className="text-[14px] text-text-primary" />
          <div className="truncate text-xs text-text-secondary">{teacher.role}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs">
            <Stars rating={teacher.rating} size={11} />
            <span className="font-bold text-text-primary">{teacher.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-card-hover/70 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-sm font-extrabold text-text-primary">
            <Layers className="h-3.5 w-3.5 text-text-muted" />
            {teacher.seriesCount}
          </div>
          <div className="mt-0.5 text-[10px] text-text-muted">Test Series</div>
        </div>
        <div className="rounded-xl bg-card-hover/70 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-sm font-extrabold text-text-primary">
            <Users className="h-3.5 w-3.5 text-text-muted" />
            {(teacher.studentCount / 1000).toFixed(0)}K
          </div>
          <div className="mt-0.5 text-[10px] text-text-muted">Students</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/tests/teachers/${teacher.id}`}
          className="flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-card text-xs font-bold text-text-primary transition-colors hover:border-violet-500/30 hover:text-violet-500 dark:hover:text-violet-300"
        >
          View Profile
        </Link>
        <button
          className={cn(
            "flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all",
            teacher.following
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)] hover:-translate-y-0.5"
          )}
        >
          {teacher.following ? (
            <>
              <Check className="h-3.5 w-3.5" /> Following
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5" /> Follow
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}