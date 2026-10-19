"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Inbox,
  RefreshCw,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "@/lib/toast";

/* ------------------------------------------------------------------ */
/* Formatters (deterministic — safe for SSR/CSR hydration)             */
/* ------------------------------------------------------------------ */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n: number) => String(n).padStart(2, "0");

export const fmtInt = (n: number) => n.toLocaleString("en-IN");
export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
export const fmtMoney = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
export const fmtPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
export const fmtMs = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${Math.round(n)} ms`);
export const fmtTokens = (n: number) => `${fmtCompact(n)} tok`;

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtClock(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export const inputClass =
  "w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

export const CHART_COLORS = {
  brand: "var(--qs-brand)",
  blue: "var(--qs-blue)",
  green: "var(--qs-ok)",
  red: "var(--qs-bad)",
  amber: "#E8A600",
  teal: "#2BB3A3",
  lilac: "#B79CFF",
} as const;

/* ------------------------------------------------------------------ */
/* Badges, banners, cards                                              */
/* ------------------------------------------------------------------ */

export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1A1240]">
      {label}
    </span>
  );
}

export type NoteTone = "info" | "warn" | "ok" | "bad";

const NOTE_STYLES: Record<NoteTone, string> = {
  info: "border-[var(--qs-blue)] bg-[color-mix(in_srgb,var(--qs-blue)_10%,var(--qs-surface))] text-[var(--qs-ink)]",
  warn: "border-[var(--qs-warn)] bg-[color-mix(in_srgb,var(--qs-warn)_12%,var(--qs-surface))] text-[var(--qs-ink)]",
  ok: "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ink)]",
  bad: "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-ink)]",
};

export function NoteBanner({
  tone = "info",
  icon: Icon,
  children,
  action,
}: {
  tone?: NoteTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-[16px] border-2 px-4 py-3 ${NOTE_STYLES[tone]}`}>
      {Icon ? <Icon size={16} className="shrink-0" /> : null}
      <div className="min-w-0 flex-1 text-[13px] font-medium leading-relaxed">{children}</div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export type StatusTone = "ok" | "warn" | "bad" | "info" | "neutral" | "brand";

const STATUS_STYLES: Record<StatusTone, string> = {
  ok: "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
  warn: "border-[var(--qs-warn)] bg-[color-mix(in_srgb,var(--qs-warn)_14%,var(--qs-surface))] text-[var(--qs-warn)]",
  bad: "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]",
  info: "border-[var(--qs-blue)] bg-[color-mix(in_srgb,var(--qs-blue)_12%,var(--qs-surface))] text-[var(--qs-blue)]",
  neutral: "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]",
  brand: "border-[var(--qs-brand)] bg-[color-mix(in_srgb,var(--qs-brand)_12%,var(--qs-surface))] text-[var(--qs-brand)]",
};

