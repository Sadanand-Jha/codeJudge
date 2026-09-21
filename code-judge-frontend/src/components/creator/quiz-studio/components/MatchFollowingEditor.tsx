"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  Trash2,
  Plus,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Settings2,
  Eye,
  Link2,
  Shuffle,
  AlertTriangle,
  Sparkles,
  Check,
  X,
  Layers,
  Info,
  MousePointer2,
  Hand,
  ArrowRight,
  Lightbulb,
  HelpCircle,
  CircleDot,
  ListChecks,
  ToggleRight,
  FileText,
  Hash,
  Type,
  AlignLeft,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import type { CreatorQuestion, MatchItem } from "@/components/quiz/creator/types";
import { useStudio } from "../StudioProvider";

const SELECTABLE_TYPES = [
  "single_choice", "multiple_choice", "true_false", "fill_blanks", "match_following",
];
import { EditableContent, RichToolbar } from "./RichToolbar";
import { MatchingStudentPreview } from "./MatchingStudentPreview";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const ALPHA = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const pad = (n: number) => String(n + 1).padStart(2, "0");

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  single_choice: CircleDot,
  multiple_choice: ListChecks,
  true_false: ToggleRight,
  fill_blanks: FileText,
  text: Type,
  match_following: ListChecks,
  integer: Hash,
  paragraph: AlignLeft,
  code_output: Code2,
};
const TYPE_SHORT: Record<string, string> = {
  single_choice: "MCQ",
  multiple_choice: "Multi",
  true_false: "T/F",
  fill_blanks: "Fill",
  text: "Short",
  match_following: "Match",
  integer: "Int",
  paragraph: "Long",
  code_output: "Code",
};
const TYPE_DESC: Record<string, string> = {
  single_choice: "Single correct answer",
  multiple_choice: "Multiple correct answers",
  true_false: "True / False",
  fill_blanks: "Fill in the Blank",
  integer: "Numerical",
  text: "Short Answer",
  paragraph: "Long Answer",
  code_output: "Coding",
  match_following: "Match the Following",
};

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200",
        enabled
          ? "bg-[#E91E63] border-[#E91E63]"
          : "bg-card border-border"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200",
          enabled ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Main Editor
// ─────────────────────────────────────────────────────────

