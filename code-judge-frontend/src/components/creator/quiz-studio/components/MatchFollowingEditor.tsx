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
  integer: Hash,
  text: Type,
  paragraph: AlignLeft,
  code_output: Code2,
  match_following: ListChecks,
};
const TYPE_SHORT: Record<string, string> = {
  single_choice: "MCQ",
  multiple_choice: "Multi",
  true_false: "T/F",
  fill_blanks: "Fill",
  integer: "Int",
  text: "Short",
  paragraph: "Long",
  code_output: "Code",
  match_following: "Match",
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
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [connectHoverRight, setConnectHoverRight] = useState<string | null>(null);
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

  // Trigger unsaved indicator on any change via effect-like logic in update
  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!q.title.replace(/<[^>]*>/g, "").trim()) errors.push("Question text cannot be empty.");
    if (left.length < 2 || right.length < 2) errors.push("Add at least 2 pairs.");
    const unmapped = left.filter((l) => !mapping[l.id]).length;
    if (unmapped > 0) errors.push(`${unmapped} item${unmapped > 1 ? "s" : ""} still need a correct match.`);
    // broken mappings
    for (const [k, v] of Object.entries(mapping)) {
      if (!right.some((r) => r.id === v)) errors.push("A mapping points to a deleted match — please remap.");
    }
    return errors;
  }, [q.title, left, right, mapping]);

  const needsMappingWarn = left.filter((l) => !mapping[l.id]).length > 0;

  // Actions for items
  const updateLeft = (id: string, content: string) =>
    update({ matchItems: left.map((x) => (x.id === id ? { ...x, content } : x)) });
  const updateRight = (id: string, content: string) =>
    update({ matchMatches: right.map((x) => (x.id === id ? { ...x, content } : x)) });

  const addLeft = () => {
    if (left.length >= 10) return;
    const newId = `${q.id}_left_${Date.now()}`;
    update({ matchItems: [...left, { id: newId, content: "" }] });
  };
  const addRight = () => {
    if (right.length >= 10) return;
    const newId = `${q.id}_right_${Date.now()}`;
    update({ matchMatches: [...right, { id: newId, content: "" }] });
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
    if (left.length <= 2) return;
    const nextLeft = left.filter((x) => x.id !== id);
    const nextMap = { ...mapping };
    delete nextMap[id];
    update({ matchItems: nextLeft, matchMapping: nextMap });
  };
  const removeRightRow = (id: string) => {
    if (right.length <= 2) return;
    const nextRight = right.filter((x) => x.id !== id);
    const nextMap = { ...mapping };
    for (const k of Object.keys(nextMap)) if (nextMap[k] === id) delete nextMap[k];
    update({ matchMatches: nextRight, matchMapping: nextMap });
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
    <div className="flex flex-1 flex-col min-h-0 bg-card">
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

      {/* ── Header toolbar ── */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E91E63]/10 border border-[#E91E63]/20">
              <Layers className="h-4 w-4 text-[#E91E63]" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-semibold tracking-tight text-text-primary leading-none">Match the Following</h1>
                <span className="hidden sm:inline text-xs text-text-muted">· Q{String(activeIdx + 1).padStart(2, "0")}</span>
              </div>
              <p className="mt-1 text-xs leading-none text-text-muted">Connect each item on the left with its correct match on the right.</p>
            </div>
            <span className="hidden sm:inline-flex items-center rounded-full bg-card-hover border border-border px-2 py-0.5 text-[10px] font-semibold tracking-wide text-text-secondary">
              MATCH
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* autosave indicator */}
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-text-muted mr-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", autoSaveState === "saved" ? "bg-emerald-500" : autoSaveState === "saving" ? "bg-amber-500 animate-pulse" : "bg-amber-400")} />
              {autoSaveState === "saving" ? "Saving…" : autoSaveState === "saved" ? "Saved" : "Unsaved changes"}
            </span>

            {/* Type changer — same as problem builder page */}
            <div className="relative">
              <button
                onClick={() => setShowType(!showType)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-card-hover"
              >
                {TYPE_SHORT[q.type]} <ChevronDown className="h-3 w-3 text-text-muted" />
              </button>
              {showType && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                  {(Object.keys(TYPE_SHORT) as string[]).map((t) => {
                    const Icon = TYPE_ICON[t];
                    const active = t === q.type;
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          if (t === "match_following") {
                            update({ type: t } as any);
                          } else if (t !== q.type) {
                            // keep match data but switch type — editor will unmount to generic
                            update({ type: t } as any);
                          }
                          setShowType(false);
                        }}
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
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] space-y-6 px-4 py-6 sm:px-6">
          {/* Question prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Question</label>
              <span className="text-[11px] text-text-muted">Rich text · bold, italic, code, links, images</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <RichToolbar />
              <EditableContent
                value={q.title}
                onChange={(html) => update({ title: html })}
                placeholder="Match each data structure with its primary use case."
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
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            {/* workspace header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#E91E63]" />
                <h2 className="text-sm font-semibold text-text-primary">Matching workspace</h2>
                <span className="rounded-full bg-card-hover border border-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">{pairCount} pairs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-text-muted">Drag to reorder · click to map</span>
                <button
                  onClick={() => setShowCreatorHelp(!showCreatorHelp)}
                  className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium", showCreatorHelp ? "border-[#E91E63]/30 bg-[#E91E63]/10 text-[#E91E63]" : "border-border bg-card text-text-muted hover:bg-card-hover")}
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
                  <div className="px-4 py-3 sm:px-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E91E63] text-white">
                        <Info className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-text-primary">Creator guide — connect one-by-one (exactly like students will)</p>
                        <p className="mt-0.5 text-[11px] text-text-muted">Connect each left item one-by-one with its right match. Students will follow the same 2-step click process.</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E91E63] text-white text-[11px]">1</span> Add items</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">Type 2–10 items in <b className="text-text-primary">Column A</b> and matches in <b className="text-text-primary">Column B</b>. Use <Plus className="inline h-3 w-3" /> Add Item.</p>
                          </div>
                          <div className="rounded-xl border border-[#E91E63]/30 bg-[#E91E63]/10 px-3 py-2.5">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#E91E63]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E91E63] text-white text-[11px]">2</span> Connect one-by-one <ArrowRight className="h-3 w-3" /></p>
                            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                              <span className="inline-flex items-center gap-1 font-medium text-text-primary"><MousePointer2 className="h-3 w-3 text-[#E91E63]" /> Click</span> any left card — it turns <span className="text-[#E91E63] font-medium">pink</span>. Then <span className="inline-flex items-center gap-1 font-medium text-text-primary"><MousePointer2 className="h-3 w-3 text-[#E91E63]" /> Click</span> its right match — pink dot connects. Or <span className="inline-flex items-center gap-1 font-medium"><Hand className="h-3 w-3" /> drag</span> left → drop on right.
                            </p>
                          </div>
                          <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[11px]">3</span> Verify mapping</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">Check <b className="text-text-primary">Correct Matches</b> below — every <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 align-middle" /> amber needs a link. Use dropdown to fix, <Link2 className="inline h-3 w-3 text-[#E91E63]" /> = linked.</p>
                          </div>
                        </div>
                        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-text-muted"><Lightbulb className="h-3 w-3 text-amber-500" /> <span>Pink border = selected, Pink dot = connected, Emerald = mapped, Amber = needs mapping. Delete auto-removes its link.</span></p>
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
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border">
                  <Link2 className="h-6 w-6 text-text-muted" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Build your matching pairs</h3>
                <p className="max-w-sm text-xs leading-relaxed text-text-muted">Add items to both columns and connect each item with its correct match.</p>
                <button onClick={addPair} className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[#E91E63] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D81B60]">
                  <Plus className="h-3.5 w-3.5" /> Add First Pair
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:divide-x divide-border">
                {/* LEFT COLUMN */}
                <div className="p-4">
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
                          draggable
                          onDragStart={() => { setDraggedLeftId(item.id); setSelectedLeftId(item.id); }}
                          onDragEnd={() => setDraggedLeftId(null)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.preventDefault(); const from = draggedLeftId; if (from && from !== item.id) reorderLeft(from, item.id); }}
                          onClick={() => setSelectedLeftId(item.id)}
                          className={cn(
                            "group flex items-center gap-2 rounded-xl border px-2.5 py-2.5 transition-all duration-200",
                            isSelected ? "border-[#E91E63]/30 bg-[#E91E63]/[0.06] shadow-[0_0_0_2px_rgba(233,30,99,0.08)]" : isMapped ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5" : "border-border bg-card hover:border-border"
                          )}
                        >
                          <span className="flex cursor-grab items-center text-text-muted hover:text-text-secondary">
                            <GripVertical className="h-3.5 w-3.5" />
                          </span>
                          <span className={cn("flex h-6 min-w-7 items-center justify-center rounded-lg border text-[11px] font-bold tabular-nums", isMapped ? "border-emerald-500 bg-emerald-500 text-white" : isSelected ? "border-[#E91E63] bg-[#E91E63] text-white animate-pulse" : "border-border bg-card-hover text-text-primary")}>
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
                          {/* pink connection dot */}
                          <span className={cn("h-2 w-2 shrink-0 rounded-full transition-all", isMapped ? "bg-[#E91E63] shadow-[0_0_6px_rgba(233,30,99,0.6)] animate-pulse" : isSelected ? "bg-[#E91E63]/60" : "bg-border")} />
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
                        <MousePointer2 className="h-3 w-3" /> Left selected — now click any card in Column B to link (one-by-one)
                      </motion.p>
                    ) : (
                      <p className="mt-2 text-center text-[11px] text-text-muted">Click a left card first, then its right match — one pair at a time</p>
                    )}
                  </AnimatePresence>
                </div>

                {/* RIGHT COLUMN */}
                <div className="p-4 border-t lg:border-t-0">
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
                      const isAwaiting = !!selectedLeftId && !isMapped;
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => e.preventDefault()}
                          onDragOver={(e) => { e.preventDefault(); setConnectHoverRight(item.id); }}
                          onDragLeave={() => setConnectHoverRight(null)}
                          onDrop={(e) => { e.preventDefault(); setConnectHoverRight(null); handleDropMapping(item.id); }}
                          onClick={() => {
                            if (selectedLeftId) handleDropMapping(item.id);
                            else if (draggedLeftId) handleDropMapping(item.id);
                          }}
                          className={cn(
                            "group flex items-center gap-2 rounded-xl border px-2.5 py-2.5 transition-all duration-200",
                            isDropHover ? "border-[#E91E63] bg-[#E91E63]/10 scale-[1.01] shadow-[0_0_0_3px_rgba(233,30,99,0.12)]" : isMapped ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5" : isAwaiting ? "border-[#E91E63]/40 bg-[#E91E63]/[0.05] hover:border-[#E91E63] animate-pulse" : "border-border bg-card hover:border-border"
                          )}
                        >
                          <span className="flex cursor-grab items-center text-text-muted">
                            <GripVertical className="h-3.5 w-3.5" />
                          </span>
                          <span className={cn("flex h-6 min-w-7 items-center justify-center rounded-lg border text-[11px] font-bold", isMapped ? "border-emerald-500 bg-emerald-500 text-white" : isAwaiting ? "border-[#E91E63] bg-[#E91E63] text-white animate-pulse" : "border-border bg-card-hover text-text-primary")}>
                            {ALPHA[idx] ?? String(idx + 1)}
                          </span>
                          <input
                            value={item.content}
                            onChange={(e) => updateRight(item.id, e.target.value)}
                            placeholder={isAwaiting ? `Click to link →` : `Match ${ALPHA[idx] ?? idx + 1}`}
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
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", isMapped ? "bg-emerald-500" : "bg-border")} />
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

          {/* Correct Answer Mapping */}
          {!isEmpty && (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Correct Matches</h3>
                  <span className={cn("text-xs font-medium", Object.keys(mapping).length === left.length ? "text-emerald-600" : "text-amber-600")}>{Object.keys(mapping).length} / {left.length} mapped</span>
                </div>
                <p className="mt-1 text-xs text-text-muted">Verify one-by-one pairing — each left row needs exactly one right match. <b className="text-text-primary">Click left → click right</b> above, or pick via dropdown here. Pink = linked, amber = pending.</p>
              </div>

              <div className="border-t border-border">
                {/* header row */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <span>Item</span>
                  <span className="text-center">→</span>
                  <span>Correct Match</span>
                </div>

                <div className="divide-y divide-border">
                  {left.map((l, idx) => {
                    const mapped = mapping[l.id];
                    const isUnmapped = !mapped;
                    return (
                      <div key={l.id} className={cn("grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2.5", isUnmapped && "bg-amber-50/50 dark:bg-amber-500/5")}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-card-hover border border-border text-[11px] font-bold text-text-primary">{pad(idx)}</span>
                          <span className="truncate text-sm font-medium text-text-primary">{l.content || <span className="text-text-muted italic">Empty</span>}</span>
                          {isUnmapped && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
                        </div>
                        <div className="flex justify-center">
                          {mapped ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E91E63] text-white shadow-[0_0_8px_rgba(233,30,99,0.4)]">
                              <Link2 className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="h-px w-6 bg-border" />
                          )}
                        </div>
                        <div className="relative">
                          <select
                            value={mapped ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) {
                                const nm = { ...mapping }; delete nm[l.id]; update({ matchMapping: nm });
                              } else update({ matchMapping: { ...mapping, [l.id]: v } });
                            }}
                            className="h-8 w-full rounded-lg border border-border bg-card px-2 pr-7 text-xs text-text-primary focus:outline-none focus:border-[#E91E63]/40"
                          >
                            <option value="">Select match…</option>
                            {right.map((r, i) => (
                              <option key={r.id} value={r.id}>{ALPHA[i]} · {r.content || "Empty"}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {needsMappingWarn && (
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400 border-t border-amber-200/50">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>⚠️ {left.filter((l) => !mapping[l.id]).length} item(s) still need a correct match.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Matching Behaviour */}
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <div className="px-4 py-3 sm:px-5 border-b border-border flex items-center gap-2">
              <Shuffle className="h-3.5 w-3.5 text-text-muted" />
              <h3 className="text-sm font-semibold text-text-primary">Matching Behaviour</h3>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-sm font-medium text-text-primary">Shuffle Column B</p>
                  <p className="text-xs text-text-muted">Randomize the right-side options for students.</p>
                </div>
                <Toggle enabled={!!q.shuffleColumnB} onToggle={() => update({ shuffleColumnB: !q.shuffleColumnB })} />
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-sm font-medium text-text-primary">Shuffle Column A</p>
                  <p className="text-xs text-text-muted">Randomize the left-side items for students.</p>
                </div>
                <Toggle enabled={!!q.shuffleColumnA} onToggle={() => update({ shuffleColumnA: !q.shuffleColumnA })} />
              </div>
            </div>
            <p className="px-4 py-2.5 text-[11px] leading-relaxed text-text-muted bg-card">Correct mapping remains intact even when options are shuffled for students.</p>
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

                    {/* Student Interaction */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Student Interaction</h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { id: "drag", label: "Drag & drop" },
                          { id: "click", label: "Click to match" },
                          { id: "both", label: "Both" },
                        ].map((opt) => {
                          const active = (q.interactionMode ?? "both") === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => update({ interactionMode: opt.id as any })}
                              className={cn(
                                "rounded-xl border px-4 py-2 text-xs font-medium transition-colors",
                                active ? "border-[#E91E63] bg-[#E91E63] text-white" : "border-border bg-card text-text-secondary hover:bg-card-hover"
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[11px] text-text-muted">Default: Both — students can drag or click to connect.</p>
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

          {/* Question-specific game mechanics moved to dedicated Game Mechanics page */}
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              <span className="font-medium text-text-primary">🎮 Game Mechanics</span> — lifelines & power-ups are now quiz-wide.
            </p>
            <a href={state.serverQuizId ? `/creator/quizzes/${state.serverQuizId}/game-mechanics` : "#"} className="text-xs font-medium text-[#E91E63] hover:underline">
              Configure →
            </a>
          </div>

          <p className="text-center text-[11px] text-text-muted">Question {activeIdx + 1} · {pairCount} pairs · Marks {q.marks} · {q.difficulty}</p>
        </div>
      </div>

      {/* Student preview */}
      <MatchingStudentPreview open={previewOpen} onClose={() => setPreviewOpen(false)} question={q} />
    </div>
  );
}
