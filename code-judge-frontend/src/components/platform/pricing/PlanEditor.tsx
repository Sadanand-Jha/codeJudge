"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, History, Plus, Save, Send, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  platformApi,
  type EntitlementDefinition,
  type PlatformPlan,
  type PlatformPlanImpact,
  type PlatformVersion,
  type SubscriptionPlanUpdate,
} from "@/services/platform";
import { BTN, BTN_DANGER, BTN_PRI, DraftBadge, Field, INPUT, Toggle, VersionHistory } from "./admin-ui";
import type { PreviewPlan } from "./PricingPreview";
import Select from "@/components/ui/Select";

type FeatureRow = { id: string; text: string; enabled: boolean };

type DraftPrice = NonNullable<SubscriptionPlanUpdate["prices"]>[number];

type PlanDraft = Partial<SubscriptionPlanUpdate> & {
  prices?: DraftPrice[];
  entitlements?: Record<string, number | boolean>;
};

function rupees(paise: number): number {
  return Math.round(paise) / 100;
}

function paise(value: number): number {
  return Math.round(value * 100);
}

function featureRows(features: unknown): FeatureRow[] {
  if (!Array.isArray(features)) return [];
  return features
    .filter((value): value is string => typeof value === "string")
    .map((text) => ({ id: `${Math.random().toString(36).slice(2)}-${text.slice(0, 12)}`, text, enabled: true }));
}

function draftOf(plan: PlatformPlan): PlanDraft | null {
  return plan.draft_payload as PlanDraft | null;
}

function initialPrices(plan: PlatformPlan, draft: PlanDraft | null): DraftPrice[] {
  const stored = draft?.prices ?? plan.prices;
  const latest = new Map<string, DraftPrice>();
  for (const row of stored) {
    const key = `${row.billing_period}|${row.custom_days ?? 0}`;
    const existing = latest.get(key);
    const rowId = "id" in row ? Number(row.id) : 0;
    const existingId = existing && "id" in existing ? Number(existing.id) : 0;
    if (!existing || (row.is_active && !existing.is_active) || rowId > existingId) {
      latest.set(key, { ...row });
    }
  }

  const rows = [...latest.values()];
  for (const period of ["monthly", "quarterly", "yearly", "lifetime"] as const) {
    if (!rows.some((row) => row.billing_period === period)) {
      rows.push({
        billing_period: period,
        custom_days: null,
        amount: 0,
        mrp_amount: null,
        tax_inclusive: true,
        gateway_price_id: null,
        is_active: period === "monthly",
      });
    }
  }
  const monthly = rows.find((row) => row.billing_period === "monthly");
  if (monthly) monthly.is_active = true;
  return rows;
}

