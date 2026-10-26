"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coins, CreditCard, GripVertical, LayoutTemplate, Plus, Sparkles, Ticket, WifiOff } from "lucide-react";
import { SectionCard, SectionSkeleton, ErrorState } from "@/components/platform/ui";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  platformApi,
  type EntitlementDefinition,
  type PlatformCoupon,
  type PlatformCreditPack,
  type PlatformPageContent,
  type PlatformPlan,
} from "@/services/platform";
import { BTN, BTN_PRI } from "./admin-ui";
import { PlanEditor } from "./PlanEditor";
import { PackEditor } from "./PackEditor";
import { CouponEditor } from "./CouponEditor";
import { ContentEditor } from "./ContentEditor";
import { PricingPreview, type PreviewPack, type PreviewPlan, type PreviewTab } from "./PricingPreview";
import {
  LOCAL_CONTENT,
  LOCAL_COUPONS,
  LOCAL_ENTITLEMENT_REGISTRY,
  LOCAL_PACKS,
  LOCAL_PLANS,
  PRICING_BACKEND_ENABLED,
} from "./localCatalog";

const TABS: { id: PreviewTab; label: string; icon: typeof CreditCard }[] = [
  { id: "plans", label: "Monthly plans", icon: CreditCard },
  { id: "packs", label: "Credit packs", icon: Coins },
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "content", label: "Page content", icon: LayoutTemplate },
];

