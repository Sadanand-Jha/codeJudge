"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Pause,
  Play,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  BillButton,
  formatINR,
  MockDataTag,
  Panel,
  StatusBadge,
  type StatusTone,
} from "@/components/creator/billing/ui";
import { CAMPAIGN_OBJECTIVES, DSA_SPEND_SERIES, QUALITY_SCORE, VISIBILITY_FACTORS } from "./mockData";
import { FactorRow, MetricCell, QualityMeter, SponsoredBadge } from "./ui";
import { ChartLegend, FunnelList, ImpressionsClicksBars, SpendAreaChart } from "./charts";
import type { AdCampaign, CampaignStatus } from "./types";

const STATUS_TONE: Record<CampaignStatus, StatusTone> = {
  active: "emerald",
  paused: "amber",
  completed: "slate",
  draft: "sky",
};
function objectiveLabel(id: AdCampaign["objectiveId"]) {
  return CAMPAIGN_OBJECTIVES.find((o) => o.id === id)?.label ?? "—";
}

export function CampaignDetail({ campaign }: { campaign: AdCampaign }) {
  const refundRate = campaign.enrollments > 0 ? (campaign.refunds / campaign.enrollments) * 100 : 0;
  const isActive = campaign.status === "active";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/creator/advertise"
              aria-label="Back to Advertising"
              className="rounded-lg border border-border bg-card p-1.5 text-text-muted transition-colors hover:text-text-primary hover:border-border-hover"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <h1 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-[22px]">{campaign.productName}</h1>
            <StatusBadge label={campaign.status} tone={STATUS_TONE[campaign.status]} dot />
            <SponsoredBadge />
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">
            {campaign.objectiveId && `${objectiveLabel(campaign.objectiveId)} · `}
            {formatINR(campaign.dailyBudget)}/day · {campaign.startDate} → {campaign.endDate}
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

      {/* ── Headline KPIs ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Spent" value={formatINR(campaign.spent)} sub={`of ${formatINR(campaign.totalBudget)} budget`} pct={Math.min(100, Math.round((campaign.spent / (campaign.totalBudget || 1)) * 100))} barTone="bg-pink-500 dark:bg-ai-accent" />
        <KpiCard label="Impressions" value={campaign.impressions.toLocaleString("en-IN")} sub={`${campaign.reach.toLocaleString("en-IN")} unique reach`} pct={100} barTone="bg-sky-500" />
        <KpiCard label="Enrollments" value={campaign.enrollments.toLocaleString("en-IN")} sub={`${campaign.conversionPct.toFixed(1)}% conversion`} pct={Math.min(100, Math.round(campaign.conversionPct * 8))} barTone="bg-emerald-500" />
        <KpiCard label="Revenue attributed" value={formatINR(campaign.revenueAttributed)} sub={`${campaign.roas.toFixed(1)}× ROAS`} pct={Math.min(100, Math.round((campaign.roas / 6) * 100))} barTone="bg-violet-500" />
      </div>

      {/* ── Full metric set ────────────────────────────────────── */}
      <Panel title="All metrics" subtitle="Since campaign start · figures update in near real-time while the campaign runs">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCell label="Spend" value={formatINR(campaign.spent)} />
          <MetricCell label="Impressions" value={campaign.impressions.toLocaleString("en-IN")} />
          <MetricCell label="Reach" value={campaign.reach.toLocaleString("en-IN")} />
          <MetricCell label="Clicks" value={campaign.clicks.toLocaleString("en-IN")} />
          <MetricCell label="CTR" value={`${campaign.ctrPct.toFixed(2)}%`} />
          <MetricCell label="Product views" value={campaign.visits.toLocaleString("en-IN")} />
          <MetricCell label="Enrollments" value={campaign.enrollments.toLocaleString("en-IN")} />
          <MetricCell label="Revenue attributed" value={formatINR(campaign.revenueAttributed)} />
          <MetricCell label="Conversion rate" value={`${campaign.conversionPct.toFixed(1)}%`} />
          <MetricCell label="Cost per enrollment" value={formatINR(campaign.costPerEnrollment)} />
          <MetricCell label="ROAS" value={`${campaign.roas.toFixed(1)}×`} />
          <MetricCell label="Refund rate" value={`${refundRate.toFixed(1)}%`} />
        </dl>
      </Panel>

      {/* ── Charts + quality ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Spend & impressions" subtitle="Daily delivery over the campaign window">
            <SpendAreaChart data={DSA_SPEND_SERIES} />
          </Panel>
          <Panel
            title="Impressions vs clicks"
            subtitle="Clicks track how compelling your placement is"
            action={<ChartLegend items={[{ label: "Impressions", color: "#38bdf8" }, { label: "Clicks", color: "#a78bfa" }]} />}
          >
            <ImpressionsClicksBars data={DSA_SPEND_SERIES} />
          </Panel>
          <Panel title="Funnel" subtitle="From impression to paid enrollment">
            <FunnelList
              steps={[
                { label: "Impressions", value: campaign.impressions.toLocaleString("en-IN"), pct: 100 },
                { label: "Clicks", value: campaign.clicks.toLocaleString("en-IN"), pct: safePct(campaign.clicks, campaign.impressions) },
                { label: "Product views", value: campaign.visits.toLocaleString("en-IN"), pct: safePct(campaign.visits, campaign.impressions) },
                { label: "Enrollments", value: campaign.enrollments.toLocaleString("en-IN"), pct: safePct(campaign.enrollments, campaign.impressions) },
              ]}
            />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="How your visibility is determined" subtitle="Quality signals amplify — they are never replaced by spend">
            <QualityMeter score={QUALITY_SCORE} label="Your current promotion quality" />
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
            <span className="font-semibold text-text-primary">Ad spend is separate from marketplace commission.</span>{" "}
            On every sale you keep 70% and Risponse keeps 30%. The {formatINR(campaign.spent)} spent on this campaign
            was funded from your ad credits — it never comes out of your sales payouts, and your 30% commission is
            unchanged while this campaign runs.
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
}: {
  label: string;
  value: string;
  sub: string;
  pct: number;
  barTone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-hover">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">{label}</p>
      <p className="mt-1.5 text-lg font-extrabold tracking-tight text-text-primary tabular-nums sm:text-xl">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-text-secondary">{sub}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn("h-full rounded-full", barTone)} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}
