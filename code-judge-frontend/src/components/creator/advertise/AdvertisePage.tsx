"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  BillButton,
  EmptyState,
  formatINR,
  MockDataTag,
  SegmentedControl,
  StatusBadge,
} from "@/components/creator/billing/ui";
import { MetricCell, QualityMeter, FactorRow, SponsoredBadge } from "./ui";
import { CAMPAIGNS, VISIBILITY_FACTORS, QUALITY_SCORE } from "./mockData";
import type { CampaignStatus } from "./types";
import { useToast } from "@/hooks/useToast";

const STATUS_META: Record<CampaignStatus, { tone: "emerald" | "amber" | "sky" | "slate"; label: string }> = {
  active: { tone: "emerald", label: "Active" },
  paused: { tone: "amber", label: "Paused" },
  completed: { tone: "sky", label: "Completed" },
  draft: { tone: "slate", label: "Draft" },
};

const FILTERS: Array<{ id: CampaignStatus | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "completed", label: "Completed" },
  { id: "draft", label: "Draft" },
];

export function AdvertisePage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const [filter, setFilter] = useState<CampaignStatus | "all">("all");

  const campaigns = demoState === "empty" ? [] : CAMPAIGNS.filter((c) => filter === "all" || c.status === filter);
  const activeCampaigns = CAMPAIGNS.filter((c) => c.status === "active");
  const summary = useMemo(() => {
    const activeCount = activeCampaigns.length;
    const spent = CAMPAIGNS.reduce((s, c) => s + c.spent, 0);
    const reached = CAMPAIGNS.reduce((s, c) => s + c.reach, 0);
    return { activeCount, spent, reached };
  }, [activeCampaigns.length]);

  return (
    <div className="space-y-6">
      {/* ============ Header — spec: Advertise + subtitle + Create Campaign ============ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[26px] font-extrabold tracking-tight text-text-primary">Advertise</h1>
            <MockDataTag />
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-text-secondary">Get your test series in front of relevant students.</p>
        </div>
        <BillButton variant="primary" icon={<Plus className="h-4 w-4" />} href="/creator/advertise/create" className="shrink-0">
          <span className="hidden sm:inline">+ Create Campaign</span>
          <span className="sm:hidden">Create Campaign</span>
        </BillButton>
      </div>

      {/* ============ Compact summary strip — spec ============ */}
      <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <SummaryCell label="Active Campaigns" value={String(summary.activeCount)} sub={`${summary.activeCount} running`} />
        <SummaryCell label="₹ Spent" value={formatINR(summary.spent)} sub="Total advertising spend" />
        <SummaryCell label="Students Reached" value={summary.reached.toLocaleString("en-IN")} sub="Estimated relevant reach" />
      </div>

      {/* ============ Campaigns list ============ */}
      <CampaignSection campaigns={campaigns} filter={filter} onFilter={setFilter} onToast={toast.success} />

      {/* ============ Secondary: Quality + Commission disclaimer ============ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Your campaign quality — spec section 8 */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-text-secondary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold tracking-tight text-text-primary">Your campaign quality</h2>
              <p className="text-xs text-text-muted">Quality affects how efficiently your campaign reaches students.</p>
            </div>
          </div>

          <div className="mt-4">
            <QualityMeter score={QUALITY_SCORE} label="Your current promotion quality" />
          </div>
          <div className="mt-2 rounded-lg bg-white/[0.02] px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Strong rating · Low refund rate · High student engagement · Relevant audience</span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {VISIBILITY_FACTORS.slice(0, 4).map((f) => (
              <FactorRow key={f.label} label={f.label} strength={f.strength} hint={f.hint} />
            ))}
          </div>
          <p className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-text-muted">
            Your product&apos;s rating, refund rate, engagement, and relevance can affect how efficiently your campaign
            reaches students. Poor-quality products cannot dominate the marketplace simply by spending more.
          </p>
        </section>

        {/* Commission disclaimer + visibility note */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-text-secondary">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold tracking-tight text-text-primary">Advertising &amp; sales are separate</h2>
              <p className="text-xs text-text-muted">Two independent costs — never mixed.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-white/[0.02] p-3.5">
              <div>
                <p className="text-[13px] font-bold text-text-primary">Test-series sales</p>
                <p className="text-[11px] text-text-muted">You keep 70% of every paid sale.</p>
              </div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">70%</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-white/[0.02] px-3 py-2.5">
              <p className="text-[13px] font-semibold text-text-primary">Marketplace commission</p>
              <p className="text-[13px] font-bold text-text-muted">30%</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3.5">
            <p className="text-xs font-bold text-text-primary">Advertising and test-series sales are separate.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
              Advertising spend is charged separately from your test-series sales commission. When a student purchases
              your test series through Risponse, the standard marketplace commission applies.
            </p>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-white/[0.02] px-3 py-2.5">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
            <p className="text-[11px] leading-relaxed text-text-muted">
              Risponse handles targeting, placement, optimization, and delivery automatically — you simply pay for targeted
              reach to relevant students.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCell({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-white/[0.02] px-3 py-3 text-center sm:px-4 sm:text-left">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className="mt-1 text-[18px] font-extrabold tracking-tight text-text-primary tabular-nums sm:text-xl">{value}</p>
      <p className="mt-0.5 hidden text-[11px] text-text-muted sm:block">{sub}</p>
    </div>
  );
}

/* ============ Campaign list section ============ */
function CampaignSection({
  campaigns,
  filter,
  onFilter,
  onToast,
}: {
  campaigns: typeof CAMPAIGNS;
  filter: CampaignStatus | "all";
  onFilter: (v: CampaignStatus | "all") => void;
  onToast: (opts: { title: string; description: string }) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <h2 className="text-base font-extrabold tracking-tight text-text-primary">Campaigns</h2>
        <Link
          href="/creator/advertise/create"
          className="inline-flex items-center gap-1 text-xs font-semibold text-pink-500 hover:text-pink-600 dark:text-ai-accent"
        >
          + Create Campaign <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="px-5 pt-4">
        <SegmentedControl<CampaignStatus | "all"> options={FILTERS} value={filter} onChange={onFilter} size="sm" />
      </div>

      <div className="mt-4 space-y-3 px-5 pb-5">
        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns in this view"
            description="Create a campaign to put your test series in front of relevant students. Choose a series → audience → budget → reach."
            action={
              <BillButton variant="primary" icon={<Plus className="h-4 w-4" />} href="/creator/advertise/create">
                Create Campaign
              </BillButton>
            }
          />
        ) : (
          campaigns.map((c, i) => <CampaignCard key={c.id} campaign={c} index={i} onToast={onToast} />)
        )}
      </div>
    </section>
  );
}

