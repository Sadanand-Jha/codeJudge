"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, UserPlus, UserCheck, Star, Download, MoreHorizontal, User, MessageCircle, ClipboardList, Ban } from "lucide-react";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  StatCard,
  StatCardSkeleton,
  SegmentedControl,
  BillButton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  StatusBadge,
} from "@/components/creator/billing/ui";
import type { StatusTone } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";

type StudentStatus = "active" | "inactive" | "blocked";

interface Student {
  id: string;
  name: string;
  email: string;
  testsPurchased: number;
  attempts: number;
  avgScore: number;
  lastActive: string;
  status: StudentStatus;
}

const STATUS_TONE: Record<StudentStatus, StatusTone> = {
  active: "emerald",
  inactive: "slate",
  blocked: "rose",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "blocked", label: "Blocked" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const STUDENTS: Student[] = [
  { id: "s1", name: "Aarav Sharma", email: "aarav.sharma@gmail.com", testsPurchased: 12, attempts: 34, avgScore: 82, lastActive: "2 hours ago", status: "active" },
  { id: "s2", name: "Isha Patel", email: "isha.patel@outlook.com", testsPurchased: 8, attempts: 21, avgScore: 91, lastActive: "Yesterday", status: "active" },
  { id: "s3", name: "Rohan Mehta", email: "rohan.mehta@gmail.com", testsPurchased: 5, attempts: 12, avgScore: 74, lastActive: "3 days ago", status: "inactive" },
  { id: "s4", name: "Priya Nair", email: "priya.nair@yahoo.com", testsPurchased: 15, attempts: 42, avgScore: 88, lastActive: "4 hours ago", status: "active" },
  { id: "s5", name: "Vikram Singh", email: "vikram.singh@gmail.com", testsPurchased: 3, attempts: 7, avgScore: 61, lastActive: "2 weeks ago", status: "inactive" },
  { id: "s6", name: "Ananya Iyer", email: "ananya.iyer@gmail.com", testsPurchased: 10, attempts: 28, avgScore: 79, lastActive: "1 day ago", status: "active" },
  { id: "s7", name: "Kabir Kapoor", email: "kabir.kapoor@gmail.com", testsPurchased: 6, attempts: 15, avgScore: 68, lastActive: "1 month ago", status: "blocked" },
  { id: "s8", name: "Sneha Reddy", email: "sneha.reddy@gmail.com", testsPurchased: 9, attempts: 25, avgScore: 85, lastActive: "6 hours ago", status: "active" },
  { id: "s9", name: "Aditya Rao", email: "aditya.rao@outlook.com", testsPurchased: 2, attempts: 5, avgScore: 55, lastActive: "3 weeks ago", status: "inactive" },
];

function StudentMenu({ student }: { student: Student }) {
  const [open, setOpen] = useState(false);
  const blocked = student.status === "blocked";
  const items = [
    { id: "profile", label: "View Profile", icon: User },
    { id: "message", label: "Message", icon: MessageCircle },
    { id: "attempts", label: "View Attempts", icon: ClipboardList },
    { id: "block", label: blocked ? "Unblock" : "Block", icon: Ban, destructive: !blocked },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-primary"
        aria-label={`Actions for ${student.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-2xl shadow-black/50"
            >
              {items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors",
                      i > 0 && "mt-0.5 border-t border-border/60 pt-2",
                      item.destructive
                        ? "text-danger hover:bg-danger/10"
                        : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StudentsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(
    () => ({ students: STUDENTS, stats: { total: 9, newMonth: 3, active: 5, rating: 4.8 } }),
    { delayMs: 650, demoState }
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = useMemo(() => {
    const list = data?.students ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
      const matchesFilter = filter === "all" || s.status === filter;
      const matchesQuery = q === "" || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [data, query, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Students"
        subtitle="See who bought your tests and how they perform"
        badge={<MockDataTag />}
        actions={
          <>
            <BillButton href="/creator/invitations">Invite Students</BillButton>
            <BillButton variant="ghost" icon={<Download className="h-4 w-4" />}>
              Export
            </BillButton>
          </>
        }
      />

      {state === "loading" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton rows={7} cols={6} />
        </>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No students yet"
          description="Students who purchase or are invited to your tests will show up here."
          action={<BillButton href="/creator/invitations">Invite Students</BillButton>}
        />
      )}

      {state === "ready" && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Students" value={data.stats.total} display={String(data.stats.total)} delta={12} accent="primary" icon={<Users className="h-4 w-4" />} />
            <StatCard label="New This Month" value={data.stats.newMonth} display={String(data.stats.newMonth)} delta={8} accent="success" icon={<UserPlus className="h-4 w-4" />} />
            <StatCard label="Active Learners" value={data.stats.active} display={String(data.stats.active)} delta={5} accent="info" icon={<UserCheck className="h-4 w-4" />} />
            <StatCard label="Avg. Rating" value={data.stats.rating} display={`${data.stats.rating} / 5`} delta={2} accent="gold" icon={<Star className="h-4 w-4" />} />
          </div>

          <Panel noPadding>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students…"
                  className="h-9 w-64 rounded-xl border border-border bg-card pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-pink-500/40"
                />
              </div>
              <SegmentedControl value={filter} onChange={setFilter} options={FILTERS} size="md" />
            </div>

            {filtered.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No matching students"
                  description="Try adjusting your search or filter to find the students you're looking for."
                />
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto px-4 pb-4 md:block">
                  <table className="w-full min-w-[820px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        <th className="px-3 py-3">Student</th>
                        <th className="px-3 py-3 text-right">Tests Purchased</th>
                        <th className="px-3 py-3 text-right">Attempts</th>
                        <th className="px-3 py-3 text-right">Avg Score</th>
                        <th className="px-3 py-3">Last Active</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s, i) => (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                        >
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-xs font-bold text-white">
                                {s.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate font-semibold text-text-primary">{s.name}</p>
                                <p className="truncate text-[11px] text-text-muted">{s.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-right tabular-nums text-text-secondary">{s.testsPurchased}</td>
                          <td className="px-3 py-4 text-right tabular-nums text-text-secondary">{s.attempts}</td>
                          <td className="px-3 py-4 text-right font-semibold tabular-nums text-text-primary">{s.avgScore}%</td>
                          <td className="px-3 py-4 text-text-secondary">{s.lastActive}</td>
                          <td className="px-3 py-4">
                            <StatusBadge label={s.status} tone={STATUS_TONE[s.status]} dot />
                          </td>
                          <td className="px-3 py-4 text-right">
                            <StudentMenu student={s} />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-2.5 p-4 md:hidden">
                  {filtered.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-sm font-bold text-white">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{s.name}</p>
                        <p className="truncate text-[11px] text-text-muted">{s.email}</p>
                        <p className="mt-1 text-[11px] text-text-secondary">
                          {s.testsPurchased} tests · {s.attempts} attempts · {s.avgScore}% avg
                        </p>
                      </div>
                      <StatusBadge label={s.status} tone={STATUS_TONE[s.status]} dot />
                      <StudentMenu student={s} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}