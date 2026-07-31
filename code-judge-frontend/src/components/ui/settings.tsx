"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check, AlertTriangle } from "lucide-react";

/* =============================================
   Toggle — Animated Switch
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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/40 ${
        checked
          ? "bg-[#7C3AED] shadow-[0_0_12px_rgba(124,58,237,0.35)]"
          : "bg-white/[0.08] border border-white/[0.06]"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );

  if (!label) return toggle;

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-[#9CA3AF] mt-0.5">{description}</p>}
      </div>
      {toggle}
    </div>
  );
}

/* =============================================
   SettingsCard — Glassmorphism Card Wrapper
   ============================================= */
interface SettingsCardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  variant?: "default" | "danger";
  className?: string;
}

export function SettingsCard({ title, description, icon, children, variant = "default", className = "" }: SettingsCardProps) {
  const isDanger = variant === "danger";
  return (
    <section
      className={`group relative  rounded-[16px] border p-5 transition-all duration-300 hover:shadow-lg ${
        isDanger
          ? "border-[#EF4444]/20 bg-[#EF4444]/[0.03]"
          : "border-white/[0.06] bg-[#111827]/60 backdrop-blur-xl hover:border-white/[0.1]"
      } ${className}`}
      style={{
        boxShadow: isDanger
          ? "0 4px 24px rgba(239, 68, 68, 0.08)"
          : "0 4px 24px rgba(0, 0, 0, 0.2)",
      }}
    >
      {title && (
        <header className="mb-4 flex items-center gap-3">
          {icon && (
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isDanger ? "bg-[#EF4444]/10 text-[#EF4444]" : "bg-[#7C3AED]/10 text-[#7C3AED]"
            }`}>
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-[15px] font-semibold text-white">{title}</h2>
            {description && <p className="text-xs text-[#9CA3AF] mt-0.5">{description}</p>}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

/* =============================================
   SettingsInput — Input with Label
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
}: SettingsInputProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-[#9CA3AF]">{label}</label>
        {showCounter && maxLength && (
          <span className="text-[10px] text-[#6B7280]">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-[#6B7280] pointer-events-none">{icon}</div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          maxLength={maxLength}
          className={`w-full rounded-xl border border-white/[0.06] bg-[#09090B] py-2.5 text-sm text-white placeholder-[#6B7280] outline-none transition-all focus:border-[#7C3AED]/40 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.08)] ${
            icon ? "pl-10" : "pl-3.5"
          } ${action ? "pr-24" : "pr-3.5"} ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
        />
        {action && (
          <div className="absolute right-2 flex items-center gap-1">{action}</div>
        )}
      </div>
    </div>
  );
}

/* =============================================
   SettingsSelect — Searchable Dropdown
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
}

export function SettingsSelect({ label, value, onChange, options, searchable, placeholder }: SettingsSelectProps) {
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
      <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-[#09090B] py-2.5 pl-3.5 pr-3 text-sm text-white outline-none transition-all hover:border-white/[0.1] focus:border-[#7C3AED]/40"
      >
        <span className={selected ? "text-white" : "text-[#6B7280]"}>
          {selected ? selected.label : placeholder || "Select..."}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#6B7280] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#111827] shadow-2xl"
          >
            {searchable && (
              <div className="flex items-center border-b border-white/[0.06] px-3">
                <Search className="h-3.5 w-3.5 text-[#6B7280]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent py-2 pl-2 text-xs text-white placeholder-[#6B7280] outline-none"
                />
              </div>
            )}
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[#6B7280]">No results found</div>
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
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      opt.value === value
                        ? "bg-[#7C3AED]/15 text-white"
                        : "text-[#9CA3AF] hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {opt.label}
                    {opt.value === value && <Check className="h-3.5 w-3.5 text-[#7C3AED]" />}
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
        <label className="text-xs font-medium text-[#9CA3AF]">{label}</label>
        <span className="text-xs font-semibold text-white">
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
            background: `linear-gradient(to right, #7C3AED ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
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
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111827] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                isDanger ? "bg-[#EF4444]/10 text-[#EF4444]" : "bg-[#7C3AED]/10 text-[#7C3AED]"
              }`}>
                {isDanger ? <AlertTriangle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
            </div>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">{description}</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/[0.12]"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition-all ${
                  isDanger
                    ? "bg-[#EF4444] hover:shadow-[0_0_16px_rgba(239,68,68,0.4)]"
                    : "bg-[#7C3AED] hover:shadow-[0_0_16px_rgba(124,58,237,0.4)]"
                }`}
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
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.04] py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-[#9CA3AF] mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}