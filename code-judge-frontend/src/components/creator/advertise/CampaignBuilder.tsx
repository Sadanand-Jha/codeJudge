"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Megaphone,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { BillButton, EmptyState, formatINR } from "@/components/creator/billing/ui";
import {
  BudgetReachSlider,
  BudgetRecommendation,
  CampaignPreviewCard,
  EstimateHint,
  ProductRating,
  QualityMeter,
} from "./ui";
import { ELIGIBLE_PRODUCTS, ELIGIBLE_AUDIENCE_SIZE, QUALITY_SCORE, VISIBILITY_FACTORS } from "./mockData";
import { budgetToReach, BUDGET_MIN, BUDGET_MAX, DURATION_OPTIONS, type CampaignDurationPreset } from "./types";
import type { AdProduct } from "./types";

const STEPS = [
  { id: 1, label: "Test Series", icon: ListChecks },
  { id: 2, label: "Audience", icon: Users },
  { id: 3, label: "Budget & Reach", icon: TrendingUp },
  { id: 4, label: "Review & Launch", icon: Megaphone },
];

export function CampaignBuilder({ demoState }: { demoState?: "empty" | "error" }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [product, setProduct] = useState<AdProduct | null>(null);
  const [audience, setAudience] = useState({
    category: "Computer Science",
    examGoal: "Placement Preparation",
    skills: "DSA",
    difficulty: "Intermediate",
    studentLevel: "2nd–4th Year Students",
    language: "English",
    interests: "DSA, Placements",
  });
  const [budget, setBudget] = useState(2500);
  const [duration, setDuration] = useState<CampaignDurationPreset>("until");
  const [customDays, setCustomDays] = useState(10);
  const [launching, setLaunching] = useState(false);

  const eligible = demoState === "empty" ? [] : ELIGIBLE_PRODUCTS.filter((p) => p.eligible);
  const reach = useMemo(() => budgetToReach(budget), [budget]);
  const canNext = () => {
    if (step === 1) return !!product;
    return true;
  };
  const goNext = () => setStep((s) => Math.min(4, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const launch = () => {
    setLaunching(true);
    setTimeout(() => {
      setLaunching(false);
      router.push("/creator/advertise");
    }, 900);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Stepper */}
      <nav aria-label="Campaign steps" className="overflow-x-auto">
        <ol className="flex items-center gap-1 text-xs font-medium text-text-muted">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = s.id < step;
            return (
              <li key={s.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold transition-all",
                    active
                      ? "border-pink-500/30 bg-pink-500/10 text-pink-600 dark:border-ai-accent/40 dark:bg-ai-accent/10 dark:text-ai-accent"
                      : done
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                        : "border-border bg-card text-text-muted"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className={cn("whitespace-nowrap", active ? "text-text-primary" : "")}>{s.label}</span>
                {s.id < STEPS.length && <span className="mx-1 hidden h-px w-6 bg-border sm:block" />}
              </li>
            );
          })}
        </ol>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          {step === 1 && <StepProducts products={eligible} value={product} onChange={setProduct} />}
          {step === 2 && <StepAudience value={audience} onChange={setAudience} product={product} />}
          {step === 3 && (
            <StepBudgetReach
              budget={budget}
              reach={reach}
              onBudget={setBudget}
              duration={duration}
              onDuration={setDuration}
              customDays={customDays}
              onCustomDays={setCustomDays}
            />
          )}
          {step === 4 && (
            <StepReview
              product={product}
              audience={audience}
              budget={budget}
              reach={reach}
              duration={duration}
              customDays={customDays}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <StepFooter
        step={step}
        canNext={canNext()}
        onBack={goBack}
        onNext={goNext}
        onLaunch={launch}
        launching={launching}
        budget={budget}
        reach={reach}
        hasProduct={!!product}
      />
    </div>
  );
}

/* ============ Step 1 — Select Test Series ============ */
function StepProducts({
  products,
  value,
  onChange,
}: {
  products: AdProduct[];
  value: AdProduct | null;
  onChange: (p: AdProduct | null) => void;
}) {
  const none = products.length === 0;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-text-primary">Select Test Series</h2>
        <p className="mt-1 text-[13px] text-text-secondary">Choose the test series you want to promote. Only eligible series appear here.</p>
        {none ? (
          <EmptyState
            title="No eligible test series"
            description="Publish a test series and verify it to make it eligible for advertising."
            action={
              <BillButton variant="primary" href="/creator/series">
                Open Test Series
              </BillButton>
            }
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} selected={value?.id === p.id} onSelect={() => onChange(p)} />
            ))}
          </div>
        )}
      </div>

      {value && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Preview — how students will see it</p>
          <div className="mt-3 max-w-sm">
            <CampaignPreviewCard
              product={{
                name: value.name,
                rating: value.rating,
                testCount: value.testCount,
                attempts: value.attempts,
                price: value.price,
                description: value.description,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: AdProduct;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 transition-all",
        selected
          ? "border-pink-500/40 bg-pink-500/[0.04] ring-1 ring-pink-500/20 dark:border-ai-accent/40 dark:ring-ai-accent/30"
          : "border-border bg-white/[0.02] hover:border-border-hover"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1">
          <p className="text-[14px] font-bold text-text-primary">{product.name}</p>
          <p className="mt-1 text-[12px] text-text-muted">
            {product.testCount} Tests · <ProductRating rating={product.rating} /> · {product.attempts.toLocaleString("en-IN")} Attempts
          </p>
          <p className="mt-2 text-[13px] font-extrabold text-text-primary tabular-nums">{formatINR(product.price)}</p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <span className="text-[11px] text-text-muted">{product.tags.join(" · ")}</span>
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              selected
                ? "border border-pink-500/40 bg-pink-500/10 text-pink-600 dark:border-ai-accent/40 dark:bg-ai-accent/10 dark:text-ai-accent"
                : "border border-border bg-card text-text-primary hover:border-border-hover"
            )}
          >
            {selected ? (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" /> Selected
              </span>
            ) : (
              "Select"
            )}
          </button>
        </div>
      </div>
      {selected && <Check className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-card bg-pink-500 p-0.5 text-white" />}
    </div>
  );
}

