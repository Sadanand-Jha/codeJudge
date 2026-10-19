"use client";

import React, { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  SETTINGS_DEFAULTS,
  TIER_LABELS,
  type AiOpsSettings,
  type AiTier,
} from "@/components/platform/ai-ops/mock-data";
import {
  AiOpsPageHeader,
  ConfirmDialog,
  Field,
  FilterSelect,
  NoteBanner,
  SectionCard,
  SegmentedControl,
  Toggle,
  inputClass,
} from "@/components/platform/ai-ops/primitives";

const cloneSettings = (settings: AiOpsSettings): AiOpsSettings => ({ ...settings });

const tierOptions = (Object.keys(TIER_LABELS) as AiTier[]).map((tier) => ({
  value: tier,
  label: TIER_LABELS[tier],
}));

const retentionOptions = ["30", "60", "90", "180", "365"].map((days) => ({
  value: days,
  label: `${days} days`,
}));

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border-2 border-[var(--qs-line)] px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-extrabold text-[var(--qs-ink)]">{label}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--qs-muted)]">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function PercentField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          type="number"
          min={0}
          max={100}
          step={1}
          className={`${inputClass} pr-9`}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[var(--qs-muted)]"
          aria-hidden="true"
        >
          %
        </span>
      </div>
    </Field>
  );
}