export function MatchFollowingEditor() {
  const { state, updateQuestion, duplicateQuestion, removeQuestion } = useStudio();
  const q = state.questions.find((x) => x.id === state.activeQuestionId);
  if (!q || q.type !== "match_following") return null;

  const left: MatchItem[] = q.matchItems ?? [];
  const right: MatchItem[] = q.matchMatches ?? [];
  const mapping: Record<string, string> = q.matchMapping ?? {};
  const pairCount = Math.min(left.length, right.length);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showCreatorHelp, setShowCreatorHelp] = useState(true);
  const [showType, setShowType] = useState(false);
  const [draggedLeftId, setDraggedLeftId] = useState<string | null>(null);
  const [draggedRightId, setDraggedRightId] = useState<string | null>(null);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [connectHoverRight, setConnectHoverRight] = useState<string | null>(null);
  const [dragOverLeftId, setDragOverLeftId] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [autoSaveState, setAutoSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImg = useRef<{ col: "left" | "right"; id: string } | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(
    (patch: Partial<CreatorQuestion>) => {
      setAutoSaveState("saving");
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => setAutoSaveState("saved"), 700);
      updateQuestion(q.id, { ...patch, updatedAt: new Date().toISOString() });
    },
    [q.id, updateQuestion]
  );

  const hasDataToLose = (qq: CreatorQuestion) => {
    const hasTitle = qq.title.replace(/<[^>]*>/g, "").trim().length > 0;
    const hasMatch = (qq.matchItems?.some((m) => m.content.trim().length > 0) || qq.matchMatches?.some((m) => m.content.trim().length > 0));
    const hasExplain = qq.explanation.trim().length > 0;
    return hasTitle || !!hasMatch || !!hasExplain;
  };

  const doSwitchType = (t: string) => {
    update({ type: t as any });
    setShowType(false);
    setPendingType(null);
  };

  const requestTypeChange = (t: string) => {
    if (t === q.type) { setShowType(false); return; }
    if (hasDataToLose(q)) setPendingType(t);
    else doSwitchType(t);
  };

  // Trigger unsaved indicator on any change via effect-like logic in update
  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!q.title.replace(/<[^>]*>/g, "").trim()) errors.push("Question text cannot be empty.");
    if (left.length < 2 || right.length < 2) errors.push("Add at least 2 pairs.");
    // Line-wise: same row = correct pair, check index fallback
    const unmappedLineWise = left.filter((l, idx) => {
      if (mapping[l.id]) return false;
      return !right[idx]?.content?.trim();
    }).length;
    if (unmappedLineWise > 0) errors.push(`${unmappedLineWise} row${unmappedLineWise > 1 ? "s" : ""} need Column B on same line.`);
    // broken mappings
    for (const [k, v] of Object.entries(mapping)) {
      if (!right.some((r) => r.id === v)) errors.push("A mapping points to a deleted match — please remap.");
    }
    return errors;
  }, [q.title, left, right, mapping]);

  // Actions for items
  const updateLeft = (id: string, content: string) =>
    update({ matchItems: left.map((x) => (x.id === id ? { ...x, content } : x)) });
  const updateRight = (id: string, content: string) =>
    update({ matchMatches: right.map((x) => (x.id === id ? { ...x, content } : x)) });

  const addLeft = () => {
    // Dual-side: adding a row adds on both columns line-wise
    if (left.length >= 10 || right.length >= 10) return;
    const lid = `${q.id}_left_${Date.now()}`;
    const rid = `${q.id}_right_${Date.now() + 1}`;
    update({ matchItems: [...left, { id: lid, content: "" }], matchMatches: [...right, { id: rid, content: "" }] });
  };
  const addRight = () => {
    if (left.length >= 10 || right.length >= 10) return;
    const lid = `${q.id}_left_${Date.now()}`;
    const rid = `${q.id}_right_${Date.now() + 1}`;
    update({ matchItems: [...left, { id: lid, content: "" }], matchMatches: [...right, { id: rid, content: "" }] });
  };
  const addPair = () => {
    if (left.length >= 10 || right.length >= 10) return;
    const lid = `${q.id}_left_${Date.now()}`;
    const rid = `${q.id}_right_${Date.now() + 1}`;
    update({
      matchItems: [...left, { id: lid, content: "" }],
      matchMatches: [...right, { id: rid, content: "" }],
    });
  };

  const removeLeftRow = (id: string) => {
    // Line-wise: delete same row on both columns (as creator adds line-wise)
    if (left.length <= 2 || right.length <= 2) return;
    const idx = left.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const rightIdToDelete = right[idx]?.id;
    const nextLeft = left.filter((_, i) => i !== idx);
    const nextRight = right.filter((_, i) => i !== idx);
    const nextMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(mapping)) {
      if (k === id) continue;
      if (v === rightIdToDelete) continue;
      // re-map keeping remaining ids; if mapping pointed to deleted right, it was already skipped
      // if left index shifted, keep original id mapping — line-wise fallback handles index
      nextMap[k] = v;
    }
    // If rightIdToDelete was mapped by some left, that left is already removed (if idx left) or will be orphaned — clean it
    update({ matchItems: nextLeft, matchMatches: nextRight, matchMapping: nextMap });
  };
  const removeRightRow = (id: string) => {
    if (left.length <= 2 || right.length <= 2) return;
    const idx = right.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const leftIdToDelete = left[idx]?.id;
    const nextRight = right.filter((_, i) => i !== idx);
    const nextLeft = left.filter((_, i) => i !== idx);
    const nextMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(mapping)) {
      if (k === leftIdToDelete) continue;
      if (v === id) continue;
      nextMap[k] = v;
    }
    update({ matchItems: nextLeft, matchMatches: nextRight, matchMapping: nextMap });
  };

  const reorderLeft = (fromId: string, toId: string) => {
    const from = left.findIndex((x) => x.id === fromId);
    const to = left.findIndex((x) => x.id === toId);
    if (from === -1 || to === -1 || from === to) return;
    const copy = [...left];
    const [m] = copy.splice(from, 1);
    copy.splice(to, 0, m);
    update({ matchItems: copy });
  };
  const reorderRight = (fromId: string, toId: string) => {
    const from = right.findIndex((x) => x.id === fromId);
    const to = right.findIndex((x) => x.id === toId);
    if (from === -1 || to === -1 || from === to) return;
    const copy = [...right];
    const [m] = copy.splice(from, 1);
    copy.splice(to, 0, m);
    update({ matchMatches: copy });
  };

  const handleMap = (leftId: string, rightId: string) => {
    update({ matchMapping: { ...mapping, [leftId]: rightId } });
    setSelectedLeftId(null);
  };

  const handleDropMapping = (rightId: string) => {
    if (draggedLeftId) {
      handleMap(draggedLeftId, rightId);
      setDraggedLeftId(null);
    } else if (selectedLeftId) {
      handleMap(selectedLeftId, rightId);
    }
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const tgt = pendingImg.current;
    e.target.value = "";
    if (!f || !tgt) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        if (tgt.col === "left")
          update({ matchItems: left.map((x) => (x.id === tgt.id ? { ...x, imageUrl: reader.result as string } : x)) });
        else update({ matchMatches: right.map((x) => (x.id === tgt.id ? { ...x, imageUrl: reader.result as string } : x)) });
      }
    };
    reader.readAsDataURL(f);
  };

  const activeIdx = state.questions.findIndex((x) => x.id === q.id);

  // Empty state
  const isEmpty = left.length === 0 && right.length === 0;

  return (
    <div className="flex w-full max-w-full min-w-0 flex-1 flex-col overflow-x-hidden bg-card">
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

      {/* ── Header toolbar ── */}
      <div className="shrink-0 border-b border-border bg-card px-3 py-3 sm:px-6 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E91E63]/10 border border-[#E91E63]/20">
              <Layers className="h-4 w-4 text-[#E91E63]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-[14px] sm:text-[15px] font-semibold tracking-tight text-text-primary leading-none break-words">Match the Following</h1>
                <span className="text-xs text-text-muted">· Q{String(activeIdx + 1).padStart(2, "0")}</span>
              </div>
              <p className="mt-1 text-[11px] sm:text-xs leading-snug text-text-muted break-words">Add pairs line-wise — Column A row 1 matches Column B row 1. Students see Column B shuffled.</p>
            </div>
            <span className="hidden sm:inline-flex shrink-0 items-center rounded-full bg-card-hover border border-border px-2 py-0.5 text-[10px] font-semibold tracking-wide text-text-secondary">
              MATCH
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 self-start sm:self-auto">
            {/* Type changer — same as problem builder page */}
            <div className="relative">
              <button
                onClick={() => setShowType(!showType)}
                className="inline-flex max-w-[110px] items-center gap-1 truncate rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium text-text-primary hover:bg-card-hover sm:max-w-none sm:px-3"
              >
                <span className="truncate">{TYPE_SHORT[q.type]}</span> <ChevronDown className="h-3 w-3 shrink-0 text-text-muted" />
              </button>
              {showType && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                  {SELECTABLE_TYPES.map((t) => {
                    const Icon = TYPE_ICON[t];
                    const active = t === q.type;
                    return (
                      <button
                        key={t}
                        onClick={() => requestTypeChange(t)}
                        className={cn("flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-card-hover", active && "bg-pink-50 dark:bg-pink-500/10")}
                      >
                        <Icon className={cn("h-4 w-4 mt-0.5", active ? "text-[#E91E63]" : "text-text-muted")} />
                        <div>
                          <p className={cn("text-xs font-medium", active ? "text-[#E91E63]" : "text-text-primary")}>
                            {TYPE_SHORT[t]} — {TYPE_DESC[t]}
                          </p>
                        </div>
                        {active && <Check className="ml-auto h-4 w-4 text-[#E91E63]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={() => duplicateQuestion(q.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-muted hover:bg-card-hover"
              title="Duplicate question"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
              </svg>
            </button>
            <button
              onClick={() => removeQuestion(q.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-muted hover:bg-card-hover hover:text-red-500"
              title="Delete question"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {showType && <div className="fixed inset-0 z-40" onClick={() => setShowType(false)} />}
      </div>

      {/* ── Main scroll area ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex w-full max-w-full min-w-0 max-w-[880px] flex-col space-y-4 sm:space-y-6 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6">
          {/* Question prompt — rich text editor for the problem statement */}
          <div className="w-full max-w-full min-w-0 space-y-2 overflow-hidden">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Question</label>
              <span className="text-[10px] sm:text-[11px] text-text-muted break-words">Rich text · bold, italic, code, links, images</span>
            </div>
            {/* bg-card (white) instead of bg-background (gray) for consistent look with QuestionEditor */}
            <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
              <RichToolbar />
              <EditableContent
                value={q.title}
                onChange={(html) => update({ title: html })}
                placeholder="Match the following"
                minHeight="min-h-[96px]"
              />
            </div>
            {!q.title.replace(/<[^>]*>/g, "").trim() && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> Question text cannot be empty.
              </p>
            )}
          </div>

          {/* Matching workspace — centerpiece */}
          <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-background">
            {/* workspace header */}
            <div className="flex flex-col gap-2 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#E91E63]" />
                <h2 className="min-w-0 break-words text-sm font-semibold text-text-primary">Matching workspace</h2>
                <span className="shrink-0 rounded-full bg-card-hover border border-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">{pairCount} pairs</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                <span className="hidden sm:inline text-xs text-text-muted">Line-wise pairs · Students see Column B shuffled</span>
                <button
                  onClick={() => setShowCreatorHelp(!showCreatorHelp)}
                  className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium", showCreatorHelp ? "border-[#E91E63]/30 bg-[#E91E63]/10 text-[#E91E63]" : "border-border bg-card text-text-muted hover:bg-card-hover")}
                >
                  <HelpCircle className="h-3 w-3" /> {showCreatorHelp ? "Hide help" : "How to?"}
                </button>
              </div>
            </div>

            {/* Creator how-to — explains one-by-one click */}
            <AnimatePresence initial={false}>
              {showCreatorHelp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-border bg-[#E91E63]/[0.04]"
                >
                  <div className="w-full max-w-full min-w-0 overflow-hidden px-3 py-3 sm:px-5">
                    <div className="flex w-full max-w-full min-w-0 items-start gap-2 sm:gap-3 overflow-hidden">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E91E63] text-white">
                        <Info className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="break-words text-xs font-semibold text-text-primary">Just add columns line-wise — same row = correct pair</p>
                        <p className="mt-0.5 break-words text-[11px] leading-relaxed text-text-muted">Creator: type Column A and Column B on the <b className="text-text-primary">same line</b>. That line is the correct answer. Students will see Column B in <b className="text-text-primary">random order</b> and must recreate the lines.</p>
                        <div className="mt-3 grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E91E63] text-white text-[11px]">1</span> Add line-wise</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">Row <b className="text-text-primary">01</b>: type <b className="text-text-primary">A1</b> and its correct <b className="text-text-primary">B1</b> on the same line. Row 02: A2 ↔ B2, etc. Use <Plus className="inline h-3 w-3" /> Add Pair or add per column.</p>
                          </div>
                          <div className="rounded-xl border border-[#E91E63]/30 bg-[#E91E63]/10 px-3 py-2.5">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#E91E63]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E91E63] text-white text-[11px]">2</span> Correct = front <ArrowRight className="h-3 w-3" /></p>
                            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                              Example: A: <b>France</b> front-of <b>Paris</b>, A: <b>Japan</b> front-of <b>Tokyo</b>. No extra click needed — same line <span className="text-[#E91E63] font-medium">is the answer</span>. Mapping below just mirrors the lines.
                            </p>
                          </div>
                          <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[11px]">3</span> Students see shuffled</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">Creator view stays line-wise. Student view shuffles <b className="text-text-primary">Column B</b> (and optionally A). Check <b className="text-text-primary">Correct Matches</b> below — amber means that row has no front match.</p>
                          </div>
                        </div>
                        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-text-muted"><Lightbulb className="h-3 w-3 text-amber-500" /> <span>Tip: Keep pairs on the same line number. If you reorder, re-check Correct Matches. <Shuffle className="inline h-3 w-3" /> shuffle toggles do not break the line-wise answer.</span></p>
                      </div>
                      <button onClick={() => setShowCreatorHelp(false)} className="shrink-0 rounded-lg p-1 text-text-muted hover:bg-card-hover">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isEmpty ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 sm:px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border">
                  <Link2 className="h-6 w-6 text-text-muted" />
                </div>
                <h3 className="break-words text-sm font-semibold text-text-primary">Build your matching pairs</h3>
                <p className="max-w-sm break-words text-xs leading-relaxed text-text-muted">Add items to both columns and connect each item with its correct match.</p>
                <button onClick={addPair} className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[#E91E63] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D81B60]">
                  <Plus className="h-3.5 w-3.5" /> Add First Pair
                </button>
              </div>
            ) : (
              <div className="grid w-full max-w-full min-w-0 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2 lg:divide-x divide-border">
                {/* LEFT COLUMN */}
                <div className="w-full max-w-full min-w-0 overflow-hidden p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Column A</h3>
                      <p className="text-[11px] text-text-muted">Items</p>
                    </div>
                    <span className="rounded-full bg-card border border-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">{left.length} items</span>
                  </div>
                  <div className="space-y-2">
                    {left.map((item, idx) => {
                      const mappedRightId = mapping[item.id];
                      const mappedRight = right.find((r) => r.id === mappedRightId);
                      const isSelected = selectedLeftId === item.id;
                      const isMapped = !!mappedRightId;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedLeftId(item.id)}
                          className={cn(
                            "group flex items-center gap-2 rounded-xl border px-2.5 py-2.5 transition-all duration-200 cursor-pointer",
                            isSelected ? "border-[#E91E63]/30 bg-[#E91E63]/[0.06] shadow-[0_0_0_2px_rgba(233,30,99,0.08)]" : "border-border bg-card hover:border-border"
                          )}
                        >
                          <span className="flex items-center text-text-muted">
                            <GripVertical className="h-3.5 w-3.5 opacity-30" />
                          </span>
                          <span className={cn("flex h-6 min-w-7 items-center justify-center rounded-lg border text-[11px] font-bold tabular-nums", isSelected ? "border-[#E91E63] bg-[#E91E63] text-white animate-pulse" : "border-border bg-card-hover text-text-primary")}>
                            {pad(idx)}
                          </span>
                          <input
                            value={item.content}
                            onChange={(e) => updateLeft(item.id, e.target.value)}
                            placeholder={`Item ${pad(idx)} — click to select`}
                            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                            onFocus={() => setSelectedLeftId(item.id)}
                          />
                          {item.imageUrl && <img src={item.imageUrl} alt="" className="h-7 w-7 rounded object-cover border" />}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); pendingImg.current = { col: "left", id: item.id }; imageInputRef.current?.click(); }}
                              className="rounded p-1 text-text-muted hover:bg-card-hover"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeLeftRow(item.id); }}
                              className="rounded p-1 text-text-muted hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* arrow indicator — same row maps to Column B */}
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#E91E63]/40" />
                          {/* connection dot - no green, just pink when selected else neutral */}
                          <span className={cn("h-2 w-2 shrink-0 rounded-full transition-all", isSelected ? "bg-[#E91E63]/60" : "bg-border")} />
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={addLeft}
                    disabled={left.length >= 10}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-pink-300 dark:border-pink-400/30 bg-pink-50/50 dark:bg-pink-500/10 py-2 text-xs font-medium text-[#E91E63] hover:bg-pink-50 dark:hover:bg-pink-500/15 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </button>
                  <AnimatePresence>
                    {selectedLeftId ? (
                      <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-[#E91E63]">
                        <MousePointer2 className="h-3 w-3" /> Row selected — correct answer is Column B on the same line
                      </motion.p>
                    ) : (
                      <p className="mt-2 text-center text-[11px] text-text-muted">Tip: Keep pairs on the same row number — Row 01 A ↔ Row 01 B is the correct pair for students (B will be shuffled)</p>
                    )}
                  </AnimatePresence>
                </div>

                {/* RIGHT COLUMN */}
                <div className="w-full max-w-full min-w-0 overflow-hidden p-3 sm:p-4 border-t lg:border-t-0">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Column B</h3>
                      <p className="text-[11px] text-text-muted">Matches</p>
                    </div>
                    <span className="rounded-full bg-card border border-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">{right.length} matches</span>
                  </div>
                  <div className="space-y-2">
                    {right.map((item, idx) => {
                      const isTarget = Object.values(mapping).includes(item.id);
                      const isDropHover = connectHoverRight === item.id;
                      const isMapped = isTarget;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (selectedLeftId) handleDropMapping(item.id);
                          }}
                          className={cn(
                            "group flex items-center gap-2 rounded-xl border px-2.5 py-2.5 transition-all duration-200 cursor-pointer",
                            isDropHover ? "border-[#E91E63] bg-[#E91E63]/10 scale-[1.01] shadow-[0_0_0_3px_rgba(233,30,99,0.12)]" : "border-border bg-card hover:border-border"
                          )}
                        >
                          <span className="flex items-center text-text-muted">
                            <GripVertical className="h-3.5 w-3.5 opacity-30" />
                          </span>
                          <span className={cn("flex h-6 min-w-7 items-center justify-center rounded-lg border text-[11px] font-bold", "border-border bg-card-hover text-text-primary")}>
                            {ALPHA[idx] ?? String(idx + 1)}
                          </span>
                          <input
                            value={item.content}
                            onChange={(e) => updateRight(item.id, e.target.value)}
                            placeholder={`Match ${ALPHA[idx] ?? idx + 1}`}
                            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {item.imageUrl && <img src={item.imageUrl} alt="" className="h-7 w-7 rounded object-cover border" />}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); pendingImg.current = { col: "right", id: item.id }; imageInputRef.current?.click(); }}
                              className="rounded p-1 text-text-muted hover:bg-card-hover"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeRightRow(item.id); }}
                              className="rounded p-1 text-text-muted hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="h-2 w-2 shrink-0 rounded-full bg-border" />
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={addRight}
                    disabled={right.length >= 10}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-pink-300 dark:border-pink-400/30 bg-pink-50/50 dark:bg-pink-500/10 py-2 text-xs font-medium text-[#E91E63] hover:bg-pink-50 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Match
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview button prominent */}
          <button
            onClick={() => setPreviewOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E91E63] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#D81B60] shadow-[0_4px_16px_rgba(233,30,99,0.25)] transition-colors"
          >
            <Eye className="h-4 w-4" /> Preview Question
          </button>

          {/* Validation inline */}
          {validation.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> Fix before publishing</p>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                {validation.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex w-full items-center justify-between px-4 py-3.5 sm:px-5 hover:bg-card-hover/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Settings2 className="h-4 w-4 text-text-muted" /> Advanced Settings
              </span>
              {advancedOpen ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
            </button>
            <AnimatePresence initial={false}>
              {advancedOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-border"
                >
                  <div className="space-y-6 p-4 sm:p-5">
                    {/* Scoring */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Scoring</h4>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-text-secondary">Marks</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={q.marks}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, "");
                              update({ marks: v === "" ? 0 : Math.max(0, Number(v) || 0) });
                            }}
                            className="h-9 rounded-xl border border-border bg-card px-3 text-sm"
                          />
                        </label>
                        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                          <div>
                            <p className="text-xs font-medium text-text-primary">Partial marking</p>
                            <p className="text-[11px] text-text-muted">Proportional marks</p>
                          </div>
                          <Toggle enabled={!!q.partialMarking} onToggle={() => update({ partialMarking: !q.partialMarking })} />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                          <div>
                            <p className="text-xs font-medium text-text-primary">Negative marking</p>
                            <p className="text-[11px] text-text-muted">Penalty for wrong</p>
                          </div>
                          <Toggle enabled={!!q.negativeMarkingEnabled} onToggle={() => update({ negativeMarkingEnabled: !q.negativeMarkingEnabled })} />
                        </div>
                      </div>
                      {q.partialMarking && (
                        <p className="mt-2 text-[11px] text-text-muted">Award proportional marks for partially correct matches.</p>
                      )}
                      {q.negativeMarkingEnabled && (
                        <label className="mt-3 flex items-center gap-2 text-xs">
                          <span className="text-text-secondary">Negative marks</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={q.negativeMarks ?? 0}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, "");
                              update({ negativeMarks: v === "" ? 0 : Math.max(0, Number(v) || 0) });
                            }}
                            className="h-7 w-20 rounded-lg border border-border bg-card px-2 text-xs"
                          />
                        </label>
                      )}
                    </div>

                    {/* Student Interaction — tap only (drag removed) */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Student Interaction</h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => update({ interactionMode: "click" as any })}
                          className="rounded-xl border px-4 py-2 text-xs font-medium border-[#E91E63] bg-[#E91E63] text-white"
                        >
                          Tap to pair
                        </button>
                        <span className="inline-flex items-center px-3 py-1 text-[11px] text-text-muted">Tap Column A → Tap Column B (same row = correct, B shuffled for students)</span>
                      </div>
                      <p className="mt-2 text-[11px] text-text-muted">Students tap to pair — no drag. Blue highlight only when all pairs correctly matched.</p>
                    </div>

                    {/* Feedback */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Feedback</h4>
                      <div className="mt-3 space-y-2">
                        <label className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                          <span className="text-xs font-medium text-text-primary">Show correct answers after submission</span>
                          <Toggle enabled={!!q.showCorrectAfterSubmit} onToggle={() => update({ showCorrectAfterSubmit: !q.showCorrectAfterSubmit })} />
                        </label>
                        <label className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                          <span className="text-xs font-medium text-text-primary">Show explanation after submission</span>
                          <Toggle enabled={!!q.showExplanationAfterSubmit} onToggle={() => update({ showExplanationAfterSubmit: !q.showExplanationAfterSubmit })} />
                        </label>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Explanation (shown after submission if enabled)</label>
                      <textarea
                        value={q.explanation}
                        onChange={(e) => update({ explanation: e.target.value })}
                        placeholder="Explain the correct pairings…"
                        rows={3}
                        className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-center text-[11px] text-text-muted">Question {activeIdx + 1} · {pairCount} pairs · Marks {q.marks} · {q.difficulty}</p>
        </div>
      </div>

      {/* Student preview */}
      <MatchingStudentPreview open={previewOpen} onClose={() => setPreviewOpen(false)} question={q} />
      {pendingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPendingType(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">Change question type?</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  You have written data for <span className="font-semibold text-text-primary">Match</span>. Switching to <span className="font-semibold text-[#E91E63]">{pendingType?.replace("_", " ")}</span> will remove existing matching pairs / correct answer. <span className="font-medium">Kyoki phir options type etc mei dikkat ho jayega.</span>
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingType(null)} className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-card-hover">Cancel</button>
              <button type="button" onClick={() => doSwitchType(pendingType)} className="rounded-lg bg-[#E91E63] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D81B60]">Continue, remove data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
