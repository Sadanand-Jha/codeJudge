"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Building2, School, Layers, UserCheck, MoreHorizontal, Settings2, KeyRound, ClipboardList, Ban } from "lucide-react";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  PageHeader,
  MockDataTag,
  StatCard,
  StatCardSkeleton,
  BillButton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  StatusBadge,
} from "@/components/creator/billing/ui";
import type { StatusTone } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";

type OrgType = "School" | "Coaching" | "Institute" | "Company";
type OrgStatus = "active" | "pending" | "suspended";

interface Organization {
  id: string;
  name: string;
  type: OrgType;
  contact: string;
  seatsUsed: number;
  seatsTotal: number;
  testsAssigned: number;
  status: OrgStatus;
}

const TYPE_TONE: Record<OrgType, StatusTone> = {
  School: "sky",
  Coaching: "violet",
  Institute: "emerald",
  Company: "slate",
};

const STATUS_TONE: Record<OrgStatus, StatusTone> = {
  active: "emerald",
  pending: "amber",
  suspended: "rose",
};

const ORGANIZATIONS: Organization[] = [
  { id: "o1", name: "Delhi Public School, RK Puram", type: "School", contact: "Principal N. Banerjee", seatsUsed: 340, seatsTotal: 500, testsAssigned: 12, status: "active" },
  { id: "o2", name: "Resonance Coaching Center", type: "Coaching", contact: "Harsh V. Choudhary", seatsUsed: 180, seatsTotal: 250, testsAssigned: 24, status: "active" },
  { id: "o3", name: "Vidyarthi Institute of Tech", type: "Institute", contact: "Dr. Meera Krishnan", seatsUsed: 96, seatsTotal: 120, testsAssigned: 9, status: "active" },
  { id: "o4", name: "Bright Future Academy", type: "Coaching", contact: "Arjun Deshmukh", seatsUsed: 45, seatsTotal: 100, testsAssigned: 6, status: "pending" },
  { id: "o5", name: "EduBridge Learning Pvt Ltd", type: "Company", contact: "Sanya Verma", seatsUsed: 210, seatsTotal: 200, testsAssigned: 15, status: "suspended" },
  { id: "o6", name: "St. Xavier&apos;s High School", type: "School", contact: "Fr. Thomas Joseph", seatsUsed: 132, seatsTotal: 150, testsAssigned: 8, status: "active" },
];

function OrgMenu({ org }: { org: Organization }) {
  const [open, setOpen] = useState(false);
  const suspended = org.status === "suspended";
  const items = [
    { id: "manage", label: "Manage", icon: Settings2 },
    { id: "licenses", label: "Licenses", icon: KeyRound },
    { id: "tests", label: "Assign Tests", icon: ClipboardList },
    { id: "suspend", label: suspended ? "Reinstate" : "Suspend", icon: Ban, destructive: !suspended },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-primary"
        aria-label={`Actions for ${org.name}`}
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

export function OrganizationsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const { state, data, retry } = useBillingData(
    () => ({ organizations: ORGANIZATIONS, stats: { total: 6, active: 4, licenses: 1320, seatsUsed: 1003 } }),
    { delayMs: 650, demoState }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        subtitle="Manage organizations and institutions that use your tests"
        badge={<MockDataTag />}
        actions={
          <BillButton variant="ghost" icon={<Plus className="h-4 w-4" />} href="/creator/organizations/new">
            Add Organization
          </BillButton>
        }
      />

      {state === "loading" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton rows={6} cols={7} />
        </>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No organizations yet"
          description="Add a school, coaching center or company to manage licenses and assign tests."
          action={<BillButton href="/creator/organizations/new">Add Organization</BillButton>}
        />
      )}

      {state === "ready" && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Orgs" value={data.stats.total} display={String(data.stats.total)} delta={2} accent="primary" icon={<Building2 className="h-4 w-4" />} />
            <StatCard label="Active Orgs" value={data.stats.active} display={String(data.stats.active)} accent="success" icon={<School className="h-4 w-4" />} />
            <StatCard label="Licenses" value={data.stats.licenses} display={String(data.stats.licenses)} delta={14} accent="info" icon={<Layers className="h-4 w-4" />} />
            <StatCard label="Seats Used" value={data.stats.seatsUsed} display={String(data.stats.seatsUsed)} delta={6} accent="gold" icon={<UserCheck className="h-4 w-4" />} />
          </div>

          <div className="rounded-2xl border border-border bg-card transition-colors duration-200 hover:border-border-hover">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">All Organizations</h3>
                <p className="mt-0.5 text-xs text-text-secondary">Licenses, contacts and assigned tests per organization</p>
              </div>
              <StatusBadge label={`${data.stats.seatsUsed} / ${data.stats.licenses} seats`} tone="violet" />
            </div>

            <div className="hidden overflow-x-auto p-4 md:block">
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-3">Organization</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Contact</th>
                    <th className="px-3 py-3">Seats</th>
                    <th className="px-3 py-3 text-right">Tests Assigned</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.organizations.map((o, i) => {
                    const pct = Math.round((o.seatsUsed / o.seatsTotal) * 100);
                    return (
                      <motion.tr
                        key={o.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 text-xs font-bold text-white">
                              {o.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[240px] truncate font-semibold text-text-primary">{o.name}</p>
                              <p className="text-[11px] text-text-muted">Org ID · {o.id.toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <StatusBadge label={o.type} tone={TYPE_TONE[o.type]} />
                        </td>
                        <td className="px-3 py-4 text-text-secondary">{o.contact}</td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  o.seatsUsed > o.seatsTotal
                                    ? "bg-rose-500"
                                    : "bg-gradient-to-r from-pink-500 to-violet-600"
                                )}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-text-secondary">
                              {o.seatsUsed}/{o.seatsTotal}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-right font-semibold tabular-nums text-text-primary">{o.testsAssigned}</td>
                        <td className="px-3 py-4">
                          <StatusBadge label={o.status} tone={STATUS_TONE[o.status]} dot />
                        </td>
                        <td className="px-3 py-4 text-right">
                          <OrgMenu org={o} />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2.5 p-4 md:hidden">
              {data.organizations.map((o) => (
                <div key={o.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 text-xs font-bold text-white">
                        {o.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{o.name}</p>
                        <p className="text-[11px] text-text-muted">{o.contact}</p>
                      </div>
                    </div>
                    <StatusBadge label={o.status} tone={STATUS_TONE[o.status]} dot />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-text-secondary">
                    <StatusBadge label={o.type} tone={TYPE_TONE[o.type]} />
                    <span className="font-semibold tabular-nums text-text-primary">
                      {o.seatsUsed}/{o.seatsTotal} seats
                    </span>
                    <span className="tabular-nums">{o.testsAssigned} tests</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}