"use client";

import { useMemo, useState } from "react";
import { BookOpen, Check, Layers, Loader2, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  createSyllabus,
  updateSyllabus,
  variantToSavePayload,
  type GeneratedSyllabusVariant,
  type SyllabusVariantKey,
} from "@/services/syllabus";

interface SyllabusMultiImportDialogProps {
  variants: Record<SyllabusVariantKey, GeneratedSyllabusVariant[]>;
  filename: string;
  importJobId: string;
  targetId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const BTN_SEC =
  "rounded-xl border-2 border-[var(--qs-line)] px-4 py-2 text-[12px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50";

export function SyllabusMultiImportDialog({
  variants,
  filename,
  importJobId,
  targetId,
  onClose,
  onSaved,
}: SyllabusMultiImportDialogProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set((variants.balanced ?? []).map((_, index) => index))
  );
  const [saving, setSaving] = useState(false);
  const list = useMemo(() => variants.balanced ?? [], [variants]);

  const allSelected = list.length > 0 && list.every((_, index) => selected.has(index));
  const chosen = list.filter((_, index) => selected.has(index));

  const toggle = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(list.map((_, index) => index)));
  };

  const save = async () => {
    if (!chosen.length || saving) {
      if (!chosen.length) toast.error("Select at least one subject to save.");
      return;
    }
    setSaving(true);
    let created = 0;
    try {
      for (let index = 0; index < chosen.length; index++) {
        const payload = variantToSavePayload(chosen[index], importJobId);
        if (targetId && index === 0) {
          await updateSyllabus(targetId, payload);
        } else {
          await createSyllabus(payload);
        }
        created++;
      }
      toast.success(
        chosen.length === 1 ? "Syllabus saved." : `${chosen.length} syllabi saved.`
      );
      onSaved();
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not save the imported syllabi.");
      toast.error(created ? `Saved ${created} of ${chosen.length}. ${message}` : message);
      if (created) onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-sm sm:p-6">
      <div className="my-8 w-full max-w-3xl overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--qs-muted)]">
              Custom syllabus
            </p>
            <h2 className="qs-display mt-1 text-[22px] font-extrabold text-[var(--qs-ink)]">
              Review {list.length} subjects
            </h2>
            <p className="mt-1 truncate text-[12px] font-medium text-[var(--qs-muted)]">
              From {filename}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-[var(--qs-line)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50"
            aria-label="Close import review"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[calc(100dvh-13rem)] space-y-4 overflow-y-auto p-5">
          <div className="flex items-start gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
            <p className="text-[11px] font-medium leading-5 text-[var(--qs-muted)]">
              This document contains several subjects. Each selected subject will be saved as its
              own syllabus card.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleAll}
              disabled={saving || list.length === 0}
              className="text-[11px] font-bold text-pink-600 hover:underline disabled:opacity-50"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
            <span className="text-[11px] font-bold text-[var(--qs-muted)]">
              {chosen.length} of {list.length} selected
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((syllabus, index) => {
              const checked = selected.has(index);
              const chapterCount = syllabus.chapters.length;
              const topicCount = syllabus.chapters.reduce(
                (total, chapter) => total + chapter.topics.length,
                0
              );
              return (
                <label
                  key={`${syllabus.name}-${index}`}
                  className={cn(
                    "cursor-pointer rounded-2xl border-2 bg-[var(--qs-surface)] p-3 transition-colors",
                    checked
                      ? "border-[var(--qs-brand)]"
                      : "border-[var(--qs-line)] hover:border-[var(--qs-ink)]"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={saving}
                    onChange={() => toggle(index)}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2",
                        checked
                          ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                          : "border-[var(--qs-line)]"
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-extrabold text-[var(--qs-ink)]">
                        {syllabus.name}
                      </p>
                      <p className="truncate text-[11px] font-medium text-[var(--qs-muted)]">
                        {syllabus.subject}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-[var(--qs-bg)] px-2 py-1 text-[10px] font-bold text-[var(--qs-muted)]">
                      {chapterCount} chapters
                    </span>
                    <span className="rounded-md bg-[var(--qs-bg)] px-2 py-1 text-[10px] font-bold text-[var(--qs-muted)]">
                      {topicCount} topics
                    </span>
                  </div>
                  {syllabus.chapters.length > 0 && (
                    <p className="mt-2 line-clamp-2 text-[10px] font-medium leading-4 text-[var(--qs-muted)]">
                      {syllabus.chapters.map((chapter) => chapter.title).join(" · ")}
                    </p>
                  )}
                </label>
              );
            })}
          </div>

          {targetId && (
            <p className="text-[11px] font-medium leading-5 text-[var(--qs-muted)]">
              Re-import will replace the selected syllabus with the first subject. The remaining
              selected subjects are added as new cards.
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 py-3">
          <button type="button" onClick={onClose} disabled={saving} className={BTN_SEC}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || chosen.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-[12px] font-bold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BookOpen className="h-3.5 w-3.5" />
            )}
            {saving
              ? "Saving…"
              : `Save ${chosen.length} ${chosen.length === 1 ? "syllabus" : "syllabi"}`}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default SyllabusMultiImportDialog;
