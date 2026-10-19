"use client";

import React from "react";
import { EmptyState } from "@/components/platform/ui";

export function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5">
      <div className="truncate text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{label}</div>
      <div className="mt-1 truncate text-[22px] font-extrabold tabular-nums tracking-tight text-[var(--qs-ink)]">{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-[var(--qs-muted)]">{sub}</div>}
    </div>
  );
}

export function SimpleTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <EmptyState message={empty} />;
  return (
    <div className="overflow-x-auto rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
      <table className="w-full min-w-[520px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b-2 border-[var(--qs-ink)] text-left">
            {head.map((h) => <th key={h} className="px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--qs-line)] transition-colors last:border-0 hover:bg-[var(--qs-bg)]">
              {r.map((c, j) => (
                <td key={j} className={`max-w-[240px] truncate px-3 py-2.5 ${j === 0 ? "font-bold text-[var(--qs-ink)]" : "text-[var(--qs-muted)]"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t-2 border-[var(--qs-line)] px-3 py-2 text-[12px] text-[var(--qs-muted)]">Showing {rows.length} of {rows.length} records</p>
    </div>
  );
}

export function PageHeader({ title, detail, eyebrow }: { title: string; detail: string; eyebrow?: string }) {
  return (
    <div className="pt-1">
      {eyebrow && <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">{eyebrow}</p>}
      <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-tight text-[var(--qs-ink)] sm:text-[36px]">{title}</h1>
      <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-[var(--qs-muted)]">{detail}</p>
    </div>
  );
}