/* ============ Step 2 — Audience ============ */
function StepAudience({
  value,
  onChange,
  product,
}: {
  value: { category: string; examGoal: string; skills: string; difficulty: string; studentLevel: string; language: string; interests: string };
  onChange: (v: typeof value) => void;
  product: AdProduct | null;
}) {
  const set = (k: keyof typeof value) => (v: string) => onChange({ ...value, [k]: v });
  const recommended = product?.recommendedAudience ?? ["Computer Science", "Placement Preparation", "DSA", "2nd–4th Year Students"];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-[15px] font-bold text-text-primary">Audience</h2>
      <p className="mt-1 text-[13px] text-text-secondary">We recommend the most relevant students automatically. Adjust only if you want to.</p>

      <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
          <Target className="h-4 w-4 text-violet-500" />
          Recommended audience
        </p>
        <p className="mt-1 text-[11px] text-text-muted">Automatically determined from your test series</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recommended.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-white px-2.5 py-1 text-xs font-medium text-text-secondary dark:bg-white/[0.06]"
            >
              🎯 {a}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 dark:bg-white/[0.04]">
          <Users className="h-4 w-4 text-violet-500" />
          <div>
            <p className="text-xs font-bold text-text-primary tabular-nums">Eligible audience — {ELIGIBLE_AUDIENCE_SIZE.toLocaleString("en-IN")} students</p>
            <p className="text-[11px] text-text-muted">Students matching this audience on Risponse right now</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-bold text-text-primary">Optionally modify targeting</p>
        <p className="text-[11px] text-text-muted">Leave as recommended for best results. Don&apos;t over-target.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label="Category" value={value.category} onChange={set("category")} options={["Computer Science", "Electronics", "Mechanical", "MBA", "Medical", "Other"]} />
          <SelectField label="Exam / preparation goal" value={value.examGoal} onChange={set("examGoal")} options={["Placement Preparation", "GATE", "JEE", "NEET", "CAT", "SSC / Banking"]} />
          <SelectField label="Skills" value={value.skills} onChange={set("skills")} options={["DSA", "Aptitude", "System Design", "Web Dev", "Other"]} />
          <SelectField label="Difficulty" value={value.difficulty} onChange={set("difficulty")} options={["Beginner", "Intermediate", "Advanced"]} />
          <SelectField label="Student level" value={value.studentLevel} onChange={set("studentLevel")} options={["1st Year", "2nd Year", "3rd Year", "4th Year", "2nd–4th Year Students", "Any"]} />
          <SelectField label="Language" value={value.language} onChange={set("language")} options={["English", "Hindi", "English + Hindi"]} />
          <div className="sm:col-span-2">
            <TextField label="Relevant interests" value={value.interests} onChange={set("interests")} placeholder="DSA, Placements, Competitive Programming" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</label>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border bg-input-bg px-3.5 py-2.5 pr-9 text-[13px] text-text-primary outline-none focus:border-accent/40"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
      </div>
    </div>
  );
}
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-border bg-input-bg px-3.5 py-2.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent/40"
      />
    </div>
  );
}

