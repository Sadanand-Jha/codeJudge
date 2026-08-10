'use client'
import {
  Sparkles,
  Check,
  ChevronDown,
  X,
  GraduationCap,
  Lock,
  CreditCard,
  Landmark,
  Smartphone,
  Loader2,
  Zap,
  BarChart3,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/hooks/useToast";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "@/config/aiCredits";
import {
  TEACHER_PLANS,
  PLAN_CARD_FEATURE_LIMIT,
  COMPARISON_CATEGORIES,
  AI_CREDITS_POINTS,
  TRUST_POINTS,
  PRICING_FAQS,
  type TeacherPlan,
  type TeacherPlanId,
} from "@/config/pricingPlans";

type Audience = "student" | "creator";

/* ---------------------------------- Helpers ---------------------------------- */

const CURRENT_PLAN_LABELS: Record<string, string> = {
  free: "Free",
  "student-pro": "Student Pro",
  "creator-pro": "Creator Pro",
  ultimate: "Ultimate",
};

function currentTeacherPlanId(planId?: string): TeacherPlanId {
  if (planId === "teacher") return "teacher";
  if (planId === "teacher-pro") return "teacher-pro";
  if (planId === "ai-pro") return "ai-pro";
  return "free";
}

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

/* ---------------------------------- Star field (module scope, computed once) ---------------------------------- */
interface StarData {
  id: number;
  left: string;
  top: string;
  size: number;
  opacity: number;
  delay: string;
  duration: string;
  drift: boolean;
  driftDelay?: string;
  driftDuration?: string;
}

const STAR_FIELD: StarData[] = Array.from({ length: 140 }, (_, i) => {
  const drift = Math.random() > 0.55;
  return {
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 1 + Math.random() * 2,
    opacity: 0.2 + Math.random() * 0.7,
    delay: `${Math.random() * 6}s`,
    duration: `${2 + Math.random() * 5}s`,
    drift,
    driftDelay: drift ? `${Math.random() * 8}s` : undefined,
    driftDuration: drift ? `${18 + Math.random() * 14}s` : undefined,
  };
});

const SHOOTING_STARS = Array.from({ length: 4 }, (_, i) => ({
  id: i,
  left: `${10 + Math.random() * 60}%`,
  top: `${Math.random() * 45}%`,
  delay: `${10 + i * 14 + Math.random() * 5}s`,
  duration: `${6 + Math.random() * 3}s`,
}));

function StarField() {
  return (
    <div className="pricing-stars">
      {STAR_FIELD.map((s) => (
        <span
          key={s.id}
          className={`pricing-star ${s.drift ? "drift" : ""}`}
          style={{
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            "--star-opacity": s.opacity,
            "--twinkle-delay": s.delay,
            "--twinkle-duration": s.duration,
            ...(s.drift
              ? { "--drift-delay": s.driftDelay, "--drift-duration": s.driftDuration }
              : {}),
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

/* ---------------------------------- Payment methods ---------------------------------- */

const PAYMENT_METHODS = [
  { name: "UPI", icon: Smartphone },
  { name: "Visa", icon: CreditCard },
  { name: "MasterCard", icon: CreditCard },
  { name: "RuPay", icon: CreditCard },
  { name: "Net Banking", icon: Landmark },
  { name: "Razorpay", icon: Lock },
];

/* ============================================
   Plan Card
   ============================================ */
function PlanCard({
  plan,
  isCurrent,
  onSelect,
}: {
  plan: TeacherPlan;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const popular = plan.id === "teacher-pro";
  const ai = plan.id === "ai-pro";
  const limit = PLAN_CARD_FEATURE_LIMIT[plan.id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className={cnCard(plan, popular, ai)}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-text-primary">{plan.name}</h3>
            {plan.badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  popular ? "bg-accent/15 text-accent" : "bg-[#EC4899]/10 text-[#EC4899]"
                }`}
              >
                {plan.badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-secondary">{plan.tagline}</p>

          <div className="mt-4 flex items-baseline gap-1.5">
            <span className={`text-3xl font-extrabold tabular-nums ${ai ? "pricing-gradient-text" : "text-text-primary"}`}>
              {formatPrice(plan.price)}
            </span>
            <span className="text-[11px] text-text-muted">/ month</span>
          </div>
          {ai && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-accent/25 bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent">
              <Sparkles className="h-3 w-3" />
              AI-powered
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="mb-5 flex-1 space-y-2">
          {!ai &&
            plan.features.slice(0, limit).map((f) => (
              <li key={f.text} className="flex items-start gap-2">
                <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${ai ? "text-accent" : "text-success"}`} />
                <span className={`text-[11px] leading-snug ${f.highlight ? "font-semibold text-accent" : "text-text-secondary"}`}>
                  {f.text}
                </span>
              </li>
            ))}

          {ai && (
            <>
              {plan.features
                .filter((f) => !f.ai)
                .slice(0, 1)
                .map((f) => (
                  <li key={f.text} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <span className="text-[11px] leading-snug text-text-secondary">{f.text}</span>
                  </li>
                ))}
              <li className="py-1">
                <div className="flex items-center gap-2">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">AI-powered features</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </li>
              {plan.features
                .filter((f) => f.ai && !f.highlight)
                .slice(0, limit - 2)
                .map((f) => (
                  <li key={f.text} className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                    <span className="text-[11px] leading-snug text-text-secondary">{f.text}</span>
                  </li>
                ))}
            </>
          )}

          {plan.features.length > limit && (
            <li className="text-[10px] text-text-muted">+ {plan.features.length - limit} more features</li>
          )}
        </ul>

        {/* AI credits callout for AI plan */}
        {ai && (
          <div className="mb-5">
            <div className="rounded-xl border border-accent/25 bg-accent/[0.07] p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-bold text-text-primary">200 AI credits</span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-text-secondary">
                Included every month with AI Pro — powers every AI feature.
              </p>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onSelect}
          disabled={isCurrent}
          className={cnCta(plan, popular, ai, isCurrent)}
        >
          {isCurrent ? "Your current plan" : plan.cta}
          {!isCurrent && <ArrowRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </motion.div>
  );
}

function cnCard(plan: TeacherPlan, popular: boolean, ai: boolean): string {
  const base = "relative rounded-2xl border p-6 transition-all duration-200";
  if (popular) {
    return `${base} border-accent/40 bg-card shadow-[0_0_40px_rgba(124,58,237,0.10)] hover:shadow-[0_0_50px_rgba(124,58,237,0.18)]`;
  }
  if (ai) {
    return `${base} border-accent/30 bg-gradient-to-b from-accent/[0.06] to-card hover:border-accent/50`;
  }
  return `${base} border-border bg-card hover:border-border-hover`;
}

function cnCta(plan: TeacherPlan, popular: boolean, ai: boolean, isCurrent: boolean): string {
  const base =
    "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold transition-all duration-200 active:scale-[0.98]";
  if (isCurrent) return `${base} cursor-not-allowed border border-border bg-card-hover text-text-muted`;
  if (ai) {
    return `${base} bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-[0_4px_16px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_24px_rgba(139,92,246,0.5)]`;
  }
  if (popular) {
    return `${base} bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)]`;
  }
  return `${base} border border-border bg-card-hover text-text-primary hover:border-accent/40 hover:bg-accent/10 hover:text-accent`;
}

/* ============================================
   Student Plan Card (unchanged Student Pro)
   ============================================ */
function StudentPlanSection({ onSelect }: { onSelect: () => void }) {
  const studentPro = SUBSCRIPTION_PLANS.find((p) => p.id === "student-pro");

  return (
    <section className="pt-4">
      <div className="mb-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <GraduationCap className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-bold text-text-primary sm:text-2xl">For Students</h2>
        </div>
        <p className="mx-auto max-w-xl text-sm text-text-secondary">
          Supercharge your practice with AI assistance. The Free plan is always available to students.
        </p>
      </div>

      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-accent/30 bg-card p-6 shadow-[0_0_40px_rgba(124,58,237,0.10)] transition-all duration-200 hover:border-accent/50">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-text-primary">{studentPro?.name ?? "Student Pro"}</h3>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
              Popular
            </span>
          </div>
          <p className="text-[11px] text-text-secondary">{studentPro?.description ?? "AI-powered learning assistance for students"}</p>

          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold tabular-nums text-text-primary">{formatPrice(studentPro?.monthlyPrice ?? 299)}</span>
            <span className="text-[11px] text-text-muted">/ month</span>
          </div>

          <ul className="mt-5 space-y-2">
            {(studentPro?.features ?? []).map((f) => (
              <li key={f.id} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                <span className="text-[11px] leading-snug text-text-secondary">{f.label}</span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              <span className="text-[11px] leading-snug text-text-secondary">
                {studentPro?.monthlyCredits ?? 300} AI credits / month
              </span>
            </li>
          </ul>

          <button
            onClick={onSelect}
            className="mt-6 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)] active:scale-[0.98]"
          >
            Get Student Pro
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   Comparison Table
   ============================================ */
function ComparisonTable() {
  const cols: Array<{ id: TeacherPlanId; label: string; price: number }> = [
    { id: "free", label: "Free", price: 0 },
    { id: "teacher", label: "Teacher", price: 49 },
    { id: "teacher-pro", label: "Teacher Pro", price: 99 },
    { id: "ai-pro", label: "AI Pro", price: 199 },
  ];

  return (
    <section className="pt-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">Compare plans</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-text-secondary">
          See exactly which feature belongs to which plan.
        </p>
      </div>

      <div className="space-y-3">
        {COMPARISON_CATEGORIES.map((cat, ci) => (
          <details
            key={cat.label}
            open
            className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-border-hover"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 outline-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                  <BarChart3 className="h-3.5 w-3.5 text-accent" />
                </span>
                <span className="text-[13px] font-bold text-text-primary">{cat.label}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180" />
            </summary>

            <div className="overflow-x-auto border-t border-border/60">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-card-hover/50 text-[10px] uppercase tracking-wider text-text-muted">
                    <th className="sticky left-0 z-10 bg-card-hover/50 px-4 py-2.5 font-semibold">Feature</th>
                    {cols.map((c) => (
                      <th key={c.id} className="px-3 py-2.5 text-center font-semibold">
                        {c.label}
                        <span className="block text-[10px] font-normal normal-case text-text-muted">{formatPrice(c.price)}/mo</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cat.rows.map((row) => (
                    <tr key={row.label} className="border-b border-border/50 last:border-0">
                      <td className="sticky left-0 z-10 bg-card px-4 py-2.5 text-[11px] text-text-secondary">{row.label}</td>
                      {cols.map((c) => {
                        const v = row.values[c.id];
                        return (
                          <td key={c.id} className="px-3 py-2.5 text-center">
                            {typeof v === "boolean" ? (
                              v ? (
                                <Check className="mx-auto h-4 w-4 text-success" />
                              ) : (
                                <span className="text-text-muted">—</span>
                              )
                            ) : (
                              <span className={`text-[10px] ${v === "—" ? "text-text-muted" : "font-semibold text-text-secondary"}`}>{v}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className="sr-only">{ci}</span>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ============================================
   AI Credits Explainer
   ============================================ */
function AICreditsExplainer() {
  return (
    <section className="pt-12">
      <div className="mb-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-bold text-text-primary sm:text-2xl">AI credits</h2>
        </div>
        <p className="mx-auto max-w-xl text-sm text-text-secondary">
          AI credits power ByteClash&apos;s AI features. They come with AI Pro — not with any other plan.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AI_CREDITS_POINTS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="rounded-2xl border border-border bg-card p-5 hover:border-border-hover"
          >
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <h3 className="text-[12px] font-bold text-text-primary">{p.title}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{p.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ============================================
   Trust Section
   ============================================ */
function TrustSection() {
  return (
    <section className="pt-12">
      <div className="mb-8 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-bold text-text-primary sm:text-2xl">Why teachers choose ByteClash</h2>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST_POINTS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="rounded-2xl border border-border bg-card p-5 hover:border-border-hover"
          >
            <h3 className="text-[12px] font-bold text-text-primary">{p.title}</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">{p.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ============================================
   FAQ
   ============================================ */
function FaqSection({ openFaq, setOpenFaq }: { openFaq: number | null; setOpenFaq: (n: number | null) => void }) {
  return (
    <section className="pt-12">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">Frequently asked questions</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-text-secondary">
          Everything you need to know about plans, pricing and AI credits.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-3">
        {PRICING_FAQS.map((faq, i) => {
          const isOpen = openFaq === i;
          return (
            <div
              key={faq.q}
              className={`pricing-faq-card overflow-hidden rounded-2xl border transition-all duration-300 ${
                isOpen ? "pricing-faq-open border-accent/30 bg-card" : "border-border bg-card hover:border-border-hover"
              }`}
            >
              <button
                onClick={() => setOpenFaq(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <span className="text-[14px] font-medium text-text-primary">{faq.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    isOpen ? "bg-accent/20 text-accent" : "bg-accent/5 text-text-muted"
                  }`}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="px-6 pb-5 text-[13px] leading-relaxed text-text-secondary">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================
   Upgrade / Checkout Modal
   ============================================ */
function UpgradeModal({
  plan,
  currentPlanLabel,
  isCurrent,
  onClose,
}: {
  plan: TeacherPlan | null;
  currentPlanLabel: string;
  isCurrent: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!plan) return null;

  const confirm = async () => {
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      // Demo — in production, route to the payment gateway for this plan.
      toast.success({
        title: isCurrent ? "Subscription active" : `${plan.name} selected`,
        description: isCurrent
          ? "You're already on this plan."
          : `${plan.name} · ${formatPrice(plan.price)}/month. Checkout is a demo in this build.`,
      });
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Subscription</p>
            <h3 className="mt-0.5 text-lg font-bold text-text-primary">{isCurrent ? "Your current plan" : plan.cta}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Current plan */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card-hover/50 px-4 py-3">
            <span className="text-[11px] text-text-muted">Current plan</span>
            <span className="text-[12px] font-bold text-text-primary">{currentPlanLabel}</span>
          </div>

          {/* Selected plan */}
          <div className="flex items-center justify-between rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3">
            <div>
              <p className="text-[11px] text-text-muted">Selected plan</p>
              <p className="text-[13px] font-bold text-text-primary">{plan.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-extrabold tabular-nums text-text-primary">
                {formatPrice(plan.price)}
                <span className="text-[10px] font-normal text-text-muted"> / month</span>
              </p>
              <p className="text-[10px] text-text-muted">Billed monthly</p>
            </div>
          </div>

          {/* What gets unlocked */}
          <div>
            <p className="mb-2 text-[11px] font-semibold text-text-secondary">What gets unlocked</p>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {plan.features.slice(0, 10).map((f) => (
                <li key={f.text} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                  <span className="text-[10px] leading-snug text-text-secondary">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border p-5">
          <button
            onClick={confirm}
            disabled={busy}
            className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
              plan.ai ? "bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]" : "bg-gradient-to-r from-[#EC4899] to-[#8B5CF6]"
            }`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            {busy ? "Processing..." : isCurrent ? "Your current plan" : plan.cta}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-text-muted">
            <Lock className="h-3 w-3" />
            Secure payments powered by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================
   Main Page
   ============================================ */
function PricingPageContent() {
  const toast = useToast();
  const { balance } = useAICreditsStore();
  const [activeTab, setActiveTab] = useState<"all" | Audience>("all");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [selectedPlan, setSelectedPlan] = useState<TeacherPlan | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [packBuying, setPackBuying] = useState<string | null>(null);

  const currentPlanId = balance.planId as string | undefined;
  const currentPlanLabel = CURRENT_PLAN_LABELS[currentPlanId ?? ""] ?? "Free";
  const currentTeacher = currentTeacherPlanId(currentPlanId);

  const buyPack = async (packId: string) => {
    setPackBuying(packId);
    try {
      const store = useAICreditsStore.getState();
      await store.purchasePack(packId);
      toast.success({
        title: "Credits purchased",
        description: "The credits were added to your balance.",
      });
    } catch {
      toast.error({ title: "Could not purchase credits", description: "Something went wrong. Please try again." });
    } finally {
      setPackBuying(null);
    }
  };

  const showTeachers = activeTab !== "student";
  const showStudents = activeTab !== "creator";

  return (
    <div className="pricing-page-content relative">
      {/* ===== Light theme background ===== */}
      <div className="pricing-bg-light absolute inset-0 -z-20">
        <div className="pricing-blob pricing-blob-1" />
        <div className="pricing-blob pricing-blob-2" />
        <div className="pricing-blob pricing-blob-3" />
      </div>

      {/* ===== Dark space background ===== */}
      <div className="pricing-bg-space absolute inset-0 -z-20 hidden dark:block">
        <StarField />
        {SHOOTING_STARS.map((ss) => (
          <span
            key={ss.id}
            className="pricing-shooting-star"
            style={{
              left: ss.left,
              top: ss.top,
              "--shoot-delay": ss.delay,
              "--shoot-duration": ss.duration,
            } as CSSProperties}
          />
        ))}
        <div className="pricing-nebula -left-20 top-20 h-[320px] w-[320px] bg-[#7C3AED]/20" />
        <div className="pricing-nebula -right-20 bottom-20 h-[380px] w-[380px] bg-[#EC4899]/20" style={{ animationDelay: "6s" }} />
        <div className="pricing-nebula left-1/3 top-1/2 h-[300px] w-[300px] bg-[#6366F1]/15" style={{ animationDelay: "12s" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">
        {/* ===== AI Credits Status (if low) ===== */}
        {balance.hasActiveSubscription && balance.monthlyAllowance > 0 && balance.remaining / balance.monthlyAllowance < 0.5 && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-[#8B5CF6]/10 to-[#EC4899]/10 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-[12px] font-bold text-text-primary">Your AI Credits</h3>
                    <p className="mt-0.5 text-[10px] text-text-secondary">
                      {balance.remaining} remaining · {balance.monthlyAllowance} monthly
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => (window.location.href = "/pricing#credits")}
                  className="shrink-0 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2 text-[11px] font-bold text-white shadow-[0_2px_10px_rgba(236,72,153,0.3)] transition-all hover:shadow-[0_4px_16px_rgba(236,72,153,0.45)]"
                >
                  Buy Credits
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* ===== Hero ===== */}
        <section className="relative pb-8 pt-10 text-center">
          <div className="pricing-hero-glow absolute inset-0 -z-10" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-[11px] font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Start free. Upgrade when your assessments grow. Add AI when you need it.
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl"
          >
            Choose the plan that{" "}
            <span className="pricing-gradient-text">fits your teaching.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base"
          >
            Run better assessments, manage your classroom, and add AI-powered teaching when you&apos;re ready.
          </motion.p>

          {/* Audience tabs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1.5"
          >
            {(["all", "student", "creator"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative rounded-full px-5 py-2 text-[12px] font-semibold capitalize transition-all duration-300 ${
                  activeTab === tab ? "audience-tab-selected" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {activeTab === tab && (
                  <motion.span
                    layoutId="audience-tab-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] shadow-[0_0_16px_rgba(124,58,237,0.4)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">
                  {tab === "all" ? "Everything" : tab === "student" ? "For Students" : "For Creators"}
                </span>
              </button>
            ))}
          </motion.div>
        </section>

        {/* ===== Teacher plans ===== */}
        {showTeachers && (
          <>
            <section className="pt-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {TEACHER_PLANS.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrent={currentTeacher === plan.id}
                    onSelect={() => setSelectedPlan(plan)}
                  />
                ))}
              </div>
            </section>

            {/* ===== AI credits explainer ===== */}
            <AICreditsExplainer />

            {/* ===== Comparison ===== */}
            <ComparisonTable />
          </>
        )}

        {/* ===== Student plan ===== */}
        {showStudents && (
          <div className="pt-12">
            <StudentPlanSection onSelect={() => setShowStudentModal(true)} />
          </div>
        )}

        {/* ===== Trust ===== */}
        <TrustSection />

        {/* ===== Credit Packs ===== */}
        <section id="credits" className="pt-12">
          <div className="mb-8 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">AI Credit Packs</h2>
            </div>
            <p className="mx-auto max-w-2xl text-sm text-text-secondary">
              Need more AI power? Credits work with AI Pro and roll over month to month.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`rounded-2xl border p-5 transition-all duration-200 ${
                  pack.popular
                    ? "border-[#8B5CF6]/40 bg-gradient-to-br from-[#8B5CF6]/10 to-[#EC4899]/10 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                    : "border-border bg-card hover:border-border-hover"
                }`}
              >
                {pack.popular && <div className="mb-2 text-[9px] font-bold tracking-wider text-[#C084FC]">POPULAR</div>}
                <div className="text-[11px] font-medium text-text-muted">Pack</div>
                <div className="mb-0.5 text-lg font-extrabold text-text-primary">{pack.name}</div>
                <div className="mb-3 text-[11px] text-text-secondary">{pack.credits} credits</div>
                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-text-primary">₹{pack.price}</span>
                </div>
                <div className="mb-4 text-[10px] text-text-muted">
                  ₹{Math.round((pack.price / pack.credits) * 100) / 100}/credit
                </div>
                <button
                  onClick={() => buyPack(pack.id)}
                  disabled={packBuying === pack.id}
                  className="w-full rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {packBuying === pack.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Buy Pack"}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-[11px] text-text-muted">
            Purchased credits never expire while your subscription is active.
          </p>
        </section>

        {/* ===== FAQ ===== */}
        <FaqSection openFaq={openFaq} setOpenFaq={setOpenFaq} />

        {/* ===== Payment ===== */}
        <section className="pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="pricing-payment-section rounded-3xl border border-border bg-card px-6 py-10 text-center"
          >
            <h3 className="text-sm font-semibold text-text-primary sm:text-base">Payments made simple</h3>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.name}
                    className="flex items-center gap-2 rounded-xl border border-border bg-accent/5 px-4 py-2.5 text-[12px] font-medium text-text-secondary transition-colors hover:border-accent/30"
                  >
                    <Icon className="h-4 w-4 text-accent" />
                    {m.name}
                  </div>
                );
              })}
            </div>
            <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
              <Lock className="h-3 w-3" />
              Secure payments powered by Razorpay
            </p>
          </motion.div>
        </section>
      </div>

      {/* ===== Upgrade / Checkout modal ===== */}
      <AnimatePresence>
        {selectedPlan && (
          <UpgradeModal
            plan={selectedPlan}
            currentPlanLabel={currentPlanLabel}
            isCurrent={currentTeacher === selectedPlan.id}
            onClose={() => setSelectedPlan(null)}
          />
        )}
      </AnimatePresence>

      {/* ===== Student upgrade modal ===== */}
      <AnimatePresence>
        {showStudentModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setShowStudentModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Subscription</p>
                  <h3 className="mt-0.5 text-lg font-bold text-text-primary">Get Student Pro</h3>
                </div>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="rounded-full p-1 text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between rounded-xl border border-border bg-card-hover/50 px-4 py-3">
                  <span className="text-[11px] text-text-muted">Current plan</span>
                  <span className="text-[12px] font-bold text-text-primary">
                    {currentPlanId === "student-pro" ? "Student Pro" : "Free"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3">
                  <div>
                    <p className="text-[11px] text-text-muted">Selected plan</p>
                    <p className="text-[13px] font-bold text-text-primary">Student Pro</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold tabular-nums text-text-primary">
                      ₹299
                      <span className="text-[10px] font-normal text-text-muted"> / month</span>
                    </p>
                    <p className="text-[10px] text-text-muted">Billed monthly</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-border p-5">
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)] active:scale-[0.98]"
                >
                  <Lock className="h-3.5 w-3.5" />
                  {currentPlanId === "student-pro" ? "Your current plan" : "Get Student Pro"}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-text-muted">
                  <Lock className="h-3 w-3" />
                  Secure payments powered by Razorpay
                </p>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================
   Page
   ============================================ */
export default function PricingPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <AppLayout>
      <div className={`relative min-h-screen ${isLight ? "bg-[#FAFBFF]" : "bg-[#050510]"}`}>
        <PricingPageContent />
      </div>
    </AppLayout>
  );
}
