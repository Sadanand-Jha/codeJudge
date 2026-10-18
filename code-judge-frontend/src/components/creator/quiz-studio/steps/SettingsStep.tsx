"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ClipboardList, Eye, ShieldCheck, Shuffle, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { StudioStepHeader, StudioStepLayout, SwitchField } from "../primitives";
import { TimingSection } from "../components/timing";

const GROUPS: Array<{ id: string; label: string; icon: LucideIcon; fields: SettingField[]; comingSoon?: boolean; alwaysOn?: boolean }> = [
  {
    id: "general",
    label: "General",
    icon: SlidersHorizontal,
    fields: [
      { key: "negativeMarking", label: "Enable negative marking", description: "Deduct marks for wrong answers." },
    ],
  },
  {
    id: "behavior",
    label: "Question Behavior",
    icon: Shuffle,
    fields: [
      { key: "randomizeQuestions", label: "Randomize question order" },
      { key: "randomizeOptions", label: "Randomize option order" },
    ],
  },
  {
    id: "result",
    label: "Result & Visibility",
    icon: Eye,
    fields: [
      { key: "showResultsImmediately", label: "Show results", description: "Students can see the marks obtained in their attempt" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    alwaysOn: true,
    fields: [
      { key: "fullscreenMode", label: "Full-screen mode" },
      { key: "tabSwitchDetection", label: "Tab-switch detection" },
      { key: "copyProtection", label: "Disable copy / text selection" },
    ],
  },
];

interface SettingField {
  key: string;
  label: string;
  type?: "number" | "select";
  options?: string[];
  description?: string;
}

export function SettingsStep() {
  return (
    <StudioStepLayout width="wide">
      <StudioStepHeader title="Quiz Settings" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <TimingSection />

          {GROUPS.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
            >
              <SettingGroup
                key={g.id}
                id={g.id}
                label={g.label}
                icon={g.icon}
                fields={g.fields}
                comingSoon={g.comingSoon}
                alwaysOn={g.alwaysOn}
              />
            </motion.div>
          ))}
        </div>

        <SummaryAside />
      </div>
    </StudioStepLayout>
  );
}

function SummaryAside() {
  const { state } = useStudio();
  const lifecycle = state.info.quizLifecycle;
  const status =
    lifecycle === "live"
      ? { label: "Live", pill: "border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] text-[var(--qs-ok)]", live: true }
      : lifecycle === "scheduled"
        ? { label: "Scheduled", pill: "border-[#a85d00]/40 bg-[#fff3d6] text-[#a85d00]", live: false }
        : lifecycle === "ended"
          ? { label: "Ended", pill: "border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] text-[var(--qs-bad)]", live: false }
          : { label: "Draft", pill: "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]", live: false };

  const startLabel =
    lifecycle === "scheduled" && state.info.startDate
      ? new Date(state.info.startDate).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })
      : "Manual";

  return (
    <aside className="min-w-0 lg:sticky lg:top-4">
      <div className="overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
        <div className="flex items-center justify-between border-b-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1a1240]">Summary</p>
          <ClipboardList className="h-4 w-4 text-[#1a1240]" />
        </div>
        <dl className="divide-y-2 divide-[var(--qs-line)] text-xs">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <dt className="font-bold text-[var(--qs-muted)]">Status</dt>
            <dd>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border-2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                  status.pill
                )}
              >
                {status.live && (
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none" />
                )}
                {status.label}
              </span>
            </dd>
          </div>
          <SummaryRow label="Start" value={startLabel} />
          <SummaryRow label="Attempt time" value={`${state.info.duration || 60} min`} />
          <SummaryRow label="Negative marking" value={state.settings.negativeMarking ? "On" : "Off"} />
        </dl>
      </div>
    </aside>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="font-bold text-[var(--qs-muted)]">{label}</dt>
      <dd className={cn("font-extrabold tabular-nums text-[var(--qs-ink)]", valueClassName)}>{value}</dd>
    </div>
  );
}

function SettingGroup({
  label,
  icon: Icon,
  fields,
  comingSoon,
  alwaysOn,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  fields: SettingField[];
  comingSoon?: boolean;
  alwaysOn?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4", comingSoon && "opacity-60")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 text-sm font-black text-[var(--qs-ink)]">
            {label}
          </span>
          {comingSoon && (
            <span className="shrink-0 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--qs-muted)]">
              Coming soon
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[var(--qs-muted)] transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-2 divide-y-2 divide-[var(--qs-line)]">
          {fields.map((f) =>
            alwaysOn ? (
              <div key={f.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium text-[var(--qs-ink)]">{f.label}</span>
                <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)]">
                  <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                </span>
              </div>
            ) : comingSoon ? (
              <div key={f.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium text-[var(--qs-muted)]">{f.label}</span>
                <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-line)] opacity-60">
                  <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                </span>
              </div>
            ) : (
              <Field key={f.key} field={f} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function Field({ field }: { field: SettingField }) {
  const { state, updateSettings } = useStudio();
  const value = (state.settings as unknown as Record<string, unknown>)[field.key];

  if (field.type === "select") {
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm font-medium text-[var(--qs-ink)]">{field.label}</span>
        <select
          value={String(value)}
          onChange={(e) => updateSettings({ [field.key]: e.target.value })}
          className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1 text-xs font-bold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
        >
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm font-medium text-[var(--qs-ink)]">{field.label}</span>
        <input
          type="number"
          min={0}
          value={Number(value) || ""}
          onChange={(e) => updateSettings({ [field.key]: Number(e.target.value) })}
          className="h-8 w-20 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 text-xs font-bold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
        />
      </div>
    );
  }

  return (
    <SwitchField
      label={field.label}
      description={field.description}
      checked={!!value}
      onChange={(v) => updateSettings({ [field.key]: v })}
    />
  );
}