/* ============ Step 3 — Budget → Reach (centerpiece) + Duration ============ */
function StepBudgetReach({
  budget,
  reach,
  onBudget,
  duration,
  onDuration,
  customDays,
  onCustomDays,
}: {
  budget: number;
  reach: number;
  onBudget: (v: number) => void;
  duration: CampaignDurationPreset;
  onDuration: (v: CampaignDurationPreset) => void;
  customDays: number;
  onCustomDays: (v: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-text-primary">How many relevant students do you want to reach?</h2>
        <p className="mt-1 text-[13px] text-text-secondary">Move the slider — the reach updates instantly. No CPM or CPC jargon.</p>

        <div className="mt-5">
          <BudgetReachSlider value={budget} onChange={onBudget} reach={reach} />
        </div>

        <div className="mt-4 rounded-xl border border-border/60 bg-white/[0.02] px-3.5 py-3">
          <p className="text-xs font-bold text-text-primary">Your campaign is charged based on targeted reach.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
            Risponse will show your test series to students who are likely to be interested based on their preparation
            activity, interests, skills, and profile. You pay for access to relevant students — we handle targeting,
            placement, optimization, and delivery automatically.
          </p>
          <EstimateHint />
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold text-text-primary">Quick picks</p>
          <div className="mt-2">
            <BudgetRecommendation onSelect={onBudget} selected={budget} />
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="text-[14px] font-bold text-text-primary">Campaign Duration</h3>
        <p className="mt-1 text-xs text-text-muted">No daily budgets to manage. Pick how long the campaign runs.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DURATION_OPTIONS.map((o) => {
            const active = duration === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onDuration(o.id)}
                className={cn(
                  "relative rounded-xl border px-3 py-3 text-left transition-all",
                  active
                    ? "border-pink-500/40 bg-pink-500/[0.06] ring-1 ring-pink-500/20 dark:border-ai-accent/40 dark:bg-ai-accent/10"
                    : "border-border bg-white/[0.02] hover:border-border-hover"
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn("h-3 w-3 rounded-full border-2", active ? "border-pink-500 bg-pink-500" : "border-border")} />
                  <span className="text-xs font-bold text-text-primary">{o.label}</span>
                </span>
                {o.hint && <span className="mt-1 inline-flex rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">{o.hint}</span>}
              </button>
            );
          })}
        </div>
        {duration === "custom" && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={90}
              value={customDays}
              onChange={(e) => onCustomDays(Math.min(90, Math.max(1, Number(e.target.value) || 1)))}
              className="w-20 rounded-xl border border-border bg-input-bg px-2.5 py-1.5 text-sm font-bold tabular-nums text-text-primary outline-none focus:border-accent/40"
            />
            <span className="text-xs text-text-muted">days</span>
          </div>
        )}
        <div className="mt-3 rounded-lg bg-white/[0.02] px-3 py-2.5">
          <p className="text-xs text-text-secondary">
            <span className="font-bold text-text-primary">{formatINR(budget)} campaign</span> · Target: ~{reach.toLocaleString("en-IN")} relevant students ·{" "}
            {duration === "until" ? "Campaign remains active until the target reach is completed." : duration === "custom" ? `Runs for ${customDays} days.` : `Runs for ${duration} days.`}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============ Step 4 — Review + Preview + Quality + Summary ============ */
