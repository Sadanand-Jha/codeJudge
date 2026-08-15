"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  FileCode2,
  Sparkles,
  Loader2,
  Copy,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  FileDiff,
} from "lucide-react";
import MonacoEditorWrapper from "./MonacoEditor";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/helpers";
import type { editor as MonacoEditorNS, Range as MonacoRange } from "monaco-editor";

interface SuggestionReviewOverlayProps {
  open: boolean;
  filename: string;
  language: string;
  /** The whole file with the proposed edits already applied. */
  proposedCode: string;
  /** The file the AI was asked to change — used to highlight the diff. */
  originalCode?: string;
  explanation?: string;
  applying?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

type ReviewLineStatus = "added" | "modified" | "unchanged";

interface LineDiffResult {
  /** Status of each line in the PROPOSED file (index-aligned). */
  proposedStatus: ReviewLineStatus[];
  additions: number;
  modifications: number;
  deletions: number;
}

/**
 * Line-based diff between the original file and the proposed result.
 * Classifies each proposed line as added (pure insert run) or modified
 * (insert run paired with deletions in the same hunk); deletions are only
 * counted, since the review shows the whole proposed file.
 */
function computeLineDiff(original: string, proposed: string): LineDiffResult {
  let a = original.length ? original.split("\n") : [];
  let b = proposed.length ? proposed.split("\n") : [];
  if (a.length && a[a.length - 1] === "") a = a.slice(0, -1);
  if (b.length && b[b.length - 1] === "") b = b.slice(0, -1);

  const n = a.length;
  const m = b.length;
  const proposedStatus: ReviewLineStatus[] = new Array(m).fill("added");
  let deletions = 0;

  // LCS DP with traceback. Guard against pathological file sizes: large
  // matrices are replaced by a cheap prefix/suffix heuristic below.
  const MAX_CELLS = 4_000_000;
  if (n * m <= MAX_CELLS) {
    const cols = m + 1;
    const dp = new Int32Array((n + 1) * cols);
    for (let i = 1; i <= n; i++) {
      const row = i * cols;
      const prev = (i - 1) * cols;
      const ai = a[i - 1];
      for (let j = 1; j <= m; j++) {
        if (ai === b[j - 1]) {
          dp[row + j] = dp[prev + j - 1] + 1;
        } else {
          dp[row + j] =
            dp[prev + j] > dp[row + j - 1]
              ? dp[prev + j]
              : dp[row + j - 1];
        }
      }
    }

    // Traceback from the end (guaranteed optimal), then reverse to forward order.
    type Op = { t: "eq" | "ins" | "del"; j?: number };
    const ops: Op[] = [];
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.push({ t: "eq", j: j - 1 });
        i--;
        j--;
      } else if (
        j > 0 &&
        (i === 0 || dp[i * cols + j] === dp[i * cols + j - 1])
      ) {
        ops.push({ t: "ins", j: j - 1 });
        j--;
      } else {
        ops.push({ t: "del" });
        deletions++;
        i--;
      }
    }
    ops.reverse();

    // Group insert runs: an insert bounded by an equal line (or the file edge)
    // is "added" unless deletions sit in the same hunk, in which case the
    // whole run is a replacement ("modified").
    let removedInHunk = 0;
    const pendingIns: number[] = [];
    const flush = () => {
      const isMod = removedInHunk > 0;
      for (const idx of pendingIns) {
        proposedStatus[idx] = isMod ? "modified" : "added";
      }
      pendingIns.length = 0;
      removedInHunk = 0;
    };
    for (const op of ops) {
      if (op.t === "eq") {
        flush();
        proposedStatus[op.j!] = "unchanged";
      } else if (op.t === "ins") {
        pendingIns.push(op.j!);
      } else {
        removedInHunk++;
      }
    }
    flush();
  } else {
    // Fallback: common prefix + suffix, everything between is a replacement.
    let lo = 0;
    while (lo < n && lo < m && a[lo] === b[lo]) lo++;
    let hi = 0;
    while (
      hi < n - lo &&
      hi < m - lo &&
      a[n - 1 - hi] === b[m - 1 - hi]
    ) {
      hi++;
    }
    const midA = n - lo - hi;
    const midB = m - lo - hi;
    for (let k = lo; k < lo + midB; k++) {
      proposedStatus[k] = midA > 0 ? "modified" : "added";
    }
    deletions = midA;
  }

  let additions = 0;
  let modifications = 0;
  for (const status of proposedStatus) {
    if (status === "added") additions++;
    else if (status === "modified") modifications++;
  }
  return { proposedStatus, additions, modifications, deletions };
}

/**
 * Full-file review overlay opened when the AI proposes changes. Instead of
 * decorating the main Monaco editor inline, the entire proposed result is shown
 * here so the user can review the whole code before deciding to accept or
 * reject it.
 */