export function StatusBadge({
  tone = "neutral",
  children,
  dot = false,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.07em] ${STATUS_STYLES[tone]}`}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaTone = "muted",
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  delta?: string;
  deltaTone?: "ok" | "bad" | "muted";
  icon?: LucideIcon;
}) {
  const deltaColor =
    deltaTone === "ok" ? "text-[var(--qs-ok)]" : deltaTone === "bad" ? "text-[var(--qs-bad)]" : "text-[var(--qs-muted)]";
  return (
    <div className="rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[4px_4px_0_var(--qs-sun)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">{label}</p>
        {Icon ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <p className="qs-display mt-2.5 text-[26px] font-extrabold leading-none text-[var(--qs-ink)]">{value}</p>
      {delta || hint ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
          {delta ? <span className={`font-extrabold ${deltaColor}`}>{delta}</span> : null}
          {hint ? <span className="text-[var(--qs-muted)]">{hint}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  tone = "line",
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  tone?: "line" | "ink";
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`rounded-[18px] border-2 bg-[var(--qs-surface)] ${
        tone === "ink" ? "border-[var(--qs-ink)]" : "border-[var(--qs-line)]"
      } ${className ?? ""}`}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="truncate text-[15.5px] font-extrabold text-[var(--qs-ink)]">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-[12.5px] text-[var(--qs-muted)]">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName ?? "p-4"}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-6 py-10 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]">
        <Icon size={18} />
      </span>
      <p className="mt-3 text-[15px] font-extrabold text-[var(--qs-ink)]">{title}</p>
      {description ? <p className="mt-1 max-w-[420px] text-[13px] text-[var(--qs-muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function AiOpsPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--qs-brand)]">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-[28px] font-extrabold leading-[1.05] text-[var(--qs-ink)]">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-[780px] text-[13.5px] leading-relaxed text-[var(--qs-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function KeyValueList({
  items,
  columns = 1,
}: {
  items: { label: string; value: React.ReactNode }[];
  columns?: 1 | 2;
}) {
  return (
    <dl className={`grid gap-x-6 gap-y-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">{item.label}</dt>
          <dd className="mt-0.5 break-words text-[13.5px] font-medium text-[var(--qs-ink)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "brand",
}: {
  value: number;
  max: number;
  tone?: "brand" | "ok" | "warn" | "bad";
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color =
    tone === "ok"
      ? "var(--qs-ok)"
      : tone === "warn"
        ? "var(--qs-warn)"
        : tone === "bad"
          ? "var(--qs-bad)"
          : "var(--qs-brand)";
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full border border-[var(--qs-line)] bg-[var(--qs-bg)]"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs & controls                                                   */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  htmlFor,
  children,
  required = false,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {hint ? <p className="text-[12px] text-[var(--qs-muted)]">{hint}</p> : null}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  id,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  className?: string;
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={`relative ${className ?? ""}`}>
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <select
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[38px] w-full min-w-[150px] cursor-pointer appearance-none rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] pl-3 pr-9 text-[13px] font-bold text-[var(--qs-ink)] outline-none transition-colors focus:border-[var(--qs-brand)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--qs-muted)]"
        aria-hidden="true"
      />
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`relative ${className ?? ""}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--qs-muted)]"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-[38px] w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] pl-9 pr-9 text-[13px] font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-[8px] text-[var(--qs-muted)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
          aria-label={`Clear ${label.toLowerCase()}`}
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={`b-seg ${className ?? ""}`} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="b"
          data-selected={option.value === value}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TabLinks({
  tabs,
  isActive,
}: {
  tabs: { href: string; label: string; icon?: LucideIcon }[];
  isActive: (href: string) => boolean;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5" aria-label="AI operations sections">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="b b-tab sm"
            data-selected={active}
            aria-current={active ? "page" : undefined}
          >
            {tab.icon ? <tab.icon size={14} /> : null}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="b b-switch"
    />
  );
}

export function CopyButton({ value, label = "Copy", size = "sm" }: { value: string; label?: string; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Copy failed", { description: "Clipboard access is not available in this browser." });
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={copy}
      className={`b b-ghost ${size === "sm" ? "sm" : ""}`}
      aria-label={`${label}: ${value}`}
    >
      <Copy size={13} />
      {copied ? "Copied" : label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Data table                                                          */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  initialSortKey?: string;
  initialSortDir?: "asc" | "desc";
  pageSize?: number;
  emptyLabel?: string;
  onRowClick?: (row: T) => void;
  bare?: boolean;
}

const ALIGN_CLASS = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  initialSortKey,
  initialSortDir = "asc",
  pageSize = 0,
  emptyLabel = "No rows match the current filters.",
  onRowClick,
  bare = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return rows;
    const next = [...rows];
    next.sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      const result = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? result : -result;
    });
    return next;
  }, [rows, columns, sortKey, sortDir]);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const visible = pageSize > 0 ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sorted;

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return;
    if (sortKey === column.key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column.key);
      setSortDir("asc");
    }
  };

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b-2 border-[var(--qs-line)]">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-3 py-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)] ${
                  ALIGN_CLASS[column.align ?? "left"]
                } ${column.headerClassName ?? ""}`}
              >
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column)}
                    className={`inline-flex items-center gap-1 hover:text-[var(--qs-ink)] ${
                      sortKey === column.key ? "text-[var(--qs-ink)]" : ""
                    }`}
                  >
                    {column.header}
                    {sortKey === column.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp size={11} />
                      ) : (
                        <ArrowDown size={11} />
                      )
                    ) : null}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-[13px] text-[var(--qs-muted)]">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            visible.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter") onRowClick(row);
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={`border-b border-[var(--qs-line)] last:border-b-0 ${
                    onRowClick
                      ? "cursor-pointer transition-colors hover:bg-[var(--qs-bg)] focus-visible:bg-[var(--qs-bg)] focus-visible:outline-none"
                      : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 py-2.5 align-top text-[var(--qs-ink)] ${ALIGN_CLASS[column.align ?? "left"]} ${
                        column.cellClassName ?? ""
                      }`}
                    >
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {bare ? table : <div className="overflow-hidden rounded-[14px] border-2 border-[var(--qs-line)]">{table}</div>}
      {pageSize > 0 && sorted.length > pageSize ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--qs-muted)]">
          <span>
            Showing <strong className="text-[var(--qs-ink)]">{(currentPage - 1) * pageSize + 1}</strong>–
            <strong className="text-[var(--qs-ink)]">{Math.min(currentPage * pageSize, sorted.length)}</strong> of{" "}
            <strong className="text-[var(--qs-ink)]">{fmtInt(sorted.length)}</strong>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="b b-icon sm"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-1 font-bold text-[var(--qs-ink)]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="b b-icon sm"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

