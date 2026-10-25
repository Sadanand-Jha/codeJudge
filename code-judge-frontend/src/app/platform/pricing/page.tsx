"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, Plus, Save, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/platform/subpage-blocks";
import {
  ErrorState,
  SectionCard,
  SectionSkeleton,
} from "@/components/platform/ui";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  platformApi,
  type CreditPackUpdate,
  type EntitlementDefinition,
  type PlatformCreditPack,
  type PlatformPlan,
  type SubscriptionPlanUpdate,
} from "@/services/platform";

const INPUT =
  "w-full rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-[13px] font-semibold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]";
const LABEL =
  "mb-1 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]";
const BTN =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-[12px] font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50";
const BTN_PRI =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 py-2 text-[12px] font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 disabled:opacity-50";

function rupees(paise: number): number {
  return Math.round(paise) / 100;
}

function paise(value: number): number {
  return Math.round(value * 100);
}

function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[var(--qs-muted)]">{hint}</span>}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] font-bold text-[var(--qs-ink)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--qs-brand)]"
      />
      {label}
    </label>
  );
}

function PlanEditor({
  plan,
  registry,
  onSaved,
}: {
  plan: PlatformPlan;
  registry: EntitlementDefinition[];
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const monthly =
    plan.prices.find((price) => price.billing_period === "monthly" && price.is_active) ??
    plan.prices.find((price) => price.billing_period === "monthly");
  const [name, setName] = useState(plan.name);
  const [tagline, setTagline] = useState(plan.tagline ?? "");
  const [offer, setOffer] = useState(plan.offer ?? "");
  const [cta, setCta] = useState(plan.cta ?? "");
  const [features, setFeatures] = useState(plan.features.join("\n"));
  const [price, setPrice] = useState(String(rupees(monthly?.amount ?? 0)));
  const [mrp, setMrp] = useState(
    monthly?.mrp_amount ? String(rupees(monthly.mrp_amount)) : ""
  );
  const [trialDays, setTrialDays] = useState(String(plan.trial_days));
  const [sortOrder, setSortOrder] = useState(String(plan.sort_order));
  const [isPublic, setIsPublic] = useState(plan.is_public);
  const [featured, setFeatured] = useState(plan.featured);
  const [entitlements, setEntitlements] = useState<Record<string, number | boolean>>(() => {
    const next: Record<string, number | boolean> = {};
    for (const definition of registry) {
      next[definition.key] = plan.entitlements[definition.key] ?? definition.default;
    }
    return next;
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const prices = plan.prices
        .filter((row) => row.is_active)
        .map((row) => ({
          billing_period: row.billing_period,
          custom_days: row.custom_days,
          amount:
            row.billing_period === "monthly" ? paise(Number(price) || 0) : row.amount,
          mrp_amount:
            row.billing_period === "monthly"
              ? mrp.trim()
                ? paise(Number(mrp) || 0)
                : null
              : row.mrp_amount,
          tax_inclusive: row.tax_inclusive,
          gateway_price_id: row.gateway_price_id,
          is_active: true,
        }));

      const payload: SubscriptionPlanUpdate = {
        name,
        tagline: tagline.trim() || null,
        offer: offer.trim() || null,
        cta: cta.trim() || null,
        features: features
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        is_public: isPublic,
        featured,
        sort_order: Number(sortOrder) || 0,
        trial_days: Number(trialDays) || 0,
        prices,
        entitlements,
        expectedUpdatedAt: plan.updated_at,
      };
      await platformApi.updateSubscriptionPlan(plan.id, payload);
      toast.success({ title: "Plan saved", description: `${name} is updated.` });
      await onSaved();
    } catch (error) {
      toast.error({
        title: "Plan could not be saved",
        description: getApiErrorMessage(error, "Check the fields and try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await platformApi.activateSubscriptionPlan(plan.id);
      toast.success({ title: "Plan activated", description: `${plan.name} is live.` });
      await onSaved();
    } catch (error) {
      toast.error({
        title: "Plan could not be activated",
        description: getApiErrorMessage(error, "Try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-bold text-[var(--qs-muted)]">
            Editing <span className="text-[var(--qs-ink)]">{plan.slug}</span>
            {plan.is_default_free && " · internal default plan"}
          </p>
          <p className="text-[11px] text-[var(--qs-muted)]">
            {plan.active_subscriber_count} active subscribers · {plan.subscriber_count} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border-2 border-[var(--qs-line)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
            {plan.status}
          </span>
          {plan.status !== "active" && (
            <button type="button" className={BTN} onClick={activate} disabled={saving}>
              Activate
            </button>
          )}
          <button type="button" className={BTN_PRI} onClick={save} disabled={saving}>
            <Save size={14} />
            {saving ? "Saving…" : "Save plan"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Plan name">
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Monthly price (₹)">
          <input
            className={INPUT}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="Compare-at price (₹)" hint="Shown struck through when higher.">
          <input
            className={INPUT}
            inputMode="decimal"
            value={mrp}
            onChange={(e) => setMrp(e.target.value)}
            placeholder="Optional"
          />
        </Field>
        <Field label="Sort order">
          <input
            className={INPUT}
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Tagline">
          <input className={INPUT} value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </Field>
        <Field label="CTA label">
          <input className={INPUT} value={cta} onChange={(e) => setCta(e.target.value)} />
        </Field>
        <Field label="Offer line" hint="Example: Limited 2026 offer price.">
          <input className={INPUT} value={offer} onChange={(e) => setOffer(e.target.value)} />
        </Field>
        <Field
          label="Trial days"
          hint="Only Basic should have a 7-day trial; set others to 0."
        >
          <input
            className={INPUT}
            inputMode="numeric"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Feature list" hint="One feature per line.">
        <textarea
          className={`${INPUT} min-h-[110px]`}
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap gap-5 rounded-[12px] border-2 border-[var(--qs-line)] px-3 py-2.5">
        <Toggle label="Public on pricing pages" checked={isPublic} onChange={setIsPublic} />
        <Toggle label="Featured / most popular" checked={featured} onChange={setFeatured} />
      </div>

      <div>
        <p className={LABEL}>Entitlements</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {registry.map((definition) => {
            const value = entitlements[definition.key] ?? definition.default;
            return (
              <Field
                key={definition.key}
                label={definition.label}
                hint={`${definition.category}${definition.unit ? ` · ${definition.unit}` : ""} · -1 = unlimited`}
              >
                {definition.type === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) =>
                      setEntitlements((current) => ({
                        ...current,
                        [definition.key]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[var(--qs-brand)]"
                  />
                ) : (
                  <input
                    className={INPUT}
                    inputMode="numeric"
                    value={String(value)}
                    onChange={(event) =>
                      setEntitlements((current) => ({
                        ...current,
                        [definition.key]: Number(event.target.value) || 0,
                      }))
                    }
                  />
                )}
              </Field>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PackEditor({
  pack,
  onSaved,
  onCreated,
}: {
  pack: PlatformCreditPack | null;
  onSaved: () => Promise<void>;
  onCreated: (pack: PlatformCreditPack) => void;
}) {
  const toast = useToast();
  const [code, setCode] = useState(pack?.code ?? "");
  const [name, setName] = useState(pack?.name ?? "");
  const [price, setPrice] = useState(String(pack?.price_inr ?? 0));
  const [credits, setCredits] = useState(String(pack?.credits ?? 0));
  const [validityDays, setValidityDays] = useState(String(pack?.validity_days ?? 180));
  const [description, setDescription] = useState(pack?.description ?? "");
  const [cta, setCta] = useState(pack?.cta ?? "");
  const [sortOrder, setSortOrder] = useState(String(pack?.sort_order ?? 0));
  const [savePercent, setSavePercent] = useState(String(pack?.save_percent ?? 0));
  const [popular, setPopular] = useState(pack?.is_popular ?? false);
  const [active, setActive] = useState(pack?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload: CreditPackUpdate = {
        code,
        name,
        price_inr: Number(price) || 0,
        credits: Number(credits) || 0,
        validity_days: Number(validityDays) || 0,
        description: description.trim() || null,
        cta: cta.trim() || null,
        sort_order: Number(sortOrder) || 0,
        save_percent: Number(savePercent) || 0,
        is_popular: popular,
        is_active: active,
      };
      if (pack) {
        await platformApi.updateCreditPack(pack.id, payload);
        toast.success({ title: "Pack saved", description: `${name} is updated.` });
      } else {
        const created = await platformApi.createCreditPack(payload);
        toast.success({ title: "Pack created", description: `${created.name} is live.` });
        onCreated(created);
      }
      await onSaved();
    } catch (error) {
      toast.error({
        title: "Pack could not be saved",
        description: getApiErrorMessage(error, "Check the fields and try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (!pack || saving) return;
    setSaving(true);
    try {
      await platformApi.deleteCreditPack(pack.id);
      toast.success({ title: "Pack deactivated", description: `${pack.name} is hidden.` });
      await onSaved();
    } catch (error) {
      toast.error({
        title: "Pack could not be deactivated",
        description: getApiErrorMessage(error, "Try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-bold text-[var(--qs-muted)]">
          {pack ? `Editing ${pack.code}` : "New credit pack"}
        </p>
        <div className="flex items-center gap-2">
          {pack && pack.is_active && (
            <button type="button" className={BTN} onClick={deactivate} disabled={saving}>
              Deactivate
            </button>
          )}
          <button type="button" className={BTN_PRI} onClick={save} disabled={saving}>
            <Save size={14} />
            {saving ? "Saving…" : "Save pack"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Pack code" hint="Lowercase letters, numbers and dashes.">
          <input
            className={INPUT}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={Boolean(pack)}
          />
        </Field>
        <Field label="Pack name">
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Price (₹)">
          <input
            className={INPUT}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="Credits">
          <input
            className={INPUT}
            inputMode="numeric"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
          />
        </Field>
        <Field label="Validity (days)">
          <input
            className={INPUT}
            inputMode="numeric"
            value={validityDays}
            onChange={(e) => setValidityDays(e.target.value)}
          />
        </Field>
        <Field label="Sort order">
          <input
            className={INPUT}
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </Field>
        <Field label="Save %" hint="Badge shown next to the pack name.">
          <input
            className={INPUT}
            inputMode="numeric"
            value={savePercent}
            onChange={(e) => setSavePercent(e.target.value)}
          />
        </Field>
        <Field label="CTA label">
          <input className={INPUT} value={cta} onChange={(e) => setCta(e.target.value)} />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          className={`${INPUT} min-h-[80px]`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap gap-5 rounded-[12px] border-2 border-[var(--qs-line)] px-3 py-2.5">
        <Toggle label="Popular badge" checked={popular} onChange={setPopular} />
        <Toggle label="Active / visible" checked={active} onChange={setActive} />
      </div>
    </div>
  );
}

export default function PlatformPricingPage() {
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [packs, setPacks] = useState<PlatformCreditPack[]>([]);
  const [registry, setRegistry] = useState<EntitlementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"plans" | "packs">("plans");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [creatingPack, setCreatingPack] = useState(false);

  const fetchCatalog = useCallback(async () => {
    const [planData, registryData, packData] = await Promise.all([
      platformApi.subscriptionPlans(),
      platformApi.subscriptionRegistry(),
      platformApi.creditPacks(),
    ]);
    return {
      plans: planData.plans,
      registry: registryData.registry,
      packs: packData.packs,
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCatalog();
      setPlans(data.plans);
      setRegistry(data.registry);
      setPacks(data.packs);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load pricing."));
    } finally {
      setLoading(false);
    }
  }, [fetchCatalog]);

  useEffect(() => {
    let cancelled = false;
    fetchCatalog()
      .then((data) => {
        if (cancelled) return;
        setPlans(data.plans);
        setRegistry(data.registry);
        setPacks(data.packs);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Unable to load pricing."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchCatalog]);

  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const selectedPack = creatingPack
    ? null
    : packs.find((pack) => pack.id === selectedPackId) ?? packs[0] ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pricing"
        detail="Edit the live monthly plans and credit packs. Public pricing pages and creator billing read this catalog directly."
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("plans")}
          className={tab === "plans" ? BTN_PRI : BTN}
        >
          <Sparkles size={14} />
          Monthly plans
        </button>
        <button
          type="button"
          onClick={() => setTab("packs")}
          className={tab === "packs" ? BTN_PRI : BTN}
        >
          <Coins size={14} />
          Credit packs
        </button>
      </div>

      {loading ? (
        <SectionCard title="Pricing catalog" subtitle="Loading owner-only data.">
          <SectionSkeleton rows={4} />
        </SectionCard>
      ) : error ? (
        <SectionCard title="Pricing catalog" subtitle="Could not load pricing.">
          <ErrorState message={error} onRetry={() => void load()} />
        </SectionCard>
      ) : tab === "plans" ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const monthly = plan.prices.find(
                (row) => row.billing_period === "monthly" && row.is_active
              );
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`rounded-[16px] border-2 p-4 text-left transition-colors ${
                    selectedPlan?.id === plan.id
                      ? "border-[var(--qs-ink)] bg-[var(--qs-sun)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-extrabold text-[var(--qs-ink)]">
                      {plan.name}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                      {plan.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--qs-muted)]">{plan.slug}</p>
                  <p className="mt-2 text-[20px] font-extrabold text-[var(--qs-ink)]">
                    {monthly ? inr(rupees(monthly.amount)) : "No price"}
                    <span className="ml-1 text-[11px] font-bold text-[var(--qs-muted)]">
                      / month
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-[var(--qs-muted)]">
                    {plan.is_public ? "Public" : "Hidden"} · {plan.trial_days} trial days ·{" "}
                    {plan.featured ? "Featured" : "Standard"}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedPlan && (
            <SectionCard
              key={`${selectedPlan.id}-${selectedPlan.updated_at}`}
              title={`Edit ${selectedPlan.name}`}
              subtitle="Saving writes to the same catalog the frontend reads."
            >
              <PlanEditor plan={selectedPlan} registry={registry} onSaved={load} />
            </SectionCard>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              className={BTN}
              onClick={() => {
                setCreatingPack(true);
                setSelectedPackId(null);
              }}
            >
              <Plus size={14} />
              New pack
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => {
                  setCreatingPack(false);
                  setSelectedPackId(pack.id);
                }}
                className={`rounded-[16px] border-2 p-4 text-left transition-colors ${
                  !creatingPack && selectedPack?.id === pack.id
                    ? "border-[var(--qs-ink)] bg-[var(--qs-sun)]"
                    : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-extrabold text-[var(--qs-ink)]">
                    {pack.name}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                    {pack.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--qs-muted)]">{pack.code}</p>
                <p className="mt-2 text-[20px] font-extrabold text-[var(--qs-ink)]">
                  {inr(pack.price_inr)}
                  <span className="ml-1 text-[11px] font-bold text-[var(--qs-muted)]">
                    · {pack.credits} credits
                  </span>
                </p>
                <p className="mt-1 text-[11px] font-bold text-[var(--qs-muted)]">
                  Valid {pack.validity_days} days
                  {pack.is_popular ? " · Popular" : ""}
                </p>
              </button>
            ))}
          </div>

          <SectionCard
            key={creatingPack ? "new" : `${selectedPack?.id}-${selectedPack?.created_at}`}
            title={creatingPack ? "New credit pack" : `Edit ${selectedPack?.name ?? "pack"}`}
            subtitle="Prices are in INR. Credits are added after server-side payment verification."
          >
            <PackEditor
              pack={selectedPack}
              onSaved={load}
              onCreated={(created) => {
                setCreatingPack(false);
                setSelectedPackId(created.id);
              }}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
