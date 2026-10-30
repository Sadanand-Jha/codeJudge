"use client";

import { AlignCenter, AlignLeft, AlignRight, RotateCcw } from "lucide-react";
import { HEADER_LIMITS } from "@/config/letterheads";
import type { HeaderConfig } from "@/types/letterhead";

interface HeaderAdjustControlsProps {
  config: HeaderConfig;
  onChange: (config: HeaderConfig) => void;
  disabled?: boolean;
  compact?: boolean;
}

function RangeField({
  label,
  value,
  suffix,
  min,
  max,
  step = 1,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  suffix: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-muted)]">
        {label}
        <span className="rounded-full bg-[var(--qs-bg)] px-1.5 py-0.5 text-[10px] font-extrabold normal-case tracking-normal text-[var(--qs-ink)]">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number(value)}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

export function HeaderAdjustControls({
  config,
  onChange,
  disabled = false,
  compact = false,
}: HeaderAdjustControlsProps) {
  const update = (patch: Partial<HeaderConfig>) => onChange({ ...config, ...patch });
  const alignOptions = [
    { value: "left" as const, label: "Left", Icon: AlignLeft },
    { value: "center" as const, label: "Centre", Icon: AlignCenter },
    { value: "right" as const, label: "Right", Icon: AlignRight },
  ];

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <RangeField
        label="Header height"
        value={String(Math.round(config.cropHeight * 100))}
        suffix="%"
        min={HEADER_LIMITS.cropHeight.min * 100}
        max={HEADER_LIMITS.cropHeight.max * 100}
        onChange={(value) => update({ cropHeight: value / 100 })}
        disabled={disabled}
      />
      <RangeField
        label="Width"
        value={String(Math.round(config.widthPct * 100))}
        suffix="%"
        min={HEADER_LIMITS.widthPct.min * 100}
        max={HEADER_LIMITS.widthPct.max * 100}
        onChange={(value) => update({ widthPct: value / 100 })}
        disabled={disabled}
      />
      <div className="grid grid-cols-2 gap-3">
        <RangeField
          label="Top"
          value={String(Math.round(config.offsetYmm))}
          suffix="mm"
          min={HEADER_LIMITS.offsetYmm.min}
          max={HEADER_LIMITS.offsetYmm.max}
          onChange={(value) => update({ offsetYmm: value })}
          disabled={disabled}
        />
        <RangeField
          label="Side nudge"
          value={String(Math.round(config.offsetXmm))}
          suffix="mm"
          min={HEADER_LIMITS.offsetXmm.min}
          max={HEADER_LIMITS.offsetXmm.max}
          onChange={(value) => update({ offsetXmm: value })}
          disabled={disabled}
        />
      </div>

      <div>
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-muted)]">
          Alignment
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {alignOptions.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => update({ align: value })}
              className={`inline-flex items-center justify-center gap-1 rounded-[9px] border-2 px-2 py-1.5 text-[11px] font-bold transition ${
                config.align === value
                  ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                  : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)]"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-[var(--qs-ink)]">
          <input
            type="checkbox"
            checked={config.repeatOnAllPages}
            disabled={disabled}
            onChange={(event) => update({ repeatOnAllPages: event.target.checked })}
            className="h-4 w-4 accent-[var(--qs-brand)]"
          />
          Repeat on every page
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...config, cropTop: 0, cropHeight: 0.18, widthPct: 1, offsetXmm: 0, offsetYmm: 15, align: "center", repeatOnAllPages: false })}
          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[var(--qs-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--qs-ink)] disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          Reset placement
        </button>
      </div>

      <p className="rounded-[9px] bg-[var(--qs-bg)] px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-[var(--qs-muted)]">
        The header is cropped from the top of page 1. The question content starts below it.
      </p>
    </div>
  );
}
