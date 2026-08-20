"use client";

import { useState } from "react";
import { Upload, Award, Eye } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { SwitchField } from "../primitives";

const PRESET_COLORS = [
  "#7C3AED",
  "#EC4899",
  "#3B82F6",
  "#14B8A6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
];

export function BrandingStep() {
  const { state, updateBranding } = useStudio();
  const b = state.branding;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h2 className="text-lg font-extrabold text-text-primary">Branding</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Customize how your quiz looks and feels. Colors are constrained to
          accessible, high-contrast presets so the learner experience stays
          readable.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase text-text-secondary">Logo</label>
          <ThumbUploader
            label="Logo"
            current={b.logoUrl}
            onChange={(url) => updateBranding({ logoUrl: url })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase text-text-secondary">Quiz Thumbnail</label>
          <ThumbUploader
            label="Thumbnail"
            current={b.logoUrl}
            onChange={(url) => updateBranding({ logoUrl: url })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase text-text-secondary">Accent color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => updateBranding({ accentColor: c })}
              className={cn(
                "h-8 w-8 rounded-lg border-2",
                b.accentColor === c
                  ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.4)]"
                  : "border-border"
              )}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
        <input
          type="text"
          value={b.accentColor}
          onChange={(e) => updateBranding({ accentColor: e.target.value })}
          className="h-8 w-28 rounded-lg border border-input-border bg-input-bg px-2 text-xs text-text-primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase text-text-secondary">Creator name</label>
          <input
            value={b.creatorName}
            onChange={(e) => updateBranding({ creatorName: e.target.value })}
            placeholder="Your display name"
            className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase text-text-secondary">Organization name</label>
          <input
            value={b.organizationName}
            onChange={(e) => updateBranding({ organizationName: e.target.value })}
            placeholder="Optional"
            className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary"
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-xs font-bold uppercase text-text-secondary">Footer text</label>
          <input
            value={b.footerText}
            onChange={(e) => updateBranding({ footerText: e.target.value })}
            placeholder="e.g. © 2026 Academy. All rights reserved."
            className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-pink-500" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
            Certificate
          </span>
        </div>
        <div className="space-y-3">
          <SwitchField
            label="Issue certificate on completion"
            checked={b.certificateEnabled}
            onChange={(v) => updateBranding({ certificateEnabled: v })}
          />
          {b.certificateEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-text-secondary">
                  Certificate title
                </label>
                <input
                  value={b.certificateTitle}
                  onChange={(e) => updateBranding({ certificateTitle: e.target.value })}
                  placeholder="Certificate of Completion"
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-text-secondary">
                  Issuer name
                </label>
                <input
                  value={b.certificateIssuer}
                  onChange={(e) => updateBranding({ certificateIssuer: e.target.value })}
                  placeholder="Principal / Director"
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-text-secondary">
                  Completion threshold (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={b.completionThreshold || ""}
                  onChange={(e) => updateBranding({ completionThreshold: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <LivePreview branding={b} info={state.info} questions={state.questions} />
    </div>
  );
}

function ThumbUploader({
  label,
  current,
  onChange,
}: {
  label: string;
  current: string;
  onChange: (url: string) => void;
}) {
  const [preview, setPreview] = useState(current);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(url);
  };
  return (
    <label className="relative flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/60 text-xs text-text-secondary transition-colors hover:border-pink-500/40">
      {preview ? (
        <img src={preview} alt={label} className="h-full w-full rounded-lg object-cover" />
      ) : (
        <>
          <Upload className="mb-1 h-5 w-5" />
          <span>Upload {label}</span>
        </>
      )}
      <input type="file" accept="image/*" hidden onChange={handle} />
    </label>
  );
}

function LivePreview({
  branding,
  info,
  questions,
}: {
  branding: StudioBrandingLocal;
  info: { title: string; shortDescription: string; duration: number };
  questions: { marks: number }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-secondary">
        <Eye className="h-4 w-4" /> Live preview
      </div>
      <div className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center gap-3">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="logo" className="h-8 w-8 rounded" />
          ) : (
            <div className="h-8 w-8 rounded bg-gradient-to-br from-pink-500 to-violet-600 text-white flex items-center justify-center text-xs font-bold">
              LO
            </div>
          )}
          <span className="text-xs font-bold text-text-primary">
            {branding.organizationName || branding.creatorName || "Your Name"}
          </span>
        </div>
        <h3 className="text-sm font-bold text-text-primary">{info.title || "Untitled Quiz"}</h3>
        <p className="mt-1 text-xs text-text-secondary line-clamp-2">
          {info.shortDescription || "Quiz description will appear here."}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-text-secondary">
          <span>{questions.length} questions</span>
          <span>{questions.reduce((s, q) => s + (q.marks || 0), 0)} marks</span>
          <span>{info.duration} min</span>
        </div>
        <div
          className="mt-3 h-1.5 w-32 rounded-full bg-border"
          style={{ backgroundColor: "rgba(124,58,237,0.2)" }}
        />
      </div>
    </div>
  );
}

type StudioBrandingLocal = {
  logoUrl: string;
  accentColor: string;
  creatorName: string;
  organizationName: string;
  certificateEnabled: boolean;
};
