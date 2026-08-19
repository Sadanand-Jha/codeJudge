"use client";

import Link from "next/link";
import { ChevronRight, Users2 } from "lucide-react";
import { TeacherCard } from "@/components/tests/TeacherCard";
import { TeacherCta } from "@/components/tests/TeacherCta";
import { TEACHERS } from "@/components/tests/mockData";

export default function AllTeachersPage() {
  return (
    <div className="tests-ambient relative min-h-screen">
      <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-text-muted">
          <Link href="/tests" className="hover:text-text-primary">Tests</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-text-secondary">Educators</span>
        </nav>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/25 bg-pink-500/10 px-3 py-1 text-[11px] font-bold text-pink-500 dark:border-ai-accent/30 dark:bg-ai-accent/10 dark:text-ai-accent">
            <Users2 className="h-3.5 w-3.5" />
            Teacher Ecosystem
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            Top Educators
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            Explore the teachers students trust — follow them, try their series, or publish your own.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {TEACHERS.map((teacher, i) => (
            <TeacherCard key={teacher.id} teacher={teacher} index={i} />
          ))}
        </div>

        <div className="mt-16">
          <TeacherCta />
        </div>
      </div>
    </div>
  );
}