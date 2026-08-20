"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { SwitchField } from "../primitives";

const GROUPS: Array<{ id: string; label: string; fields: SettingField[] }> = [
  {
    id: "general",
    label: "General",
    fields: [
      { key: "attemptLimit", label: "Attempt limit", type: "number" },
      { key: "negativeMarking", label: "Enable negative marking" },
    ],
  },
  {
    id: "behavior",
    label: "Question Behavior",
    fields: [
      { key: "randomizeQuestions", label: "Randomize question order" },
      { key: "randomizeOptions", label: "Randomize option order" },
      { key: "oneQuestionPerScreen", label: "One question per screen" },
      { key: "allowQuestionNavigation", label: "Allow question navigation" },
      { key: "allowBackNavigation", label: "Allow back navigation" },
      { key: "showProgress", label: "Show progress indicator" },
      { key: "showQuestionNumbers", label: "Show question numbers" },
    ],
  },
  {
    id: "scoring",
    label: "Scoring",
    fields: [
      { key: "partialMarking", label: "Partial marking" },
      { key: "negativeMarking", label: "Negative marking on wrong answer" },
    ],
  },
  {
    id: "result",
    label: "Result & Visibility",
    fields: [
      { key: "showScore", label: "Show score" },
      { key: "showPercentage", label: "Show percentage" },
      { key: "showCorrectAnswers", label: "Show correct answers" },
      { key: "showExplanations", label: "Show explanations" },
      { key: "resultMode", label: "Result timing", type: "select", options: ["immediate", "after_end", "manual"] },
    ],
  },
  {
    id: "security",
    label: "Security",
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
      <h2 className="text-lg font-extrabold text-text-primary">Quiz Settings</h2>
      {GROUPS.map((g) => (
        <SettingGroup key={g.id} id={g.id} label={g.label} fields={g.fields} />
      ))}
    </div>
  );
}

function SettingGroup({
  id,
  label,
  fields,
}: {
  id: string;
  label: string;
  fields: SettingField[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
          {label}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-text-secondary transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-3 space-y-1">
          {fields.map((f) => (
            <Field key={f.key} field={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ field }: { field: SettingField }) {
  const { state, updateSettings } = useStudio();
  const value = (state.settings as Record<string, unknown>)[field.key];

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
