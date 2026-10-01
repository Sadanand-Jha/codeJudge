"use client";

import { ArrowLeft, Check, FilePlus2, Layers, Loader2, Trash2 } from "lucide-react";
import type { SectionBlueprint } from "@/services/aiGenerate";
import { getSectionMarks, getSectionQuestionCount } from "./types";

interface Props {
  blueprints: SectionBlueprint[];
  loading: boolean;
  busyId: number | null;
  onBack: () => void;
  onCreateNew: () => void;
  onUse: (blueprint: SectionBlueprint) => void;
  onDelete: (blueprint: SectionBlueprint) => void;
}

export function SectionBlueprintLibrary({ blueprints, loading, busyId, onBack, onCreateNew, onUse, onDelete }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/[0.07] to-pink-500/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold text-text-secondary hover:text-violet-500"><ArrowLeft className="h-3 w-3" /> Back to section options</button>
          <h2 className="text-base font-extrabold text-text-primary">Section blueprints</h2>
          <p className="mt-1 text-xs text-text-secondary">Reuse a complete section structure and continue directly to question generation.</p>
        </div>
        <button type="button" onClick={onCreateNew} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-lg shadow-pink-500/15"><FilePlus2 className="h-3.5 w-3.5" /> Create new</button>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm text-text-secondary"><Loader2 className="h-4 w-4 animate-spin" /> Loading saved blueprints…</div>
      ) : blueprints.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/60 px-5 py-12 text-center">
          <Layers className="mx-auto h-8 w-8 text-text-muted" />
          <h3 className="mt-3 text-sm font-bold text-text-primary">Create your first section</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-text-secondary">No saved section blueprint exists yet. Create the structure once, then reuse it for future papers.</p>
          <button type="button" onClick={onCreateNew} className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white"><FilePlus2 className="h-3.5 w-3.5" /> Create your first section</button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {blueprints.map((blueprint) => {
            const questionCount = blueprint.sections.reduce((sum, section) => sum + getSectionQuestionCount(section), 0);
            const marks = blueprint.sections.reduce((sum, section) => sum + getSectionMarks(section), 0);
            return (
              <article key={blueprint.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-violet-400/30 hover:shadow-md">
                <div className="border-b border-border bg-card-hover/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-text-primary">{blueprint.name}</h3>
                      {blueprint.description && <p className="mt-1 text-[11px] leading-4 text-text-secondary">{blueprint.description}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-bold text-violet-600 dark:text-violet-300">{blueprint.sections.length} sections</span>
                  </div>
                  <p className="mt-2 text-[10px] font-semibold text-text-muted">{questionCount} questions · {marks} marks</p>
                </div>

                <div className="max-h-72 space-y-2 overflow-y-auto p-3">
                  {blueprint.sections.map((section, sectionIndex) => (
                    <div key={`${blueprint.id}-${section.id}-${sectionIndex}`} className="rounded-xl border border-border bg-card-hover/25 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-text-primary">{section.name || `Section ${sectionIndex + 1}`}</p>
                        <span className="text-[9px] font-semibold text-text-muted">{getSectionMarks(section)} marks</span>
                      </div>
                      {section.instructions && <p className="mt-1 line-clamp-2 text-[9px] text-text-muted">{section.instructions}</p>}
                      <div className="mt-2 space-y-1">
                        {section.questionGroups.map((group, groupIndex) => (
                          <div key={`${group.id}-${groupIndex}`} className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="truncate text-text-secondary">{group.name || group.type}</span>
                            <span className="shrink-0 font-semibold text-text-primary">{group.questionCount} × {group.marksPerQuestion} marks · {group.attemptRule === "any_n" ? `attempt ${group.attemptCount}` : "all"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-t border-border p-3">
                  <button type="button" onClick={() => onUse(blueprint)} disabled={busyId === blueprint.id} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3 text-xs font-bold text-white disabled:opacity-50">
                    {busyId === blueprint.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Use blueprint
                  </button>
                  <button type="button" onClick={() => onDelete(blueprint)} disabled={busyId !== null} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-text-muted transition-colors hover:border-rose-400/30 hover:text-rose-500 disabled:opacity-50" aria-label={`Delete ${blueprint.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
