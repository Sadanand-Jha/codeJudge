"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  Calendar,
  Clock,
  Zap,
  ShoppingCart,
  ArrowUpRight,
  BarChart3,
  Activity,
  AlertTriangle,
  Crown,
  ChevronRight,
  GraduationCap,
  Shield,
} from "lucide-react";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { CREDIT_PACKS, PLAN_CREDIT_ALLOWANCES } from "@/config/aiCredits";
import { useState } from "react";

/* ============================================
   Animated credit progress bar
   ============================================ */
function CreditBar({ used, total, compact = false }: { used: number; total: number; compact?: boolean }) {
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const remaining = total - used;
  const low = total > 0 && remaining / total < 0.2;

  return (
    <div className={`w-full ${compact ? "h-2" : "h-3"} rounded-full bg-card-hover overflow-hidden`}>
      <motion.div
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`h-full rounded-full ${
          low
            ? "bg-gradient-to-r from-[#EF4444] to-[#F59E0B]"
            : "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]"
        }`}
      />
    </div>
  );
}

/* ============================================
   Stat card
   ============================================ */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: accent ? `${accent}20` : "rgba(139,92,246,0.1)", color: accent ?? "var(--accent)" }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[11px] font-medium text-text-muted">{label}</div>
      </div>
      <div className="mt-2 text-xl font-extrabold text-text-primary">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-text-muted">{sub}</div>}
    </div>
  );
}

/* ============================================
   Main Dashboard
   ============================================ */