/* ============ Compact campaign card — spec section 1 example ============ */
function CampaignCard({
  campaign: c,
  index,
  onToast,
}: {
  campaign: (typeof CAMPAIGNS)[number];
  index: number;
  onToast: (opts: { title: string; description: string }) => void;
}) {
  const meta = STATUS_META[c.status];
  const isDraft = c.status === "draft";
  const pct = c.targetedReach > 0 ? Math.min(100, Math.round((c.reach / c.targetedReach) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={cn(
        "rounded-2xl border bg-white/[0.02] transition-colors hover:border-border-hover",
        c.status === "active" ? "border-border" : "border-border/70"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-text-primary">{c.productName}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {c.productKindLabel} · {c.durationLabel} · Target ~{c.targetedReach.toLocaleString("en-IN")} students
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SponsoredBadge />
          <StatusBadge label={meta.label} tone={meta.tone} dot />
        </div>
      </div>

      {/* Completion bar for active */}
      {c.status === "active" && (
        <div className="mx-5 mt-3">
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>{pct}% of targeted reach completed</span>
            <span className="tabular-nums">
              {c.reach.toLocaleString("en-IN")} / {c.targetedReach.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {isDraft ? (
        <div className="mx-5 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3">
          <p className="text-xs text-text-secondary">Draft — not yet running.</p>
          <div className="flex gap-2">
            <BillButton variant="ghost" href="/creator/advertise/create">
              Edit
            </BillButton>
            <BillButton variant="primary" icon={<Play className="h-3.5 w-3.5" />} href={`/creator/advertise/${c.id}`}>
              Publish
            </BillButton>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 px-5 sm:grid-cols-4">
          <MetricCell label="Campaign" value={formatINR(c.budget)} sub="advertising cost" />
          <MetricCell label="Students reached" value={c.reach.toLocaleString("en-IN")} sub={`of ~${c.targetedReach.toLocaleString("en-IN")}`} />
          <MetricCell label="Test-series visits" value={c.visits.toLocaleString("en-IN")} sub={`${c.ctrPct}% CTR`} />
          <MetricCell label="Enrollments" value={c.enrollments.toLocaleString("en-IN")} sub={`${c.conversionPct}% conv.`} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-[11px] text-text-muted">
          {c.status === "draft" ? "Not launched" : `${c.startDate} → ${c.endDate}`} · {formatINR(c.budget)} total
        </p>
        <div className="flex gap-2">
          <BillButton variant="ghost" icon={<BarChart3 className="h-4 w-4" />} href={`/creator/advertise/${c.id}`}>
            View Campaign
          </BillButton>
          {c.status === "active" && (
            <BillButton
              variant="outline"
              icon={<Pause className="h-4 w-4" />}
              onClick={() => onToast({ title: "Campaign paused", description: `${c.productName} will stop spending.` })}
            >
              Pause
            </BillButton>
          )}
          {c.status === "paused" && (
            <BillButton
              variant="primary"
              icon={<Play className="h-4 w-4" />}
              onClick={() => onToast({ title: "Campaign resumed", description: `${c.productName} is active again.` })}
            >
              Resume
            </BillButton>
          )}
        </div>
      </div>
    </motion.div>
  );
}
