"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, FileText, Loader2, X } from "lucide-react";
import { PaperHeaderFields } from "@/components/creator/common/PaperHeaderFields";
import type { PaperHeaderMeta } from "@/utils/paperHeader";

export function PaperExportDialog({
  open,
  onClose,
  meta,
  onChange,
  onDownload,
  downloading = false,
  questionCount,
}: {
  open: boolean;
  onClose: () => void;
  meta: PaperHeaderMeta;
  onChange: (next: PaperHeaderMeta) => void;
  onDownload: () => void;
  downloading?: boolean;
  questionCount: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(26,18,64,0.55)] p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !downloading) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="paper-export-title"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]"
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 id="paper-export-title" className="text-lg font-extrabold tracking-tight text-[var(--qs-ink)]">
                    Paper details
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
                    Set the heading, institute and date. These appear on the PDF paper.
                  </p>
                </div>
              </div>
              <button type="button" onClick={onClose} disabled={downloading} className="b b-icon sm" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <PaperHeaderFields value={meta} onChange={onChange} showMarks disabled={downloading} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-bold text-[var(--qs-muted)]">
                  {questionCount} question{questionCount === 1 ? "" : "s"}
                </span>
                <button type="button" onClick={onClose} disabled={downloading} className="b sm">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={downloading}
                  className="b b-pri sm gap-1.5"
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {downloading ? "Preparing…" : "Download PDF"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
