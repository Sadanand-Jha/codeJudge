"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/helpers";
import type { ComponentProps } from "react";

type Icon = ComponentType<{ className?: string }>;

export function PrimaryButton({
  children,
  icon: Icon,
  active,
  ...props
}: ComponentProps<"button"> & { icon?: Icon; active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all",
        active
          ? "bg-gradient-to-r from-pink-500 to-violet-600 shadow-[0_8px_24px_rgba(236,72,153,0.35)] hover:brightness-105"
          : "bg-gradient-to-r from-pink-500 to-violet-600 hover:brightness-105 hover:shadow-[0_8px_24px_rgba(236,72,153,0.45)]"
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  icon: Icon,
  subtle,
  ...props
}: ComponentProps<"button"> & { icon?: Icon; subtle?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
        subtle
          ? "border-border bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
          : "border-border text-text-secondary hover:bg-white/[0.04] hover:text-text-primary dark:hover:bg-white/[0.06]"
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function StepButton({
  step,
  active,
  done,
  onClick,
}: {
  step: number;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all",
        active &&
          "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)]",
        done &&
          !active &&
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      )}
    >
      {done ? <span className="h-3 w-3" /> : <span className="h-3 w-3" />}
      <span className="hidden sm:inline">{'Step ' + step}</span>
    </button>
  );
}

export function Input({
  label,
  error,
  ...props
}: ComponentProps<"input"> & { label?: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-bold text-text-secondary">{label}</label>}
      <input
        type="text"
        {...props}
        className={cn(
          "h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted outline-none transition-colors file:mr-3 file:rounded-lg file:border-0 file:bg-pink-500 file:py-1 file:px-3 file:text-xs file:font-bold file:text-white",
          "focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
        )}
      />
      {error && <p className="text-[11px] font-semibold text-rose-500">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  rows = 4,
  ...props
}: ComponentProps<"textarea"> & { label?: string; error?: string; rows?: number }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-bold text-text-secondary">{label}</label>}
      <textarea
        {...props}
        rows={rows}
        className={cn(
          "w-full rounded-xl border border-input-border bg-input-bg px-3.5 py-3 text-sm text-text-primary placeholder-text-muted outline-none transition-colors",
          "focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/15"
        )}
      />
      {error && <p className="text-[11px] font-semibold text-rose-500">{error}</p>}
    </div>
  );
}

export function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
          checked
            ? "border-pink-500 bg-pink-500"
            : "border-border bg-border"
        )}
        aria-checked={checked}
        role="switch"
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

export function Badge({
  children,
  color = "neutral",
  className,
}: {
  children: React.ReactNode;
  color?: "neutral" | "success" | "warning" | "rose" | "purple";
  className?: string;
}) {
  const map = {
    neutral: "bg-white/[0.06] text-text-secondary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    purple: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-bold",
        map[color],
        className
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-text-primary">{title}</h3>
      {description && <p className="max-w-sm text-xs text-text-secondary">{description}</p>}
      {action}
    </div>
  );
}