export function PlanEditor({
  plan,
  plans,
  registry,
  onRefresh,
  onDeleted,
  onPreview,
  content,
  previewMode = false,
}: {
  plan: PlatformPlan;
  plans: PlatformPlan[];
  registry: EntitlementDefinition[];
  onRefresh: () => Promise<void>;
  onDeleted: () => void;
  onPreview: (plan: PreviewPlan) => void;
  content: Record<string, string>;
  previewMode?: boolean;
}) {
  const toast = useToast();
  const draft = draftOf(plan);
  const [prices, setPrices] = useState<DraftPrice[]>(() => initialPrices(plan, draft));
  const monthly = prices.find((row) => row.billing_period === "monthly");
  const isPreview = previewMode;
  const [name, setName] = useState(draft?.name ?? plan.name);
  const [slug, setSlug] = useState(draft?.slug ?? plan.slug);
  const [description, setDescription] = useState(draft?.description ?? plan.description ?? "");
  const [tagline, setTagline] = useState(draft?.tagline ?? plan.tagline ?? "");
  const [offer, setOffer] = useState(draft?.offer ?? plan.offer ?? "");
  const [cta, setCta] = useState(draft?.cta ?? plan.cta ?? "");
  const [discountBadge, setDiscountBadge] = useState(draft?.discount_badge ?? plan.discount_badge ?? "");
  const [trialDays, setTrialDays] = useState(String(draft?.trial_days ?? plan.trial_days));
  const [sortOrder, setSortOrder] = useState(String(draft?.sort_order ?? plan.sort_order));
  const [isPublic, setIsPublic] = useState(
    plan.is_default_free ? true : (draft?.is_public ?? plan.is_public)
  );
  const [featured, setFeatured] = useState(draft?.featured ?? plan.featured);
  const [features, setFeatures] = useState<FeatureRow[]>(() => featureRows(draft?.features ?? plan.features));
  const [newFeature, setNewFeature] = useState("");
  const [entitlements, setEntitlements] = useState<Record<string, number | boolean>>(() => {
    const values = draft?.entitlements ?? plan.entitlements ?? {};
    const next: Record<string, number | boolean> = {};
    for (const definition of registry) {
      next[definition.key] = values[definition.key] ?? definition.default;
    }
    for (const [key, value] of Object.entries(values)) {
      if (!(key in next)) next[key] = value;
    }
    return next;
  });
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [versions, setVersions] = useState<PlatformVersion[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [impact, setImpact] = useState<PlatformPlanImpact | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveStrategy, setArchiveStrategy] = useState<"run_until_expiry" | "migrate">("run_until_expiry");
  const [archiveTargetId, setArchiveTargetId] = useState("");

  const autoBadge = useMemo(() => {
    const amount = rupees(monthly?.amount ?? 0);
    const original = monthly?.mrp_amount ? rupees(monthly.mrp_amount) : 0;
    if (original <= amount || original <= 0) return "";
    return `${Math.round((1 - amount / original) * 100)}% off`;
  }, [monthly]);

  const visibleFeatures = useMemo(
    () => features.filter((feature) => feature.enabled && feature.text.trim()).map((feature) => feature.text.trim()),
    [features]
  );

  const updatePrice = (index: number, patch: Partial<DraftPrice>) => {
    setPrices((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addCustomPrice = () => {
    setPrices((current) => [
      ...current,
      {
        billing_period: "custom_days",
        custom_days: 30,
        amount: 0,
        mrp_amount: null,
        tax_inclusive: true,
        gateway_price_id: null,
        is_active: true,
      },
    ]);
  };

  useEffect(() => {
    if (isPreview || plan.active_subscriber_count <= 0) return;
    let cancelled = false;
    platformApi
      .subscriptionPlanImpact(plan.id)
      .then((data) => {
        if (!cancelled) setImpact(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isPreview, plan.active_subscriber_count, plan.id]);

  const impactLines = useMemo(() => {
    if (!impact) return [];
    return plan.prices
      .map((row) => {
        const count = impact.price_subscribers[String(row.id)] ?? 0;
        if (count <= 0) return null;
        const period =
          row.billing_period === "custom_days"
            ? `${row.custom_days ?? "custom"} days`
            : row.billing_period;
        return `${count} on ₹${rupees(row.amount)}/${period}`;
      })
      .filter((line): line is string => Boolean(line));
  }, [impact, plan.prices]);

  useEffect(() => {
    onPreview({
      slug: plan.slug,
      name,
      tagline,
      offer,
      cta,
      featured,
      trialDays: Number(trialDays) || 0,
      price: rupees(monthly?.amount ?? 0),
      originalPrice: monthly?.mrp_amount ? rupees(monthly.mrp_amount) : null,
      credits: Number(entitlements.ai_credits_per_month) || 0,
      features: visibleFeatures,
      discountBadge: discountBadge.trim() || null,
    });
  }, [
    cta,
    discountBadge,
    entitlements.ai_credits_per_month,
    featured,
    name,
    offer,
    onPreview,
    plan.slug,
    monthly?.amount,
    monthly?.mrp_amount,
    tagline,
    trialDays,
    visibleFeatures,
  ]);

  const buildPayload = useCallback((): SubscriptionPlanUpdate | null => {
    if (!name.trim()) {
      toast.error({ title: "Name is required", description: "Give the plan a clear name." });
      return null;
    }
    const activePrices = prices.filter((item) => item.is_active);
    const customPeriods = new Set<number>();
    for (const row of activePrices) {
      if (row.billing_period === "custom_days") {
        if (!Number.isInteger(row.custom_days) || !row.custom_days || row.custom_days < 1) {
          toast.error({ title: "Invalid custom period", description: "Custom billing periods need a positive whole number of days." });
          return null;
        }
        if (customPeriods.has(row.custom_days)) {
          toast.error({ title: "Duplicate custom period", description: `Only one active price can use a ${row.custom_days}-day period.` });
          return null;
        }
        customPeriods.add(row.custom_days);
      }
      if (!Number.isInteger(row.amount) || row.amount < 0) {
        toast.error({ title: "Invalid price", description: "Prices must be zero or more." });
        return null;
      }
      if (row.mrp_amount != null && (!Number.isInteger(row.mrp_amount) || row.mrp_amount < row.amount)) {
        toast.error({ title: "Invalid strike-through price", description: "MRP must be at least the selling price." });
        return null;
      }
    }
    const numericEntitlements: Record<string, number | boolean> = {};
    for (const [key, value] of Object.entries(entitlements)) {
      if (typeof value === "number" && !Number.isInteger(value)) {
        toast.error({ title: "Whole numbers only", description: `${key} must be a whole number.` });
        return null;
      }
      numericEntitlements[key] = value;
    }

    const pricesPayload = activePrices.map((row) => ({
      billing_period: row.billing_period,
      custom_days: row.custom_days,
      amount: row.amount,
      mrp_amount: row.mrp_amount,
      tax_inclusive: row.tax_inclusive,
      gateway_price_id: row.gateway_price_id,
      is_active: true,
    }));

    return {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || null,
      tagline: tagline.trim() || null,
      offer: offer.trim() || null,
      cta: cta.trim() || null,
      discount_badge: discountBadge.trim() || null,
      features: visibleFeatures,
      is_public: isPublic,
      featured,
      sort_order: Number(sortOrder) || 0,
      trial_days: Number(trialDays) || 0,
      prices: pricesPayload,
      entitlements: numericEntitlements,
    };
  }, [
    cta,
    description,
    discountBadge,
    entitlements,
    featured,
    isPublic,
    prices,
    name,
    offer,
    slug,
    sortOrder,
    tagline,
    toast,
    trialDays,
    visibleFeatures,
  ]);

  const saveDraft = async (silent = false): Promise<boolean> => {
    if (isPreview || saving) return false;
    const payload = buildPayload();
    if (!payload) return false;
    setSaving(true);
    try {
      await platformApi.saveSubscriptionPlanDraft(plan.id, payload);
      if (!silent) {
        toast.success({ title: "Draft saved", description: "Nothing is live until you publish." });
      }
      await onRefresh();
      return true;
    } catch (error) {
      toast.error({
        title: "Draft could not be saved",
        description: getApiErrorMessage(error, "Check the fields and try again."),
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (isPreview || saving) return;
    const saved = await saveDraft(true);
    if (!saved) return;
    setSaving(true);
    try {
      await platformApi.publishSubscriptionPlanDraft(plan.id);
      toast.success({ title: "Plan published", description: `${name} is live.` });
      await onRefresh();
    } catch (error) {
      toast.error({
        title: "Plan could not be published",
        description: getApiErrorMessage(error, "Fix the highlighted fields and try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async () => {
    if (isPreview) return;
    setHistoryOpen((open) => !open);
    if (historyOpen) return;
    setHistoryLoading(true);
    try {
      const response = await platformApi.subscriptionPlanVersions(plan.id);
      setVersions(response.versions);
    } catch (error) {
      toast.error({
        title: "History unavailable",
        description: getApiErrorMessage(error, "Try again."),
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const restore = async (versionId: number) => {
    if (isPreview || restoring) return;
    setRestoring(true);
    try {
      await platformApi.restoreSubscriptionPlanVersion(plan.id, versionId);
      toast.success({ title: "Version restored as draft", description: "Review it, then publish when ready." });
      await onRefresh();
      const response = await platformApi.subscriptionPlanVersions(plan.id);
      setVersions(response.versions);
    } catch (error) {
      toast.error({
        title: "Version could not be restored",
        description: getApiErrorMessage(error, "Try again."),
      });
    } finally {
      setRestoring(false);
    }
  };

  const duplicate = async () => {
    if (isPreview || saving) return;
    setSaving(true);
    try {
      await platformApi.duplicateSubscriptionPlan(plan.id);
      toast.success({ title: "Plan duplicated", description: "The copy is paused and hidden until you publish it." });
      await onRefresh();
    } catch (error) {
      toast.error({ title: "Plan could not be duplicated", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setSaving(false);
    }
  };

  const runArchive = async (strategy?: "run_until_expiry" | "migrate", migrationTargetPlanId?: number) => {
    if (isPreview || saving) return;
    setSaving(true);
    try {
      await platformApi.archiveSubscriptionPlan(plan.id, { strategy, migrationTargetPlanId });
      setArchiveOpen(false);
      toast.success({ title: "Plan archived", description: `${plan.name} is no longer public.` });
      await onRefresh();
    } catch (error) {
      toast.error({ title: "Plan could not be archived", description: getApiErrorMessage(error, "Try again.") });
    } finally {
      setSaving(false);
    }
  };

  const archive = () => {
    if (isPreview || saving) return;
    if (plan.active_subscriber_count <= 0) {
      if (window.confirm(`Archive ${plan.name}? It will disappear from the public catalog.`)) {
        void runArchive();
      }
      return;
    }
    setArchiveOpen(true);
  };

  const confirmArchive = () => {
    if (archiveStrategy === "migrate") {
      const targetId = Number(archiveTargetId);
      if (!targetId) {
        toast.error({ title: "Choose a target plan", description: "Pick an active plan to move subscribers to." });
        return;
      }
      void runArchive("migrate", targetId);
      return;
    }
    void runArchive("run_until_expiry");
  };

  const remove = async () => {
    if (isPreview || saving) return;
    if (!window.confirm(`Permanently delete ${plan.name}? This only works when it has no subscriptions.`)) return;
    setSaving(true);
    try {
      await platformApi.deleteSubscriptionPlan(plan.id);
      toast.success({ title: "Plan deleted", description: `${plan.name} was removed.` });
      onDeleted();
    } catch (error) {
      toast.error({ title: "Plan could not be deleted", description: getApiErrorMessage(error, "Use archive instead.") });
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    const text = newFeature.trim();
    if (!text) return;
    setFeatures((rows) => [...rows, { id: `${Math.random().toString(36).slice(2)}`, text, enabled: true }]);
    setNewFeature("");
  };

  const moveFeature = (index: number, direction: -1 | 1) => {
    setFeatures((rows) => {
      const target = index + direction;
      if (target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-[var(--qs-ink)]">{plan.name}</h3>
          <DraftBadge hasDraft={Boolean(plan.draft_payload)} />
          <span className="rounded-full border border-[var(--qs-line)] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[var(--qs-muted)]">
            {plan.status}
          </span>
          <span className="text-[11px] font-bold text-[var(--qs-muted)]">
            {plan.active_subscriber_count} active · {plan.subscriber_count} total
          </span>
        </div>
        <button type="button" className={BTN} onClick={loadHistory} disabled={saving || isPreview}>
          <History size={14} />
          Version history
        </button>
      </div>

      {historyOpen && (
        <div className="rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
          <VersionHistory versions={versions} loading={historyLoading} onRestore={restore} busy={restoring} />
        </div>
      )}

      {plan.active_subscriber_count > 0 && (
        <div
          role="status"
          className="flex gap-3 rounded-[12px] border-2 border-[var(--qs-warn)] bg-[color-mix(in_srgb,var(--qs-warn)_10%,var(--qs-surface))] p-3 text-[12px]"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--qs-warn)]" />
          <div className="space-y-1">
            <p className="font-extrabold text-[var(--qs-ink)]">
              This plan has {plan.active_subscriber_count} active subscriber{plan.active_subscriber_count === 1 ? "" : "s"}
              {plan.subscriber_count > plan.active_subscriber_count ? ` (${plan.subscriber_count} total)` : ""}.
            </p>
            <p className="text-[var(--qs-muted)]">
              Publishing replaces the live plan immediately. Existing subscriptions are not migrated, so review pricing,
              entitlements and the public catalog before publishing.
            </p>
            {impactLines.length > 0 && (
              <p className="font-bold text-[var(--qs-ink)]">Live subscriber mix: {impactLines.join(" · ")}.</p>
            )}
          </div>
        </div>
      )}

      {archiveOpen && plan.active_subscriber_count > 0 && (
        <div className="space-y-3 rounded-[12px] border-2 border-[var(--qs-bad)] bg-[color-mix(in_srgb,var(--qs-bad)_8%,var(--qs-surface))] p-3 text-[12px]">
          <p className="font-extrabold text-[var(--qs-ink)]">Archive {plan.name} with active subscribers</p>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              checked={archiveStrategy === "run_until_expiry"}
              onChange={() => setArchiveStrategy("run_until_expiry")}
              className="mt-0.5 accent-[var(--qs-brand)]"
            />
            <span>
              <b>Run until expiry</b>
              <span className="block text-[var(--qs-muted)]">Keep access for current subscribers until their paid period ends.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              checked={archiveStrategy === "migrate"}
              onChange={() => setArchiveStrategy("migrate")}
              className="mt-0.5 accent-[var(--qs-brand)]"
            />
            <span>
              <b>Move subscribers now</b>
              <span className="block text-[var(--qs-muted)]">Migrate active subscribers to another active plan immediately.</span>
            </span>
          </label>
          {archiveStrategy === "migrate" && (
            <Field label="Migration target" hint="Only active plans can receive migrated subscribers.">
              <Select
                className={INPUT}
                value={archiveTargetId}
                onChange={(event) => setArchiveTargetId(event.target.value)}
              >
                <option value="">Choose a plan…</option>
                {plans
                  .filter((candidate) => candidate.id !== plan.id && candidate.status === "active")
                  .map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BTN_DANGER} onClick={confirmArchive} disabled={saving || isPreview}>
              Archive plan
            </button>
            <button type="button" className={BTN} onClick={() => setArchiveOpen(false)} disabled={saving || isPreview}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Plan name">
          <input className={INPUT} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Slug" hint="Used in URLs. Lowercase letters, numbers and dashes.">
          <input className={INPUT} value={slug} onChange={(event) => setSlug(event.target.value)} />
        </Field>
        <Field label="CTA label">
          <input className={INPUT} value={cta} onChange={(event) => setCta(event.target.value)} placeholder="Choose plan" />
        </Field>
        <Field label="Tagline">
          <input className={INPUT} value={tagline} onChange={(event) => setTagline(event.target.value)} />
        </Field>
        <Field label="Offer line">
          <input className={INPUT} value={offer} onChange={(event) => setOffer(event.target.value)} placeholder="Limited 2026 offer" />
        </Field>
        <Field label="Discount badge" hint={autoBadge ? `Leave blank to auto-calculate: ${autoBadge}` : "Leave blank to auto-calculate from price and MRP."}>
          <input className={INPUT} value={discountBadge} onChange={(event) => setDiscountBadge(event.target.value)} placeholder={autoBadge || "e.g. 25% off"} />
        </Field>
        <Field label="Trial days">
          <input className={INPUT} type="number" min={0} step={1} value={trialDays} onChange={(event) => setTrialDays(event.target.value)} />
        </Field>
        <Field label="Sort order">
          <input className={INPUT} type="number" step={1} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
        </Field>
        <div className="flex flex-col justify-end gap-2 pb-1">
          <Toggle
            label="Visible on public pricing"
            checked={isPublic}
            onChange={setIsPublic}
            disabled={plan.is_default_free}
          />
          <Toggle label="Featured / most popular" checked={featured} onChange={setFeatured} />
        </div>
      </div>

      <Field label="Description" hint="Internal/public plan description, separate from the short tagline.">
        <textarea className={`${INPUT} min-h-20`} value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>

      <div className="rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
        <div className="mb-3">
          <p className="text-[12px] font-extrabold text-[var(--qs-ink)]">Billing prices</p>
          <p className="text-[11px] text-[var(--qs-muted)]">
            Monthly pricing is required as the default. Enable other billing periods to offer them at checkout.
          </p>
        </div>
        <div className="space-y-3">
          {prices.map((row, index) => {
            const label = row.billing_period === "custom_days"
              ? "Custom period"
              : row.billing_period.charAt(0).toUpperCase() + row.billing_period.slice(1);
            return (
              <div key={`${row.billing_period}-${row.custom_days ?? 0}-${index}`} className="grid gap-2 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-2 sm:grid-cols-[minmax(120px,0.7fr)_1fr_1fr_auto] sm:items-end">
                <div className="flex items-center gap-2">
                  {row.billing_period !== "monthly" && (
                    <input
                      type="checkbox"
                      checked={row.is_active === true}
                      onChange={(event) => updatePrice(index, { is_active: event.target.checked })}
                      aria-label={`Offer ${label}`}
                      className="h-4 w-4 accent-[var(--qs-brand)]"
                    />
                  )}
                  <span className="text-[12px] font-extrabold text-[var(--qs-ink)]">{label}</span>
                  {row.billing_period === "custom_days" && (
                    <input
                      className={`${INPUT} max-w-20`}
                      type="number"
                      min={1}
                      step={1}
                      value={row.custom_days ?? ""}
                      onChange={(event) => updatePrice(index, { custom_days: Number(event.target.value) || null })}
                      aria-label="Custom billing period in days"
                    />
                  )}
                </div>
                <Field label="Price (₹)">
                  <input
                    className={INPUT}
                    type="number"
                    min={0}
                    step={1}
                    value={rupees(row.amount)}
                    disabled={!row.is_active}
                    onChange={(event) => updatePrice(index, { amount: paise(Number(event.target.value) || 0) })}
                  />
                </Field>
                <Field label="Strike-through MRP (₹)">
                  <input
                    className={INPUT}
                    type="number"
                    min={0}
                    step={1}
                    value={row.mrp_amount == null ? "" : rupees(row.mrp_amount)}
                    disabled={!row.is_active}
                    placeholder="Optional"
                    onChange={(event) => updatePrice(index, { mrp_amount: event.target.value === "" ? null : paise(Number(event.target.value) || 0) })}
                  />
                </Field>
                {row.billing_period === "custom_days" && (
                  <button
                    type="button"
                    className={BTN_DANGER}
                    onClick={() => setPrices((current) => current.filter((_, i) => i !== index))}
                    aria-label="Remove custom billing period"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" className={`${BTN} mt-3`} onClick={addCustomPrice}>
          <Plus size={14} />
          Add custom days
        </button>
      </div>

      <div className="rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[12px] font-extrabold text-[var(--qs-ink)]">Features</p>
            <p className="text-[11px] text-[var(--qs-muted)]">Drag-free reorder with arrows. Unchecked features are not published.</p>
          </div>
          <span className="text-[11px] font-bold text-[var(--qs-muted)]">{visibleFeatures.length} visible</span>
        </div>
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div key={feature.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={feature.enabled}
                onChange={(event) =>
                  setFeatures((rows) =>
                    rows.map((row) => (row.id === feature.id ? { ...row, enabled: event.target.checked } : row))
                  )
                }
                className="h-4 w-4 accent-[var(--qs-brand)]"
              />
              <input
                className={`${INPUT} ${feature.enabled ? "" : "line-through opacity-60"}`}
                value={feature.text}
                onChange={(event) =>
                  setFeatures((rows) =>
                    rows.map((row) => (row.id === feature.id ? { ...row, text: event.target.value } : row))
                  )
                }
              />
              <button type="button" className={BTN} onClick={() => moveFeature(index, -1)} disabled={index === 0} aria-label="Move feature up">
                <ArrowUp size={13} />
              </button>
              <button type="button" className={BTN} onClick={() => moveFeature(index, 1)} disabled={index === features.length - 1} aria-label="Move feature down">
                <ArrowDown size={13} />
              </button>
              <button type="button" className={BTN_DANGER} onClick={() => setFeatures((rows) => rows.filter((row) => row.id !== feature.id))} aria-label="Remove feature">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className={INPUT}
            value={newFeature}
            onChange={(event) => setNewFeature(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addFeature();
              }
            }}
            placeholder="Add a feature and press Enter"
          />
          <button type="button" className={BTN} onClick={addFeature}>
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
        <p className="mb-2 text-[12px] font-extrabold text-[var(--qs-ink)]">Entitlements</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {registry.map((definition) => {
            const value = entitlements[definition.key] ?? definition.default;
            return (
              <Field key={definition.key} label={definition.label} hint={definition.description || definition.key}>
                {definition.type === "boolean" ? (
                  <Toggle
                    label={definition.label}
                    checked={Boolean(value)}
                    onChange={(next) => setEntitlements((current) => ({ ...current, [definition.key]: next }))}
                  />
                ) : (
                  <div className="relative">
                    <input
                      className={`${INPUT} ${definition.unit ? "pr-14" : ""}`}
                      type="number"
                      step={1}
                      value={String(value)}
                      onChange={(event) =>
                        setEntitlements((current) => ({
                          ...current,
                          [definition.key]: Number(event.target.value),
                        }))
                      }
                    />
                    {definition.unit && (
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[var(--qs-muted)]">
                        {definition.unit}
                      </span>
                    )}
                  </div>
                )}
              </Field>
            );
          })}
          {Object.keys(entitlements)
            .filter((key) => !registry.some((definition) => definition.key === key))
            .map((key) => (
              <Field key={key} label={key} hint="Custom entitlement">
                {typeof entitlements[key] === "boolean" ? (
                  <Toggle
                    label={key}
                    checked={Boolean(entitlements[key])}
                    onChange={(next) => setEntitlements((current) => ({ ...current, [key]: next }))}
                  />
                ) : (
                  <input
                    className={INPUT}
                    type="number"
                    step={1}
                    value={String(entitlements[key])}
                    onChange={(event) => setEntitlements((current) => ({ ...current, [key]: Number(event.target.value) }))}
                  />
                )}
              </Field>
            ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BTN_PRI} onClick={publish} disabled={saving || isPreview}>
          <Send size={14} />
          Publish
        </button>
        <button type="button" className={BTN} onClick={() => void saveDraft()} disabled={saving || isPreview}>
          <Save size={14} />
          Save draft
        </button>
        <button type="button" className={BTN} onClick={duplicate} disabled={saving || isPreview}>
          <Plus size={14} />
          Duplicate
        </button>
        {!plan.is_default_free && (
          <button type="button" className={BTN} onClick={archive} disabled={saving || isPreview}>
            Archive
          </button>
        )}
        {!plan.is_default_free && plan.subscriber_count === 0 && (
          <button type="button" className={BTN_DANGER} onClick={remove} disabled={saving || isPreview}>
            <Trash2 size={14} />
            Delete
          </button>
        )}
        {plan.updated_at && (
          <span className="ml-auto text-[11px] text-[var(--qs-muted)]">
            Updated {new Date(plan.updated_at).toLocaleString("en-IN")}
          </span>
        )}
      </div>
      {content.plans_gst_note && <p className="text-[11px] text-[var(--qs-muted)]">Public note: {content.plans_gst_note}</p>}
    </div>
  );
}
