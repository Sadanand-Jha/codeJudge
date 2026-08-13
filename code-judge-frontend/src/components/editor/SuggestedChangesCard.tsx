"use client";

import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, X, AlertTriangle, Loader2, RefreshCw, Code2 } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { AIEdit, DiffLine } from "@/lib/codeEdits";
import { buildEditDiff } from "@/lib/codeEdits";

interface SuggestedChangesCardProps {
  filename: string;
  explanation: string;
  edits: AIEdit[];
  modelValue: string;
  /** True when the AI changes can no longer be safely applied. */
  stale?: boolean;
  /** True while an apply is in flight. */
  applying?: boolean;
  onApply: () => void;
  onReject: () => void;
  onRefresh?: () => void;
}

/**
 * Polished "Suggested changes" card shown inside the code assistant chat when
 * the AI wants to modify the editor. Renders a compact before/after diff and
 * Apply / Reject actions. The full file stays in Monaco, never in the chat.
 */
function SuggestedChangesCard({
  filename,
  explanation,
  edits,
  modelValue,
  stale = false,
  applying = false,
  onApply,
  onReject,
  onRefresh,
}: SuggestedChangesCardProps) {
  const [revealed, setRevealed] = useState(true);

  // Merge diffs across edits for a single grouped preview. Memoised on the
  // inputs that actually change the diff — recomputing it on every parent
  // re-render (each streaming chunk re-renders the whole chat) is a major cause
  // of 100% CPU / freezes when the AI streams a large diff.
  const diffLines: DiffLine[] = useMemo(() => {
    return edits.flatMap((e, i) => {
      const group = buildEditDiff(modelValue, e);
      if (i < edits.length - 1 && group.length > 0) {
        // Thin separator between independent edit hunks.
        group.push({ type: "context", text: "" });
      }
      return group;
    });
  }, [edits, modelValue]);

  // Keep the preview responsive even for very large diffs.
  const MAX_PREVIEW_LINES = 120;
  const previewLines =
    diffLines.length > MAX_PREVIEW_LINES
      ? diffLines.slice(0, MAX_PREVIEW_LINES)
      : diffLines;
  const previewOverflow = diffLines.length - previewLines.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-2 overflow-hidden rounded-xl border border-[#7C3AED]/25 bg-card shadow-[0_8px_30px_rgba(124,58,237,0.08)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-b-[#7C3AED]/15 bg-card-hover/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#EC4899] to-[#7C3AED]">
            <Sparkles className="h-3 w-3 text-white" />
          </span>
          <span className="text-[11px] font-bold text-text-primary">Suggested changes</span>
          <span className="text-[9px] font-medium uppercase tracking-wider text-text-muted">
            {filename}
          </span>
        </div>
        <button
          onClick={() => setRevealed((v) => !v)}
          className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-card hover:text-text-primary"
          aria-label={revealed ? "Collapse" : "Expand"}
        >
          <Code2 className={cn("h-3.5 w-3.5 transition-transform", !revealed && "rotate-180")} />
        </button>
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="px-3 pt-2 text-[11px] leading-relaxed text-text-secondary">
          {explanation}
        </p>
      )}

      {/* Stale warning */}
      {stale && (
        <div className="flex items-start gap-1.5 px-3 pt-2 text-[11px] leading-relaxed text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            The file changed while this suggestion was being generated. Review
            it before applying, or recalculate for the current code.
          </span>
        </div>
      )}

      {/* Diff preview */}
      <AnimatePresence initial={false}>
        {revealed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="m-3 max-h-56 overflow-auto rounded-lg border border-border bg-[#0d0e14] font-mono text-[11px] leading-[18px]">
              {previewLines.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2 whitespace-pre px-2.5",
                    d.type === "add" && "bg-emerald-500/10 text-emerald-300",
                    d.type === "remove" && "bg-rose-500/10 text-rose-300/80 line-through decoration-rose-400/40",
                    d.type === "context" && "text-text-muted/60",
                    d.text === "" && "h-[18px]"
                  )}
                >
                  <span className="w-4 shrink-0 select-none text-center opacity-60">
                    {d.type === "add" ? "+" : d.type === "remove" ? "−" : ""}
                  </span>
                  <span className="overflow-x-auto">{d.text || " "}</span>
                </div>
              ))}
              {previewOverflow > 0 && (
                <div className="flex gap-2 px-2.5 py-1 text-[11px] text-text-muted/70">
                  <span className="w-4 shrink-0" />
                  <span>
                    … {previewOverflow} more line{previewOverflow === 1 ? "" : "s"} in this diff
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {!stale && (
        <div className="flex items-center justify-end gap-1.5 border-t border-border/60 bg-card-hover/20 px-3 py-2">
          <button
            onClick={onReject}
            disabled={applying}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
          <button
            onClick={onApply}
            disabled={applying}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#7C3AED] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-[0_2px_10px_rgba(124,58,237,0.35)] transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
          >
            {applying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Accept
          </button>
        </div>
      )}

      {/* Stale actions — offer recalculate */}
      {stale && (
        <div className="flex items-center justify-end gap-1.5 px-3 pb-3">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
          >
            <RefreshCw className="h-3 w-3" />
            Recalculate
          </button>
          <button
            onClick={onReject}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
        </div>
      )}
    </motion.div>
  );
}

// onApply/onReject/onRefresh are recreated on each parent render but close over a
// stable suggestion id, so we only re-render the card when the data it shows changes.
function areEqual(
  prev: SuggestedChangesCardProps,
  next: SuggestedChangesCardProps
) {
  return (
    prev.filename === next.filename &&
    prev.explanation === next.explanation &&
    prev.edits === next.edits &&
    prev.modelValue === next.modelValue &&
    prev.stale === next.stale &&
    prev.applying === next.applying
  );
}

export default memo(SuggestedChangesCard, areEqual);
