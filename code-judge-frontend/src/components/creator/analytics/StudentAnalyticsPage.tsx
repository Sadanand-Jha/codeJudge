"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Clock, Trophy, Target, Search, Eye, Share2, BarChart3, Download, UserCheck, ClipboardList, UserRound, MessageSquare } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useToast } from "@/hooks/useToast";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  StatCard,
  StatCardSkeleton,
  PanelSkeleton,
  SegmentedControl,
  StatusBadge,
  type StatusTone,
  BillButton,
  EmptyState,
  ErrorState,
} from "@/components/creator/billing/ui";
import { MiniBarChart, OverflowMenu } from "./charts";
import { RANGE_OPTIONS, type Range } from "./shared";

type StudentStatus = "Active" | "At Risk" | "Inactive";

interface StudentRow {
  id: string;
  name: string;
  email: string;
  testsTaken: number;
  avgScore: number;
  highestScore: number;
  accuracy: number;
  lastActive: string;
  status: StudentStatus;
}

const STUDENTS: StudentRow[] = [
  { id: "s1", name: "Aarav Sharma", email: "aarav.sharma@gmail.com", testsTaken: 24, avgScore: 86.4, highestScore: 98.2, accuracy: 91.2, lastActive: "2h ago", status: "Active" },
  { id: "s2", name: "Priya Patel", email: "priya.patel@gmail.com", testsTaken: 19, avgScore: 79.8, highestScore: 94.5, accuracy: 85.6, lastActive: "5h ago", status: "Active" },
  { id: "s3", name: "Rohan Mehta", email: "rohan.mehta@gmail.com", testsTaken: 15, avgScore: 72.1, highestScore: 88.7, accuracy: 79.3, lastActive: "1d ago", status: "At Risk" },
  { id: "s4", name: "Sneha Iyer", email: "sneha.iyer@gmail.com", testsTaken: 21, avgScore: 83.5, highestScore: 96.1, accuracy: 88.9, lastActive: "3h ago", status: "Active" },
  { id: "s5", name: "Arjun Nair", email: "arjun.nair@gmail.com", testsTaken: 11, avgScore: 65.7, highestScore: 81.4, accuracy: 73.5, lastActive: "6d ago", status: "At Risk" },
  { id: "s6", name: "Kavya Reddy", email: "kavya.reddy@gmail.com", testsTaken: 8, avgScore: 61.2, highestScore: 78.9, accuracy: 70.8, lastActive: "18d ago", status: "Inactive" },
  { id: "s7", name: "Vikram Singh", email: "vikram.singh@gmail.com", testsTaken: 27, avgScore: 88.9, highestScore: 99.0, accuracy: 93.4, lastActive: "40m ago", status: "Active" },
  { id: "s8", name: "Meera Joshi", email: "meera.joshi@gmail.com", testsTaken: 13, avgScore: 70.3, highestScore: 86.2, accuracy: 78.1, lastActive: "4d ago", status: "At Risk" },
  { id: "s9", name: "Aditya Verma", email: "aditya.verma@gmail.com", testsTaken: 6, avgScore: 58.4, highestScore: 74.6, accuracy: 67.2, lastActive: "32d ago", status: "Inactive" },
];

const STATUS_TONE: Record<StudentStatus, StatusTone> = {
  Active: "emerald",
  "At Risk": "rose",
  Inactive: "slate",
};

const W8 = Array.from({ length: 8 }, (_, i) => `W${i + 1}`);
const WEEKLY_SCORES = [68.2, 69.4, 70.1, 71.8, 70.5, 73.2, 74.1, 75.6];

const PERF_TREND: Record<Range, Array<{ label: string; value: number }>> = {
  "7d": [
    { label: "Mon", value: 70.2 },
    { label: "Tue", value: 72.1 },
    { label: "Wed", value: 71.4 },
    { label: "Thu", value: 73.8 },
    { label: "Fri", value: 72.9 },
    { label: "Sat", value: 74.6 },
    { label: "Sun", value: 73.5 },
  ],
  "30d": W8.map((label, i) => ({ label, value: WEEKLY_SCORES[i] })),
  "90d": [
    { label: "W1", value: 64.2 },
    { label: "W2", value: 65.8 },
    { label: "W3", value: 67.1 },
    { label: "W4", value: 66.4 },
    { label: "W5", value: 68.9 },
    { label: "W6", value: 69.7 },
    { label: "W7", value: 71.3 },
    { label: "W8", value: 72.8 },
    { label: "W9", value: 73.4 },
    { label: "W10", value: 74.9 },
    { label: "W11", value: 75.2 },
    { label: "W12", value: 75.6 },
  ],
};

