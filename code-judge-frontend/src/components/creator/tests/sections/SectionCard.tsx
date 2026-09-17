"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Calculator,
  Sparkles,
  BookOpen,
  Layers,
  Check,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  type Section,
  type QuestionGroup,
  type QuestionType,
  type SubQuestion,
  type NestedTypeConfigItem,
  QUESTION_TYPES,
  createDefaultQuestionGroup,
  createDefaultSubQuestion,
  createDefaultNestedConfig,
  generateChildrenFromConfig,
  relabelSubQuestions,
  getSectionQuestionCount,
  getSectionAvailableMarks,
  getSectionMarks,
} from "./types";

export function SectionCard({
  section,
  index,
  totalSections,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAIGenerate,
}: {
  section: Section;
  index: number;
  totalSections: number;
  onUpdate: (id: string, patch: Partial<Section>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onAIGenerate?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const qCount = getSectionQuestionCount(section);
  const availableMarks = getSectionAvailableMarks(section);
  const sectionMarks = getSectionMarks(section);

  const addQuestionGroup = (type: QuestionType) => {
    const meta = QUESTION_TYPES.find((qt) => qt.id === type);
    const newGroup: QuestionGroup = {
      ...createDefaultQuestionGroup(),
      name: meta?.label || type,
      type,
      category: meta?.category || "other",
    };
    if (type === "NESTED") {
      newGroup.children = [];
      newGroup.questionCount = 0;
      newGroup.marksPerQuestion = 0;
      newGroup.nestedConfig = [createDefaultNestedConfig()];
    }
    onUpdate(section.id, {
      questionGroups: [...section.questionGroups, newGroup],
    });
    setShowTypeSelector(false);
  };

  const updateGroup = (groupId: string, patch: Partial<QuestionGroup>) => {
    onUpdate(section.id, {
      questionGroups: section.questionGroups.map((g) =>
        g.id === groupId ? { ...g, ...patch } : g
      ),
    });
  };

  const removeGroup = (groupId: string) => {
    onUpdate(section.id, {
      questionGroups: section.questionGroups.filter((g) => g.id !== groupId),
    });
  };

  const addSubQuestion = (groupId: string) => {
    const group = section.questionGroups.find((g) => g.id === groupId);
    if (!group || !group.children) return;
    const groupIdx = section.questionGroups.indexOf(group);
    const childIdx = group.children.length;
    const newChildren = [...group.children, createDefaultSubQuestion(groupIdx, childIdx)];
    updateGroup(groupId, { children: newChildren, questionCount: newChildren.length });
  };

  const updateSubQuestion = (groupId: string, childId: string, patch: Partial<SubQuestion>) => {
    const group = section.questionGroups.find((g) => g.id === groupId);
    if (!group || !group.children) return;
    const groupIdx = section.questionGroups.indexOf(group);
    const newChildren = group.children.map((c) => (c.id === childId ? { ...c, ...patch } : c));
    updateGroup(groupId, { children: relabelSubQuestions(newChildren, groupIdx) });
  };

  const removeSubQuestion = (groupId: string, childId: string) => {
    const group = section.questionGroups.find((g) => g.id === groupId);
    if (!group || !group.children) return;
    if (group.children.length <= 1) return;
    const groupIdx = section.questionGroups.indexOf(group);
    const newChildren = group.children.filter((c) => c.id !== childId);
    updateGroup(groupId, { children: relabelSubQuestions(newChildren, groupIdx), questionCount: newChildren.length });
  };

  const duplicateSubQuestion = (groupId: string, childId: string) => {
    const group = section.questionGroups.find((g) => g.id === groupId);
    if (!group || !group.children) return;
    const groupIdx = section.questionGroups.indexOf(group);
    const src = group.children.find((c) => c.id === childId);
    if (!src) return;
    const copy: SubQuestion = { ...src, id: `sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, options: src.options?.map((o) => ({ ...o, id: `${o.id}_dup` })) };
    const idx = group.children.indexOf(src);
    const newChildren = [...group.children];
    newChildren.splice(idx + 1, 0, copy);
    updateGroup(groupId, { children: relabelSubQuestions(newChildren, groupIdx), questionCount: newChildren.length });
  };

  const moveSubQuestion = (groupId: string, childId: string, direction: "up" | "down") => {
    const group = section.questionGroups.find((g) => g.id === groupId);
    if (!group || !group.children) return;
    const groupIdx = section.questionGroups.indexOf(group);
    const idx = group.children.findIndex((c) => c.id === childId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= group.children.length) return;
    const newChildren = [...group.children];
    [newChildren[idx], newChildren[targetIdx]] = [newChildren[targetIdx], newChildren[idx]];
    updateGroup(groupId, { children: relabelSubQuestions(newChildren, groupIdx) });
  };

  const setSubQuestionType = (groupId: string, childId: string, newType: QuestionType) => {
    const meta = QUESTION_TYPES.find((qt) => qt.id === newType);
    const patch: Partial<SubQuestion> = {
      type: newType,
      category: meta?.category || "other",
    };
    if (newType === "MCQ_SINGLE" || newType === "MCQ_MULTIPLE") {
      const child = section.questionGroups.find((g) => g.id === groupId)?.children?.find((c) => c.id === childId);
      if (!child?.options || child.options.length < 2) {
        patch.options = [
          { id: `${childId}_a`, label: "A", content: "", isCorrect: false },
          { id: `${childId}_b`, label: "B", content: "", isCorrect: false },
          { id: `${childId}_c`, label: "C", content: "", isCorrect: false },
          { id: `${childId}_d`, label: "D", content: "", isCorrect: false },
        ];
      }
    } else if (newType === "TRUE_FALSE") {
      patch.options = [
        { id: `${childId}_true`, label: "A", content: "True", isCorrect: true },
        { id: `${childId}_false`, label: "B", content: "False", isCorrect: false },
      ];
    } else {
      patch.options = undefined;
      patch.correctAnswer = undefined;
    }
    updateSubQuestion(groupId, childId, patch);
  };

  // ── Nested config management ──
  const addNestedConfigRow = (groupId: string) => {
    const group = section.questionGroups.find((g) => g.id === groupId);
    if (!group) return;
    const config = group.nestedConfig ?? [];
    updateGroup(groupId, { nestedConfig: [...config, createDefaultNestedConfig()] });
  };

  const updateNestedConfigRow = (groupId: string, configId: string, patch: Partial<NestedTypeConfigItem>) => {
    const group = section.questionGroups.find((g) => g.id === groupId);
    if (!group || !group.nestedConfig) return;
    updateGroup(groupId, {
      nestedConfig: group.nestedConfig.map((c) => (c.id === configId ? { ...c, ...patch } : c)),
    });
  };

  const removeNestedConfigRow = (groupId: string, configId: string) => {
    const group = section.questionGroups.find((g) => g.id === groupId);
    if (!group || !group.nestedConfig) return;
    const newConfig = group.nestedConfig.filter((c) => c.id !== configId);
    updateGroup(groupId, { nestedConfig: newConfig.length > 0 ? newConfig : undefined });
  };

  const generateNestedChildren = (groupId: string) => {
    const group = section.questionGroups.find((g) => g.id === groupId);
    if (!group || !group.nestedConfig || group.nestedConfig.length === 0) return;
    const groupIdx = section.questionGroups.indexOf(group);
    const children = generateChildrenFromConfig(group.nestedConfig, groupIdx);
    updateGroup(groupId, { children, questionCount: children.length });
  };

  const addedTypes = new Set(section.questionGroups.map((g) => g.type));
  const availableTypes = QUESTION_TYPES.filter((qt) => !addedTypes.has(qt.id));
  const objectiveTypes = availableTypes.filter((qt) => qt.category === "objective");
  const subjectiveTypes = availableTypes.filter((qt) => qt.category === "subjective");
  const compositeTypes = availableTypes.filter((qt) => qt.category === "composite");
  const technicalTypes = availableTypes.filter((qt) => qt.category === "technical");
  const otherTypes = availableTypes.filter((qt) => qt.category === "other" || qt.category === "structural");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.04),0_4px_12px_rgba(17,24,39,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMoveUp(section.id)}
            disabled={index === 0}
            className="rounded p-0.5 text-text-muted transition-colors hover:text-text-primary disabled:opacity-30"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(section.id)}
            disabled={index === totalSections - 1}
            className="rounded p-0.5 text-text-muted transition-colors hover:text-text-primary disabled:opacity-30"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-text-muted active:cursor-grabbing" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-text-primary">{section.name}</span>
            {section.title && (
              <>
                <span className="text-text-muted">—</span>
                <span className="text-sm text-text-secondary">{section.title}</span>
              </>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-text-muted">
            <span>{qCount} Questions</span>
            <span>·</span>
            <span>{availableMarks} Available</span>
            <span>·</span>
            <span className="font-semibold text-text-secondary">{sectionMarks} Marks</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-border-hover hover:text-text-primary"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(section.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-border-hover hover:text-text-primary"
            aria-label="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(section.id)}
            disabled={totalSections <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-rose-500/40 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-5 px-5 py-5">
              {/* Section Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    Section Name
                  </label>
                  <input
                    value={section.name}
                    onChange={(e) => onUpdate(section.id, { name: e.target.value })}
                    placeholder="e.g. Section A"
                    className="h-10 w-full rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    Section Title
                  </label>
                  <input
                    value={section.title}
                    onChange={(e) => onUpdate(section.id, { title: e.target.value })}
                    placeholder="e.g. Objective Questions"
                    className="h-10 w-full rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted">
                  Instructions
                </label>
                <textarea
                  value={section.instructions}
                  onChange={(e) => onUpdate(section.id, { instructions: e.target.value })}
                  rows={2}
                  placeholder="e.g. Answer all questions in this section."
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
                />
              </div>

              {/* Question Groups */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    Question Groups
                  </label>
                </div>

                {section.questionGroups.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {section.questionGroups.map((group) => {
                      const isNested = group.type === "NESTED";
                      const children = group.children ?? [];
                      const groupAvailable = isNested
                        ? children.reduce((s, c) => s + c.marks, 0)
                        : group.questionCount * group.marksPerQuestion;
                      const isAnyN = group.attemptRule === "any_n" && group.attemptCount > 0;
                      const effectiveCount = isAnyN
                        ? Math.min(group.attemptCount, group.questionCount)
                        : group.questionCount;
                      const groupMarks = isNested
                        ? groupAvailable
                        : effectiveCount * group.marksPerQuestion;
                      const groupIdx = section.questionGroups.indexOf(group);

                      return (
                        <div
                          key={group.id}
                          className="rounded-xl border border-border bg-card-hover/30 p-3.5"
                        >
                          <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-text-primary">
                                  {group.name}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                                    group.category === "objective"
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      : group.category === "composite"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      : group.category === "technical"
                                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                                      : group.category === "structural"
                                      ? "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                                      : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                  )}
                                >
                                  {group.category}
                                </span>
                                {isNested && (
                                  <span className="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                    {children.length} sub-q
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {!isNested && (
                                <>
                                  <div className="min-w-[80px]">
                                    <label className="mb-1 block text-[10px] font-bold text-text-muted">Questions</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={200}
                                      value={group.questionCount || ""}
                                      onChange={(e) =>
                                        updateGroup(group.id, {
                                          questionCount: Math.max(1, Number(e.target.value)),
                                        })
                                      }
                                      className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2.5 text-xs text-text-primary outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
                                    />
                                  </div>
                                  <div className="min-w-[80px]">
                                    <label className="mb-1 block text-[10px] font-bold text-text-muted">Marks/Q</label>
                                    <input
                                      type="number"
                                      min={0.5}
                                      max={100}
                                      step={0.5}
                                      value={group.marksPerQuestion || ""}
                                      onChange={(e) =>
                                        updateGroup(group.id, {
                                          marksPerQuestion: Math.max(0.5, Number(e.target.value)),
                                        })
                                      }
                                      className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2.5 text-xs text-text-primary outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
                                    />
                                  </div>
                                </>
                              )}

                              {/* Attempt Rule */}
                              <div className="min-w-[120px]">
                                <label className="mb-1 block text-[10px] font-bold text-text-muted">Attempt</label>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateGroup(group.id, { attemptRule: "all", attemptCount: 0 })
                                    }
                                    className={cn(
                                      "flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold transition-all",
                                      group.attemptRule === "all"
                                        ? "bg-pink-500/10 text-pink-600 dark:text-pink-400"
                                        : "bg-card text-text-muted hover:text-text-primary"
                                    )}
                                  >
                                    All
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateGroup(group.id, {
                                        attemptRule: "any_n",
                                        attemptCount: Math.min(
                                          group.attemptCount || Math.ceil(group.questionCount / 2),
                                          group.questionCount
                                        ),
                                      })
                                    }
                                    className={cn(
                                      "flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold transition-all",
                                      group.attemptRule === "any_n"
                                        ? "bg-pink-500/10 text-pink-600 dark:text-pink-400"
                                        : "bg-card text-text-muted hover:text-text-primary"
                                    )}
                                  >
                                    Any N
                                  </button>
                                </div>
                              </div>

                              {group.attemptRule === "any_n" && (
                                <div className="min-w-[60px]">
                                  <label className="mb-1 block text-[10px] font-bold text-text-muted">N =</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={group.questionCount}
                                    value={group.attemptCount || ""}
                                    onChange={(e) =>
                                      updateGroup(group.id, {
                                        attemptCount: Math.min(
                                          Number(e.target.value),
                                          group.questionCount
                                        ),
                                      })
                                    }
                                    className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2.5 text-xs text-text-primary outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
                                  />
                                </div>
                              )}

                              {/* Marks summary */}
                              <div className="flex h-9 min-w-[70px] items-center rounded-lg border border-border bg-muted px-2.5 text-[11px] font-semibold text-text-primary">
                                {groupMarks} marks
                              </div>

                              <button
                                type="button"
                                onClick={() => removeGroup(group.id)}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-rose-500/40 hover:text-rose-500"
                                aria-label={`Remove ${group.name}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Attempt info */}
                          {isAnyN && (
                            <div className="mt-2 rounded-lg bg-pink-500/5 px-3 py-1.5 text-[10px] text-pink-600 dark:text-pink-400">
                              Attempt {group.attemptCount} out of {group.questionCount} ·
                              Available: {groupAvailable} · Obtainable: {groupMarks}
                            </div>
                          )}

                          {/* Nested Sub-Questions Builder */}
                          {isNested && (
                            <div className="mt-3 space-y-3 border-t border-border pt-3">
                              {/* Config Panel */}
                              <div className="rounded-lg border border-dashed border-border bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                                    Type Configuration
                                  </span>
                                  <span className="text-[10px] text-text-muted">
                                    Define which types and how many
                                  </span>
                                </div>

                                {(group.nestedConfig ?? []).length === 0 && !children.length && (
                                  <p className="text-[11px] text-text-muted py-1">
                                    Add question types below, then click Generate to create sub-questions.
                                  </p>
                                )}

                                {(group.nestedConfig ?? []).map((cfg) => {
                                  const typeMeta = QUESTION_TYPES.find((qt) => qt.id === cfg.type);
                                  const categoryColors: Record<string, string> = {
                                    objective: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                    subjective: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                                    composite: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                    technical: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                                    structural: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
                                    other: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
                                  };

                                  return (
                                    <div key={cfg.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                                      <select
                                        value={cfg.type}
                                        onChange={(e) => updateNestedConfigRow(group.id, cfg.id, { type: e.target.value as QuestionType })}
                                        className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-[11px] font-medium text-text-primary outline-none focus:border-pink-500/60"
                                      >
                                        {QUESTION_TYPES.filter((qt) => qt.id !== "NESTED").map((qt) => (
                                          <option key={qt.id} value={qt.id}>{qt.label}</option>
                                        ))}
                                      </select>
                                      {typeMeta && (
                                        <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium", categoryColors[typeMeta.category] ?? "bg-gray-500/10 text-gray-600")}>
                                          {typeMeta.category}
                                        </span>
                                      )}
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[10px] text-text-muted">×</span>
                                        <input
                                          type="number"
                                          min={1}
                                          max={50}
                                          value={cfg.count}
                                          onChange={(e) => updateNestedConfigRow(group.id, cfg.id, { count: Math.max(1, Number(e.target.value) || 1) })}
                                          className="h-8 w-12 rounded-lg border border-border bg-card px-2 text-[11px] text-text-primary text-center outline-none focus:border-pink-500/60"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[10px] text-text-muted">mk:</span>
                                        <input
                                          type="number"
                                          min={0.5}
                                          max={100}
                                          step={0.5}
                                          value={cfg.marksPerQuestion}
                                          onChange={(e) => updateNestedConfigRow(group.id, cfg.id, { marksPerQuestion: Math.max(0.5, Number(e.target.value) || 0.5) })}
                                          className="h-8 w-14 rounded-lg border border-border bg-card px-2 text-[11px] text-text-primary text-center outline-none focus:border-pink-500/60"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeNestedConfigRow(group.id, cfg.id)}
                                        className="shrink-0 rounded p-1 text-text-muted hover:text-red-500"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  );
                                })}

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => addNestedConfigRow(group.id)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-text-secondary hover:border-pink-500/40 hover:text-pink-500"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add Type
                                  </button>
                                  {(group.nestedConfig ?? []).length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => generateNestedChildren(group.id)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-pink-500 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-pink-600"
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      Generate {(group.nestedConfig ?? []).reduce((s, c) => s + c.count, 0)} Sub-Questions
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Generated Sub-Questions List */}
                              {children.length > 0 && (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                                      Sub Questions
                                    </span>
                                    <span className="text-[10px] text-text-muted">
                                      {children.length} question{children.length !== 1 ? "s" : ""} · {groupMarks} total marks
                                    </span>
                                  </div>

                                  {children.map((child, ci) => {
                                    const isChoice = child.type === "MCQ_SINGLE" || child.type === "MCQ_MULTIPLE" || child.type === "TRUE_FALSE";
                                    const isSingleChoice = child.type === "MCQ_SINGLE" || child.type === "TRUE_FALSE";

                                    return (
                                      <div
                                        key={child.id}
                                        className="rounded-lg border border-border bg-card p-3 ml-2"
                                      >
                                        <div className="flex items-start gap-2 mb-2">
                                          <span className="shrink-0 text-[11px] font-bold text-pink-600 dark:text-pink-400 mt-2 min-w-[36px]">
                                            {child.label}
                                          </span>
                                          <div className="flex-1 min-w-0 space-y-2">
                                            {/* Type + Marks row */}
                                            <div className="flex items-center gap-2">
                                              <select
                                                value={child.type}
                                                onChange={(e) => setSubQuestionType(group.id, child.id, e.target.value as QuestionType)}
                                                className="h-8 rounded-lg border border-border bg-card px-2 text-[11px] font-medium text-text-primary outline-none focus:border-pink-500/60"
                                              >
                                                {QUESTION_TYPES.filter((qt) => qt.id !== "NESTED").map((qt) => (
                                                  <option key={qt.id} value={qt.id}>{qt.label}</option>
                                                ))}
                                              </select>
                                              <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-text-muted">Marks:</span>
                                                <input
                                                  type="number"
                                                  min={0.5}
                                                  max={100}
                                                  step={0.5}
                                                  value={child.marks}
                                                  onChange={(e) => updateSubQuestion(group.id, child.id, { marks: Math.max(0.5, Number(e.target.value) || 0.5) })}
                                                  className="h-8 w-14 rounded-lg border border-border bg-card px-2 text-[11px] text-text-primary outline-none focus:border-pink-500/60"
                                                />
                                              </div>
                                            </div>

                                            {/* Content */}
                                            <input
                                              value={child.content}
                                              onChange={(e) => updateSubQuestion(group.id, child.id, { content: e.target.value })}
                                              placeholder="Sub-question content..."
                                              className="w-full h-8 rounded-lg border border-border bg-card px-2.5 text-[11px] text-text-primary placeholder:text-text-muted outline-none focus:border-pink-500/60"
                                            />

                                            {/* Options for choice types */}
                                            {isChoice && child.options && (
                                              <div className="space-y-1 ml-1">
                                                {child.options.map((opt) => (
                                                  <div key={opt.id} className="flex items-center gap-2">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const newOpts = child.options!.map((o) => ({
                                                          ...o,
                                                          isCorrect: isSingleChoice ? o.id === opt.id : o.id === opt.id ? !o.isCorrect : o.isCorrect,
                                                        }));
                                                        updateSubQuestion(group.id, child.id, { options: newOpts });
                                                      }}
                                                      className={cn(
                                                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                                                        opt.isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-card"
                                                      )}
                                                    >
                                                      {opt.isCorrect && <Check className="h-2.5 w-2.5" />}
                                                    </button>
                                                    <span className="shrink-0 text-[10px] font-bold text-text-muted w-4">{opt.label}</span>
                                                    <input
                                                      value={opt.content}
                                                      onChange={(e) => {
                                                        const newOpts = child.options!.map((o) => o.id === opt.id ? { ...o, content: e.target.value } : o);
                                                        updateSubQuestion(group.id, child.id, { options: newOpts });
                                                      }}
                                                      placeholder={child.type === "TRUE_FALSE" ? opt.content : `Option ${opt.label}`}
                                                      disabled={child.type === "TRUE_FALSE"}
                                                      className="flex-1 h-7 rounded border border-border bg-card px-2 text-[10px] text-text-primary placeholder:text-text-muted outline-none focus:border-pink-500/60 disabled:opacity-60"
                                                    />
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            {/* Answer for non-choice types */}
                                            {!isChoice && (
                                              <input
                                                value={String(child.correctAnswer ?? "")}
                                                onChange={(e) => updateSubQuestion(group.id, child.id, { correctAnswer: e.target.value })}
                                                placeholder="Correct answer"
                                                className="w-full h-8 rounded-lg border border-border bg-card px-2.5 text-[11px] text-text-primary placeholder:text-text-muted outline-none focus:border-pink-500/60"
                                              />
                                            )}
                                          </div>

                                          {/* Child actions */}
                                          <div className="flex flex-col gap-0.5 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => moveSubQuestion(group.id, child.id, "up")}
                                              disabled={ci === 0}
                                              className="rounded p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30"
                                            >
                                              <ChevronUp className="h-3 w-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => moveSubQuestion(group.id, child.id, "down")}
                                              disabled={ci === children.length - 1}
                                              className="rounded p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30"
                                            >
                                              <ChevronDown className="h-3 w-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => duplicateSubQuestion(group.id, child.id)}
                                              className="rounded p-0.5 text-text-muted hover:text-text-primary"
                                            >
                                              <Copy className="h-3 w-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => removeSubQuestion(group.id, child.id)}
                                              disabled={children.length <= 1}
                                              className="rounded p-0.5 text-text-muted hover:text-red-500 disabled:opacity-30"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  <button
                                    type="button"
                                    onClick={() => addSubQuestion(group.id)}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-pink-300 dark:border-pink-400/30 bg-pink-50/50 dark:bg-pink-500/10 py-2 text-[11px] font-semibold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/15"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add Sub Question
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Group */}
                {showTypeSelector ? (
                  <div className="rounded-xl border border-border bg-card-hover/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary">Add Question Group</span>
                      <button
                        type="button"
                        onClick={() => setShowTypeSelector(false)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:text-text-primary"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {objectiveTypes.length > 0 && (
                      <div className="mb-3">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-text-muted">
                          Objective
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {objectiveTypes.map((qt) => (
                            <button
                              key={qt.id}
                              type="button"
                              onClick={() => addQuestionGroup(qt.id)}
                              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary transition-all hover:border-pink-500/40 hover:text-pink-500"
                            >
                              {qt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {subjectiveTypes.length > 0 && (
                      <div className="mb-3">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-text-muted">
                          Subjective
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {subjectiveTypes.map((qt) => (
                            <button
                              key={qt.id}
                              type="button"
                              onClick={() => addQuestionGroup(qt.id)}
                              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary transition-all hover:border-pink-500/40 hover:text-pink-500"
                            >
                              {qt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {compositeTypes.length > 0 && (
                      <div className="mb-3">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-text-muted">
                          Composite
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {compositeTypes.map((qt) => (
                            <button
                              key={qt.id}
                              type="button"
                              onClick={() => addQuestionGroup(qt.id)}
                              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary transition-all hover:border-pink-500/40 hover:text-pink-500"
                            >
                              {qt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {technicalTypes.length > 0 && (
                      <div className="mb-3">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-text-muted">
                          Technical
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {technicalTypes.map((qt) => (
                            <button
                              key={qt.id}
                              type="button"
                              onClick={() => addQuestionGroup(qt.id)}
                              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary transition-all hover:border-pink-500/40 hover:text-pink-500"
                            >
                              {qt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {otherTypes.length > 0 && (
                      <div className="mb-3">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-text-muted">
                          Other
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {otherTypes.map((qt) => (
                            <button
                              key={qt.id}
                              type="button"
                              onClick={() => addQuestionGroup(qt.id)}
                              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary transition-all hover:border-pink-500/40 hover:text-pink-500"
                            >
                              {qt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {availableTypes.length === 0 && (
                      <p className="text-xs text-text-muted">All question types have been added.</p>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTypeSelector(true)}
                    disabled={availableTypes.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-card px-4 py-2.5 text-xs font-semibold text-text-secondary transition-all hover:border-pink-500/40 hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Question Group
                  </button>
                )}
              </div>

              {/* Marks Summary */}
              <div className="rounded-xl border border-border bg-card-hover/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-text-muted" />
                  <span className="text-xs font-bold text-text-primary">Marks Summary</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                    <span className="text-[11px] text-text-muted">Total Questions</span>
                    <span className="text-sm font-extrabold text-text-primary">{qCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                    <span className="text-[11px] text-text-muted">Available Marks</span>
                    <span className="text-sm font-extrabold text-text-primary">{availableMarks}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                    <span className="text-[11px] text-text-muted">Section Marks</span>
                    <span className="text-sm font-extrabold text-pink-600 dark:text-pink-400">{sectionMarks}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={section.negativeMarking}
                      onChange={(e) => onUpdate(section.id, { negativeMarking: e.target.checked })}
                      className="h-4 w-4 rounded border-border-hover accent-pink-500"
                    />
                    <span className="text-xs font-medium text-text-primary">Negative Marking</span>
                  </label>
                  {section.negativeMarking && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-text-muted">Penalty:</span>
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={section.negativeMarks || ""}
                        onChange={(e) => onUpdate(section.id, { negativeMarks: Number(e.target.value) })}
                        placeholder="0.25"
                        className="h-8 w-20 rounded-lg border border-input-border bg-input-bg px-2 text-xs text-text-primary outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10"
                      />
                      <span className="text-[11px] text-text-muted">marks</span>
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={section.partialMarking}
                      onChange={(e) => onUpdate(section.id, { partialMarking: e.target.checked })}
                      className="h-4 w-4 rounded border-border-hover accent-pink-500"
                    />
                    <span className="text-xs font-medium text-text-primary">Partial Marking</span>
                  </label>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => { /* placeholder */ }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Questions
                </button>
                <button
                  type="button"
                  onClick={onAIGenerate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/5 px-3 py-2 text-xs font-semibold text-pink-600 transition-all hover:bg-pink-500/10 dark:text-pink-400"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate with AI
                </button>
                <button
                  type="button"
                  onClick={() => { /* placeholder */ }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Question Bank
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
