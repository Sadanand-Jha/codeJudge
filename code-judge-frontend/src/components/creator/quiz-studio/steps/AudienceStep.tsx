"use client";

import { Users, Mail, Upload, ClipboardList, Copy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { toast } from "@/lib/toast";

const MODE_OPTIONS: Array<{ id: "public" | "private" | "unlisted" | "classroom"; label: string; desc: string }> = [
  { id: "public", label: "Public", desc: "Anyone can discover and attempt the quiz." },
  { id: "private", label: "Private", desc: "Only people with the link can attempt." },
  { id: "unlisted", label: "Unlisted", desc: "Accessible only through a direct link." },
  { id: "classroom", label: "Classroom", desc: "Restricted to your class or organization." },
];

const SAMPLE_CSV = "Name,Roll Number,Email\nAnanya Sharma,001,ananya@example.com\nRohan Mehta,002,rohan@example.com\n";

export function AudienceStep() {
  const { state, updateAudience } = useStudio();
  const a = state.audience;

  const toggleAccessCode = () =>
    updateAudience({ accessCodeEnabled: !a.accessCodeEnabled });
  const regenerateCode = () =>
    updateAudience({ accessCode: Math.random().toString(36).slice(2, 8).toUpperCase() });
  const copyCode = () => {
    navigator.clipboard.writeText(a.accessCode);
    toast.success({ title: "Code copied", description: a.accessCode });
  };

  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateAudience({ csvPreview: String(reader.result) });
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h2 className="text-lg font-extrabold text-text-primary">Audience & Access</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Control who can register and attempt your quiz.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODE_OPTIONS.map((m) => (
          <label
            key={m.id}
            className={cn(
              "flex flex-col gap-1 rounded-2xl border p-4 text-left transition-all",
              a.mode === m.id
                ? "border-pink-500/40 bg-pink-500/5"
                : "border-border hover:border-border-hover"
            )}
          >
            <input
              type="radio"
              name="accessMode"
              className="sr-only"
              checked={a.mode === m.id}
              onChange={() => updateAudience({ mode: m.id })}
            />
            <span className="text-sm font-bold text-text-primary">{m.label}</span>
            <span className="text-xs text-text-secondary">{m.desc}</span>
          </label>
        ))}
      </div>

      {(a.mode === "classroom" || a.mode === "private" || a.mode === "unlisted") && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
            Access Code
          </h3>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm font-mono tracking-widest text-text-primary">
              {a.accessCode || "——"}
            </div>
            <button
              type="button"
              onClick={regenerateCode}
              className="rounded-lg border border-border p-1.5 text-text-secondary hover:text-text-primary"
              title="Regenerate code"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg border border-border p-1.5 text-text-secondary hover:text-text-primary"
              title="Copy code"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={a.accessCodeEnabled}
              onChange={toggleAccessCode}
              className="h-3.5 w-3.5 rounded accent-pink-500"
            />
            <span className="text-text-secondary">Require access code to start</span>
          </label>
        </div>
      )}

      {a.mode === "classroom" && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
              Invite Students
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toast.info({ title: "CSV format", description: "Download the sample CSV." })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
              >
                <ClipboardList className="h-3.5 w-3.5" /> Sample CSV
              </button>
              <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary">
                <Upload className="h-3.5 w-3.5" />
                <input type="file" accept=".csv,.xlsx" hidden onChange={handleCsv} />
                Upload CSV
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-text-secondary">Name</p>
              <input
                type="text"
                placeholder="Full name"
                className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2 text-sm text-text-primary"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-text-secondary">Roll number</p>
              <input
                type="text"
                placeholder="Roll / ID"
                className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2 text-sm text-text-primary"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-text-secondary">Email</p>
              <input
                type="email"
                placeholder="student@example.com"
                className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2 text-sm text-text-primary"
              />
            </div>
          </div>

          {a.csvPreview && (
            <div className="rounded-lg bg-input-bg p-3 text-[10px] font-mono text-text-secondary">
              {a.csvPreview}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
