"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  FileQuestion,
  Wallet,
  Star,
  Plus,
  ArrowRight,
  Settings2,
  Eye,
  Trash2,
  TrendingUp,
  FilePlus2,
} from "lucide-react";
import { TEACHER_DASHBOARD_STATS, TEACHER_SERIES } from "./mockData";
import { PrimaryButton, GhostButton } from "./ui";
import { cn } from "@/lib/helpers";

export function TeacherTestDashboard() {
  const [tab, setTab] = useState<"all" | "published" | "draft">("all");
  const stats = TEACHER_DASHBOARD_STATS;
  const series = TEACHER_SERIES.filter((s) => (tab === "all" ? true : s.status === tab));

  const statCards = [
    { label: "Total Sales", value: `₹${stats.totalSales.toLocaleString("en-IN")}`, icon: TrendingUp, tint: "text-pink-500 bg-pink-500/10" },
    { label: "Students", value: stats.students.toLocaleString("en-IN"), icon: Users, tint: "text-violet-500 bg-violet-500/10" },
    { label: "Tests", value: String(stats.tests), icon: FileQuestion, tint: "text-sky-500 bg-sky-500/10" },
    { label: "Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`, icon: Wallet, tint: "text-emerald-500 bg-emerald-500/10" },
    { label: "Avg Rating", value: stats.averageRating.toFixed(1), icon: Star, tint: "text-amber-500 bg-amber-500/10" },
  ];

  return (
    <div className="tests-ambient relative min-h-screen">
      <div className="mx-auto w-full max-w-[1240px] px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">My Test Series</h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              Manage your test catalog, students and sales — all in one place.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <GhostButton href="/tests/create">
              <FilePlus2 className="h-4 w-4" /> Create Test
            </GhostButton>
            <PrimaryButton href="/tests/create">
              <Plus className="h-4 w-4" /> Create Test Series
            </PrimaryButton>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.tint)}>
                <s.icon className="h-[18px] w-[18px]" />
              </div>
              <div className="mt-3 text-xl font-extrabold tabular-nums text-text-primary">{s.value}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-text-muted">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Series list */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">My Test Series</h2>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
              {(["all", "published", "draft"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-[11px] font-bold capitalize transition-colors",
                    tab === t ? "bg-pink-500/10 text-pink-500 dark:bg-ai-accent/10 dark:text-ai-accent" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {series.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/12 to-violet-600/12 text-pink-500 ring-1 ring-inset ring-pink-500/15 sm:flex dark:text-ai-accent">
                    <FileQuestion className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-text-primary">{s.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-secondary">
                      <span>{s.examName}</span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400" /> {s.rating.toFixed(1)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3 text-text-muted" /> {s.students.toLocaleString("en-IN")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileQuestion className="h-3 w-3 text-text-muted" /> {s.tests} tests
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          s.status === "published"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                        )}
                      >
                        {s.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-5 sm:flex-col sm:items-end sm:gap-1">
                  <div className="text-right">
                    <div className="text-sm font-extrabold tabular-nums text-text-primary">
                      ₹{s.revenue.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-text-muted">revenue{s.price === 0 ? " · free" : ` @ ₹${s.price}`}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href="/tests"
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-bold text-text-primary transition-colors hover:border-pink-500/30 hover:text-pink-500"
                    >
                      <Eye className="h-3.5 w-3.5" /> Manage
                    </Link>
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-pink-500/30 hover:text-pink-500">
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-rose-500/40 hover:text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center">
            <button className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-500 transition-colors hover:text-pink-400 dark:text-ai-accent">
              View all series <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}