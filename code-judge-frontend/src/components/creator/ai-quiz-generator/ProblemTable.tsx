"use client";

import { Trash2, GripVertical, Pencil, AlertTriangle, HelpCircle, Check } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { DetectedProblem } from "./types";

const difficultyColor = {
  Easy: "text-[var(--qs-ok)] bg-[var(--qs-ok)]/10",
  Medium: "text-[#a85d00] bg-[#a85d00]/10",
  Hard: "text-[var(--qs-bad)] bg-[var(--qs-bad)]/10",
};

const confidenceIcon = {
  high: { icon: Check, cls: "text-[var(--qs-ok)]" },
  medium: { icon: AlertTriangle, cls: "text-[#a85d00]" },
  low: { icon: HelpCircle, cls: "text-[var(--qs-bad)]" },
};

export function ProblemTable({
  problems,
  onRemove,
  onEdit,
}: {
  problems: DetectedProblem[];
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onEdit: (id: string, title: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[16px] border-2 border-[var(--qs-line)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)]">
            <th className="w-10 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]" />
            <th className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">#</th>
            <th className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Problem</th>
            <th className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Topic</th>
            <th className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Difficulty</th>
            <th className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Confidence</th>
            <th className="w-20 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {problems.map((p) => {
            const conf = confidenceIcon[p.confidence];
            const ConfIcon = conf.icon;
            return (
              <tr
                key={p.id}
                className="group border-b-2 border-[var(--qs-line)]/60 transition-colors last:border-b-0 hover:bg-[var(--qs-bg)]/70"
              >
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    className="cursor-grab text-[var(--qs-muted)] opacity-0 transition-opacity hover:text-[var(--qs-ink)] group-hover:opacity-100"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-[var(--qs-muted)]">{String(p.number).padStart(2, "0")}</td>
                <td className="px-3 py-2.5">
                  <span className="font-bold text-[var(--qs-ink)]">{p.title}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--qs-muted)]">
                    {p.topic}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-extrabold", difficultyColor[p.difficulty])}>
                    {p.difficulty}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <ConfIcon className={cn("h-3.5 w-3.5", conf.cls)} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onEdit(p.id, p.title)}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-line)]/50 hover:text-[var(--qs-ink)]"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(p.id)}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bad)]/10 hover:text-[var(--qs-bad)]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
