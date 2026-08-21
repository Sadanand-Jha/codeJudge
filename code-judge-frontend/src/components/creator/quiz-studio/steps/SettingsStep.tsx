"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { SwitchField } from "../primitives";

const GROUPS: Array<{ id: string; label: string; fields: SettingField[]; comingSoon?: boolean }> = [
  {
    id: "general",
    label: "General",
    fields: [
      { key: "negativeMarking", label: "Enable negative marking" },
    ],
  },
  {
    id: "behavior",
    label: "Question Behavior",
    fields: [
      { key: "randomizeQuestions", label: "Randomize question order" },
      { key: "randomizeOptions", label: "Randomize option order" },
    ],
  },
  {
    id: "result",
    label: "Result & Visibility",
    fields: [
      { key: "showResultsImmediately", label: "Show results immediately" },
    ],
  },
  {
    id: "security",
    label: "Security",
    comingSoon: true,
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
}

export function SettingsStep() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <h2 className="text-lg font-semibold text-text-primary">Quiz Settings</h2>
      {GROUPS.map((g) => (
        <SettingGroup
          key={g.id}
          id={g.id}
          label={g.label}
          fields={g.fields}
          comingSoon={g.comingSoon}
        />
      ))}
    </div>
  );
}

function SettingGroup({
  id,
  label,
  fields,
  comingSoon,
}: {
  id: string;
  label: string;
  fields: SettingField[];
  comingSoon?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", comingSoon && "opacity-60")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {label}
          </span>
          {comingSoon && (
            <span className="rounded-full border border-border bg-card-hover px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Coming soon
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-text-secondary transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-3 space-y-1">
          {fields.map((f) =>
            comingSoon ? (
              <div key={f.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-text-muted">{f.label}</span>
                <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border bg-border opacity-60">
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
        <span className="text-sm text-text-primary">{field.label}</span>
        <select
          value={String(value)}
          onChange={(e) => updateSettings({ [field.key]: e.target.value })}
          className="rounded-lg border border-input-border bg-input-bg px-2.5 py-1 text-xs text-text-primary outline-none"
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
        <span className="text-sm text-text-primary">{field.label}</span>
        <input
          type="number"
          min={0}
          value={Number(value) || ""}
          onChange={(e) => updateSettings({ [field.key]: Number(e.target.value) })}
          className="h-8 w-20 rounded-lg border border-input-border bg-input-bg px-2 text-xs text-text-primary outline-none"
        />
      </div>
    );
  }

  return (
    <SwitchField
      label={field.label}
      checked={!!value}
      onChange={(v) => updateSettings({ [field.key]: v })}
    />
  );
}
