"use client";

import { ArrowLeft, Check, FilePlus2, Layers, Trash2 } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
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
      <div className="flex flex-col gap-3 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <button type="button" onClick={onBack} className="b b-ghost sm mb-2 gap-1"><ArrowLeft className="h-3.5 w-3.5" /> Back to section options</button>
          <h2 className="text-base font-extrabold text-[var(--qs-ink)]">Section blueprints</h2>
          <p className="mt-1 text-xs text-[var(--qs-muted)]">Reuse a complete section structure and continue directly to question generation.</p>
        </div>
        <button type="button" onClick={onCreateNew} className="b b-pri sm shrink-0 gap-1.5"><FilePlus2 className="h-3.5 w-3.5" /> Create new</button>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-sm font-semibold text-[var(--qs-muted)]"><SecureLogo variant="mark" size={20} className="animate-pulse motion-reduce:animate-none" /> Loading saved blueprints…</div>
      ) : blueprints.length === 0 ? (
        <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-12 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
            <Layers className="h-5 w-5" />
          </span>
          <h3 className="mt-3 text-sm font-bold text-[var(--qs-ink)]">Create your first section</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--qs-muted)]">No saved section blueprint exists yet. Create the structure once, then reuse it for future papers.</p>
          <button type="button" onClick={onCreateNew} className="b b-pri mt-4 gap-1.5"><FilePlus2 className="h-3.5 w-3.5" /> Create your first section</button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {blueprints.map((blueprint) => {
            const questionCount = blueprint.sections.reduce((sum, section) => sum + getSectionQuestionCount(section), 0);
            const marks = blueprint.sections.reduce((sum, section) => sum + getSectionMarks(section), 0);
            return (
              <article key={blueprint.id} className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] transition-colors hover:border-[var(--qs-brand)]">
                <div className="border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-[var(--qs-ink)]">{blueprint.name}</h3>
                      {blueprint.description && <p className="mt-1 text-[11px] leading-4 text-[var(--qs-muted)]">{blueprint.description}</p>}
                    </div>
                    <span className="shrink-0 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2 py-0.5 text-[9px] font-bold text-[#1a1240]">{blueprint.sections.length} sections</span>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-[var(--qs-muted)]">{questionCount} questions · {marks} marks</p>
                </div>

                <div className="max-h-72 space-y-2 overflow-y-auto p-3">
                  {blueprint.sections.map((section, sectionIndex) => (
                    <div key={`${blueprint.id}-${section.id}-${sectionIndex}`} className="rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-[var(--qs-ink)]">{section.name || `Section ${sectionIndex + 1}`}</p>
                        <span className="shrink-0 text-[9px] font-bold text-[var(--qs-muted)]">{getSectionMarks(section)} marks</span>
                      </div>
                      {section.instructions && <p className="mt-1 line-clamp-2 text-[9px] text-[var(--qs-muted)]">{section.instructions}</p>}
                      <div className="mt-2 space-y-1">
                        {section.questionGroups.map((group, groupIndex) => (
                          <div key={`${group.id}-${groupIndex}`} className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="truncate text-[var(--qs-muted)]">{group.name || group.type}</span>
                            <span className="shrink-0 font-bold tabular-nums text-[var(--qs-ink)]">{group.questionCount} × {group.marksPerQuestion} marks · {group.attemptRule === "any_n" ? `attempt ${group.attemptCount}` : "all"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-t-2 border-[var(--qs-line)] p-3">
                  <button type="button" onClick={() => onUse(blueprint)} disabled={busyId === blueprint.id} className="b b-pri sm flex-1 gap-1.5">
                    {busyId === blueprint.id ? <SecureLogo variant="mark" size={14} className="animate-pulse motion-reduce:animate-none" /> : <Check className="h-3.5 w-3.5" />} Use blueprint
                  </button>
                  <button type="button" onClick={() => onDelete(blueprint)} disabled={busyId !== null} className="b b-icon sm disabled:opacity-50" aria-label={`Delete ${blueprint.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
