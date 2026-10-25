"use client";

import type { ComponentType, ReactNode } from "react";
import { Construction } from "lucide-react";
import { cn } from "@/lib/helpers";

interface SettingsPanelProps {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: ReactNode;
  danger?: boolean;
  children: ReactNode;
  className?: string;
}

export default function SettingsPanel({
  title,
  description,
  icon: Icon,
  badge,
  danger = false,
  children,
  className,
}: SettingsPanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[22px] border-2 bg-[var(--qs-surface)] shadow-[4px_4px_0_var(--qs-sun)]",
        danger ? "border-[var(--qs-bad)]" : "border-[var(--qs-line)]",
        className
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[var(--qs-line)] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] shadow-[2px_2px_0_var(--qs-sun)]",
                danger
                  ? "bg-[var(--qs-badbg)] text-[var(--qs-bad)]"
                  : "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold tracking-tight text-[var(--qs-ink)]">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--qs-muted)]">{description}</p>
            ) : null}
          </div>
        </div>
        {badge}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function SettingsComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]",
        className
      )}
    >
      Coming soon
    </span>
  );
}

export function SettingsComingSoonBody({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-8 text-center sm:py-10">
      <span className="grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240] shadow-[3px_3px_0_var(--qs-ink)]">
        <Construction className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <p className="mt-3 text-sm font-extrabold text-[var(--qs-ink)]">Coming soon</p>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--qs-muted)]">{message}</p>
    </div>
  );
}

export function SettingsTextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  error,
  maxLength,
  autoComplete,
  disabled,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  maxLength?: number;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
        {label}
        {required ? <span className="ml-0.5 text-[var(--qs-bad)]">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-1.5 h-11 w-full rounded-[12px] border-2 bg-[var(--qs-field)] px-3.5 text-sm font-semibold text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)]/60 focus:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-60",
          error ? "border-[var(--qs-bad)]" : "border-[var(--qs-line)]"
        )}
      />
      {error ? (
        <span className="mt-1 block text-[10px] font-semibold text-[var(--qs-bad)]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[10px] leading-relaxed text-[var(--qs-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

