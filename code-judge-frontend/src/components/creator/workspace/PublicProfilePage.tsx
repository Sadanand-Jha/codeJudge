"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  BookOpen,
  Globe,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
  Video,
  Send,
  Camera,
  ClipboardCheck,
  Layers,
  ListChecks,
  NotebookPen,
  ThumbsUp,
} from "lucide-react";
import { PageHeader, MockDataTag, Panel, StatusBadge, BillButton } from "@/components/creator/billing/ui";
import { CREATOR_PROFILE } from "./mockData";
import { cn } from "@/lib/helpers";

const SOCIAL_ICONS: Record<string, typeof Video> = {
  YouTube: Video,
  Telegram: Send,
  Instagram: Camera,
};

const STATS = [
  { label: "Students", value: "1,842", icon: Users },
  { label: "Tests", value: "27", icon: ClipboardCheck },
  { label: "Test Series", value: "12", icon: Layers },
  { label: "Attempts", value: "9,640", icon: GraduationCap },
];

const CONTENT_TABS = [
  { id: "tests", label: "Tests", icon: ClipboardCheck },
  { id: "quizzes", label: "Quizzes", icon: ListChecks },
  { id: "series", label: "Test Series", icon: Layers },
  { id: "problems", label: "Problems", icon: NotebookPen },
  { id: "about", label: "About", icon: BookOpen },
  { id: "reviews", label: "Reviews", icon: ThumbsUp },
] as const;

type ContentTab = (typeof CONTENT_TABS)[number]["id"];

const PUBLIC_TESTS = [
  { name: "JEE Physics Mock Test #4", type: "Test", price: 199, rating: 4.9, sales: 1210, questions: 40, duration: "180 min" },
  { name: "NEET Biology Full Test", type: "Test", price: 149, rating: 4.6, sales: 874, questions: 90, duration: "180 min" },
  { name: "JEE Chemistry Mock Test #2", type: "Test", price: 199, rating: 4.7, sales: 692, questions: 60, duration: "120 min" },
  { name: "SSC CGL Quant Practice", type: "Test", price: 99, rating: 4.5, sales: 533, questions: 100, duration: "60 min" },
];

const PUBLIC_QUIZZES = [
  { name: "NEET Biology Quiz: Genetics", type: "Quiz", price: 49, rating: 4.8, sales: 423, questions: 15, duration: "20 min" },
  { name: "JEE Physics Quiz: Kinematics", type: "Quiz", price: 39, rating: 4.7, sales: 356, questions: 12, duration: "15 min" },
  { name: "CS Fundamentals Quiz", type: "Quiz", price: 0, rating: 4.6, sales: 289, questions: 20, duration: "25 min" },
];

const PUBLIC_SERIES = [
  { name: "JEE Main 2027 Mock Series", type: "Series", price: 499, rating: 4.8, sales: 842, questions: 480, duration: "24 tests" },
  { name: "NEET Crash Course Series", type: "Series", price: 699, rating: 4.6, sales: 511, questions: 540, duration: "18 tests" },
];

const PUBLIC_PROBLEMS = [
  { name: "Two Pointers — Sliding Window", difficulty: "Medium", solves: 1842, rating: 4.9 },
  { name: "DP — Knapsack Variations", difficulty: "Hard", solves: 1120, rating: 4.8 },
  { name: "Binary Search on Answer", difficulty: "Easy", solves: 2301, rating: 4.7 },
];

const PUBLIC_REVIEWS = [
  { name: "Priya Nair", rating: 5, text: "Really close to the real exam pattern. The analytics after each test are super helpful!", time: "2 weeks ago" },
  { name: "Rahul Sharma", rating: 5, text: "Best mock test quality I have used. Questions are well-researched.", time: "1 month ago" },
  { name: "Sneha Patel", rating: 4, text: "Great variety of questions. Would love more explanations on wrong answers.", time: "2 months ago" },
];

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("h-3 w-3", i < Math.round(rating) ? "fill-yellow-500 text-yellow-500" : "text-text-muted")} />
      ))}
    </span>
  );
}

function PriceTag({ price }: { price: number }) {
  return price === 0 ? <span className="text-sm font-bold text-emerald-500">Free</span> : <p className="text-sm font-bold text-text-primary">₹{price}</p>;
}