function StepReview({
  product,
  audience,
  budget,
  reach,
  duration,
  customDays,
}: {
  product: AdProduct | null;
  audience: { category: string; examGoal: string; skills: string; difficulty: string; studentLevel: string; language: string; interests: string };
  budget: number;
  reach: number;
  duration: CampaignDurationPreset;
  customDays: number;
}) {
  const durationLabel =
    duration === "until"
      ? "Until reach is completed"
      : duration === "custom"
        ? `${customDays} days (custom)`
        : `${duration} Days`;

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="text-sm font-bold text-text-primary">Campaign Preview</h3>
        <p className="mt-1 text-xs text-text-muted">How your promoted test series will appear in the student marketplace. Clearly labeled Sponsored.</p>
        <div className="mt-4 max-w-sm">
          <CampaignPreviewCard
            product={
              product
                ? {
                    name: product.name,
                    rating: product.rating,
                    testCount: product.testCount,
                    attempts: product.attempts,
                    price: product.price,
                    description: product.description,
                  }
                : null
            }
          />
        </div>
      </div>

      {/* Quality */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Your campaign quality
        </h3>
        <div className="mt-4">
          <QualityMeter score={QUALITY_SCORE} label="Campaign quality score" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-text-muted">
          <span className="rounded-full border border-border bg-white/[0.02] px-2 py-1">Strong rating</span>
          <span className="rounded-full border border-border bg-white/[0.02] px-2 py-1">Low refund rate</span>
          <span className="rounded-full border border-border bg-white/[0.02] px-2 py-1">High engagement</span>
          <span className="rounded-full border border-border bg-white/[0.02] px-2 py-1">Relevant audience</span>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
          Your product&apos;s rating, refund rate, engagement, and relevance can affect how efficiently your campaign reaches
          students. Advertising increases exposure, but poor-quality products cannot dominate the marketplace simply by spending more.
        </p>
        <div className="mt-3 space-y-2">
          {VISIBILITY_FACTORS.slice(0, 3).map((f) => (
            <div key={f.label} className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">{f.label}</span>
              <span className="font-bold tabular-nums text-text-primary">{Math.round(f.strength * 100)}/100</span>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Summary */}
      <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-b from-pink-500/[0.04] to-transparent p-5 sm:p-6">
        <h3 className="text-sm font-extrabold text-text-primary">Campaign Summary</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
            <dt className="text-text-muted">Test Series</dt>
            <dd className="font-bold text-text-primary text-right">{product ? product.name : "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
            <dt className="text-text-muted">Audience</dt>
            <dd className="text-right font-medium text-text-primary">
              {audience.category} · {audience.skills} · {audience.examGoal}
              <br />
              <span className="text-xs text-text-muted">{audience.studentLevel} · {audience.language}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
            <dt className="text-text-muted">Budget</dt>
            <dd className="font-extrabold tabular-nums text-text-primary">{formatINR(budget)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
            <dt className="text-text-muted">Targeted Reach</dt>
            <dd className="text-right">
              <span className="font-extrabold tabular-nums text-text-primary">~{reach.toLocaleString("en-IN")}</span>
              <span className="text-xs text-text-muted"> relevant students</span>
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
            <dt className="text-text-muted">Duration</dt>
            <dd className="font-semibold text-text-primary">{durationLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 pt-1">
            <dt className="font-bold text-text-primary">Advertising Cost</dt>
            <dd className="text-lg font-extrabold tabular-nums text-text-primary">{formatINR(budget)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-center text-[11px] font-semibold text-pink-600 dark:text-pink-400">
          You will be charged {formatINR(budget)} when you launch. No hidden fees.
        </p>
      </div>

      {/* Commission disclaimer */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="text-xs leading-relaxed text-text-secondary">
            <p className="font-bold text-text-primary">Advertising and test-series sales are separate.</p>
            <p className="mt-1">
              Advertising spend is charged separately from your test-series sales commission. When a student purchases
              your test series through Risponse, the standard marketplace commission applies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ Footer ============ */
function StepFooter({
  step,
  canNext,
  onBack,
  onNext,
  onLaunch,
  launching,
  budget,
  reach,
  hasProduct,
}: {
  step: number;
  canNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onLaunch: () => void;
  launching: boolean;
  budget: number;
  reach: number;
  hasProduct: boolean;
}) {
  const isReview = step === 4;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-0 rounded-xl border border-border bg-card/90 p-3 backdrop-blur-xl lg:static lg:bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-text-secondary">Budget</span>
            <span className="font-bold tabular-nums text-text-primary">{formatINR(budget)}</span>
            <span className="hidden sm:inline">→ ~{reach.toLocaleString("en-IN")} students</span>
          </span>
          {!isReview && <span className="hidden sm:inline text-text-muted">· Step {step} of 4</span>}
        </div>
        <div className="flex gap-2">
          {step > 1 && (
            <BillButton variant="ghost" onClick={onBack}>
              Back
            </BillButton>
          )}
          {isReview ? (
            <BillButton variant="primary" loading={launching} disabled={!hasProduct || launching} icon={<Megaphone className="h-4 w-4" />} onClick={onLaunch}>
              {hasProduct ? `Launch Campaign — ${formatINR(budget)}` : "Select a test series"}
            </BillButton>
          ) : (
            <BillButton variant="primary" disabled={!canNext} onClick={onNext}>
              Continue
            </BillButton>
          )}
        </div>
      </div>
    </motion.div>
  );
}