export default function AiOpsSettingsPage() {
  const [draft, setDraft] = useState<AiOpsSettings>(() => cloneSettings(SETTINGS_DEFAULTS));
  const [baseline, setBaseline] = useState<AiOpsSettings>(() => cloneSettings(SETTINGS_DEFAULTS));
  const [resetOpen, setResetOpen] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  const update = <K extends keyof AiOpsSettings,>(key: K, value: AiOpsSettings[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  const discard = () => {
    setDraft(cloneSettings(baseline));
  };

  const save = () => {
    setBaseline(cloneSettings(draft));
    toast.success("Settings saved (demo)", {
      description: "Backend integration required to persist AI operations settings.",
    });
  };

  const resetToDefaults = () => {
    setDraft(cloneSettings(SETTINGS_DEFAULTS));
    toast.info("Settings reset to defaults (demo)", {
      description: "Nothing is persisted until the AI operations API is integrated.",
    });
  };

  return (
    <div className="space-y-6">
      <AiOpsPageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Defaults, retention, alert thresholds and export preferences for the AI operations console. Changes are a local preview until the backend API is connected."
        actions={
          <button type="button" className="b sm" onClick={() => setResetOpen(true)}>
            <RotateCcw size={13} />
            Reset to defaults
          </button>
        }
      />

      <NoteBanner tone="info">
        Enforcement of these settings happens server-side once the AI operations API is integrated. Saving here
        only updates this demo session.
      </NoteBanner>

      <SectionCard title="Model defaults" subtitle="Applied to new feature routes unless a route overrides them.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Default tier" htmlFor="settings-default-tier">
              <FilterSelect
                id="settings-default-tier"
                label="Default tier"
                value={draft.defaultTier}
                onChange={(value) => update("defaultTier", value as AiTier)}
                options={tierOptions}
              />
            </Field>
            <Field label="Default max output tokens" htmlFor="settings-max-output">
              <input
                id="settings-max-output"
                type="number"
                min={1}
                step={100}
                className={inputClass}
                value={draft.defaultMaxOutputTokens}
                onChange={(event) => update("defaultMaxOutputTokens", Number(event.target.value))}
              />
            </Field>
            <Field label="Default timeout (ms)" htmlFor="settings-timeout">
              <input
                id="settings-timeout"
                type="number"
                min={1000}
                step={1000}
                className={inputClass}
                value={draft.defaultTimeoutMs}
                onChange={(event) => update("defaultTimeoutMs", Number(event.target.value))}
              />
            </Field>
          </div>
          <div className="space-y-2">
            <ToggleRow
              label="Automatic fallback"
              description="Use the configured fallback models when the primary model fails or times out."
              checked={draft.autoFallback}
              onChange={(next) => update("autoFallback", next)}
            />
            <ToggleRow
              label="Prefer cheapest model"
              description="Bias automatic routing toward the lowest sample price that meets the request tier."
              checked={draft.preferCheapestModel}
              onChange={(next) => update("preferCheapestModel", next)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Usage & log retention" subtitle="How long sample usage records and request logs are kept.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Usage retention" htmlFor="settings-usage-retention">
              <FilterSelect
                id="settings-usage-retention"
                label="Usage retention"
                value={draft.usageRetentionDays}
                onChange={(value) => update("usageRetentionDays", value)}
                options={retentionOptions}
              />
            </Field>
            <Field label="Log retention" htmlFor="settings-log-retention">
              <FilterSelect
                id="settings-log-retention"
                label="Log retention"
                value={draft.logRetentionDays}
                onChange={(value) => update("logRetentionDays", value)}
                options={retentionOptions}
              />
            </Field>
          </div>
          <div className="space-y-2">
            <ToggleRow
              label="Show token estimates"
              description="Display estimated token counts before a request is submitted."
              checked={draft.showTokenEstimates}
              onChange={(next) => update("showTokenEstimates", next)}
            />
            <ToggleRow
              label="Compact numbers"
              description="Use compact formatting for large token and request counts across the console."
              checked={draft.compactNumbers}
              onChange={(next) => update("compactNumbers", next)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Alert thresholds" subtitle="Percentage moves that trigger a sample operations alert.">
        <div className="grid gap-3 sm:grid-cols-3">
          <PercentField
            id="settings-alert-cost"
            label="Cost spike"
            value={draft.alertCostSpikePct}
            onChange={(next) => update("alertCostSpikePct", next)}
          />
          <PercentField
            id="settings-alert-fallback"
            label="Fallback rate"
            value={draft.alertFallbackRatePct}
            onChange={(next) => update("alertFallbackRatePct", next)}
          />
          <PercentField
            id="settings-alert-error"
            label="Error rate"
            value={draft.alertErrorRatePct}
            onChange={(next) => update("alertErrorRatePct", next)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Data & export" subtitle="Controls for exporting sample usage and log data.">
        <div className="space-y-4">
          <ToggleRow
            label="Enable exports"
            description="Allow owners to download usage and request log data from this console."
            checked={draft.exportEnabled}
            onChange={(next) => update("exportEnabled", next)}
          />
          <div className="space-y-1.5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">
              Export format
            </p>
            <SegmentedControl
              ariaLabel="Export format"
              value={draft.exportFormat}
              onChange={(value) => update("exportFormat", value)}
              options={[
                { value: "csv", label: "CSV" },
                { value: "json", label: "JSON" },
              ]}
            />
          </div>
          <ToggleRow
            label="Include prompts in exports"
            description="Add prompt text to exported request logs for deeper review."
            checked={draft.exportIncludePrompts}
            onChange={(next) => update("exportIncludePrompts", next)}
          />
          {draft.exportIncludePrompts ? (
            <p
              className="rounded-[12px] border-2 border-[var(--qs-warn)] bg-[var(--qs-bg)] px-3 py-2 text-[12.5px] font-medium leading-relaxed text-[var(--qs-ink)]"
              role="alert"
            >
              Prompt export is sensitive and should require an explicit owner confirmation before it is enabled in
              production.
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Display" subtitle="Presentation preferences for this console.">
        <div className="space-y-1.5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">Currency</p>
          <SegmentedControl
            ariaLabel="Display currency"
            value={draft.currency}
            onChange={(value) => update("currency", value)}
            options={[
              { value: "INR", label: "INR" },
              { value: "USD", label: "USD" },
            ]}
          />
          <p className="text-[12.5px] text-[var(--qs-muted)]">
            Display-only in this console; stored prices are INR.
          </p>
        </div>
      </SectionCard>

      <div className="sticky bottom-0 z-20 -mx-4 border-t-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3 md:-mx-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13px] font-bold text-[var(--qs-ink)]">
            <span
              className={`h-2 w-2 rounded-full ${dirty ? "bg-[var(--qs-warn)]" : "bg-[var(--qs-ok)]"}`}
              aria-hidden="true"
            />
            {dirty ? "Unsaved changes" : "All changes saved"}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" className="b" onClick={discard} disabled={!dirty}>
              Discard
            </button>
            <button type="button" className="b b-pri" onClick={save} disabled={!dirty}>
              <Save size={13} />
              Save
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetToDefaults}
        title="Reset settings to defaults?"
        description="All settings will return to their default values in this demo session. Nothing is persisted until the AI operations API is integrated."
        confirmLabel="Reset defaults"
      />
    </div>
  );
}
