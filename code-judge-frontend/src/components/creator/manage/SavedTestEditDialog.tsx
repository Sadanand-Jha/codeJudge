"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Pencil, X } from "lucide-react";
import { PaperHeaderFields } from "@/components/creator/common/PaperHeaderFields";
import { useToast } from "@/hooks/useToast";
import { updateSavedTest, type SavedTestSummary } from "@/utils/savedTests";
import { withPaperHeaderDefaults, type PaperHeaderMeta } from "@/utils/paperHeader";

export function SavedTestEditDialog({
  test,
  onClose,
  onSaved,
}: {
  test: SavedTestSummary;
  onClose: () => void;
  onSaved: (test: SavedTestSummary) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(test.title);
  const [meta, setMeta] = useState<PaperHeaderMeta>(() => withPaperHeaderDefaults(test.meta));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      toast.error({ title: "Heading is required", description: "Add a heading for this paper." });
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const updated = await updateSavedTest(test.id, {
        title: nextTitle,
        meta: { ...meta, heading: nextTitle },
      });
      toast.success({ title: "Paper updated", description: "Your changes have been saved." });
      onSaved(updated);
      onClose();
    } catch (error) {
      toast.error({
        title: "Could not update paper",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(26,18,64,0.55)] p-3 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-test-edit-title"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
              <Pencil className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="saved-test-edit-title" className="text-lg font-extrabold tracking-tight text-[var(--qs-ink)]">
                Update paper details
              </h2>
              <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
                Change the heading, paper details and instructions shown in the preview and PDF.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="b b-icon sm" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="mb-4 block min-w-0">
            <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
              Test heading
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Mid Semester Examination"
              maxLength={200}
              disabled={saving}
              className="h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-semibold text-[var(--qs-ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <PaperHeaderFields value={meta} onChange={setMeta} showHeading={false} disabled={saving} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="b sm">
            Cancel
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="b b-pri sm gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
