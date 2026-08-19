"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Users,
  Layers,
  FileQuestion,
  BookOpen,
  Clock,
  Languages,
  Check,
  Lock,
  PlayCircle,
  ShieldCheck,
  Globe,
  TrendingUp,
} from "lucide-react";
import type { SeriesMeta } from "./types";
import { EXAM_MAP, SERIES_MAP, SERIES_TESTS, SERIES_REVIEWS } from "./mockData";
import { SeriesThumbnail } from "./SeriesThumbnail";
import { ExamChip, FreeBadge, GhostButton, PrimaryButton, PriceTag, Stars, TeacherAvatar, VerifiedName } from "./ui";
import { cn } from "@/lib/helpers";

const LANGUAGE_LABEL: Record<SeriesMeta["language"], string> = {
  english: "English",
  hindi: "Hindi",
  "hindi-english": "Hindi + English",
  tamil: "Tamil",
  telugu: "Telugu",
  bengali: "Bengali",
  marathi: "Marathi",
};

export function TestSeriesDetail({ seriesId }: { seriesId: string }) {
  const [owned, setOwned] = useState(false);
  const series = SERIES_MAP[seriesId];
  if (!series) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-24 text-center sm:px-8 lg:px-12">
        <p className="text-sm text-text-secondary">This test series could not be found.</p>
        <Link href="/tests" className="mt-3 inline-block text-sm font-semibold text-pink-500 dark:text-ai-accent">
          ← Back to Tests
        </Link>
      </div>
    );
  }

  const exam = EXAM_MAP[series.examId];

  const facts = [
    { icon: Layers, label: `${series.testCount} Tests` },
    { icon: FileQuestion, label: `${series.questionCount.toLocaleString("en-IN")} Questions` },
    { icon: BookOpen, label: `${series.chapterTests} Chapter Tests` },
    { icon: PlayCircle, label: `${series.fullMocks} Full Mocks` },
    { icon: Languages, label: LANGUAGE_LABEL[series.language] },
  ];

  return (
    <div className="tests-ambient relative min-h-screen">
      <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-text-muted">
          <Link href="/tests" className="hover:text-text-primary">Tests</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/tests" className="hover:text-text-primary">Test Series</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate text-text-secondary">{series.title}</span>
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left — main info */}
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <ExamChip label={series.examName} className={exam.chipClass} />
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
                {series.title}
              </h1>

              <Link
                href={`/tests/teachers/${series.teacher.id}`}
                className="mt-3 inline-flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2 transition-colors hover:border-violet-500/30"
              >
                <TeacherAvatar name={series.teacher.name} gradient={series.teacher.avatarGradient} size={34} />
                <span className="text-sm">
                  <VerifiedName name={series.teacher.name} verified={series.teacher.verified} className="text-text-primary" />
                  <span className="ml-1.5 text-xs text-text-muted">· {series.teacher.role}</span>
                </span>
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-bold text-text-primary">
                  <Stars rating={series.rating} size={14} />
                  {series.rating.toFixed(1)}
                  <span className="font-normal text-text-muted">({series.ratingCount.toLocaleString("en-IN")} ratings)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-text-secondary">
                  <Users className="h-4 w-4 text-text-muted" />
                  {series.studentCount.toLocaleString("en-IN")} students
                </span>
              </div>
            </motion.div>

            {/* Facts */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            >
              {facts.map((f) => (
                <div key={f.label} className="rounded-xl border border-border bg-card px-3 py-3.5">
                  <f.icon className="h-4 w-4 text-pink-500 dark:text-ai-accent" />
                  <div className="mt-2 text-sm font-bold text-text-primary">{f.label.split(" ")[0]}</div>
                  <div className="text-[10px] text-text-muted">{f.label.split(" ").slice(1).join(" ")}</div>
                </div>
              ))}
            </motion.div>

            {/* About */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mt-10"
            >
              <h2 className="text-lg font-bold text-text-primary">About this Test Series</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary">{series.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {series.tags?.map((tag) => (
                  <span key={tag} className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.section>

            {/* What's included */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mt-10"
            >
              <h2 className="text-lg font-bold text-text-primary">What&apos;s Included</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: PlayCircle, title: "Full-length mock tests", desc: `${series.fullMocks} NTA-pattern mocks with detailed solutions` },
                  { icon: BookOpen, title: "Chapter-wise tests", desc: `${series.chapterTests} topic tests to build fundamentals` },
                  { icon: FileQuestion, title: `${series.questionCount.toLocaleString("en-IN")}+ questions`, desc: "MCQ, numerical & multi-select with video solutions" },
                  { icon: TrendingUp, title: "Performance analytics", desc: "Percentile, rank, accuracy & subject breakdown" },
                  { icon: Globe, title: "Bilingual support", desc: "Questions available in English and Hindi" },
                  { icon: ShieldCheck, title: "Money-back guarantee", desc: "7-day refund if you're not satisfied" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500 dark:bg-ai-accent/10 dark:text-ai-accent">
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text-primary">{item.title}</div>
                      <div className="mt-0.5 text-xs text-text-secondary">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Tests in series */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mt-10"
            >
              <h2 className="text-lg font-bold text-text-primary">Tests in this Series</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                {SERIES_TESTS.map((t, i) => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-card-hover/50 sm:px-5",
                      i > 0 && "border-t border-border/70"
                    )}
                  >
                    <span className="w-7 shrink-0 text-sm font-extrabold tabular-nums text-text-muted">{t.number}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-text-primary">{t.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-secondary">
                        <span>{t.type}</span>
                        <span className="inline-flex items-center gap-1">
                          <FileQuestion className="h-3 w-3 text-text-muted" /> {t.questions}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-text-muted" /> {t.minutes} min
                        </span>
                      </div>
                    </div>
                    {t.free ? (
                      <FreeBadge />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-text-muted" />
                    )}
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Reviews */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mt-10"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">Student Reviews</h2>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-text-primary">
                  <Stars rating={series.rating} size={14} /> {series.rating.toFixed(1)}
                  <span className="font-normal text-text-muted">· {series.ratingCount.toLocaleString("en-IN")} reviews</span>
                </span>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {SERIES_REVIEWS.map((rev) => (
                  <div key={rev.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2.5">
                      <TeacherAvatar name={rev.author} gradient="from-slate-500 to-slate-400" size={32} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-text-primary">{rev.author}</div>
                        <Stars rating={rev.rating} size={11} />
                      </div>
                      <span className="ml-auto shrink-0 text-[10px] text-text-muted">{rev.date}</span>
                    </div>
                    <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">{rev.text}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* About teacher */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mt-10"
            >
              <h2 className="text-lg font-bold text-text-primary">About the Teacher</h2>
              <div className="mt-4 flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
                <TeacherAvatar name={series.teacher.name} gradient={series.teacher.avatarGradient} size={64} />
                <div className="min-w-0 flex-1">
                  <VerifiedName name={series.teacher.name} verified={series.teacher.verified} className="text-base text-text-primary" />
                  <div className="mt-0.5 text-xs text-text-secondary">
                    {series.teacher.role} · {series.teacher.handle}
                  </div>
                  <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-text-secondary">{series.teacher.bio}</p>
                </div>
                <div className="flex shrink-0 items-center gap-5">
                  <div className="text-center">
                    <div className="text-lg font-extrabold text-text-primary">{series.teacher.seriesCount}</div>
                    <div className="text-[10px] text-text-muted">Series</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-extrabold text-text-primary">{(series.teacher.studentCount / 1000).toFixed(0)}K</div>
                    <div className="text-[10px] text-text-muted">Students</div>
                  </div>
                  <GhostButton href={`/tests/teachers/${series.teacher.id}`}>View Profile</GhostButton>
                </div>
              </div>
            </motion.section>
          </div>

          {/* Right — purchase panel */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="lg:sticky lg:top-20"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.4)]">
              <SeriesThumbnail exam={exam} compact={false} />
              <div className="p-5">
                <div className="flex items-baseline justify-between">
                  <PriceTag price={series.price} originalPrice={series.originalPrice} size="lg" />
                  <span className="rounded-lg bg-emerald-500/12 px-2 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                    Save ₹{(series.originalPrice - series.price).toLocaleString("en-IN")}
                  </span>
                </div>

                <PrimaryButton
                  className="mt-4 w-full py-3.5 text-sm"
                  onClick={() => setOwned(true)}
                >
                  {owned ? "Continue Access" : `Buy Test Series · ₹${series.price}`}
                </PrimaryButton>
                <GhostButton className="mt-2.5 w-full py-3 text-sm" href="/tests/attempt/ft_phy_mechanics">
                  Start Free Trial Test
                </GhostButton>

                <ul className="mt-5 space-y-2 text-xs text-text-secondary">
                  <li className="flex items-center gap-2">
                    {owned ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Lock className="h-3.5 w-3.5 text-text-muted" />}
                    {owned ? "Unlocked — start practicing now" : "Instant access on purchase"}
                  </li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Lifetime access to all {series.testCount} tests</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Detailed solutions for every question</li>
                </ul>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-card-hover/70 px-3.5 py-2.5 text-[11px]">
                  <span className="text-text-muted">Secure payments</span>
                  <span className="font-semibold text-text-primary">UPI · Cards · NetBanking</span>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}