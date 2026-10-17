"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { ComponentProps } from "react";

type Icon = ComponentType<{ className?: string }>;

export function StudioStepLayout({
  children,
  width = "default",
  className,
}: {
  children: React.ReactNode;
  width?: "compact" | "default" | "wide";
  className?: string;
}) {
  const widths = {
    compact: "max-w-2xl",
    default: "max-w-4xl",
    wide: "max-w-6xl",
  };

  return (
    <div className={cn("mx-auto w-full min-w-0 space-y-4 py-3 sm:space-y-6 sm:px-4 sm:py-6", widths[width], className)}>
      {children}
    </div>
  );
}

export function StudioStepHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between sm:px-0">
      <h1 className="min-w-0 text-lg font-bold tracking-tight text-text-primary sm:text-xl">{title}</h1>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

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
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-pink-500/40 bg-pink-50 px-4 py-2 text-sm font-semibold text-pink-900 transition-colors duration-150",
        "hover:bg-pink-100 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/40",
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
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150",
        "hover:bg-card-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/30",
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/30"
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
        active && "border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-400",
        done && !active && "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400",
        !active && !done && "border-border text-text-secondary hover:text-text-primary"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold",
          active
            ? "bg-pink-300 text-white"
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
  "focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
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

export function StudioSelect({
  value,
  options,
  onChange,
  loading = false,
  disabled = false,
  className,
  buttonClassName,
  menuClassName,
  align = "left",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-text-primary transition-colors hover:border-border-hover focus:border-pink-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          buttonClassName
        )}
      >
        <span className="truncate">{loading ? "Loading…" : value}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && !loading && options.length > 0 && (
        <div
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-xl",
            align === "right" ? "right-0 min-w-full" : "left-0 w-full",
            menuClassName
          )}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 whitespace-nowrap px-3 py-2 text-left text-xs transition-colors hover:bg-card-hover",
                  active ? "bg-pink-50 font-semibold text-[#E91E63] dark:bg-pink-500/10" : "text-text-primary"
                )}
              >
                {opt.label}
                {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
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
            ? "border-pink-400 bg-pink-300 dark:border-pink-300 dark:bg-pink-300"
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
        "overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {(title || action) && (
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
            {description && <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary sm:line-clamp-none">{description}</p>}
          </div>
          {action && <div className="shrink-0 self-start">{action}</div>}
        </div>
      )}
      <div className="px-4 py-4 sm:px-5">{children}</div>
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
    accent: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
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