function useOverlayChrome(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useOverlayChrome(open, onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : "Details"}
    >
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-[min(480px,94vw)] flex-col border-l-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-2xl outline-none"
      >
        <header className="flex items-start justify-between gap-3 border-b-2 border-[var(--qs-line)] px-5 py-4">
          <div className="min-w-0">
            <p className="qs-display text-[17px] font-extrabold leading-tight text-[var(--qs-ink)]">{title}</p>
            {subtitle ? <p className="mt-0.5 text-[12.5px] text-[var(--qs-muted)]">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="b b-icon sm b-ghost" aria-label="Close panel">
            <X size={15} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="border-t-2 border-[var(--qs-line)] px-5 py-3.5">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useOverlayChrome(open, onClose);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : "Dialog"}
    >
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-[540px] rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[6px_6px_0_var(--qs-sun)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="qs-display text-[19px] font-extrabold leading-tight text-[var(--qs-ink)]">{title}</p>
            {description ? <p className="mt-1 text-[13px] text-[var(--qs-muted)]">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="b b-icon sm b-ghost" aria-label="Close dialog">
            <X size={15} />
          </button>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-5 flex flex-wrap items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "danger";
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="b" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`b ${tone === "danger" ? "b-danger-solid" : "b-pri"}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[13.5px] leading-relaxed text-[var(--qs-ink)]">{description}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Charts (dependency-free SVG, qs-themed)                             */
/* ------------------------------------------------------------------ */

export interface SeriesDef {
  name: string;
  color: string;
  points: number[];
  area?: boolean;
}

export function LineChart({
  series,
  labels,
  height = 200,
  formatValue = fmtInt,
  ariaLabel,
}: {
  series: SeriesDef[];
  labels: string[];
  height?: number;
  formatValue?: (value: number) => string;
  ariaLabel: string;
}) {
  const W = 640;
  const PAD = { left: 10, right: 10, top: 16, bottom: 24 };
  const count = Math.max(labels.length, 2);
  const max = Math.max(...series.flatMap((s) => s.points), 1);
  const x = (index: number) => PAD.left + (index * (W - PAD.left - PAD.right)) / (count - 1);
  const y = (value: number) => PAD.top + (1 - value / max) * (height - PAD.top - PAD.bottom);
  const labelEvery = Math.ceil(count / 6);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + ratio * (height - PAD.top - PAD.bottom)}
            y2={PAD.top + ratio * (height - PAD.top - PAD.bottom)}
            stroke="var(--qs-line)"
            strokeWidth={1}
          />
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={height - PAD.bottom} y2={height - PAD.bottom} stroke="var(--qs-ink)" strokeWidth={1.5} opacity={0.35} />
        <text x={PAD.left} y={11} fontSize={10} fontWeight={700} fill="var(--qs-muted)">
          {formatValue(max)}
        </text>
        {series.map((def) => {
          const line = def.points.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
          return (
            <g key={def.name}>
              {def.area ? (
                <polygon
                  points={`${PAD.left},${height - PAD.bottom} ${line} ${x(def.points.length - 1).toFixed(1)},${height - PAD.bottom}`}
                  fill={def.color}
                  opacity={0.12}
                />
              ) : null}
              <polyline points={line} fill="none" stroke={def.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        {labels.map((label, index) =>
          index % labelEvery === 0 ? (
            <text key={label + index} x={x(index)} y={height - 7} fontSize={10} fill="var(--qs-muted)" textAnchor="middle">
              {label}
            </text>
          ) : null,
        )}
      </svg>
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {series.map((def) => (
          <li key={def.name} className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--qs-muted)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: def.color }} aria-hidden="true" />
            {def.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BarRow {
  label: string;
  value: number;
  sublabel?: string;
  color?: string;
}

export function BarList({
  rows,
  formatValue = fmtInt,
  color = "var(--qs-brand)",
  max: maxProp,
}: {
  rows: BarRow[];
  formatValue?: (value: number) => string;
  color?: string;
  max?: number;
}) {
  const max = maxProp ?? Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] font-bold text-[var(--qs-ink)]">{row.label}</span>
            <span className="shrink-0 text-[12px] font-bold text-[var(--qs-muted)]">
              {formatValue(row.value)}
              {row.sublabel ? ` · ${row.sublabel}` : ""}
            </span>
          </div>
          <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full border border-[var(--qs-line)] bg-[var(--qs-bg)]">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, background: row.color ?? color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  slices,
  size = 168,
  thickness = 26,
  centerLabel,
  centerValue,
  formatValue = fmtInt,
  ariaLabel,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
  ariaLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const fractions = slices.map((slice) => slice.value / total);
  const offsets = fractions.map((_, index) => fractions.slice(0, index).reduce((sum, fraction) => sum + fraction, 0));
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--qs-line)" strokeWidth={thickness} />
        {slices.map((slice, index) => {
          const fraction = fractions[index];
          const dash = fraction * circumference;
          const offset = -offsets[index] * circumference;
          return (
            <circle
              key={slice.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}`}
              strokeDashoffset={offset.toFixed(2)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
        {centerValue ? (
          <text x={size / 2} y={size / 2 - 1} textAnchor="middle" fontSize={17} fontWeight={800} fill="var(--qs-ink)">
            {centerValue}
          </text>
        ) : null}
        {centerLabel ? (
          <text x={size / 2} y={size / 2 + 15} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--qs-muted)">
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 font-bold text-[var(--qs-ink)]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} aria-hidden="true" />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className="shrink-0 font-bold text-[var(--qs-muted)]">
              {formatValue(slice.value)} · {((slice.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({
  points,
  color = "var(--qs-brand)",
  width = 120,
  height = 34,
}: {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((point, index) => {
      const px = index * step;
      const py = height - 3 - ((point - min) / span) * (height - 8);
      return `${index === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="h-auto w-[110px]" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Demo refresh                                                        */
/* ------------------------------------------------------------------ */

export function useDemoRefresh(delayMs = 550) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    timer.current = window.setTimeout(() => {
      setLastRefreshed(new Date());
      setRefreshing(false);
      timer.current = null;
    }, delayMs);
  }, [delayMs]);

  return { refreshing, lastRefreshed, refresh };
}

export function RefreshDemoButton({
  refreshing,
  onRefresh,
  lastRefreshed,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  lastRefreshed: Date | null;
}) {
  return (
    <div className="flex items-center gap-2">
      {lastRefreshed ? (
        <span className="hidden text-[12px] font-bold text-[var(--qs-muted)] sm:inline">
          Refreshed {fmtClock(lastRefreshed)}
        </span>
      ) : null}
      <button type="button" className="b sm" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
        {refreshing ? "Refreshing…" : "Refresh data"}
      </button>
    </div>
  );
}
