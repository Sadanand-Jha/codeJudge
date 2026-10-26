"use client";

import { RotateCcw } from "lucide-react";
import type { PlatformVersion } from "@/services/platform";

export const INPUT =
  "w-full rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-[13px] font-semibold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]";
export const LABEL =
  "mb-1 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]";
export const BTN =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-[12px] font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50";
export const BTN_PRI =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 py-2 text-[12px] font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 disabled:opacity-50";
export const BTN_DANGER =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-[12px] font-extrabold text-red-600 transition-colors hover:border-red-400 disabled:opacity-50";

export function Field({
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

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] font-bold text-[var(--qs-ink)]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--qs-brand)]"
      />
      {label}
    </label>
  );
}

export function DraftBadge({ hasDraft }: { hasDraft: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] ${
        hasDraft
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)]"
      }`}
    >
      {hasDraft ? "Draft" : "Live"}
    </span>
  );
}

export function VersionHistory({
  versions,
  loading,
  onRestore,
  busy,
}: {
  versions: PlatformVersion[];
  loading: boolean;
  onRestore: (versionId: number) => void;
  busy: boolean;
}) {
  if (loading) {
    return <p className="text-[12px] text-[var(--qs-muted)]">Loading version history…</p>;
  }
  if (versions.length === 0) {
    return <p className="text-[12px] text-[var(--qs-muted)]">No versions yet.</p>;
  }
  return (
    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
      {versions.map((version) => (
        <div
          key={version.id}
          className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-[11px] font-extrabold text-[var(--qs-ink)]">
              {version.action}
            </p>
            <p className="text-[10px] text-[var(--qs-muted)]">
              {new Date(version.created_at).toLocaleString("en-IN")}
            </p>
          </div>
          <button
            type="button"
            className={BTN}
            disabled={busy}
            onClick={() => onRestore(version.id)}
          >
            <RotateCcw size={12} />
            Restore
          </button>
        </div>
      ))}
    </div>
  );
}
