"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  Coins,
  Eye,
  Globe,
  Laptop,
  ListChecks,
  MapPin,
  Megaphone,
  Monitor,
  Plus,
  Rocket,
  ShieldCheck,
  Smartphone,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { BillButton, EmptyState, formatINR, StatusBadge } from "@/components/creator/billing/ui";
import { EstimateHint, ProductRating } from "./ui";
import { AD_CREDITS, CAMPAIGN_OBJECTIVES, ELIGIBLE_PRODUCTS } from "./mockData";
import type { AdProduct, CampaignObjectiveId } from "./types";

const STEPS = [
  { id: 1, label: "What to promote", icon: ListChecks },
  { id: 2, label: "Objective", icon: Target },
  { id: 3, label: "Audience", icon: Users },
  { id: 4, label: "Budget", icon: TrendingUp },
  { id: 5, label: "Review", icon: Megaphone },
];

export function CampaignBuilder({ demoState }: { demoState?: "empty" | "error" }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [product, setProduct] = useState<AdProduct | null>(null);
  const [objective, setObjective] = useState<CampaignObjectiveId>("students");
  const [audience, setAudience] = useState({
    exam: "JEE Main / Advanced",
    difficulty: "Intermediate",
    level: "Class 11 & 12",
    skills: "Data Structures, Algorithms",
    language: "English, Hindi",
    location: "",
    device: "All",
  });
  const [budget, setBudget] = useState({
    daily: 200,
    total: 4000,
    preset: "7" as "3" | "7" | "14" | "custom",
    customDays: 7,
  });
  const [launching, setLaunching] = useState(false);

  const eligible = demoState === "empty" ? [] : ELIGIBLE_PRODUCTS.filter((p) => p.eligible);
  const estimate = useMemo(() => estimateRange(objective, budget.total), [objective, budget.total]);

  const canNext = () => {
    if (step === 1) return !!product;
    if (step === 4) return budget.daily > 0 && budget.total > 0;
    return true;
  };
  const goNext = () => setStep((s) => (s < 5 ? s + 1 : s));
  const goBack = () => setStep((s) => (s > 1 ? s - 1 : s));

  const launch = () => {
    setLaunching(true);
    setTimeout(() => {
      setLaunching(false);
      router.push("/creator/advertise");
    }, 900);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav aria-label="Campaign steps" className="mb-6">
        <ol className="flex items-center justify-between text-xs font-medium text-text-muted">
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
                <span className={active ? "text-text-primary" : ""}>{s.label}</span>
                {s.id < STEPS.length && <span className="mx-1 h-px flex-1 bg-border" />}
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
          {step === 2 && <StepObjective value={objective} onChange={setObjective} />}
          {step === 3 && <StepAudience value={audience} onChange={setAudience} product={product} />}
          {step === 4 && <StepBudget budget={budget} onChange={setBudget} objective={objective} />}
                    {step === 5 && (
            <StepReview product={product} objective={objective} audience={audience} budget={budget} />
          )}
        </motion.div>
      </AnimatePresence>

      <StepFooter
        step={step}
        canNext={canNext()}
        product={product}
        onBack={goBack}
        onNext={goNext}
        onLaunch={launch}
        launching={launching}
        total={budget.daily * (budget.preset === "custom" ? budget.customDays : Number(budget.preset))}
        isReview={step === 5}
      />
    </div>
  );
}

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
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-[15px] font-bold text-text-primary">Select what to promote</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Choose one published test series, course or quiz to promote. Only eligible products appear here.
      </p>
      {none ? (
        <EmptyState
          title="No eligible products"
          description="Publish a test series or quiz and verify it to make it eligible for advertising."
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
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-bold text-text-primary">{product.name}</p>
            <StatusBadge label={product.eligible ? "Eligible" : "Ineligible"} tone="emerald" dot />
          </div>
          <p className="mt-1 text-[12px] text-text-muted">
            {product.testCount} tests · <ProductRating rating={product.rating} /> · {product.attempts.toLocaleString("en-IN")} attempts
          </p>
          <p className="mt-2 text-[12px] text-text-secondary line-clamp-2">{product.tags.join(" · ")}</p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <p className="text-[16px] font-extrabold text-text-primary tabular-nums">{formatINR(product.price)}</p>
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
                <Check className="h-3 w-3" />
                Selected
              </span>
            ) : (
              "Select"
            )}
          </button>
        </div>
      </div>
      {selected && (
        <Check className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-pink-500 text-white" />
      )}
    </div>
  );
}