export default function AICreditsDashboard({ compact = false }: { compact?: boolean }) {
  const { balance, stats, creator, fairUsage, abuse } = useAICreditsStore();
  const [buyPackOpen, setBuyPackOpen] = useState(false);

  const remainingMonthly = balance.monthlyCredits - balance.monthlyCreditsConsumed;
  const remainingPurchased = balance.purchasedCredits - balance.purchasedCreditsConsumed;

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-[11px] font-semibold text-text-secondary">AI Credits</span>
          </div>
          <span className="text-[11px] font-bold text-accent">
            {balance.totalRemaining} credits
          </span>
        </div>
        <div className="mt-2">
          <CreditBar used={balance.monthlyAllowance - balance.remaining} total={balance.monthlyAllowance} compact />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted">
          <span>
            {balance.monthlyCredits > 0
              ? `${Math.round(((balance.monthlyCredits - remainingMonthly) / balance.monthlyCredits) * 100)}% used`
              : "No monthly credits"}
          </span>
          <button
            onClick={() => setBuyPackOpen(true)}
            className="rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent transition-colors hover:bg-accent/20"
          >
            Buy Credits
          </button>
        </div>
        <AnimatePresence>
          {buyPackOpen && <CreditPackModal onClose={() => setBuyPackOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="ai-credits-dashboard space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Sparkles} label="Remaining Credits" value={`${balance.remaining}`} sub={`of ${balance.monthlyAllowance} included`} accent="#8B5CF6" />
        <StatCard icon={Activity} label="Today's Usage" value={stats.consumedToday} sub="credits today" accent="#EC4899" />
        <StatCard icon={Calendar} label="This Month" value={stats.consumedThisMonth} sub={`${balance.monthlyAllowance} total`} accent="#6366F1" />
        <StatCard icon={TrendingUp} label="Est. Days Left" value={stats.estimatedDaysRemaining} sub={`avg ${stats.averageDailyUsage}/day`} accent="#22C55E" />
      </div>

      {/* Low credit warning */}
      <AnimatePresence>
        {balance.monthlyCredits > 0 && remainingMonthly / balance.monthlyCredits < 0.2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 0 }}
            className="rounded-2xl border border-[#EF4444]/30 bg-gradient-to-r from-[#EF4444]/10 to-[#F59E0B]/10 px-5 py-4"
          >
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#EF4444]">
              <AlertTriangle className="h-4 w-4" />
              You're running low on Monthly AI Credits.
            </div>
            <p className="mt-1 text-[11px] text-text-secondary">
              You have <span className="font-bold text-text-primary">{remainingMonthly}</span> monthly credits left. 
              {remainingPurchased > 0 ? ` ${remainingPurchased} purchased credits available.` : " We recommend topping up to avoid interruption."}
            </p>
            <button
              onClick={() => setBuyPackOpen(true)}
              className="mt-3 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)]"
            >
              View Credit Packs
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress + credits bar */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-text-muted">Monthly Allowance</div>
            <div className="mt-1 text-2xl font-extrabold text-text-primary">
              {balance.monthlyAllowance > 0 ? `${balance.monthlyAllowance} credits` : "No included credits"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-text-muted">Remaining</div>
            <div className="text-2xl font-extrabold text-accent">{balance.remaining}</div>
          </div>
        </div>
        <div className="mt-3">
          <CreditBar used={balance.monthlyAllowance - balance.remaining} total={balance.monthlyAllowance} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
          <span>{stats.consumedThisMonth} consumed</span>
          <span>{balance.purchasedCredits > 0 ? `${balance.purchasedCredits} purchased` : "No extra packs"}</span>
        </div>
      </div>

      {/* Per-feature breakdown */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-text-primary">
          <BarChart3 className="h-4 w-4 text-accent" />
          Credits Spent Per Feature
        </div>
        <div className="space-y-2">
          {Object.entries(stats.perFeature)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([featureId, credits]) => (
              <div key={featureId} className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-text-secondary">{featureId.replace(/^ai-/, "").replace(/-/g, " ")}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full bg-card-hover">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]" style={{ width: `${Math.min(100, (credits / Math.max(1, stats.consumedThisMonth)) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right text-[11px] font-bold text-text-primary">{credits}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Monthly graph */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-text-primary">
          <Activity className="h-4 w-4 text-accent" />
          Monthly Credit Graph
        </div>
        <div className="flex items-end gap-1 overflow-hidden">
          {stats.monthlyGraph.map((d, i) => {
            const max = Math.max(...stats.monthlyGraph.map((g) => g.credits), 1);
            const h = Math.max(4, (d.credits / max) * 100);
            const isLow = d.credits < 2;
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-full bg-card-hover">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.4, delay: i * 0.015 }}
                    className={`w-full rounded-full ${isLow ? "bg-[#EF4444]/70" : "bg-gradient-to-t from-[#8B5CF6] to-[#EC4899]"}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] text-text-muted">
          <span>Last 30 days</span>
          <span>Avg {stats.averageDailyUsage}/day</span>
        </div>
      </div>

      {/* Recent requests */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-text-primary">
          <Clock className="h-4 w-4 text-accent" />
          Usage History
        </div>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {stats.recentRequests.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center justify-between rounded-xl bg-card-hover px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-text-primary">{entry.featureLabel}</div>
                  <div className="text-[10px] text-text-muted">
                    {new Date(entry.timestamp).toLocaleString()} · {entry.promptSizeKB}KB in
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-accent">-{entry.credits}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                      entry.status === "refunded"
                        ? "bg-success/10 text-success"
                        : entry.status === "failed"
                        ? "bg-danger/10 text-danger"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Creator usage */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-text-primary">
          <GraduationCap className="h-4 w-4 text-accent" />
          Creator AI Usage This Month
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Quiz Generation", value: creator.quizGeneration },
            { label: "Question Improvement", value: creator.questionImprovement },
            { label: "Test Case Generation", value: creator.testCaseGeneration },
            { label: "Difficulty Analysis", value: creator.difficultyAnalysis },
            { label: "Report Generation", value: creator.reportGeneration },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card-hover px-3 py-2">
              <div className="text-[10px] text-text-muted">{item.label}</div>
              <div className="text-sm font-extrabold text-text-primary">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card-hover px-3 py-2">
          <Activity className="h-4 w-4 text-accent" />
          <span className="text-[11px] font-semibold text-text-secondary">Total Creator AI usage this month</span>
          <span className="ml-auto text-[12px] font-extrabold text-text-primary">{creator.totalThisMonth}</span>
        </div>
      </div>

      {/* Fair usage + abuse status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-text-primary">
            <Zap className="h-4 w-4 text-accent" />
            Fair Usage
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-text-secondary">
              <span>Hourly requests</span>
              <span className="font-semibold text-text-primary">
                {fairUsage.requestsThisHour} / {fairUsage.maxPerHour}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-text-secondary">
              <span>Daily requests</span>
              <span className="font-semibold text-text-primary">
                {fairUsage.requestsThisDay} / {fairUsage.maxPerDay}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-text-secondary">
              <span>Concurrent</span>
              <span className="font-semibold text-text-primary">
                {fairUsage.concurrentRequests} / {fairUsage.maxConcurrent}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-text-primary">
            <Shield className="h-4 w-4 text-accent" />
            Abuse Detection
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                abuse.isFlagged ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
              }`}
            >
              {abuse.isFlagged ? "FLAGGED" : "CLEAN"}
            </span>
            <span className="text-[11px] text-text-secondary">{abuse.activeRules.length} active rules</span>
          </div>
          {abuse.message && <p className="mt-2 text-[11px] text-text-muted">{abuse.message}</p>}
        </div>
      </div>

      {/* Credit packs */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-text-primary">
            <ShoppingCart className="h-4 w-4 text-accent" />
            Credit Packs
          </div>
          <span className="text-[10px] text-text-muted">Credits never expire while active</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`rounded-xl border p-3 transition-all ${
                pack.popular
                  ? "border-[#8B5CF6]/40 bg-gradient-to-br from-[#8B5CF6]/10 to-[#EC4899]/10"
                  : "border-border bg-card-hover"
              }`}
            >
              {pack.popular && (
                <div className="mb-1 text-[9px] font-bold tracking-wider text-[#C084FC]">POPULAR</div>
              )}
              <div className="text-[11px] font-semibold text-text-primary">{pack.name}</div>
              <div className="mt-0.5 text-[10px] text-text-muted">{pack.credits} credits</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-extrabold text-text-primary">₹{pack.price}</span>
                <button className="rounded-lg bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-2.5 py-1 text-[10px] font-bold text-white shadow-[0_2px_10px_rgba(236,72,153,0.3)] transition-all hover:shadow-[0_4px_16px_rgba(236,72,153,0.45)]">
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================
   Credit Pack Purchase Modal
   ============================================ */
function CreditPackModal({ onClose }: { onClose: () => void }) {
  const purchasePack = useAICreditsStore((s) => s.purchasePack);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">Buy AI Credits</h3>
          <button onClick={onClose} className="rounded-full p-1 text-text-muted hover:bg-card-hover hover:text-text-primary">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-text-muted">Credits never expire while your subscription is active.</p>
        <div className="mt-4 space-y-2">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={async () => {
                setPurchasing(pack.id);
                await purchasePack(pack.id);
                setPurchasing(null);
                onClose();
              }}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                pack.popular
                  ? "border-[#8B5CF6]/40 bg-gradient-to-r from-[#8B5CF6]/10 to-[#EC4899]/10"
                  : "border-border bg-card-hover hover:border-accent/30"
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-text-primary">{pack.name}</span>
                  {pack.popular && (
                    <span className="rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[8px] font-bold text-[#A78BFA]">BEST VALUE</span>
                  )}
                </div>
                <div className="text-[11px] text-text-muted">{pack.credits} credits</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-text-primary">₹{pack.price}</div>
                <div className="text-[9px] text-text-muted">
                  ₹{Math.round(pack.price / pack.credits * 100) / 100}/credit
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}