"use client";

import { Trash2, GripVertical, Pencil, AlertTriangle, HelpCircle, Check } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { DetectedProblem } from "./types";

const difficultyColor = {
  Easy: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  Medium: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  Hard: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
};

const confidenceIcon = {
  high: { icon: Check, cls: "text-emerald-500" },
  medium: { icon: AlertTriangle, cls: "text-amber-500" },
  low: { icon: HelpCircle, cls: "text-rose-500" },
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
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-white/[0.02] dark:bg-white/[0.01]">
            <th className="w-10 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted" />
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">#</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Problem</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Topic</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Difficulty</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Confidence</th>
            <th className="w-20 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted" />
          </tr>
        </thead>
        <tbody>
          {problems.map((p) => {
            const conf = confidenceIcon[p.confidence];
            const ConfIcon = conf.icon;
            return (
              <tr
                key={p.id}
                className="group border-b border-border/50 transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    className="cursor-grab text-text-muted opacity-0 transition-opacity hover:text-text-secondary group-hover:opacity-100"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </td>
                <td className="px-3 py-2.5 text-xs font-mono text-text-muted">{String(p.number).padStart(2, "0")}</td>
                <td className="px-3 py-2.5">
                  <span className="font-medium text-text-primary">{p.title}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-md border border-border bg-white/[0.03] px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
                    {p.topic}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", difficultyColor[p.difficulty])}>
                    {p.difficulty}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <ConfIcon className={cn("h-3.5 w-3.5", conf.cls)} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onEdit(p.id, p.title)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(p.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-500"
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
