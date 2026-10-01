"use client";

import React from "react";
import { EmptyState } from "@/components/platform/ui";

export function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5">
      <div className="truncate text-[11px] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-0.5 truncate text-[18px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</div>
      {sub && <div className="text-[11px] text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}

export function SimpleTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <EmptyState message={empty} />;
  return (
    <div className="overflow-x-auto rounded-[8px] border border-[var(--border)]">
      <table className="w-full min-w-[520px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--text-secondary)]">
            {head.map((h) => <th key={h} className="px-3 py-2 text-[11px] font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)]">
              {r.map((c, j) => (
                <td key={j} className={`max-w-[240px] truncate px-3 py-2 ${j === 0 ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PageHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="pt-1">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] sm:text-[26px]">{title}</h1>
      <p className="mt-1 max-w-2xl text-[13px] text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}
