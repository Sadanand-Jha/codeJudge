"use client";

import { useEffect } from "react";
import { FileImage, Loader2, X } from "lucide-react";
import { HeaderAdjustControls } from "./HeaderAdjustControls";
import { HeaderA4Preview } from "./HeaderA4Preview";
import { LETTERHEAD_MIN_RECOMMENDED_WIDTH } from "@/config/letterheads";
import type { HeaderConfig } from "@/types/letterhead";

interface AdjustHeaderDialogProps {
  title: string;
  description?: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  config: HeaderConfig;
  onChange: (config: HeaderConfig) => void;
  name?: string;
  onNameChange?: (name: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
}

export function AdjustHeaderDialog({
  title,
  description,
  imageUrl,
  imageWidth,
  imageHeight,
  config,
  onChange,
  name,
  onNameChange,
  onClose,
  onSave,
  saving = false,
  saveLabel = "Save header",
}: AdjustHeaderDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-3 py-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-header-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
              <FileImage className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="adjust-header-title" className="text-lg font-extrabold tracking-tight text-[var(--qs-ink)]">
                {title}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
                {description ?? "Adjust how the header sits on the first A4 page."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="b b-icon sm"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.85fr)]">
            <div className="space-y-4">
              {onNameChange && (
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                    Header name
                  </span>
                  <input
                    type="text"
                    value={name ?? ""}
                    maxLength={60}
                    disabled={saving}
                    onChange={(event) => onNameChange(event.target.value)}
                    className="h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-semibold text-[var(--qs-ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:opacity-60"
                    placeholder="e.g. ABC College letterhead"
                  />
                  <span className="mt-1 block text-right text-[10px] font-semibold text-[var(--qs-muted)]">
                    {(name ?? "").length}/60
                  </span>
                </label>
              )}
              <HeaderAdjustControls config={config} onChange={onChange} disabled={saving} />
              {imageWidth < LETTERHEAD_MIN_RECOMMENDED_WIDTH && (
                <p className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-sun)] px-3 py-2 text-[11px] font-bold text-[#1a1240]">
                  Low resolution warning: this image is {imageWidth}px wide. Use at least{" "}
                  {LETTERHEAD_MIN_RECOMMENDED_WIDTH}px for crisp printing.
                </p>
              )}
            </div>
            <div className="min-w-0">
              <HeaderA4Preview
                imageUrl={imageUrl}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                config={config}
              />
              <p className="mt-2 text-center text-[10px] font-semibold text-[var(--qs-muted)]">
                A4 · 210 × 297 mm · page 1
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="b sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || (onNameChange ? !name?.trim() : false)}
            className="b b-pri sm gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
