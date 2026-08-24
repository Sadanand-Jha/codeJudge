"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  Coins,
  Eye,
  Megaphone,
  MousePointerClick,
  Pause,
  PenLine,
  Play,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
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
import { MetricCell, SponsoredBadge, QualityMeter, FactorRow } from "./ui";
import { AD_CREDITS, CAMPAIGNS, VISIBILITY_FACTORS, QUALITY_SCORE } from "./mockData";
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
  const [fundsOpen, setFundsOpen] = useState(false);

  const campaigns =
    demoState === "empty" ? [] : CAMPAIGNS.filter((c) => filter === "all" || c.status === filter);
  const activeCount = CAMPAIGNS.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      {/* ============ Header ============ */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-extrabold tracking-tight text-text-primary sm:text-2xl">Advertise</h1>
              <MockDataTag />
            </div>
            <p className="mt-1 text-[13px] font-medium text-text-secondary">
              Put your test series in front of the right students.
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
              Promote your test series, quizzes and courses inside the Risponse marketplace to increase visibility
              and unlock steady, measurable demand. Advertising spend is always billed separately from your sales
              commission — never hidden inside it.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: Eye, label: "More impressions" },
                { icon: MousePointerClick, label: "More product visits" },
                { icon: Users, label: "More enrollments" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/[0.02] px-3 py-1 text-[11px] font-medium text-text-secondary"
                >
                  <Icon className="h-3.5 w-3.5 text-text-muted" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Available ad credits */}
          <div className="rounded-2xl border border-border bg-white/[0.02] p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              <Coins className="h-3.5 w-3.5 text-text-muted" />
              Available Ad Credits / Balance
            </p>
            <p className="mt-2 text-[28px] font-extrabold tracking-tight text-text-primary tabular-nums">
              {formatINR(AD_CREDITS.available)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                <Wallet className="h-3 w-3" /> Pending {formatINR(AD_CREDITS.pending)}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                <Banknote className="h-3 w-3" /> Lifetime {formatINR(AD_CREDITS.lifetimeFunded)}
              </span>
            </div>
            <div className="mt-4">
              <AdBalanceGauge available={AD_CREDITS.available} total={AD_CREDITS.lifetimeFunded} />
            </div>
            <div className="mt-4 flex gap-2">
              <BillButton
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setFundsOpen(true)}
              >
                Add Funds
              </BillButton>
              <Link
                href="/creator/billing"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-500 transition-colors hover:text-pink-600 dark:text-ai-accent"
              >
                Billing
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Campaign dashboard ============ */}
      <CampaignSection
        campaigns={campaigns}
        activeCount={activeCount}
        filter={filter}
        onFilter={setFilter}
        onToast={toast.success}
        onOpenFunds={() => setFundsOpen(true)}
      />

      <AddFundsModal open={fundsOpen} onClose={() => setFundsOpen(false)} onToast={toast.success} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ============ Marketplace economics ============ */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-text-secondary">
              <Wallet className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold tracking-tight text-text-primary">How your earnings & ad spend are separated</h2>
              <p className="text-[12px] text-text-muted">Two separate pools — never mixed, never hidden.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-white/[0.02] p-3.5">
              <div>
                <p className="text-[13px] font-bold text-text-primary">Test Series Sales</p>
                <p className="text-[11px] text-text-muted">You keep 70% of every paid test-series sale.</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">70%</p>
                <p className="text-[11px] text-text-muted">to you</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-white/[0.02] px-3 py-2.5">
              <div>
                <p className="text-[13px] font-semibold text-text-primary">Marketplace commission</p>
                <p className="text-[11px] text-text-muted">Risponse keeps 30% on sales only.</p>
              </div>
              <p className="text-[13px] font-bold text-text-muted">30%</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">Advertising spend</p>
                  <p className="text-[11px] text-text-muted">Charged separately from your 30% sales commission.</p>
                </div>
              </div>
              <p className="text-[13px] font-bold text-text-primary">Separate</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border/60 bg-white/[0.02] px-3 py-2 flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            <p className="text-[11px] leading-relaxed text-text-muted">
              Your 70% earnings on sales and your advertising budget are independent. Ad spend never reduces your
              sales commission, and commissions never fund your ads.
            </p>
          </div>
        </section>

        {/* ============ Quality & visibility ============ */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-text-secondary">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold tracking-tight text-text-primary">How your visibility is determined</h2>
              <p className="text-xs text-text-muted">Sponsored placements stay clearly labeled & never buy your way to the top.</p>
            </div>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-text-secondary">
            Advertising does not guarantee unlimited exposure. Where you appear depends on a mix of marketplace
            signals and your campaign budget — a healthy, high-quality product naturally ranks better.
          </p>

          <div className="mt-4">
            <QualityMeter score={QUALITY_SCORE} label="Your current promotion quality" />
          </div>

          <div className="mt-4 space-y-3">
            {VISIBILITY_FACTORS.slice(0, 4).map((f) => (
              <FactorRow key={f.label} label={f.label} strength={f.strength} hint={f.hint} />
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-start gap-2">
              <SponsoredBadge />
              <p className="text-[11px] leading-relaxed text-text-muted">
                Every promoted placement is clearly marked <span className="font-semibold">Sponsored</span> so students always
                know when a result is advertising.
              </p>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
/* ============ Ad credit balance gauge ============ */
function AdBalanceGauge({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span>{pct}% of lifetime credits available</span>
        <span className="tabular-nums">
          {available.toLocaleString("en-IN")} / {total.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] dark:bg-white/[0.05]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ============ Campaign dashboard section ============ */
function CampaignSection({
  campaigns,
  activeCount,
  filter,
  onFilter,
  onToast,
  onOpenFunds,
}: {
  campaigns: typeof CAMPAIGNS;
  activeCount: number;
  filter: CampaignStatus | "all";
  onFilter: (v: CampaignStatus | "all") => void;
  onToast: (opts: { title: string; description: string }) => void;
  onOpenFunds: () => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-extrabold tracking-tight text-text-primary">Campaigns</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {activeCount} active
          </span>
        </div>
        {activeCount === 0 && campaigns.length > 0 && (
          <button
            type="button"
            onClick={onOpenFunds}
            className="text-xs font-semibold text-pink-500 hover:text-pink-600 dark:text-ai-accent"
          >
            Not enough credits? Add funds
          </button>
        )}
      </div>

      <div className="px-5 pt-4">
        <SegmentedControl<CampaignStatus | "all"> options={FILTERS} value={filter} onChange={onFilter} size="sm" />
      </div>

      <div className="mt-4 space-y-4 px-5 pb-5">
        {campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns in this view"
            description="Create a campaign to start putting your test series in front of the right students."
            action={
              <BillButton variant="primary" icon={<Plus className="h-4 w-4" />} href="/creator/advertise/create">
                Create Campaign
              </BillButton>
            }
          />
        ) : (
          campaigns.map((c, i) => (
            <CampaignRow key={c.id} campaign={c} index={i} onToast={onToast} />
          ))
        )}
      </div>
    </section>
  );
}

/* ============ Ad campaign row card ============ */
const OBJECTIVE_LABEL: Record<string, string> = {
  visibility: "Optimized for visibility",
  students: "Optimized for visits & enrollments",
  launch: "Launch visibility boost",
};
function CampaignRow({
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="rounded-2xl border border-border bg-white/[0.02] transition-colors duration-200 hover:border-border-hover"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-text-primary">{c.productName}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {c.productKindLabel} · {OBJECTIVE_LABEL[c.objectiveId]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SponsoredBadge />
          <StatusBadge label={meta.label} tone={meta.tone} dot />
        </div>
      </div>

      {isDraft ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-white/[0.02] px-4 py-3">
          <p className="text-[12px] text-text-secondary">
            Draft — not yet running. Review your targeting and launch when ready.
          </p>
          <div className="flex gap-2">
            <BillButton variant="ghost" icon={<PenLine className="h-3.5 w-3.5" />} href="/creator/advertise/create">
              Edit
            </BillButton>
            <BillButton variant="primary" icon={<Play className="h-3.5 w-3.5" />} href={`/creator/advertise/${c.id}`}>
              Publish
            </BillButton>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 px-5">
            <MetricCell label="Spent" value={formatINR(c.spent)} />
            <MetricCell label="Impressions" value={formatCompact(c.impressions)} />
            <MetricCell label="Visits" value={c.visits.toLocaleString("en-IN")} />
            <MetricCell label="Enrollments" value={c.enrollments.toLocaleString("en-IN")} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 px-5">
            <PillButton label="CTR" value={`${c.ctrPct}%`} />
            <PillButton label="Conversion" value={`${c.conversionPct}%`} />
            <PillButton label="ROI" value={`${c.roas}×`} />
          </div>
        </>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-[11px] text-text-muted">
          Run {c.startDate} → {c.endDate} · Daily {formatINR(c.dailyBudget)}
        </p>
        <div className="flex gap-2">
          <BillButton variant="ghost" icon={<BarChart3 className="h-4 w-4" />} href={`/creator/advertise/${c.id}`}>
            View Campaign
          </BillButton>
          {c.status === "active" && (
            <BillButton
              variant="outline"
              icon={<Pause className="h-4 w-4" />}
              onClick={() => onToast({ title: "Campaign paused", description: `${c.productName} will stop spending currently.` })}
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

function PillButton({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-white/[0.02] px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
      {label} <span className="font-bold text-text-primary tabular-nums">{value}</span>
    </span>
  );
}

function formatCompact(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}
/* ============ Add Funds modal ============ */
const FUND_PRESETS = [500, 1000, 2000, 5000];

function AddFundsModal({
  open,
  onClose,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  onToast: (opts: { title: string; description: string }) => void;
}) {
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  if (!open) return null;

  const numeric = custom ? clampAmount(Number(custom)) : amount;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-text-primary">Add Ad Credits</h2>
            <p className="mt-1 text-[13px] text-text-secondary">
              Top up the balance used to run sponsored placements. Always billed separately from your sales
              commission.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:bg-white/[0.04]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FUND_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setAmount(p);
                setCustom("");
              }}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-bold tabular-nums transition-colors",
                !custom && amount === p
                  ? "border-pink-500/40 bg-pink-500/10 text-pink-600 dark:border-ai-accent/40 dark:bg-ai-accent/10 dark:text-ai-accent"
                  : "border-border bg-card text-text-primary hover:border-border-hover"
              )}
            >
              {formatINR(p)}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <label className="text-[12px] font-semibold text-text-secondary">Or enter an amount</label>
          <div className="mt-1.5 flex items-center gap-1 rounded-xl border border-border bg-input-bg px-3">
            <span className="text-text-muted">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={100}
              step={100}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom amount"
              className="w-full bg-transparent px-2 py-2.5 text-sm font-semibold text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border/70 bg-white/[0.02] px-3.5 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-text-secondary">Ad credits added now</span>
            <span className="text-base font-extrabold text-text-primary tabular-nums">{formatINR(numeric)}</span>
          </div>
          <p className="mt-1 text-[11px] text-text-muted">GST is calculated at checkout.</p>
        </div>

        <div className="mt-5 flex gap-2">
          <BillButton variant="ghost" onClick={onClose}>
            Cancel
          </BillButton>
          <BillButton
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              onToast({
                title: "Funds added",
                description: `${formatINR(numeric)} added to your advertising balance.`,
              });
              onClose();
            }}
          >
            Add Credits
          </BillButton>
        </div>
      </motion.div>
    </div>
  );
}

function clampAmount(value: number) {
  if (Number.isNaN(value) || value <= 0) return 0;
  return Math.round(value / 100) * 100;
}
