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
      <h1 className="min-w-0 text-lg font-black tracking-tight text-[var(--qs-ink)] sm:text-xl">{title}</h1>
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
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/40",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors duration-150",
        "hover:border-[var(--qs-brand)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/30",
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
        "inline-flex items-center justify-center gap-1.5 rounded-[12px] px-3 py-2 text-sm font-bold transition-colors duration-150",
        subtle
          ? "text-[var(--qs-muted)] hover:bg-[var(--qs-brand)]/10 hover:text-[var(--qs-ink)]"
          : "border-2 border-[var(--qs-line)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]/30"
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
        "inline-flex items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] px-4 py-2 text-sm font-extrabold text-white shadow-[3px_3px_0_var(--qs-sun)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-bad)]/40",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
        "relative flex items-center gap-1.5 rounded-[12px] border-2 px-3 py-1.5 text-xs font-bold transition-colors duration-150",
        active && "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]",
        done && !active && "border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
        !active && !done && "border-[var(--qs-line)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-extrabold",
          active
            ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
            : done
            ? "bg-[var(--qs-ok)] text-white"
            : "bg-[var(--qs-bg)] text-[var(--qs-muted)]"
        )}
      >
        {step}
      </span>
      <span className="hidden sm:inline">{"Step " + step}</span>
    </button>
  );
}

const fieldCls = cn(
  "w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] outline-none transition-colors duration-150",
  "focus:border-[var(--qs-brand)]"
);

export function Input({
  label,
  error,
  ...props
}: ComponentProps<"input"> & { label?: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-bold text-[var(--qs-ink)]">{label}</label>}
      <input
        type="text"
        {...props}
        className={cn(fieldCls, "h-10", props.className)}
      />
      {error && <p className="text-xs font-bold text-[var(--qs-bad)]">{error}</p>}
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
      {label && <label className="block text-xs font-bold text-[var(--qs-ink)]">{label}</label>}
      <textarea
        {...props}
        rows={rows}
        className={cn(fieldCls, "py-2.5", props.className)}
      />
      {error && <p className="text-xs font-bold text-[var(--qs-bad)]">{error}</p>}
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
          "flex w-full items-center justify-between gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] focus:border-[var(--qs-brand)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          buttonClassName
        )}
      >
        <span className="truncate">{loading ? "Loading…" : value}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)] transition-transform", open && "rotate-180")} />
      </button>
      {open && !loading && options.length > 0 && (
        <div
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 max-h-60 overflow-y-auto rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] py-1 shadow-[4px_4px_0_var(--qs-sun)]",
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
                  "flex w-full items-center justify-between gap-2 whitespace-nowrap px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--qs-poly-0)]",
                  active ? "bg-[var(--qs-poly-1)] font-extrabold text-[var(--qs-brand)]" : "text-[var(--qs-ink)]"
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
        <p className="text-sm font-extrabold text-[var(--qs-ink)]">{label}</p>
        {description && <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition-colors duration-150",
          checked
            ? "border-[var(--qs-ink)] bg-[var(--qs-ok)]"
            : "border-[var(--qs-line)] bg-[var(--qs-line)]"
        )}
        aria-checked={checked}
        role="switch"
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-150",
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
        "overflow-hidden rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]",
        className
      )}
    >
      {(title || action) && (
        <div className="flex flex-col gap-2 border-b-2 border-[var(--qs-line)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            {title && <h3 className="text-sm font-black text-[var(--qs-ink)]">{title}</h3>}
            {description && <p className="mt-0.5 line-clamp-2 text-xs font-medium text-[var(--qs-muted)] sm:line-clamp-none">{description}</p>}
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
    neutral: "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]",
    success: "border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
    warning: "border-[#a85d00]/30 bg-[#fff3d6] text-[#a85d00]",
    rose: "border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] text-[var(--qs-bad)]",
    accent: "border-[var(--qs-brand)]/30 bg-[var(--qs-poly-1)] text-[var(--qs-brand)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 px-1.5 py-0.5 text-[10px] font-extrabold",
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
      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-base font-black text-[var(--qs-ink)]">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