export default function SuggestionReviewOverlay({
  open,
  filename,
  language,
  proposedCode,
  originalCode,
  explanation,
  applying = false,
  onAccept,
  onReject,
  onClose,
}: SuggestionReviewOverlayProps) {
  const { theme: appTheme } = useTheme();
  const isLight = appTheme === "light";
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editorInstanceRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoInstanceRef = useRef<{ Range: typeof MonacoRange } | null>(null);
  const decorationRef = useRef<MonacoEditorNS.IEditorDecorationsCollection | null>(null);

  const options = useMemo(
    () => ({
      readOnly: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      lineHeight: 20,
      fontLigatures: true,
      smoothScrolling: true,
      cursorBlinking: "smooth" as const,
      renderLineHighlight: "all" as const,
      padding: { top: 12, bottom: 12 },
    }),
    []
  );

  const diff = useMemo(() => {
    if (!originalCode) return null;
    return computeLineDiff(originalCode, proposedCode);
  }, [originalCode, proposedCode]);

  const applyDecorations = useCallback(() => {
    const editor = editorInstanceRef.current;
    const monacoApi = monacoInstanceRef.current;
    if (!editor || !monacoApi || !diff) {
      decorationRef.current?.clear();
      return;
    }

    const decos: MonacoEditorNS.IModelDeltaDecoration[] = [];
    diff.proposedStatus.forEach((status, i) => {
      if (status === "unchanged") return;
      const isAdded = status === "added";
      decos.push({
        range: new monacoApi.Range(i + 1, 1, i + 1, 1),
        options: {
          isWholeLine: true,
          className: isAdded ? "review-line-added" : "review-line-modified",
          linesDecorationsClassName: isAdded
            ? "review-gutter-added"
            : "review-gutter-modified",
        },
      });
    });
    if (decorationRef.current) {
      decorationRef.current.set(decos);
    } else {
      decorationRef.current = editor.createDecorationsCollection(decos);
    }
  }, [diff]);

  const handleEditorMount = useCallback(
    (
      editor: MonacoEditorNS.IStandaloneCodeEditor,
      monacoApi: { Range: typeof MonacoRange }
    ) => {
      editorInstanceRef.current = editor;
      monacoInstanceRef.current = monacoApi;
      applyDecorations();
    },
    [applyDecorations]
  );

  // Re-apply decorations when the file or the diff changes (e.g. a second
  // suggestion opens the overlay with a fresh proposed file).
  useEffect(() => {
    applyDecorations();
  }, [applyDecorations, proposedCode]);

  // Close on Escape, mirroring the footer hint.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !applying) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, applying, onClose]);

  // Cleanup copy feedback timer.
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleAccept = useCallback(() => {
    onAccept();
  }, [onAccept]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText(proposedCode);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — silently ignore.
    }
  }, [proposedCode]);

  const langLabel =
    language.toLowerCase() === "cpp" || language.toLowerCase() === "c++"
      ? "C++"
      : language;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-ai-ignore
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm md:p-8"
        >
          <motion.div
            data-review-modal
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "flex flex-col overflow-hidden border bg-white dark:bg-[#0F1014]",
              "shadow-[0_24px_80px_rgba(15,23,42,0.16),0_4px_16px_rgba(15,23,42,0.08)]",
              "dark:shadow-[0_24px_80px_rgba(0,0,0,0.6),0_4px_16px_rgba(0,0,0,0.4)]",
              "border-[#E5E1EA] dark:border-[#292C35]",
              expanded
                ? "h-full w-full rounded-xl"
                : "h-[92vh] w-[min(1100px,96vw)] rounded-2xl md:h-[85vh]"
            )}
          >
            {/* ===== Header ===== */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E5E1EA] px-5 py-3.5 dark:border-[#292C35]">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#7C3AED]/10 text-[#7C3AED] ring-1 ring-inset ring-[#7C3AED]/15 dark:bg-[#8B5CF6]/15 dark:text-[#C4B5FD] dark:ring-[#8B5CF6]/20">
                  <Sparkles className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-semibold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
                    Review proposed changes
                  </h2>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="inline-flex max-w-[220px] items-center gap-1.5 rounded-md border border-[#E5E1EA] bg-[#F8F7FB] px-2 py-0.5 font-mono text-[11px] text-[#475569] dark:border-[#292C35] dark:bg-[#181A20] dark:text-[#9CA3AF]">
                      <FileCode2 className="h-3 w-3 shrink-0 text-[#7C3AED] dark:text-[#A78BFA]" />
                      <span className="truncate">{filename}</span>
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
                      {langLabel}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={applying}
                aria-label="Close review"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F3F2F7] hover:text-[#111827] disabled:opacity-50 dark:text-[#9CA3AF] dark:hover:bg-[#181A20] dark:hover:text-[#F3F4F6]"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* ===== AI Review ===== */}
            <div className="shrink-0 border-b border-[#E5E1EA] bg-[#F8F7FB] px-5 py-3.5 dark:border-[#292C35] dark:bg-[#181A20]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center text-[#7C3AED] dark:text-[#A78BFA]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#F3F4F6]">
                    AI Review
                  </h3>
                </div>
                <span className="rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#7C3AED] ring-1 ring-inset ring-[#7C3AED]/15 dark:bg-[#8B5CF6]/15 dark:text-[#C4B5FD] dark:ring-[#8B5CF6]/25">
                  AI generated
                </span>
              </div>
              {explanation && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#4B5563] dark:text-[#9CA3AF]">
                  {explanation}
                </p>
              )}
              {diff && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#22C55E]/25 bg-[#22C55E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#15803D] dark:border-[#22C55E]/30 dark:bg-[#22C55E]/15 dark:text-[#4ADE80]">
                    <Plus className="h-2.5 w-2.5" />
                    {diff.additions} addition{diff.additions === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#7C3AED]/25 bg-[#7C3AED]/10 px-2 py-0.5 text-[10px] font-semibold text-[#6D28D9] dark:border-[#8B5CF6]/30 dark:bg-[#8B5CF6]/15 dark:text-[#C4B5FD]">
                    <FileDiff className="h-2.5 w-2.5" />
                    {diff.modifications} modification
                    {diff.modifications === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#EF4444]/25 bg-[#EF4444]/10 px-2 py-0.5 text-[10px] font-semibold text-[#DC2626] dark:border-[#EF4444]/30 dark:bg-[#EF4444]/15 dark:text-[#F87171]">
                    <Minus className="h-2.5 w-2.5" />
                    {diff.deletions} deletion{diff.deletions === 1 ? "" : "s"}
                  </span>
                </div>
              )}
            </div>

            {/* ===== Editor chrome + whole-file editor ===== */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E5E1EA] bg-white px-4 py-1.5 dark:border-[#292C35] dark:bg-[#15171C]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-[#7C3AED]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7C3AED] dark:bg-[#8B5CF6]/15 dark:text-[#C4B5FD]">
                    {langLabel}
                  </span>
                  <span className="font-mono text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                    {filename}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopy}
                    disabled={applying}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors",
                      "border-[#E5E1EA] bg-white text-[#475569] hover:bg-[#F8F7FB] hover:text-[#111827]",
                      "dark:border-[#292C35] dark:bg-[#181A20] dark:text-[#C7CBD4] dark:hover:bg-[#1E2129] dark:hover:text-white",
                      copied && "border-[#22C55E]/40 text-[#15803D] dark:border-[#22C55E]/40 dark:text-[#4ADE80]"
                    )}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors",
                      "border-[#E5E1EA] bg-white text-[#475569] hover:bg-[#F8F7FB] hover:text-[#111827]",
                      "dark:border-[#292C35] dark:bg-[#181A20] dark:text-[#C7CBD4] dark:hover:bg-[#1E2129] dark:hover:text-white"
                    )}
                  >
                    {expanded ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                    {expanded ? "Collapse" : "Expand"}
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1">
                <MonacoEditorWrapper
                  language={language}
                  value={proposedCode}
                  options={options}
                  theme={isLight ? "review-light" : "review-dark"}
                  onMount={handleEditorMount}
                />
              </div>
            </div>

            {/* ===== Footer ===== */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#E5E1EA] bg-white px-5 py-3 dark:border-[#292C35] dark:bg-[#0F1014]">
              <p className="hidden items-center gap-1.5 text-[11px] text-[#9CA3AF] dark:text-[#6B7280] sm:flex">
                <kbd className="rounded-md border border-[#E5E1EA] bg-[#F8F7FB] px-1.5 py-0.5 font-mono text-[10px] text-[#64748B] dark:border-[#292C35] dark:bg-[#181A20] dark:text-[#9CA3AF]">
                  Esc
                </kbd>
                to close
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onReject}
                  disabled={applying}
                  className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-[#FCA5A5] bg-white px-4 text-[13px] font-semibold text-[#DC2626] transition-colors hover:border-[#F87171] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#7F1D1D] dark:bg-transparent dark:text-[#F87171] dark:hover:border-[#DC2626] dark:hover:bg-[#2A1416]"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={handleAccept}
                  disabled={applying}
                  className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#7C3AED] px-5 text-[13px] font-semibold text-white shadow-[0_2px_12px_rgba(124,58,237,0.3)] transition-colors hover:bg-[#6D28D9] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {applying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {applying ? "Applying…" : "Accept changes"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}