function StepObjective({
  value,
  onChange,
}: {
  value: CampaignObjectiveId;
  onChange: (v: CampaignObjectiveId) => void;
}) {
  const ICON: Record<CampaignObjectiveId, React.ReactNode> = {
    visibility: <Eye className="h-5 w-5 text-sky-500" />,
    students: <Users className="h-5 w-5 text-emerald-500" />,
    launch: <Rocket className="h-5 w-5 text-violet-500" />,
  };
  const DESC: Record<CampaignObjectiveId, string> = {
    visibility: "Maximize marketplace reach and impressions in feed and search.",
    students: "Drive qualified product page visits that convert into enrollments.",
    launch: "Front-load exposure to give a new product its strongest start.",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-[15px] font-bold text-text-primary">Choose campaign objective</h2>
      <p className="mt-1 text-[13px] text-text-secondary">How would you like your audience to engage?</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CAMPAIGN_OBJECTIVES.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={cn(
                "flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center transition-all",
                active
                  ? "border-pink-500/40 bg-pink-500/[0.06] dark:border-ai-accent/40 dark:bg-ai-accent/10"
                  : "border-border bg-white/[0.02] hover:border-border-hover"
              )}
            >
              {ICON[o.id]}
              <span className="text-sm font-bold text-text-primary">{o.label}</span>
              <p className="text-[11px] text-text-secondary">{DESC[o.id]}</p>
              {active && <Check className="mt-0.5 h-3.5 w-3.5 text-pink-500 dark:text-ai-accent" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

  function estimateRange(objective: CampaignObjectiveId, total: number) {
  const cpm: [number, number] =
    objective === "visibility" ? [24, 34] : objective === "launch" ? [28, 40] : [26, 36];
  const impLow = Math.max(100, Math.round((total / cpm[1]) * 1000));
  const impHigh = Math.max(impLow, Math.round((total / cpm[0]) * 1000));
  const visitLow = Math.round(impLow * 0.025);
  const visitHigh = Math.round(impHigh * 0.032);
  return { impLow, impHigh, visitLow, visitHigh };
}
function StepAudience({
  value,
  onChange,
  product,
}: {
  value: {
    exam: string;
    difficulty: string;
    level: string;
    skills: string;
    language: string;
    location: string;
    device: string;
  };
  onChange: (v: typeof value) => void;
  product: AdProduct | null;
}) {
  const set = (k: keyof typeof value) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-[15px] font-bold text-text-primary">Who should see it?</h2>
      <p className="mt-1 text-[13px] text-text-secondary">Target the students most likely to convert. Keep it simple — Risponse fills the rest.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField label="Exam / preparation category" value={value.exam} onChange={set("exam")} options={EXAMS} />
        <SelectField label="Difficulty" value={value.difficulty} onChange={set("difficulty")} options={DIFFICULTIES} />
        <SelectField label="Student level" value={value.level} onChange={set("level")} options={LEVELS} />
        <SelectField label="Preferred language" value={value.language} onChange={set("language")} options={LANGUAGES} />
        <SelectField label="Device / platform" value={value.device} onChange={set("device")} options={DEVICES} />
        <TextField label="Relevant skills" value={value.skills} onChange={set("skills")} placeholder="e.g. Data Structures, Algorithms" />
        <TextField label="Optional location targeting" value={value.location} onChange={set("location")} placeholder="India · Leave empty to target all" />
      </div>

      {product && (
        <div className="mt-5 rounded-xl border border-border/70 bg-white/[0.02] p-4">
          <p className="text-[12px] font-semibold text-text-secondary">Recommended audience</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.recommendedAudience.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/[0.03] px-2.5 py-1 text-[11px] text-text-secondary"
              >
                <Target className="h-3 w-3 text-text-muted" />
                {a}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-text-muted">
            Based on how past buyers of this product searched and converted.
          </p>
        </div>
      )}

      <EstimateHint />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</label>
      <div className="mt-1.5 relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border bg-input-bg px-3.5 py-2.5 pr-9 text-[13px] text-text-primary outline-none transition-colors focus:border-accent/40"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
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

const EXAMS = ["JEE Main / Advanced", "NEET UG", "CAT", "SSC CGL", "IBPS PO / SBI", "GATE", "CBSE / ICSE Boards", "UPSC", "Other"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const LEVELS = ["Class 9 & 10", "Class 11 & 12", "Undergraduate", "Graduate", "Working professional", "All"];
const LANGUAGES = ["English", "Hindi", "English, Hindi", "Regional languages"];
const DEVICES = ["All", "Mobile only", "Desktop only"];
/* ============ Step 4 — Budget ============ */
function StepBudget({
  budget,
  onChange,
  objective,
}: {
  budget: { daily: number; total: number; preset: "3" | "7" | "14" | "custom"; customDays: number };
  onChange: (v: typeof budget) => void;
  objective: CampaignObjectiveId;
}) {
  const days = budget.preset === "custom" ? (budget.customDays > 0 ? budget.customDays : 1) : Number(budget.preset);
  const total = budget.daily * days;
  const estimate = estimateRange(objective, total);
  const setDaily = (v: number) => onChange({ ...budget, daily: v });
  const setDays = (preset: "3" | "7" | "14" | "custom") => onChange({ ...budget, preset, total });
  const setCustomDays = (v: number) => onChange({ ...budget, preset: "custom", customDays: v });

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-[15px] font-bold text-text-primary">Set your budget</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        You pay with ad credits. Spend stops automatically when your budget is reached.
      </p>

      <div className="mt-4 space-y-5">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Daily budget</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[100, 200, 500, 1000].map((v) => {
              const active = budget.daily === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDaily(v)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-center text-sm font-bold tabular-nums transition-all",
                    active
                      ? "border-pink-500/40 bg-pink-500/[0.06] text-pink-600 dark:border-ai-accent/40 dark:bg-ai-accent/10 dark:text-ai-accent"
                      : "border-border bg-white/[0.02] text-text-primary hover:border-border-hover"
                  )}
                >
                  {formatINR(v)}
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-xs text-text-muted">₹</span>
            <input
              type="number"
              min={50}
              step={50}
              value={budget.daily}
              onChange={(e) => setDaily(Math.max(50, Number(e.target.value) || 50))}
              className="w-24 rounded-xl border border-border bg-input-bg px-2.5 py-1.5 text-sm font-bold text-text-primary tabular-nums outline-none focus:border-accent/40"
            />
            <span className="text-xs text-text-muted">per day</span>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Duration</label>
          <div className="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card-hover p-1">
            {(["3", "7", "14", "custom"] as const).map((p) => {
              const d = p === "custom" ? days : Number(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDays(p)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    budget.preset === p
                      ? "bg-white shadow ring-1 ring-border text-text-primary dark:bg-ai-hover"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
                  )}
                >
                  {p === "custom" ? "Custom" : `${d} days`}
                </button>
              );
            })}
          </div>
          {budget.preset === "custom" && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={90}
                value={budget.customDays}
                onChange={(e) => setCustomDays(Math.min(90, Math.max(1, Number(e.target.value) || 1)))}
                className="w-20 rounded-xl border border-border bg-input-bg px-2.5 py-1.5 text-sm font-bold text-text-primary tabular-nums outline-none focus:border-accent/40"
              />
              <span className="text-xs text-text-muted">days</span>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border/70 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-text-secondary">Total campaign budget</p>
            <p className="text-xl font-extrabold text-text-primary tabular-nums">{formatINR(total)}</p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
            <span>• Daily {formatINR(budget.daily)}</span>
            <span>• {days} days</span>
          </div>
          <div className="mt-3 border-t border-border/60 pt-3 space-y-1">
            <p className="flex items-baseline justify-between text-[12px] text-text-secondary">
              <span>Estimated reach</span>
              <span className="font-bold text-text-primary">
                {estimate.impLow.toLocaleString("en-IN")}–{estimate.impHigh.toLocaleString("en-IN")} impressions
              </span>
            </p>
            <p className="flex items-baseline justify-between text-[12px] text-text-secondary">
              <span>Estimated visits</span>
              <span className="font-bold text-text-primary">
                {estimate.visitLow.toLocaleString("en-IN")}–{estimate.visitHigh.toLocaleString("en-IN")} product visits
              </span>
            </p>
          </div>
          <EstimateHint />
        </div>
      </div>
    </div>
  );
}
function objectiveLabel(id: CampaignObjectiveId) {
  return id === "visibility" ? "More Visibility" : id === "students" ? "More Students" : "Launch Promotion";
}

function ObjectiveIcon(id: CampaignObjectiveId) {
  return id === "visibility" ? <Eye className="h-4 w-4 text-sky-500" /> : id === "students" ? <Users className="h-4 w-4 text-emerald-500" /> : <Rocket className="h-4 w-4 text-violet-500" />;
}

/* ============ Step 5 — Review & launch ============ */
function StepReview({
  product,
  objective,
  audience,
  budget,
}: {
  product: AdProduct | null;
  objective: CampaignObjectiveId;
  audience: { exam: string; difficulty: string; level: string; skills: string; language: string; location: string; device: string };
  budget: { daily: number; total: number; preset: "3" | "7" | "14" | "custom"; customDays: number };
}) {
  const days = budget.preset === "custom" ? (budget.customDays > 0 ? budget.customDays : 1) : Number(budget.preset);
  const total = budget.daily * days;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-text-primary">Review your campaign</h2>
        <p className="mt-1 text-[13px] text-text-secondary">Confirm what is promoted, who sees it, and how much it costs.</p>

        <div className="mt-4 space-y-3.5">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-white/[0.02] p-3.5">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-text-secondary">Promoting</p>
              <p className="mt-0.5 truncate text-sm font-bold text-text-primary">
                {product ? product.name : <span className="font-medium text-text-muted">No product selected</span>}
              </p>
              {product && (
                <p className="mt-0.5 text-[11px] text-text-muted">
                  {product.kindLabel} · {product.testCount} tests · {formatINR(product.price)}
                </p>
              )}
            </div>
            <StatusBadge label={product ? "Sponsored promotion" : "Not set"} tone={product ? "violet" : "slate"} dot />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-white/[0.02] p-3.5">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-text-secondary">Objective</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-text-primary">
                {ObjectiveIcon(objective)}
                {objectiveLabel(objective)}
              </p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-white/[0.02] p-3.5">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-text-secondary">Audience</p>
              <p className="mt-0.5 text-sm font-bold text-text-primary">
                {audience.exam} · {audience.difficulty} · {audience.language} · {audience.device}
              </p>
              {audience.skills && <p className="mt-0.5 text-[11px] text-text-muted">Skills: {audience.skills}</p>}
            </div>
            <MapPin className="h-4 w-4 shrink-0 text-text-muted" />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-white/[0.02] p-3.5">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-text-secondary">Budget</p>
              <p className="mt-0.5 text-sm font-bold text-text-primary tabular-nums">
                {formatINR(budget.daily)}/day · {days} days · {formatINR(total)} total
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Est. {total > 0 ? `${(total / 28).toFixed(0)}K–${(total / 22).toFixed(0)}K impressions` : "0"}
              </p>
            </div>
            <Coins className="h-4 w-4 shrink-0 text-text-muted" />
          </div>
        </div>
      </div>

      {/* Marketplace economics transparency — visible before checkout */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div className="space-y-0.5 text-xs text-text-secondary">
            <p className="font-semibold text-text-primary">
              Ad spend is billed separately from your marketplace commission.
            </p>
            <p>
              You keep 70% of every test-series sale. Risponse keeps 30% on sales only. Ad spend never reduces your
              70% payout, and your commission never funds your ads.
            </p>
            <p>Every promoted placement is labeled <span className="font-semibold text-text-primary">Sponsored</span>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ============ Step footer: navigation / launch ============ */
function StepFooter({
  step,
  canNext,
  product,
  onBack,
  onNext,
  onLaunch,
  launching,
  total,
  isReview,
}: {
  step: number;
  canNext: boolean;
  product: AdProduct | null;
  onBack: () => void;
  onNext: () => void;
  onLaunch: () => void;
  launching: boolean;
  total: number;
  isReview: boolean;
}) {
  const valid = !!product;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky bottom-0 rounded-xl border border-border bg-card/80 p-3 backdrop-blur-xl lg:static lg:bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-text-secondary">Total spend</span>
            <span className="tabular-nums text-text-primary">{total > 0 ? formatINR(total) : "—"}</span>
          </span>
          {!isReview && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/[0.03] px-1.5 py-0.25 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              not charged yet
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Coins className="h-3 w-3 text-text-muted" />
            <span className="tabular-nums text-text-primary">{formatINR(AD_CREDITS.available)} credits available</span>
          </span>
        </div>
        <div className="flex gap-2">
          {step > 1 && (
            <BillButton variant="ghost" onClick={onBack}>
              Back
            </BillButton>
          )}
          {isReview ? (
            <BillButton
              variant="primary"
              loading={launching}
              disabled={!valid || launching}
              icon={<Rocket className="h-4 w-4" />}
              onClick={onLaunch}
            >
              {valid ? "Launch campaign" : "Select a product"}
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
