"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/helpers";
import type { ComponentProps } from "react";

type Icon = ComponentType<{ className?: string }>;

export function PrimaryButton({
  children,
  icon: Icon,
  ...props
}: ComponentProps<"button"> & { icon?: Icon }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900 transition-colors duration-150",
        "hover:bg-indigo-100 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  icon: Icon,
  ...props
}: ComponentProps<"button"> & { icon?: Icon }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150",
        "hover:bg-card-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30",
        "disabled:cursor-not-allowed disabled:opacity-50"
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
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
        subtle
          ? "text-text-secondary hover:bg-card-hover hover:text-text-primary"
          : "border border-border text-text-secondary hover:bg-card-hover hover:text-text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function DestructiveButton({
  children,
  icon: Icon,
  ...props
}: ComponentProps<"button"> & { icon?: Icon }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150",
        "hover:bg-rose-700",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40",
        "disabled:cursor-not-allowed disabled:opacity-50"
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
        "relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
        active && "border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        done && !active && "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400",
        !active && !done && "border-border text-text-secondary hover:text-text-primary"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold",
          active
            ? "bg-indigo-300 text-white"
            : done
            ? "bg-emerald-500 text-white"
            : "bg-card-hover text-text-secondary"
        )}
      >
        {step}
      </span>
      <span className="hidden sm:inline">{"Step " + step}</span>
    </button>
  );
}

const fieldCls = cn(
  "w-full rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary placeholder-text-muted outline-none transition-colors duration-150",
  "focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10"
);

export function Input({
  label,
  error,
  ...props
}: ComponentProps<"input"> & { label?: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-text-secondary">{label}</label>}
      <input
        type="text"
        {...props}
        className={cn(fieldCls, "h-10", props.className)}
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
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
      {label && <label className="block text-xs font-medium text-text-secondary">{label}</label>}
      <textarea
        {...props}
        rows={rows}
        className={cn(fieldCls, "py-2.5", props.className)}
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
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
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150",
          checked
            ? "border-indigo-400 bg-indigo-300 dark:border-indigo-300 dark:bg-indigo-300"
            : "border-border bg-border"
        )}
        aria-checked={checked}
        role="switch"
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card",
        className
      )}
    >
      {(title || action) && (
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            {title && <h3 className="truncate text-sm font-semibold text-text-primary">{title}</h3>}
            {description && <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary sm:line-clamp-none">{description}</p>}
          </div>
          {action && <div className="shrink-0 self-start">{action}</div>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function Badge({
  children,
  color = "neutral",
  className,
}: {
  children: React.ReactNode;
  color?: "neutral" | "success" | "warning" | "rose" | "accent";
  className?: string;
}) {
  const map = {
    neutral: "bg-card-hover text-text-secondary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium",
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
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-text-muted">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
