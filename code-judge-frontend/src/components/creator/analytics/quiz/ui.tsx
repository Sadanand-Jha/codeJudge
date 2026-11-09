"use client";

import { cn } from "@/lib/helpers";

const PANEL_TONES = {
  plain: { section: "bg-[var(--qs-surface)]", accent: "" },
  brand: { section: "bg-[#F5F1FF]", accent: "bg-[var(--qs-brand)]" },
  sun: { section: "bg-[#FFFAE8]", accent: "bg-[var(--qs-sun)]" },
  mint: { section: "bg-[#EFFAF4]", accent: "bg-[#2FBF84]" },
  sky: { section: "bg-[#F0F5FF]", accent: "bg-[#5B8DEF]" },
  coral: { section: "bg-[#FFF3EE]", accent: "bg-[#FF7A50]" },
} as const;

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  tone = "plain",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  tone?: keyof typeof PANEL_TONES;
}) {
  const palette = PANEL_TONES[tone];
  return (
    <section
      className={cn(
        "relative min-w-0 overflow-hidden rounded-[14px] border-[1.5px] border-[var(--qs-ink)] p-3 sm:rounded-[22px] sm:border-2 sm:p-5 lg:p-[22px]",
        palette.section,
        className
      )}
    >
      {palette.accent && (
        <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-[3px] sm:h-[5px]", palette.accent)} />
      )}
      <header className="mb-2.5 flex items-start justify-between gap-2 sm:mb-4 sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-[13.5px] font-bold text-[var(--qs-ink)] sm:text-[19px] sm:font-extrabold sm:tracking-tight lg:text-[21px]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[10.5px] text-[var(--qs-muted)] sm:text-[13px]">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[90px] flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--qs-line)] bg-white/70 px-3 py-5 text-center text-[11px] font-medium text-[var(--qs-muted)] sm:min-h-[120px] sm:rounded-[16px] sm:border-2 sm:px-4 sm:py-8 sm:text-sm">
      {children}
    </div>
  );
}

export function VBars({
  items,
  peak = false,
}: {
  items: { l: string; v: number; c?: string }[];
  peak?: boolean;
}) {
  const max = Math.max(...items.map((i) => i.v), 1);
  return (
    <>
      <div className="flex h-[140px] items-end gap-2 border-b-2 border-[var(--qs-ink)] sm:h-[190px] sm:gap-3">
        {items.map((i) => (
          <div key={i.l} className="group flex h-full flex-1 flex-col items-center justify-end" title={String(i.v)}>
            <em className="mb-1 text-[10px] font-extrabold not-italic text-[var(--qs-ink)] sm:text-[13px]">{i.v}</em>
            <div
              className={cn(
                "w-full rounded-t-[6px] border-2 border-b-0 border-[var(--qs-ink)] transition-[filter] group-hover:brightness-110 sm:rounded-t-[10px]",
                !i.c && (peak && i.v === max && i.v > 0 ? "bg-[var(--qs-sun)]" : "bg-[var(--qs-brand)]")
              )}
              style={{
                height: i.v === 0 ? "6px" : `calc(${(i.v / max) * 84}%)`,
                background: i.c,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2 text-[9px] font-bold text-[var(--qs-muted)] sm:mt-1.5 sm:gap-3 sm:text-xs">
        {items.map((i) => (
          <span key={i.l} className="flex-1 text-center">{i.l}</span>
        ))}
      </div>
    </>
  );
}

export function HBars({ items }: { items: { l: string; v: number; r: string; c?: string }[] }) {
  return (
    <>
      {items.map((i, idx) => (
        <div key={`${i.l}-${idx}`} className="my-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:my-[11px] sm:gap-3">
          <b className="min-w-[34px] text-[11px] font-extrabold text-[var(--qs-ink)] sm:min-w-[44px] sm:text-sm">{i.l}</b>
          <div className="flex h-2.5 overflow-hidden rounded-full border border-[var(--qs-ink)] bg-[var(--qs-surface)] sm:h-3.5 sm:border-2">
            <i
              className="block h-full"
              style={{ width: `${Math.min(100, Math.max(0, i.v * 100))}%`, background: i.c ?? "var(--qs-brand)" }}
            />
          </div>
          <span className="min-w-[34px] text-right text-[10.5px] font-bold text-[var(--qs-ink)] sm:min-w-[42px] sm:text-sm">{i.r}</span>
        </div>
      ))}
    </>
  );
}

export function OutlinePill({
  tone = "muted",
  children,
}: {
  tone?: "ok" | "warn" | "bad" | "brand" | "muted";
  children: React.ReactNode;
}) {
  const tones = {
    ok: "text-[var(--qs-ok)]",
    warn: "text-[#a85d00]",
    bad: "text-[var(--qs-bad)]",
    brand: "text-[var(--qs-brand)]",
    muted: "text-[var(--qs-muted)]",
  };
  return (
    <span className={cn("inline-block rounded-full border border-current px-1.5 py-px text-[8.5px] font-bold uppercase tracking-[0.04em] sm:border-2 sm:px-[11px] sm:py-px sm:text-xs sm:font-extrabold sm:tracking-[0.05em]", tones[tone])}>
      {children}
    </span>
  );
}

export function difficultyTone(name: string | null | undefined): "ok" | "warn" | "bad" | "muted" {
  const d = String(name ?? "").toLowerCase();
  if (d.includes("easy")) return "ok";
  if (d.includes("medium")) return "warn";
  if (d.includes("hard")) return "bad";
  return "muted";
}

export const btnClass =
  "inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-[9px] text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";

export const btnPrimaryClass =
  "inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-[9px] text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition hover:brightness-105";