export function PublicProfilePage() {
  const [tab, setTab] = useState<ContentTab>("tests");
  const profile = CREATOR_PROFILE;
  const socialIcon = (label: string) => SOCIAL_ICONS[label] ?? Globe;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Public Profile"
        subtitle="This is what students see at your public creator page."
        badge={<MockDataTag />}
        actions={
          <div className="flex items-center gap-2">
            <BillButton variant="ghost" href="/creator/profile">
              Edit profile
            </BillButton>
            <BillButton href={profile.publicProfileUrl}>
              <Globe className="h-3.5 w-3.5" />
              Open live page
            </BillButton>
          </div>
        }
      />

      {/* Public header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className="h-28 bg-gradient-to-r from-pink-500/20 via-violet-500/20 to-sky-500/20" />
        <div className="px-5 pb-5 sm:px-8 sm:pb-8">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-card bg-gradient-to-br from-pink-500 to-violet-600 text-3xl font-bold text-white shadow-xl">
                  {profile.displayName.charAt(0)}
                </div>
                <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-card">
                  <BadgeCheck className="h-4 w-4 text-white" />
                </span>
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-extrabold tracking-tight text-text-primary">{profile.displayName}</h2>
                <p className="text-xs font-medium text-pink-500 dark:text-ai-accent">@{profile.creatorUsername}</p>
                <StatusBadge label="Verified Creator" tone="emerald" className="mt-1.5" />
              </div>
            </div>
            <div className="flex items-center gap-2 pb-1">
              {profile.socials.map((social) => {
                const Icon = socialIcon(social.label);
                return (
                  <Link
                    key={social.label}
                    href={`https://${social.url}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    title={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-text-secondary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/30 dark:hover:text-ai-accent"
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-text-secondary">{profile.bio}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-white/[0.02] px-3.5 py-3">
                  <Icon className="h-4 w-4 shrink-0 text-violet-500" />
                  <div>
                    <p className="text-sm font-bold text-text-primary">{stat.value}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1">
        {CONTENT_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors",
                active ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white" : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "tests" && (
            <Panel
              title="Tests"
              subtitle="Full-length mock tests by this creator"
              action={<Link href="/creator/tests" className="text-[11px] font-semibold text-pink-500 hover:text-pink-600 dark:text-ai-accent">Manage tests →</Link>}
            >
              <div className="space-y-2.5">
                {PUBLIC_TESTS.map((test) => (
                  <div key={test.name} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-white/[0.02] p-4 transition-colors hover:border-pink-500/30">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-text-primary">{test.name}</p>
                        <span className="hidden rounded-md border border-border bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-text-muted sm:inline">{test.type}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                        <RatingStars rating={test.rating} />
                        <span>{test.rating}</span>
                        <span>{test.questions} questions</span>
                        <span>{test.duration}</span>
                        <span>{test.sales.toLocaleString("en-IN")} sales</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <PriceTag price={test.price} />
                      <button className="mt-1 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:brightness-105">
                        Take Test
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "quizzes" && (
            <Panel title="Quizzes" subtitle="Quick interactive quizzes by this creator">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PUBLIC_QUIZZES.map((quiz) => (
                  <div key={quiz.name} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-white/[0.02] p-4 transition-colors hover:border-pink-500/30">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-text-primary">{quiz.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                        <RatingStars rating={quiz.rating} />
                        <span>{quiz.questions} questions · {quiz.duration}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <PriceTag price={quiz.price} />
                      <button className="mt-1 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:brightness-105">
                        Start
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "series" && (
            <Panel title="Test Series" subtitle="Bundled test series with structured prep">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PUBLIC_SERIES.map((s) => (
                  <div key={s.name} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-white/[0.02] p-4 transition-colors hover:border-pink-500/30">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-text-primary">{s.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                        <RatingStars rating={s.rating} />
                        <span>{s.duration}</span>
                        <span>{s.sales.toLocaleString("en-IN")} subscribers</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <PriceTag price={s.price} />
                      <button className="mt-1 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:brightness-105">
                        Subscribe
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "problems" && (
            <Panel title="Problems" subtitle="Practice problems from this creator">
              <div className="space-y-2">
                {PUBLIC_PROBLEMS.map((p) => (
                  <div key={p.name} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-white/[0.02] p-4 transition-colors hover:border-pink-500/30">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-text-primary">{p.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-text-muted">
                        <RatingStars rating={p.rating} />
                        <span>{p.solves.toLocaleString("en-IN")} solves</span>
                      </div>
                    </div>
                    <StatusBadge label={p.difficulty} tone={p.difficulty === "Hard" ? "rose" : p.difficulty === "Medium" ? "amber" : "emerald"} />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "about" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Panel title="About">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Expertise</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile.expertise.map((tag) => (
                          <span key={tag} className="rounded-lg border border-border bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-text-secondary">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Subjects taught</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile.subjects.map((tag) => (
                          <span key={tag} className="rounded-lg border border-border bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-text-secondary">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Exams covered</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile.exams.map((tag) => (
                          <span key={tag} className="rounded-lg border border-border bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-text-secondary">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-border pt-4">
                      <div className="space-y-2.5">
                        <p className="flex items-center gap-2 text-[13px] text-text-secondary">
                          <BookOpen className="h-3.5 w-3.5 text-text-muted" />
                          {profile.experienceYears} years of teaching experience
                        </p>
                        <p className="flex items-center gap-2 text-[13px] text-text-secondary">
                          <ShieldCheck className="h-3.5 w-3.5 text-text-muted" />
                          {profile.qualifications.join(" · ")}
                        </p>
                        <p className="flex items-center gap-2 text-[13px] text-text-secondary">
                          <MessageSquare className="h-3.5 w-3.5 text-text-muted" />
                          {profile.languages.join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
              <div className="space-y-6">
                <Panel title="Creator Since" subtitle="Member of ByteClash">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{profile.createdAt}</p>
                      <p className="text-[11px] text-text-muted">Creator ID: {profile.creatorId}</p>
                    </div>
                  </div>
                </Panel>
                <Panel title="Top Rating" subtitle="Overall student feedback">
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-extrabold text-text-primary">{profile.stats.rating}</p>
                    <div>
                      <RatingStars rating={profile.stats.rating} />
                      <p className="mt-0.5 text-[11px] text-text-secondary">from {profile.stats.students} students</p>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {tab === "reviews" && (
            <Panel title="Reviews" subtitle="What students say about this creator">
              <div className="space-y-3">
                {PUBLIC_REVIEWS.map((review) => (
                  <div key={review.name} className="rounded-xl border border-border/60 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-xs font-bold text-white">
                          {review.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-text-primary">{review.name}</p>
                          <p className="text-[10px] text-text-muted">{review.time}</p>
                        </div>
                      </div>
                      <RatingStars rating={review.rating} />
                    </div>
                    <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">{review.text}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}