const AVATAR_COLORS = [
  "from-pink-500 to-rose-500",
  "from-violet-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

export function StudentAnalyticsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const [range, setRange] = useState<Range>("30d");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const effectiveRange: Range = isMobile ? "7d" : range;
  const { state, data, retry } = useBillingData(
    () => ({
      students: STUDENTS,
      perfTrend: PERF_TREND,
      stats: {
        total: 1248,
        active: 861,
        avgTestsPerStudent: 6.4,
        topScore: 99.0,
      },
    }),
    { delayMs: 650, demoState }
  );

  const topStudents = data
    ? [...data.students].sort((a, b) => b.highestScore - a.highestScore).slice(0, 5)
    : [];

  const notify = (action: string, student: StudentRow) =>
    toast.info({
      title: action,
      description: `${action} for ${student.name}.`,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Analytics"
        subtitle="See how individual students perform"
        badge={<MockDataTag />}
        actions={
          <BillButton variant="ghost" icon={<Download className="h-4 w-4" />}>
            Export
          </BillButton>
        }
      />

      {state === "loading" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <PanelSkeleton title="Students" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PanelSkeleton title="Performance trend" />
            <PanelSkeleton title="Top students" />
          </div>
        </div>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No student activity yet"
          description="Once students attempt your tests, their individual performance and progress will appear here."
          action={<BillButton href="/creator/tests/create">Create a Test</BillButton>}
        />
      )}

      {state === "ready" && data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Students"
              value={data.stats.total}
              display={data.stats.total.toLocaleString("en-IN")}
              delta={8.5}
              hint="all-time enrolled"
              accent="info"
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Active"
              value={data.stats.active}
              display={data.stats.active.toLocaleString("en-IN")}
              delta={7.4}
              hint="active this month"
              accent="success"
              icon={<UserCheck className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Avg. Tests per Student"
              value={data.stats.avgTestsPerStudent}
              display={data.stats.avgTestsPerStudent.toFixed(1)}
              delta={4.9}
              hint="this period"
              accent="gold"
              icon={<ClipboardList className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Top Score"
              value={data.stats.topScore}
              display={`${data.stats.topScore}%`}
              delta={1.8}
              hint="highest this period"
              accent="primary"
              icon={<Trophy className="h-3.5 w-3.5" />}
            />
          </div>

          <Panel title="Students" subtitle="Individual performance across your tests">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Tests Taken</th>
                    <th className="px-3 py-3">Avg Score %</th>
                    <th className="px-3 py-3">Highest Score</th>
                    <th className="px-3 py-3">Accuracy %</th>
                    <th className="px-3 py-3">Last Active</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="w-12 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s, i) => {
                    const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    return (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${avatarColor}`}>
                              {s.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-text-primary">{s.name}</p>
                              <p className="truncate text-[11px] text-text-muted">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-text-primary tabular-nums">{s.testsTaken}</td>
                        <td className="px-3 py-3 tabular-nums text-text-secondary">{s.avgScore}%</td>
                        <td className="px-3 py-3 font-semibold text-text-primary tabular-nums">{s.highestScore}%</td>
                        <td className="px-3 py-3 tabular-nums text-text-secondary">{s.accuracy}%</td>
                        <td className="px-3 py-3 text-xs text-text-secondary">{s.lastActive}</td>
                        <td className="px-3 py-3">
                          <StatusBadge label={s.status} tone={STATUS_TONE[s.status]} dot />
                        </td>
                        <td className="px-2 py-3 text-right">
                          <OverflowMenu
                            items={[
                              { label: "View Profile", icon: <UserRound className="h-3.5 w-3.5" />, onSelect: () => notify("Viewing profile", s) },
                              { label: "View Attempts", icon: <BarChart3 className="h-3.5 w-3.5" />, onSelect: () => notify("Viewing attempts", s) },
                              { label: "Message", icon: <MessageSquare className="h-3.5 w-3.5" />, onSelect: () => notify("Message", s) },
                            ]}
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2.5 md:hidden">
              {data.students.map((s, i) => {
                const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-border/60 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${avatarColor}`}>
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">{s.name}</p>
                          <p className="truncate text-[11px] text-text-muted">{s.email}</p>
                          <p className="mt-0.5 text-[10px] text-text-secondary">Active {s.lastActive}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={s.status} tone={STATUS_TONE[s.status]} dot />
                        <OverflowMenu
                          items={[
                            { label: "View Profile", icon: <UserRound className="h-3.5 w-3.5" />, onSelect: () => notify("Viewing profile", s) },
                            { label: "View Attempts", icon: <BarChart3 className="h-3.5 w-3.5" />, onSelect: () => notify("Viewing attempts", s) },
                            { label: "Message", icon: <MessageSquare className="h-3.5 w-3.5" />, onSelect: () => notify("Message", s) },
                          ]}
                        />
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      {[
                        ["Tests", String(s.testsTaken)],
                        ["Avg %", String(s.avgScore)],
                        ["Best %", String(s.highestScore)],
                        ["Accuracy", `${s.accuracy}%`],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                          <p className="text-[10px] text-text-muted">{k}</p>
                          <p className="text-xs font-bold text-text-primary tabular-nums">{v}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel
              title="Performance trend"
              subtitle="Average student scores over time"
              action={
                <SegmentedControl
                  value={effectiveRange}
                  onChange={setRange}
                  options={isMobile ? RANGE_OPTIONS.filter((o) => o.id === "7d") : RANGE_OPTIONS}
                />
              }
            >
              <MiniBarChart data={data.perfTrend[effectiveRange]} height={isMobile ? 160 : 200} formatter={(v) => `${v}%`} />
            </Panel>

            <Panel title="Top students" subtitle="Highest performers by best score">
              <div className="space-y-2.5">
                {topStudents.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-white/[0.02] p-3 transition-colors hover:border-pink-500/30"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${
                        i === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                          : i === 1
                            ? "bg-gradient-to-br from-slate-300 to-slate-400"
                            : i === 2
                              ? "bg-gradient-to-br from-amber-600 to-amber-800"
                              : "bg-gradient-to-br from-pink-500 to-violet-600"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-text-primary">{s.name}</p>
                      <p className="truncate text-[11px] text-text-muted">
                        {s.testsTaken} tests · {s.accuracy}% accuracy
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-text-primary tabular-nums">{s.highestScore}%</p>
                      <p className="text-[10px] text-text-muted">best score</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}