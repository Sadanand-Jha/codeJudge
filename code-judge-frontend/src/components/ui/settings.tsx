"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/helpers";

/* =============================================
   Toggle — Animated Switch
   Accent is blue in light, purple in dark via --accent
   ============================================= */
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        checked
          ? "bg-accent shadow-[0_0_12px_rgba(37,99,235,0.35)]"
          : "bg-card-hover border border-border",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md",
          checked ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );

  if (!label) return toggle;

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
      </div>
      {toggle}
    </div>
  );
}

/* =============================================
   SettingsCard — Premium Elevated Card
   ============================================= */
interface SettingsCardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  variant?: "default" | "danger";
  className?: string;
  iconClassName?: string;
}

export function SettingsCard({ title, description, icon, children, variant = "default", className = "", iconClassName }: SettingsCardProps) {
  const isDanger = variant === "danger";
  return (
    <section
      className={cn(
        "group relative rounded-[18px] border p-8 transition-all duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]",
        isDanger
          ? "border-danger/20 bg-danger/[0.03]"
          : "border-border bg-card shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:border-border-hover",
        className
      )}
    >
      {title && (
        <header className="mb-6 flex items-start gap-3.5">
          {icon && (
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              isDanger ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent",
              iconClassName
            )}>
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary leading-snug">{title}</h2>
            {description && <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{description}</p>}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

/* =============================================
   SettingsInput — Input with Label
   Height 48px, blue focus ring, character counter
   ============================================= */
interface SettingsInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  icon?: ReactNode;
  readOnly?: boolean;
  maxLength?: number;
  showCounter?: boolean;
  action?: ReactNode;
  required?: boolean;
  optional?: boolean;
  onBlur?: () => void;
}

export function SettingsInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon,
  readOnly,
  maxLength,
  showCounter,
  action,
  required,
  optional,
  onBlur,
}: SettingsInputProps) {
  const pct = maxLength ? value.length / maxLength : 0;
  const counterColor =
    pct >= 0.9 ? "text-danger" : pct >= 0.75 ? "text-warning" : "text-success";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
          {optional && (
            <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Optional
            </span>
          )}
        </label>
        {showCounter && maxLength && (
          <span className={cn("text-[10px] font-medium tabular-nums", counterColor)}>
            {value.length} / {maxLength}
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-text-muted pointer-events-none">{icon}</div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          readOnly={readOnly}
          maxLength={maxLength}
          className={cn(
            "w-full h-12 rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary placeholder-text-muted outline-none transition-all duration-200",
            "focus:border-accent focus:shadow-[0_0_0_3px_var(--input-focus-ring)]",
            icon ? "pl-10" : "pl-4",
            action ? "pr-24" : "pr-4",
            readOnly && "opacity-60 cursor-not-allowed"
          )}
        />
        {action && (
          <div className="absolute right-2.5 flex items-center gap-1">{action}</div>
        )}
      </div>
    </div>
  );
}

/* =============================================
   SettingsSelect — Searchable Dropdown (48px)
   ============================================= */
interface SelectOption {
  label: string;
  value: string;
}

interface SettingsSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  searchable?: boolean;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
}

export function SettingsSelect({ label, value, onChange, options, searchable, placeholder, required, optional }: SettingsSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <label className="mb-2 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
        {optional && (
          <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
            Optional
          </span>
        )}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary outline-none transition-all duration-200 hover:border-border-hover focus:border-accent focus:shadow-[0_0_0_3px_var(--input-focus-ring)]"
      >
        <span className={selected ? "text-text-primary" : "text-text-muted"}>
          {selected ? selected.label : placeholder || "Select..."}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-text-muted transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          >
            {searchable && (
              <div className="flex items-center border-b border-border px-3.5">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent py-2.5 pl-2 text-sm text-text-primary placeholder-text-muted outline-none"
                />
              </div>
            )}
            <div className="max-h-48 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="px-3 py-2.5 text-sm text-text-muted">No results found</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      opt.value === value
                        ? "bg-accent/15 text-accent font-medium"
                        : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                    )}
                  >
                    {opt.label}
                    {opt.value === value && <Check className="h-3.5 w-3.5 text-accent" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =============================================
   SettingsSlider — Range Slider
   Accent is blue in light, purple in dark via --accent
   ============================================= */
interface SettingsSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export function SettingsSlider({ label, value, onChange, min, max, step = 1, unit }: SettingsSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">{label}</label>
        <span className="text-sm font-semibold text-text-primary tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="settings-slider w-full"
          style={{
            background: `linear-gradient(to right, #2563EB ${pct}%, rgba(148,163,184,0.25) ${pct}%)`,
          }}
        />
      </div>
    </div>
  );
}

/* =============================================
   ConfirmDialog — Confirmation Modal
   ============================================= */
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                isDanger ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"
              )}>
                {isDanger ? <AlertTriangle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
              </div>
              <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-medium text-text-primary transition-all hover:border-border-hover hover:bg-accent/5"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  "h-10 rounded-xl px-4 text-sm font-bold text-white transition-all",
                  isDanger
                    ? "bg-danger hover:shadow-[0_0_16px_rgba(239,68,68,0.4)]"
                    : "bg-accent hover:shadow-[0_0_16px_rgba(37,99,235,0.4)]"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* =============================================
   SettingsRow — Label + Control Row
   ============================================= */
interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}