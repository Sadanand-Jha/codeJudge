"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  GitBranch,
  Plus,
  RotateCcw,
  X,
  Zap,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  DEFAULT_ROUTES,
  MODELS,
  featureLabel,
  modelName,
  type FeatureRoute,
  type ReasoningEffort,
} from "@/components/platform/ai-ops/mock-data";
import {
  AiOpsPageHeader,
  ConfirmDialog,
  Drawer,
  Field,
  FilterSelect,
  KpiCard,
  NoteBanner,
  SectionCard,
  SegmentedControl,
  StatusBadge,
  Toggle,
  fmtInt,
  fmtMoney,
} from "@/components/platform/ai-ops/primitives";

const EFFORT_OPTIONS: { value: ReasoningEffort; label: string }[] = [
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const cloneRoutes = (): FeatureRoute[] => DEFAULT_ROUTES.map((route) => ({ ...route, fallbacks: [...route.fallbacks] }));

const estimatePer1k = (modelId: string): number | null => {
  if (modelId === "auto") return null;
  const model = MODELS.find((item) => item.id === modelId);
  if (!model) return null;
  return ((1200 * model.inputPricePerM + 500 * model.outputPricePerM) / 1_000_000) * 1000;
};

function ChainChips({
  route,
  compact = false,
}: {
  route: Pick<FeatureRoute, "primary" | "fallbacks" | "retryLimit">;
  compact?: boolean;
}) {
  const chip = compact
    ? "rounded-[9px] border-2 px-2 py-0.5 text-[11.5px] font-bold"
    : "rounded-[10px] border-2 px-2.5 py-1 text-[12px] font-bold";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`${chip} border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]`}>
        {modelName(route.primary)}
      </span>
      {route.retryLimit > 0 ? (
        <span className={`${chip} border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]`}>
          retry ×{route.retryLimit}
        </span>
      ) : null}
      {route.fallbacks.map((fallback, index) => (
        <React.Fragment key={fallback}>
          <ArrowRight size={13} className="text-[var(--qs-muted)]" aria-hidden="true" />
          <span className={`${chip} border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)]`}>
            {modelName(fallback)}
            <span className="ml-1 font-medium text-[var(--qs-muted)]">fallback {index + 1}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function AiOpsRoutingPage() {
  const [routes, setRoutes] = useState<FeatureRoute[]>(cloneRoutes);
  const [draft, setDraft] = useState<FeatureRoute | null>(null);
  const [resetTarget, setResetTarget] = useState<FeatureRoute | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dryRunFor, setDryRunFor] = useState<string | null>(null);

  const savedRoute = draft ? routes.find((route) => route.feature === draft.feature) ?? null : null;
  const dirty = draft !== null && savedRoute !== null && JSON.stringify(draft) !== JSON.stringify(savedRoute);

  const activeRoutes = routes.filter((route) => route.enabled).length;
  const reasoningRoutes = routes.filter((route) => ["medium", "high"].includes(route.reasoningEffort)).length;

  const updateDraft = <K extends keyof FeatureRoute>(key: K, value: FeatureRoute[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDryRunFor(null);
  };

  const addFallback = (modelId: string) => {
    if (!draft || modelId === "none") return;
    if (modelId === draft.primary || draft.fallbacks.includes(modelId)) {
      setFormError("That model is already used in this chain.");
      return;
    }
    setFormError(null);
    updateDraft("fallbacks", [...draft.fallbacks, modelId]);
  };

  const removeFallback = (modelId: string) => {
    if (!draft) return;
    updateDraft(
      "fallbacks",
      draft.fallbacks.filter((item) => item !== modelId),
    );
  };

  const saveDraft = () => {
    if (!draft) return;
    if (draft.enabled && !draft.primary) {
      setFormError("Pick a primary model before enabling this route.");
      return;
    }
    if (draft.maxOutputTokens < 100 || draft.timeoutMs < 3000) {
      setFormError("Max output tokens must be ≥ 100 and timeout ≥ 3,000 ms.");
      return;
    }
    setRoutes((prev) => prev.map((route) => (route.feature === draft.feature ? { ...draft, fallbacks: [...draft.fallbacks] } : route)));
    setDraft(null);
    toast.success("Routing updated", {
      description: `${featureLabel(draft.feature)} route saved for this demo session. Backend integration required to apply it in production.`,
    });
  };

  const discardDraft = () => {
    if (!savedRoute) return;
    setDraft({ ...savedRoute, fallbacks: [...savedRoute.fallbacks] });
    setFormError(null);
    setDryRunFor(null);
  };

  const resetToDefault = (feature: string) => {
    const recommended = DEFAULT_ROUTES.find((route) => route.feature === feature);
    if (!recommended) return;
    setRoutes((prev) => prev.map((route) => (route.feature === feature ? { ...recommended, fallbacks: [...recommended.fallbacks] } : route)));
    setDraft((prev) => (prev && prev.feature === feature ? { ...recommended, fallbacks: [...recommended.fallbacks] } : prev));
    toast.info("Route reset to recommended defaults", {
      description: `${featureLabel(feature)} now matches the shipped default configuration (demo only).`,
    });
  };

  const runDryRun = () => {
    if (!draft) return;
    const latency = 900 + (draft.retryLimit * 140 + draft.maxOutputTokens) % 900;
    setDryRunFor(draft.feature);
    toast.info("Dry run complete (simulated)", {
      description: `Primary ${modelName(draft.primary)} responded in ${latency} ms. No provider request was made.`,
    });
  };

  const fallbackOptions = [
    { value: "none", label: "Add fallback…" },
    ...MODELS.filter(
      (model) => draft && model.id !== draft.primary && !draft.fallbacks.includes(model.id) && model.status !== "disabled",
    ).map((model) => ({ value: model.id, label: `${model.name} · ${model.provider}` })),
  ];

  const primaryOptions = MODELS.filter((model) => model.status !== "disabled" && model.status !== "deprecated").map(
    (model) => ({ value: model.id, label: `${model.name} · ${model.provider}` }),
  );

  return (
    <div className="space-y-6">
      <AiOpsPageHeader
        eyebrow="Routing"
        title="Model routing & fallbacks"
        description="Decide which model serves each AI feature, how many retries run before a fallback, and what each chain costs. Changes here are demo-only until the routing API is wired."
        actions={
          <span className="b sm b-ghost" aria-hidden="true">
            <GitBranch size={13} />
            {activeRoutes} of {routes.length} routes enabled
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Enabled routes" value={`${activeRoutes} / ${routes.length}`} hint="features with active routing" icon={GitBranch} />
        <KpiCard label="Reasoning routes" value={fmtInt(reasoningRoutes)} hint="medium or high effort" icon={Zap} />
        <KpiCard
          label="Retry budget"
          value={fmtInt(routes.reduce((sum, route) => sum + route.retryLimit, 0))}
          hint="extra attempts allowed in total"
        />
        <KpiCard
          label="Avg timeout"
          value={`${Math.round(routes.reduce((sum, route) => sum + route.timeoutMs, 0) / routes.length / 1000)} s`}
          hint="per attempt, across routes"
        />
      </div>

      <NoteBanner tone="warn">
        Fallbacks only trigger on timeout, rate limit or provider errors — never on a slow-but-successful response. Keep
        at least one fallback on revenue-critical features such as paper generation.
      </NoteBanner>

      <div className="grid gap-5 lg:grid-cols-2">
        {routes.map((route) => {
          const cost = estimatePer1k(route.primary);
          return (
            <SectionCard
              key={route.feature}
              tone={route.enabled ? "ink" : "line"}
              className={route.enabled ? "" : "opacity-75"}
              title={
                <span className="flex items-center gap-2">
                  {featureLabel(route.feature)}
                  <StatusBadge tone={route.enabled ? "ok" : "neutral"} dot>
                    {route.enabled ? "enabled" : "disabled"}
                  </StatusBadge>
                </span>
              }
              subtitle={
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>effort {route.reasoningEffort}</span>
                  <span>max {fmtInt(route.maxOutputTokens)} tokens</span>
                  <span>timeout {route.timeoutMs / 1000}s</span>
                  <span>retries {route.retryLimit}</span>
                </span>
              }
              actions={
                <button type="button" className="b sm" onClick={() => setDraft({ ...route, fallbacks: [...route.fallbacks] })}>
                  Configure
                </button>
              }
            >
              <ChainChips route={route} />
              <p className="mt-3 text-[12.5px] text-[var(--qs-muted)]">
                Estimated primary cost:{" "}
                <strong className="font-extrabold text-[var(--qs-ink)]">
                  {cost === null ? "n/a" : `${fmtMoney(cost)} / 1k calls`}
                </strong>{" "}
                at sample 1.2k in / 0.5k out tokens per call.
              </p>
            </SectionCard>
          );
        })}
      </div>

      <Drawer
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft ? featureLabel(draft.feature) : "Route"}
        subtitle="Primary → retry → fallback chain"
        footer={
          draft ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="b sm b-ghost" onClick={() => setResetTarget(draft)}>
                <RotateCcw size={13} />
                Reset to defaults
              </button>
              <div className="flex items-center gap-2">
                <button type="button" className="b sm" onClick={discardDraft} disabled={!dirty}>
                  Discard
                </button>
                <button type="button" className="b b-pri sm" onClick={saveDraft} disabled={!dirty}>
                  Save changes
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {draft ? (
          <div className="space-y-5">
            {dirty ? (
              <NoteBanner tone="warn">Unsaved changes — save to apply them to this demo session.</NoteBanner>
            ) : null}

            <div className="flex items-center justify-between gap-3 rounded-[14px] border-2 border-[var(--qs-line)] px-3.5 py-3">
              <div>
                <p className="text-[13.5px] font-extrabold text-[var(--qs-ink)]">Route enabled</p>
                <p className="text-[12px] text-[var(--qs-muted)]">Disabled routes reject new requests immediately.</p>
              </div>
              <Toggle
                checked={draft.enabled}
                onChange={(next) => updateDraft("enabled", next)}
                label={`Enable routing for ${featureLabel(draft.feature)}`}
              />
            </div>

            <Field label="Primary model" htmlFor="route-primary" hint="Serves the request unless it times out or errors.">
              <FilterSelect
                id="route-primary"
                label="Primary model"
                value={draft.primary}
                onChange={(value) => {
                  const nextFallbacks = draft.fallbacks.filter((item) => item !== value);
                  setDraft({ ...draft, primary: value, fallbacks: nextFallbacks });
                  setDryRunFor(null);
                }}
                options={primaryOptions}
              />
            </Field>

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">
                Fallback chain (tried in order)
              </p>
              <div className="mt-2 space-y-2">
                {draft.fallbacks.length === 0 ? (
                  <p className="rounded-[12px] border-2 border-dashed border-[var(--qs-line)] px-3 py-2.5 text-[12.5px] text-[var(--qs-muted)]">
                    No fallbacks configured. A provider failure will fail the request.
                  </p>
                ) : (
                  draft.fallbacks.map((fallback, index) => (
                    <div
                      key={fallback}
                      className="flex items-center justify-between gap-3 rounded-[12px] border-2 border-[var(--qs-line)] px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-[13px] font-bold text-[var(--qs-ink)]">
                        <StatusBadge tone="neutral">fallback {index + 1}</StatusBadge>
                        {modelName(fallback)}
                      </span>
                      <button
                        type="button"
                        className="b b-icon sm b-ghost"
                        onClick={() => removeFallback(fallback)}
                        aria-label={`Remove fallback ${modelName(fallback)}`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <FilterSelect
                  label="Add fallback model"
                  value="none"
                  onChange={addFallback}
                  options={fallbackOptions}
                  className="flex-1"
                />
                <span className="b b-icon sm b-ghost" aria-hidden="true">
                  <Plus size={13} />
                </span>
              </div>
            </div>

            <Field label="Reasoning effort" hint="Higher effort increases cost and latency for reasoning-capable models.">
              <SegmentedControl
                ariaLabel="Reasoning effort"
                value={draft.reasoningEffort}
                onChange={(value) => updateDraft("reasoningEffort", value)}
                options={EFFORT_OPTIONS}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Max output tokens" htmlFor="route-max-tokens">
                <input
                  id="route-max-tokens"
                  type="number"
                  min={100}
                  step={100}
                  className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                  value={draft.maxOutputTokens}
                  onChange={(event) => updateDraft("maxOutputTokens", Number(event.target.value))}
                />
              </Field>
              <Field label="Timeout (ms)" htmlFor="route-timeout">
                <input
                  id="route-timeout"
                  type="number"
                  min={3000}
                  step={1000}
                  className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                  value={draft.timeoutMs}
                  onChange={(event) => updateDraft("timeoutMs", Number(event.target.value))}
                />
              </Field>
              <Field label="Retry limit" htmlFor="route-retries">
                <input
                  id="route-retries"
                  type="number"
                  min={0}
                  max={3}
                  className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                  value={draft.retryLimit}
                  onChange={(event) => updateDraft("retryLimit", Math.max(0, Math.min(3, Number(event.target.value))))}
                />
              </Field>
            </div>

            <div className="rounded-[14px] border-2 border-[var(--qs-line)] px-3.5 py-3">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                Preview cost
              </p>
              <p className="mt-1 text-[13.5px] text-[var(--qs-ink)]">
                Primary {modelName(draft.primary)} ≈{" "}
                <strong className="font-extrabold">
                  {estimatePer1k(draft.primary) === null ? "n/a" : `${fmtMoney(estimatePer1k(draft.primary) ?? 0)} / 1k calls`}
                </strong>
              </p>
              {draft.fallbacks[0] ? (
                <p className="mt-0.5 text-[12.5px] text-[var(--qs-muted)]">
                  If fallback 1 activates: {modelName(draft.fallbacks[0])} ≈{" "}
                  {estimatePer1k(draft.fallbacks[0]) === null ? "n/a" : `${fmtMoney(estimatePer1k(draft.fallbacks[0]) ?? 0)} / 1k calls`}
                </p>
              ) : null}
            </div>

            {dryRunFor === draft.feature ? (
              <div className="rounded-[14px] border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] px-3.5 py-3">
                <p className="text-[13px] font-extrabold text-[var(--qs-ok)]">Dry run passed (simulated)</p>
                <ul className="mt-1.5 space-y-1 text-[12.5px] text-[var(--qs-ink)]">
                  <li>
                    Primary {modelName(draft.primary)} — ok, {900 + (draft.retryLimit * 140 + draft.maxOutputTokens) % 900} ms
                  </li>
                  {draft.fallbacks.map((fallback, index) => (
                    <li key={fallback} className="text-[var(--qs-muted)]">
                      Fallback {index + 1} {modelName(fallback)} — standby, not used
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button type="button" className="b b-ai" onClick={runDryRun}>
              Test routing (dry run)
            </button>

            {formError ? (
              <p className="rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3 py-2 text-[12.5px] font-bold text-[var(--qs-bad)]" role="alert">
                {formError}
              </p>
            ) : null}

            <p className="text-[12px] leading-relaxed text-[var(--qs-muted)]">
              Saving updates this demo session only. In production, routing changes should be validated (models exist,
              fallbacks differ from primary) and applied through the AI operations API.
            </p>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        onConfirm={() => {
          if (resetTarget) resetToDefault(resetTarget.feature);
          setResetTarget(null);
        }}
        title="Reset route to defaults?"
        description={
          resetTarget
            ? `“${featureLabel(resetTarget.feature)}” will be restored to the recommended primary model, fallbacks and limits.`
            : ""
        }
        confirmLabel="Reset route"
        tone="danger"
      />
    </div>
  );
}