function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function moveById<T>(items: T[], fromId: number, toId: number, getId: (item: T) => number): T[] {
  const from = items.findIndex((item) => getId(item) === fromId);
  const to = items.findIndex((item) => getId(item) === toId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function monthlyPrice(plan: PlatformPlan) {
  const prices = plan.prices ?? [];
  return (
    prices.find((price) => price.billing_period === "monthly" && price.is_active) ??
    prices.find((price) => price.billing_period === "monthly")
  );
}

function planPreview(plan: PlatformPlan): PreviewPlan {
  const monthly = monthlyPrice(plan);
  return {
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline ?? "",
    offer: plan.offer ?? "",
    cta: plan.cta ?? "Choose plan",
    featured: plan.featured,
    trialDays: plan.trial_days,
    price: Math.round(monthly?.amount ?? 0) / 100,
    originalPrice: monthly?.mrp_amount ? Math.round(monthly.mrp_amount) / 100 : null,
    credits: Number(plan.entitlements?.ai_credits_per_month) || 0,
    features: plan.features ?? [],
    discountBadge: plan.discount_badge,
  };
}

function packPreview(pack: PlatformCreditPack): PreviewPack {
  return {
    id: String(pack.id),
    name: pack.name,
    credits: pack.credits,
    price: pack.price_inr,
    cta: pack.cta ?? "Buy credits",
    blurb: pack.description ?? "",
    popular: pack.is_popular,
    validityMonths: Math.max(1, Math.round(pack.validity_days / 30)),
    savePercent: pack.save_percent,
  };
}

function uniquePlanName(plans: PlatformPlan[]): string {
  const base = "Untitled plan";
  if (!plans.some((plan) => plan.name === base)) return base;
  let suffix = 2;
  while (plans.some((plan) => plan.name === `${base} ${suffix}`)) suffix += 1;
  return `${base} ${suffix}`;
}

export function PricingAdmin() {
  const toast = useToast();
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [packs, setPacks] = useState<PlatformCreditPack[]>([]);
  const [coupons, setCoupons] = useState<PlatformCoupon[]>([]);
  const [content, setContent] = useState<PlatformPageContent[]>([]);
  const [registry, setRegistry] = useState<EntitlementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PreviewTab>("plans");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [newCoupon, setNewCoupon] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [creatingPack, setCreatingPack] = useState(false);
  const newCouponRef = useRef(false);
  const [dragPlanId, setDragPlanId] = useState<number | null>(null);
  const [dragPackId, setDragPackId] = useState<number | null>(null);
  const [previewPlan, setPreviewPlan] = useState<PreviewPlan | null>(null);
  const [previewPack, setPreviewPack] = useState<PreviewPack | null>(null);
  const [previewContent, setPreviewContent] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!PRICING_BACKEND_ENABLED) {
      setPlans(LOCAL_PLANS);
      setRegistry(LOCAL_ENTITLEMENT_REGISTRY);
      setPacks(LOCAL_PACKS);
      setCoupons(LOCAL_COUPONS);
      setContent(LOCAL_CONTENT);
      setSelectedCouponId((current) =>
        current && LOCAL_COUPONS.some((coupon) => coupon.id === current) ? current : LOCAL_COUPONS[0]?.id ?? null
      );
      setSelectedPlanId((current) =>
        current && LOCAL_PLANS.some((plan) => plan.id === current) ? current : LOCAL_PLANS[0]?.id ?? null
      );
      setSelectedPackId((current) =>
        current && LOCAL_PACKS.some((pack) => pack.id === current) ? current : LOCAL_PACKS[0]?.id ?? null
      );
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const [planData, registryData, packData, couponData, contentData] = await Promise.all([
        platformApi.subscriptionPlans(),
        platformApi.subscriptionRegistry(),
        platformApi.creditPacks(),
        platformApi.coupons(),
        platformApi.pageContent(),
      ]);
      setPlans(planData.plans);
      setRegistry(registryData.registry);
      setPacks(packData.packs);
      setCoupons(couponData.coupons);
      setContent(contentData.content);
      setSelectedCouponId((current) => {
        if (newCouponRef.current) return current;
        return current && couponData.coupons.some((coupon) => coupon.id === current)
          ? current
          : couponData.coupons[0]?.id ?? null;
      });
      setSelectedPlanId((current) =>
        current && planData.plans.some((plan) => plan.id === current) ? current : planData.plans[0]?.id ?? null
      );
      setSelectedPackId((current) =>
        current && packData.packs.some((pack) => pack.id === current) ? current : packData.packs[0]?.id ?? null
      );
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Could not load the pricing catalog."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial catalog load
    void load();
  }, [load]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );
  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === selectedPackId) ?? null,
    [packs, selectedPackId]
  );
  const selectedCoupon = useMemo(
    () => coupons.find((coupon) => coupon.id === selectedCouponId) ?? null,
    [coupons, selectedCouponId]
  );

  const liveContent = useMemo(
    () => Object.fromEntries(content.map((row) => [row.key, row.value])),
    [content]
  );
  const mergedContent = useMemo(() => ({ ...liveContent, ...previewContent }), [liveContent, previewContent]);

  const previewPlans = useMemo(() => {
    const visible = plans
      .filter((plan) => plan.id === selectedPlanId || (plan.status === "active" && plan.is_public))
      .map((plan) =>
        plan.id === selectedPlanId && previewPlan ? previewPlan : planPreview(plan)
      );
    return visible;
  }, [plans, previewPlan, selectedPlanId]);

  const previewPacks = useMemo(() => {
    return packs
      .filter((pack) => pack.id === selectedPackId || pack.is_active)
      .map((pack) => (pack.id === selectedPackId && previewPack ? previewPack : packPreview(pack)));
  }, [packs, previewPack, selectedPackId]);

  const handlePlanPreview = useCallback((plan: PreviewPlan) => setPreviewPlan(plan), []);
  const handlePackPreview = useCallback((pack: PreviewPack) => setPreviewPack(pack), []);
  const handleContentPreview = useCallback((values: Record<string, string>) => setPreviewContent(values), []);

  const togglePlan = async (plan: PlatformPlan) => {
    if (!PRICING_BACKEND_ENABLED) {
      const nextActive = plan.status !== "active";
      setPlans((current) =>
        current.map((item) =>
          item.id === plan.id
            ? { ...item, status: nextActive ? "active" : "draft", is_public: nextActive }
            : item
        )
      );
      toast.success({
        title: nextActive ? "Plan activated" : "Plan hidden",
        description: "Preview only. Reconnect the backend to save.",
      });
      return;
    }
    try {
      await platformApi.toggleSubscriptionPlan(plan.id, plan.status !== "active");
      toast.success({ title: plan.status === "active" ? "Plan hidden" : "Plan activated" });
      await load();
    } catch (toggleError) {
      toast.error({ title: "Plan status could not change", description: getApiErrorMessage(toggleError, "Try again.") });
    }
  };

  const togglePack = async (pack: PlatformCreditPack) => {
    if (!PRICING_BACKEND_ENABLED) {
      setPacks((current) =>
        current.map((item) => (item.id === pack.id ? { ...item, is_active: !pack.is_active } : item))
      );
      toast.success({
        title: pack.is_active ? "Pack paused" : "Pack activated",
        description: "Preview only. Reconnect the backend to save.",
      });
      return;
    }
    try {
      await platformApi.toggleCreditPack(pack.id, !pack.is_active);
      toast.success({ title: pack.is_active ? "Pack paused" : "Pack activated" });
      await load();
    } catch (toggleError) {
      toast.error({ title: "Pack status could not change", description: getApiErrorMessage(toggleError, "Try again.") });
    }
  };

  const reorderPlans = async (targetId: number) => {
    if (dragPlanId === null || dragPlanId === targetId) return;
    const next = moveById(plans, dragPlanId, targetId, (plan) => plan.id);
    setPlans(next);
    setDragPlanId(null);
    if (!PRICING_BACKEND_ENABLED) return;
    try {
      const response = await platformApi.reorderSubscriptionPlans(next.map((plan) => plan.id));
      if (response.plans) setPlans(response.plans);
    } catch (reorderError) {
      toast.error({ title: "Order could not be saved", description: getApiErrorMessage(reorderError, "Try again.") });
      await load();
    }
  };

  const reorderPacks = async (targetId: number) => {
    if (dragPackId === null || dragPackId === targetId) return;
    const next = moveById(packs, dragPackId, targetId, (pack) => pack.id);
    setPacks(next);
    setDragPackId(null);
    if (!PRICING_BACKEND_ENABLED) return;
    try {
      const response = await platformApi.reorderCreditPacks(next.map((pack) => pack.id));
      if (response.packs) setPacks(response.packs);
    } catch (reorderError) {
      toast.error({ title: "Order could not be saved", description: getApiErrorMessage(reorderError, "Try again.") });
      await load();
    }
  };

  const createPlan = async () => {
    if (creatingPlan) return;
    setCreatingPlan(true);
    try {
      const name = uniquePlanName(plans);
      if (!PRICING_BACKEND_ENABLED) {
        const id = -Date.now();
        const stamp = new Date().toISOString();
        const created: PlatformPlan = {
          id,
          name,
          slug: `untitled-plan-${Math.abs(id)}`,
          description: null,
          tagline: "What this plan is for",
          cta: "Choose plan",
          offer: null,
          discount_badge: null,
          featured: false,
          features: [],
          status: "draft",
          is_public: false,
          is_default_free: false,
          sort_order: plans.length,
          trial_days: 0,
          archived_at: null,
          created_at: stamp,
          updated_at: stamp,
          prices: [
            {
              id: -id,
              plan_id: id,
              billing_period: "monthly",
              custom_days: null,
              amount: 0,
              mrp_amount: null,
              currency: "INR",
              tax_inclusive: true,
              gateway_price_id: null,
              is_active: true,
              created_at: stamp,
              updated_at: stamp,
            },
          ],
          subscriber_count: 0,
          active_subscriber_count: 0,
          entitlements: {},
          draft_payload: null,
          draft_updated_at: null,
        };
        setPlans((current) => [...current, created]);
        setSelectedPlanId(id);
        setPreviewPlan(null);
        toast.success({
          title: "Plan added (preview only)",
          description: "Edit the fields to update the live preview.",
        });
        return;
      }
      const created = await platformApi.createSubscriptionPlan({
        name,
        tagline: "What this plan is for",
        cta: "Choose plan",
        features: [],
        is_public: false,
        featured: false,
        sort_order: plans.length,
        trial_days: 0,
        prices: [
          {
            billing_period: "monthly",
            custom_days: null,
            amount: 0,
            mrp_amount: null,
            tax_inclusive: true,
            gateway_price_id: null,
            is_active: true,
          },
        ],
        entitlements: {},
      });
      await load();
      setSelectedPlanId(created.id);
      setPreviewPlan(null);
      toast.success({ title: "Plan draft created", description: "Edit it, save the draft, then publish." });
    } catch (createError) {
      toast.error({ title: "Plan could not be created", description: getApiErrorMessage(createError, "Try again.") });
    } finally {
      setCreatingPlan(false);
    }
  };

  const createPack = async () => {
    if (creatingPack) return;
    setCreatingPack(true);
    try {
      if (!PRICING_BACKEND_ENABLED) {
        const id = -Date.now();
        const stamp = new Date().toISOString();
        const created: PlatformCreditPack = {
          id,
          code: `PACK${String(Math.abs(id)).slice(-8)}`,
          name: "Untitled pack",
          price_inr: 0,
          credits: 100,
          validity_days: 90,
          description: null,
          is_popular: false,
          save_percent: 0,
          is_active: false,
          cta: "Buy credits",
          sort_order: packs.length,
          created_at: stamp,
          draft_payload: null,
          draft_updated_at: null,
        };
        setPacks((current) => [...current, created]);
        setSelectedPackId(id);
        setPreviewPack(null);
        toast.success({
          title: "Pack added (preview only)",
          description: "Edit the fields to update the live preview.",
        });
        return;
      }
      const created = await platformApi.createCreditPack({
        code: `PACK${Date.now().toString().slice(-8)}`,
        name: "Untitled pack",
        price_inr: 0,
        credits: 100,
        validity_days: 90,
        description: null,
        is_popular: false,
        save_percent: 0,
        is_active: false,
        cta: "Buy credits",
        sort_order: packs.length,
      });
      await load();
      setSelectedPackId(created.id);
      setPreviewPack(null);
      toast.success({ title: "Pack draft created", description: "Edit it, save the draft, then publish." });
    } catch (createError) {
      toast.error({ title: "Pack could not be created", description: getApiErrorMessage(createError, "Try again.") });
    } finally {
      setCreatingPack(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <SectionSkeleton rows={6} />
        <SectionSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-4">
      {!PRICING_BACKEND_ENABLED && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-[18px] border-2 border-amber-300 bg-amber-50 px-4 py-3"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-amber-300 bg-white/70 text-amber-700">
            <WifiOff size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-amber-950">Design preview mode</p>
            <p className="text-[12px] font-semibold text-amber-800">
              Backend is disconnected. Use local sample data to shape the page; saving and publishing are disabled.
            </p>
          </div>
          <span className="rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 text-[9px] font-extrabold tracking-[0.12em] text-amber-800">
            LOCAL DATA
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-[12px] border-2 px-4 py-2 text-[12px] font-extrabold transition-colors ${
                active
                  ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)]"
                  : "border-transparent bg-transparent text-[var(--qs-muted)] hover:border-[var(--qs-line)] hover:text-[var(--qs-ink)]"
              }`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
        <span className="ml-auto hidden pr-2 text-[11px] font-bold text-[var(--qs-muted)] md:inline">
          Drafts stay private until published.
        </span>
      </div>

      {tab === "plans" && (
        <>
          <SectionCard
            title="Plans and order"
            subtitle="Drag cards to change the public order. Toggle active to show or hide a plan."
            right={
              <button type="button" className={BTN_PRI} onClick={createPlan} disabled={creatingPlan}>
                <Plus size={14} />
                New plan
              </button>
            }
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => {
                const monthly = monthlyPrice(plan);
                const active = plan.id === selectedPlanId;
                const credits = Number(plan.entitlements?.ai_credits_per_month) || 0;
                return (
                  <div
                    key={plan.id}
                    draggable
                    onDragStart={() => setDragPlanId(plan.id)}
                    onDragEnd={() => setDragPlanId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void reorderPlans(plan.id)}
                    className={`cursor-grab rounded-[16px] border-2 p-4 transition-colors ${
                      active
                        ? "border-[var(--qs-ink)] bg-[var(--qs-sun)]"
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                    }`}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setPreviewPlan(null);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedPlanId(plan.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <GripVertical size={13} className="shrink-0 text-[var(--qs-muted)]" />
                          <p className="truncate text-[15px] font-extrabold text-[var(--qs-ink)]">{plan.name}</p>
                        </div>
                        <p className="mt-1 truncate text-[11px] font-bold text-[var(--qs-muted)]">
                          {monthly ? `${inr(monthly.amount / 100)} / month` : "No monthly price"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-[var(--qs-brand)]">
                          <Sparkles size={10} />
                          {credits > 0 ? `${credits} AI credits / month` : "No AI credits"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[var(--qs-line)] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[var(--qs-muted)]">
                        {plan.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {plan.draft_payload && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-700">
                          Draft
                        </span>
                      )}
                      {plan.featured && (
                        <span className="rounded-full bg-[var(--qs-brand)] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[var(--qs-on-brand)]">
                          Featured
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-[var(--qs-muted)]">
                        {plan.active_subscriber_count} active
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[var(--qs-muted)]">
                        {plan.is_public ? "Public" : "Hidden"}
                      </span>
                      <button
                        type="button"
                        className={BTN}
                        disabled={plan.is_default_free}
                        onClick={(event) => {
                          event.stopPropagation();
                          void togglePlan(plan);
                        }}
                      >
                        {plan.status === "active" ? "Hide" : "Activate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <div className="grid gap-4 2xl:grid-cols-2">
            <SectionCard
              title={selectedPlan ? `Edit ${selectedPlan.name}` : "Plan editor"}
              subtitle="Save a draft first, then publish. Publishing is the only step that changes the live page."
            >
              {selectedPlan ? (
                <PlanEditor
                  key={`${selectedPlan.id}-${selectedPlan.draft_updated_at ?? selectedPlan.updated_at}`}
                  plan={selectedPlan}
                  plans={plans}
                  registry={registry}
                  onRefresh={() => load()}
                  onDeleted={() => void load()}
                  onPreview={handlePlanPreview}
                  content={mergedContent}
                  previewMode={!PRICING_BACKEND_ENABLED}
                />
              ) : (
                <p className="text-[12px] text-[var(--qs-muted)]">Create a plan to start editing.</p>
              )}
            </SectionCard>
            <div className="2xl:sticky 2xl:top-6 2xl:self-start">
              <SectionCard
                title="Public preview"
                subtitle="Monthly Plans page, using the current editor values."
                right={
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-ok)]" />
                    Live draft
                  </span>
                }
              >
                <PricingPreview tab="plans" plans={previewPlans} packs={previewPacks} content={mergedContent} />
              </SectionCard>
            </div>
          </div>
        </>
      )}

      {tab === "packs" && (
        <>
          <SectionCard
            title="Credit packs and order"
            subtitle="Drag cards to change the public order. Paused packs stay out of checkout."
            right={
              <button type="button" className={BTN_PRI} onClick={createPack} disabled={creatingPack}>
                <Plus size={14} />
                New pack
              </button>
            }
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {packs.map((pack) => {
                const active = pack.id === selectedPackId;
                return (
                  <div
                    key={pack.id}
                    draggable
                    onDragStart={() => setDragPackId(pack.id)}
                    onDragEnd={() => setDragPackId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void reorderPacks(pack.id)}
                    className={`cursor-grab rounded-[16px] border-2 p-4 transition-colors ${
                      active
                        ? "border-[var(--qs-ink)] bg-[var(--qs-sun)]"
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                    }`}
                    onClick={() => {
                      setSelectedPackId(pack.id);
                      setPreviewPack(null);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedPackId(pack.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <GripVertical size={13} className="shrink-0 text-[var(--qs-muted)]" />
                          <p className="truncate text-[15px] font-extrabold text-[var(--qs-ink)]">{pack.name}</p>
                        </div>
                        <p className="mt-1 truncate text-[11px] font-bold text-[var(--qs-muted)]">
                          {inr(pack.price_inr)} · {pack.credits} credits
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[var(--qs-line)] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[var(--qs-muted)]">
                        {pack.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {pack.draft_payload && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-700">
                          Draft
                        </span>
                      )}
                      {pack.is_popular && (
                        <span className="rounded-full bg-[var(--qs-brand)] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[var(--qs-on-brand)]">
                          Popular
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-[var(--qs-muted)]">{pack.code}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[var(--qs-muted)]">{pack.validity_days} days</span>
                      <button
                        type="button"
                        className={BTN}
                        onClick={(event) => {
                          event.stopPropagation();
                          void togglePack(pack);
                        }}
                      >
                        {pack.is_active ? "Pause" : "Activate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <div className="grid gap-4 2xl:grid-cols-2">
            <SectionCard
              title={selectedPack ? `Edit ${selectedPack.name}` : "Pack editor"}
              subtitle="Credits are added only after server-side payment verification."
            >
              {selectedPack ? (
                <PackEditor
                  key={`${selectedPack.id}-${selectedPack.draft_updated_at ?? selectedPack.created_at}`}
                  pack={selectedPack}
                  onRefresh={() => load()}
                  onDeleted={() => void load()}
                  onPreview={handlePackPreview}
                  previewMode={!PRICING_BACKEND_ENABLED}
                />
              ) : (
                <p className="text-[12px] text-[var(--qs-muted)]">Create a pack to start editing.</p>
              )}
            </SectionCard>
            <div className="2xl:sticky 2xl:top-6 2xl:self-start">
              <SectionCard
                title="Public preview"
                subtitle="Credits page, using the current editor values."
                right={
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-ok)]" />
                    Live draft
                  </span>
                }
              >
                <PricingPreview tab="packs" plans={previewPlans} packs={previewPacks} content={mergedContent} />
              </SectionCard>
            </div>
          </div>
        </>
      )}

      {tab === "coupons" && (
        <div className="grid gap-4 2xl:grid-cols-2">
          <div className="space-y-4">
            <SectionCard
              title="Coupons"
              subtitle="New coupons are created disabled. Save the draft, then publish to activate."
              right={
                <button
                  type="button"
                  className={BTN_PRI}
                  onClick={() => {
                    newCouponRef.current = true;
                    setNewCoupon(true);
                    setSelectedCouponId(null);
                  }}
                >
                  <Plus size={14} />
                  New coupon
                </button>
              }
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {coupons.map((coupon) => {
                  const active = !newCoupon && coupon.id === selectedCouponId;
                  return (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => {
                        newCouponRef.current = false;
                        setNewCoupon(false);
                        setSelectedCouponId(coupon.id);
                      }}
                      className={`rounded-[14px] border-2 p-3 text-left transition-colors ${
                        active
                          ? "border-[var(--qs-ink)] bg-[var(--qs-sun)]"
                          : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[14px] font-extrabold text-[var(--qs-ink)]">{coupon.code}</span>
                        <span className="rounded-full border border-[var(--qs-line)] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[var(--qs-muted)]">
                          {coupon.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-bold text-[var(--qs-muted)]">
                        {coupon.type === "percent" ? `${coupon.value}% off` : coupon.type === "flat" ? `${inr(coupon.value)} off` : `${coupon.value} free days`}
                        {" · "}
                        {coupon.redemption_count} redeemed
                      </p>
                      {coupon.draft_payload && (
                        <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-700">
                          Draft
                        </span>
                      )}
                    </button>
                  );
                })}
                {coupons.length === 0 && !newCoupon && (
                  <p className="text-[12px] text-[var(--qs-muted)]">No coupons yet.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title={newCoupon || !selectedCoupon ? "New coupon" : `Edit ${selectedCoupon.code}`}
              subtitle="Coupons apply at checkout and never appear as public pricing cards."
            >
              <CouponEditor
                key={`${newCoupon ? "new" : selectedCoupon?.id ?? "new"}-${selectedCoupon?.draft_updated_at ?? selectedCoupon?.updated_at ?? "new"}`}
                coupon={newCoupon ? null : selectedCoupon}
                plans={plans}
                onRefresh={() => load()}
                onCreated={(couponId) => {
                  newCouponRef.current = false;
                  setNewCoupon(false);
                  setSelectedCouponId(couponId);
                }}
                onDeleted={() => {
                  newCouponRef.current = false;
                  setNewCoupon(false);
                  setSelectedCouponId(null);
                  void load();
                }}
                previewMode={!PRICING_BACKEND_ENABLED}
              />
            </SectionCard>
          </div>
          <div className="2xl:sticky 2xl:top-6 2xl:self-start">
            <SectionCard title="Public preview" subtitle="Coupons are checkout-only.">
              <PricingPreview tab="coupons" plans={previewPlans} packs={previewPacks} content={mergedContent} />
            </SectionCard>
          </div>
        </div>
      )}

      {tab === "content" && (
        <div className="grid gap-4 2xl:grid-cols-2">
          <SectionCard
            title="Pricing page content"
            subtitle="Every field supports a private draft and an explicit publish step."
          >
            <ContentEditor
              key={content.map((row) => `${row.key}:${row.updated_at}:${row.draft_value ?? ""}`).join("|")}
              content={content}
              onRefresh={() => load()}
              onPreview={handleContentPreview}
              previewMode={!PRICING_BACKEND_ENABLED}
            />
          </SectionCard>
          <div className="2xl:sticky 2xl:top-6 2xl:self-start">
            <SectionCard title="Public preview" subtitle="Monthly Plans page, using draft content.">
              <PricingPreview tab="content" plans={previewPlans} packs={previewPacks} content={mergedContent} />
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
