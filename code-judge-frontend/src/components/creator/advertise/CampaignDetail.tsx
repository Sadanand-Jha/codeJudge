"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Pause, Play, ShieldCheck, TrendingUp, Users, Eye, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  BillButton,
  formatINR,
  MockDataTag,
  Panel,
  StatusBadge,
  type StatusTone,
} from "@/components/creator/billing/ui";
import { DSA_REACH_SERIES, QUALITY_SCORE, VISIBILITY_FACTORS } from "./mockData";
import { FactorRow, MetricCell, QualityMeter, SponsoredBadge } from "./ui";
import { ChartLegend, FunnelList, ReachTimelineChart } from "./charts";
import type { AdCampaign, CampaignStatus } from "./types";

const STATUS_TONE: Record<CampaignStatus, StatusTone> = {
  active: "emerald",
  paused: "amber",
  completed: "slate",
  draft: "sky",
};

export function CampaignDetail({ campaign }: { campaign: AdCampaign }) {
  const refundRate = campaign.enrollments > 0 ? (campaign.refunds / campaign.enrollments) * 100 : 0;
  const isActive = campaign.status === "active";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/creator/advertise"
              aria-label="Back to Advertising"
              className="rounded-lg border border-border bg-card p-1.5 text-text-muted transition-colors hover:border-border-hover hover:text-text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <h1 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-[22px]">{campaign.productName}</h1>
            <StatusBadge label={campaign.status} tone={STATUS_TONE[campaign.status]} dot />
            <SponsoredBadge />
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            {formatINR(campaign.budget)} campaign · Target ~{campaign.targetedReach.toLocaleString("en-IN")} relevant students · {campaign.durationLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <BillButton variant="outline" icon={<Pause className="h-3.5 w-3.5" />}>
              Pause
            </BillButton>
          ) : campaign.status === "paused" ? (
            <BillButton variant="outline" icon={<Play className="h-3.5 w-3.5" />}>
              Resume
            </BillButton>
          ) : null}
          <MockDataTag />
        </div>
      </div>

      {/* ── Campaign completion progress ───────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-text-primary">Campaign completion</p>
          <p className="text-xs font-semibold tabular-nums text-text-muted">
            {campaign.reach.toLocaleString("en-IN")} / {campaign.targetedReach.toLocaleString("en-IN")} students · {campaign.completionPct}%
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-700"
            style={{ width: `${campaign.completionPct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-text-muted">
          Campaign remains active until the targeted reach of ~{campaign.targetedReach.toLocaleString("en-IN")} relevant students is completed.
        </p>
      </div>

      {/* ── Headline KPIs — spec section 11 ────────────────────── */}
      <Panel title="Campaign Performance" subtitle={`₹${campaign.spent.toLocaleString("en-IN")} spent · charged on targeted reach`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Students Reached" value={campaign.reach.toLocaleString("en-IN")} sub={`of ~${campaign.targetedReach.toLocaleString("en-IN")} targeted`} pct={campaign.completionPct} barTone="bg-pink-500" icon={<Users className="h-3.5 w-3.5" />} />
          <KpiCard label="Test Series Visits" value={campaign.visits.toLocaleString("en-IN")} sub={`${campaign.ctrPct}% CTR`} pct={Math.min(100, Math.round(campaign.ctrPct * 4))} barTone="bg-violet-500" icon={<Eye className="h-3.5 w-3.5" />} />
          <KpiCard label="Enrollments" value={campaign.enrollments.toLocaleString("en-IN")} sub={`${campaign.conversionPct}% conversion`} pct={Math.min(100, Math.round(campaign.conversionPct * 6))} barTone="bg-emerald-500" icon={<ShoppingBag className="h-3.5 w-3.5" />} />
          <KpiCard label="Attributed Revenue" value={formatINR(campaign.revenueAttributed)} sub={`${campaign.roas.toFixed(1)}× ROAS`} pct={Math.min(100, Math.round((campaign.roas / 6) * 100))} barTone="bg-sky-500" />
          <KpiCard label="ROAS" value={`${campaign.roas.toFixed(1)}×`} sub={`${formatINR(campaign.costPerEnrollment)} / enrollment`} pct={Math.min(100, Math.round((campaign.roas / 5) * 100))} barTone="bg-amber-500" />
        </div>
      </Panel>

      {/* ── Full metric set ────────────────────────────────────── */}
      <Panel title="All metrics" subtitle="Reach-first marketplace promotion — not impressions or bids">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCell label="Spent" value={formatINR(campaign.spent)} sub={`of ${formatINR(campaign.budget)}`} />
          <MetricCell label="Reach" value={campaign.reach.toLocaleString("en-IN")} sub={`Target ~${campaign.targetedReach.toLocaleString("en-IN")}`} />
          <MetricCell label="Product views" value={campaign.visits.toLocaleString("en-IN")} />
          <MetricCell label="Click-through rate" value={`${campaign.ctrPct.toFixed(1)}%`} />
          <MetricCell label="Enrollments" value={campaign.enrollments.toLocaleString("en-IN")} />
          <MetricCell label="Conversion rate" value={`${campaign.conversionPct.toFixed(1)}%`} />
          <MetricCell label="Revenue attributed" value={formatINR(campaign.revenueAttributed)} />
          <MetricCell label="Cost per visit" value={formatINR(campaign.costPerVisit)} />
          <MetricCell label="Cost per enrollment" value={formatINR(campaign.costPerEnrollment)} />
          <MetricCell label="Refunds" value={String(campaign.refunds)} sub={`${refundRate.toFixed(1)}% of enrollments`} />
          <MetricCell label="Completion" value={`${campaign.completionPct}%`} sub={`${campaign.reach}/${campaign.targetedReach} students`} />
        </dl>
      </Panel>

      {/* ── Charts + quality ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel
            title="Reach timeline"
            subtitle="Daily targeted student reach and product visits"
            action={<ChartLegend items={[{ label: "Reach", color: "#EC4899" }, { label: "Visits", color: "#6366F1" }]} />}
          >
            <ReachTimelineChart data={DSA_REACH_SERIES} />
          </Panel>
          <Panel title="Funnel" subtitle="From relevant reach to paid enrollment">
            <FunnelList
              steps={[
                { label: "Relevant students reached", value: campaign.reach.toLocaleString("en-IN"), pct: 100 },
                { label: "Test series visits", value: campaign.visits.toLocaleString("en-IN"), pct: safePct(campaign.visits, campaign.reach) },
                { label: "Enrollments", value: campaign.enrollments.toLocaleString("en-IN"), pct: safePct(campaign.enrollments, campaign.reach) },
              ]}
            />
            <p className="mt-3 text-[11px] text-text-muted">Estimates — not guarantees of purchases or enrollments.</p>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="How your visibility is determined" subtitle="Quality amplifies reach — never replaced by spend">
            <QualityMeter score={QUALITY_SCORE} label="Your campaign quality" />
            <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-text-muted">
              <span className="rounded-full border border-border bg-white/[0.02] px-2 py-0.5">Strong rating</span>
              <span className="rounded-full border border-border bg-white/[0.02] px-2 py-0.5">Low refund rate</span>
              <span className="rounded-full border border-border bg-white/[0.02] px-2 py-0.5">High engagement</span>
            </div>
            <div className="mt-4 space-y-3">
              {VISIBILITY_FACTORS.map((f) => (
                <FactorRow key={f.label} label={f.label} strength={f.strength} hint={f.hint} />
              ))}
            </div>
            <p className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-text-muted">
              Advertising budget increases how often an already-worthy product is shown; it does not override quality.
              Risponse never sells guaranteed top placement, and every promoted result is labeled{" "}
              <span className="font-semibold text-text-secondary">Sponsored</span>.
            </p>
          </Panel>
        </div>
      </div>

      {/* ── Marketplace economics ──────────────────────────────── */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-xs leading-relaxed text-text-secondary">
            <span className="font-semibold text-text-primary">Advertising and test-series sales are separate.</span> Advertising spend is
            charged separately from your test-series sales commission. When a student purchases your test series through Risponse, the
            standard marketplace commission applies. The {formatINR(campaign.spent)} shown above was charged for targeted reach — not
            taken from your sales payouts.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function safePct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

function KpiCard({
  label,
  value,
  sub,
  pct,
  barTone,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  pct: number;
  barTone: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-hover">
      <p className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
        {label}
        {icon && <span className="rounded-md bg-white/[0.04] p-1 text-text-muted">{icon}</span>}
      </p>
      <p className="mt-1.5 text-lg font-extrabold tracking-tight text-text-primary tabular-nums sm:text-xl">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-text-secondary">{sub}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn("h-full rounded-full", barTone)} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}
